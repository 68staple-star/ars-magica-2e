#!/usr/bin/env node
/**
 * Parse ArM5 Chapter Nine spells into Foundry spell Item seed data with R/D/T + effect text.
 * Source: Project Redcap OGL — https://www.redcap.org/page/Ars_Magica_5E_Standard_Edition,_Chapter_Nine:_Spells
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2]
  ?? join(root, "..", "src", "compendium-data", "sources", "arm5-spells-ch9.md");
const outputPath = process.argv[3]
  ?? join(root, "..", "src", "compendium-data", "spells-arm5-ch9.json");

const SOURCE = "ArM5 Chapter IX (CC BY-SA 4.0)";

const TECHNIQUE_MAP = {
  Creo: "creo",
  Intellego: "intellego",
  Muto: "muto",
  Perdo: "perdo",
  Rego: "rego"
};

const FORM_MAP = {
  Animal: "animal",
  Aquam: "aquam",
  Auram: "auram",
  Corpus: "corporem",
  Herbam: "herbam",
  Ignem: "ignem",
  Imaginem: "imagonem",
  Mentem: "mentem",
  Terram: "terram",
  Vim: "vim"
};

const TECH_ABBREV = {
  creo: "Cr",
  intellego: "In",
  muto: "Mu",
  perdo: "Pe",
  rego: "Re"
};

const FORM_ABBREV = {
  animal: "An",
  aquam: "Aq",
  auram: "Au",
  corporem: "Co",
  herbam: "He",
  ignem: "Ig",
  imagonem: "Im",
  mentem: "Me",
  terram: "Te",
  vim: "Vi"
};

const RANGE_EXPAND = {
  Per: "Personal",
  Touch: "Touch",
  Eye: "Eye",
  Voice: "Voice",
  Sight: "Sight",
  Arc: "Arcane Connection",
  "Arcane Connection": "Arcane Connection"
};

const DURATION_EXPAND = {
  Mom: "Momentary",
  Momentary: "Momentary",
  Conc: "Concentration",
  Concentration: "Concentration",
  Diam: "Diameter",
  Diameter: "Diameter",
  Sun: "Sun",
  Moon: "Moon",
  Year: "Year",
  Spec: "Special",
  Special: "Special",
  "Sun & Year": "Sun & Year"
};

const TARGET_EXPAND = {
  Ind: "Individual",
  Individual: "Individual",
  Part: "Part",
  Group: "Group",
  Room: "Room",
  Str: "Structure",
  Structure: "Structure",
  Bound: "Boundary",
  Boundary: "Boundary",
  Circle: "Circle",
  Touch: "Touch",
  Hearing: "Hearing",
  Taste: "Taste",
  Smell: "Smell",
  Vision: "Vision"
};

const SPELL_HEADER = /^(.+?)\s+R:\s*(.+?)\s*,?\s*D:\s*(.+?)\s*,?\s*T:\s*(.+?)\s*$/i;
const SECTION_RE = /^###\s+(Creo|Intellego|Muto|Perdo|Rego)\s+(Animal|Aquam|Auram|Corpus|Herbam|Ignem|Imaginem|Mentem|Terram|Vim)\s+Spells\s*$/i;
const LEVEL_HEADING = /^####\s+(General|Level\s+(\d+))\s*$/i;

/**
 * @param {string} raw
 * @param {Record<string, string>} map
 */
function expandToken(raw, map) {
  const cleaned = String(raw ?? "")
    .replace(/\s*Req:.*$/i, "")
    .replace(/,?\s*Ritual.*$/i, "")
    .replace(/\.$/, "")
    .trim();
  if (!cleaned) return "";
  return map[cleaned] ?? cleaned;
}

/**
 * @param {string} targetRaw
 */
function parseTarget(targetRaw) {
  const ritual = /\bRitual\b/i.test(targetRaw);
  const withoutReq = targetRaw.replace(/\s*Req:.*$/i, "").trim();
  const base = withoutReq.replace(/,?\s*Ritual.*$/i, "").trim();
  const target = expandToken(base.split(",")[0].trim(), TARGET_EXPAND);
  return { target, ritual };
}

/**
 * @param {string} markdown
 */
function parseSpells(markdown) {
  const lines = markdown.split(/\r?\n/);
  /** @type {object[]} */
  const spells = [];
  let technique = "";
  let form = "";
  let level = 0;
  let isGeneral = false;
  let current = null;

  /**
   * @param {boolean} [force=false]
   */
  function flush(force = false) {
    if (!current) return;
    if (!force && !current.description.trim() && !current.name) {
      current = null;
      return;
    }

    const notes = [
      current.description.trim(),
      current.base ? `(${current.base})` : "",
      "ArM5 Chapter IX OGL spell text — use with 2e casting math; verify saga house rules for any edition differences."
    ].filter(Boolean).join("\n\n");

    spells.push({
      name: current.name,
      type: "spell",
      system: {
        level: current.isGeneral ? 0 : current.level,
        technique: current.technique,
        form: current.form,
        artAbbrev: `${TECH_ABBREV[current.technique]}${FORM_ABBREV[current.form]}${current.isGeneral ? " Gen" : ""}`,
        isGeneral: current.isGeneral,
        range: current.range,
        duration: current.duration,
        target: current.target,
        mastered: false,
        notes,
        source: SOURCE,
        journal: ""
      }
    });
    current = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const section = line.match(SECTION_RE);
    if (section) {
      flush();
      technique = TECHNIQUE_MAP[section[1]];
      form = FORM_MAP[section[2]];
      continue;
    }

    const levelMatch = line.match(LEVEL_HEADING);
    if (levelMatch) {
      flush();
      isGeneral = /^General$/i.test(levelMatch[1]);
      level = isGeneral ? 0 : Number(levelMatch[2]) || 0;
      continue;
    }

    if (!technique || !form) continue;
    if (line.startsWith("#") || line.startsWith("|") || line.startsWith("---")) continue;

    const header = line.match(SPELL_HEADER);
    if (header && technique && form) {
      flush();
      const name = header[1].trim().replace(/\.$/, "");
      if (/^R:/i.test(name) || name.length < 3) continue;

      const { target, ritual } = parseTarget(header[4]);
      current = {
        name,
        technique,
        form,
        level,
        isGeneral,
        range: expandToken(header[2], RANGE_EXPAND),
        duration: expandToken(header[3], DURATION_EXPAND),
        target: ritual ? `${target} (Ritual)` : target,
        description: "",
        base: ""
      };
      continue;
    }

    if (!current) continue;

    if (/^\(Base\b/i.test(line) || /^\(General\b/i.test(line)) {
      current.base = line.replace(/^\(|\)$/g, "").trim();
      continue;
    }

    if (line) {
      current.description = current.description
        ? `${current.description}\n${line}`
        : line;
    }
  }

  flush(true);
  return spells;
}

const markdown = readFileSync(inputPath, "utf8");
const spells = parseSpells(markdown);

const seen = new Set();
const unique = [];

for (const spell of spells) {
  const key = `${spell.name}|${spell.system.technique}|${spell.system.form}|${spell.system.level}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(spell);
}

unique.sort((left, right) => left.name.localeCompare(right.name));

writeFileSync(outputPath, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
console.log(`Parsed ${unique.length} spells with R/D/T -> ${outputPath}`);

const withText = unique.filter((spell) => spell.system.notes.length > 80).length;
const withRange = unique.filter((spell) => spell.system.range).length;
console.log(`  With range: ${withRange}; with substantial text: ${withText}`);
