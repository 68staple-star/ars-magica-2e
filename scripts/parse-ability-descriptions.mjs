#!/usr/bin/env node
/**
 * Merge 2e ability descriptions from AG0201 Abilities chapter OCR dump into abilities.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, "..");
const abilitiesPath = join(projectRoot, "src", "compendium-data", "abilities.json");
const defaultSource = join(
  "C:",
  "Users",
  "Ralphs Study",
  ".cursor",
  "projects",
  "c-Users-Ralphs-Study-ars-magica-ars-magica-2e",
  "agent-tools",
  "e178278d-cc15-4074-88ae-fc665740251c.txt"
);

const sourcePath = process.argv[2] ?? defaultSource;

/** Manual short blurbs for abilities not cleanly present in OCR / later group skills */
const MANUAL = {
  "Single Weapon": "Fighting with a one-handed melee weapon (swords, axes, maces, and similar). Used with LoM/ArM5 Single ability weapons.",
  "Great Weapon": "Fighting with two-handed or pole weapons (great swords, spears, staves, and similar). Used with LoM/ArM5 Great ability weapons.",
  Bow: "Shooting bows. Used with LoM/ArM5 Bow ability weapons.",
  "Thrown Weapon": "Throwing weapons such as knives, javelins, and axes. Used with LoM/ArM5 Thrown ability weapons.",
  Crossbow: "Shooting crossbows. Used with LoM/ArM5 Crossbow ability weapons.",
  "Certámen": "Formal Hermetic magical contest between magi.",
  "Parma Magica": "The Hermetic ritual shield against magic. Score × 5 contributes to magic resistance (plus Form).",
  "Speak (Specific Alphabet)": "Speaking a specific language or alphabet you specify.",
  "Scribe (Specific Alphabet)": "Reading and writing a specific alphabet you specify.",
  "(Area) Lore": "Knowledge of a specific geographic area you specify.",
  "Craft (Specify)": "A specific craft trade you name.",
  "Evaluate (Specific Items)": "Appraising a category of goods you specify.",
  "Play (Specific Instrument)": "Playing a musical instrument you specify."
};

/**
 * @param {string} text
 */
function cleanText(text) {
  return text
    .replace(/\u00ad/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

/**
 * @param {string} markdown
 * @returns {Map<string, string>}
 */
function parseAbilityDescriptions(markdown) {
  const map = new Map();
  // Match "Name- description" blocks typical of the Abilities chapter dump
  const pattern = /(?:^|\n)([A-Z][A-Za-zÀ-ÿ'&() /-]{1,40})-\s+([\s\S]*?)(?=\n[A-Z][A-Za-zÀ-ÿ'&() /-]{1,40}-\s+|\n--- PDF|\nArs Maglca|\nKnowledges|\nWeapon Skills|\nWork Skills|$)/g;

  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    const name = match[1].replace(/\s+/g, " ").trim();
    if (/^(Specialties|Roll|Add|Only|Feel|When|You|The|For|If|Arcane|Physical|Social|Mental|Exceptional|Awareness|Performance|Forester|Rogue|Work|Casual|Formal|Hermes)/i.test(name)) {
      continue;
    }
    if (name.length < 3 || name.length > 42) continue;

    let body = cleanText(match[2]);
    // Prefer stopping at Specialties when present for a tighter sheet blurb
    const specialtyIdx = body.search(/\bSpecialties?:/i);
    if (specialtyIdx > 40) {
      body = `${body.slice(0, specialtyIdx).trim()} ${body.slice(specialtyIdx).trim()}`;
    }
    if (body.length < 20) continue;
    if (body.length > 900) body = `${body.slice(0, 897).trim()}…`;

    map.set(name.toLowerCase(), body);
  }

  return map;
}

/**
 * @param {string} name
 * @param {Map<string, string>} parsed
 */
function lookupDescription(name, parsed) {
  if (MANUAL[name]) return MANUAL[name];

  const key = name.toLowerCase();
  if (parsed.has(key)) return parsed.get(key);

  const aliases = {
    "certámen": "certamen",
    "sense holiness & unholiness": "sense holiness & unholiness",
    "play (specific instrument)": "play",
    "craft (specify)": "craft",
    "evaluate (specific items)": "evaluate",
    "(area) lore": "area lore",
    "speak (specific alphabet)": "speak",
    "scribe (specific alphabet)": "scribe"
  };

  const alias = aliases[key];
  if (alias) {
    for (const [parsedName, text] of parsed.entries()) {
      if (parsedName === alias || parsedName.startsWith(`${alias} `) || parsedName.startsWith(alias)) {
        return text;
      }
    }
  }

  for (const [parsedName, text] of parsed.entries()) {
    if (parsedName === key || parsedName.startsWith(`${key} `) || key.startsWith(parsedName)) {
      return text;
    }
  }

  return "";
}

const source = readFileSync(sourcePath, "utf8");
const parsed = parseAbilityDescriptions(source);
const abilities = JSON.parse(readFileSync(abilitiesPath, "utf8"));

let filled = 0;
for (const ability of abilities) {
  const description = lookupDescription(ability.name, parsed);
  if (description) {
    ability.system.description = description;
    filled += 1;
  } else {
    ability.system.description = ability.system.description ?? "";
  }
}

writeFileSync(abilitiesPath, `${JSON.stringify(abilities, null, 2)}\n`, "utf8");
console.log(`Ability descriptions: ${filled}/${abilities.length} filled from ${sourcePath}`);
console.log(`Parsed name keys: ${parsed.size}`);
