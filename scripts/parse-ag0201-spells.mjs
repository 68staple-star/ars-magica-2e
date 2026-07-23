#!/usr/bin/env node
/**
 * Parse AG0201 (Ars Magica 2e) Chapter 5 spells into Foundry spell Items.
 *
 * Pipeline:
 *  1) Spell List → complete catalog (name, level, technique, form)
 *  2) Full write-ups → range / duration / target / notes overlay
 *
 * Source: 3-column PDF crop at src/compendium-data/sources/ag0201-spells-cols.txt
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = process.argv[2]
  ?? path.join(root, "src/compendium-data/sources/ag0201-spells-cols.txt");
const outputPath = process.argv[3]
  ?? path.join(root, "src/compendium-data/spells-ag0201.json");

const SOURCE = "AG0201 Ars Magica 2nd Edition, Chapter 5 (Spells)";

const FORM_IDS = Object.freeze({
  animal: "animal",
  aquam: "aquam",
  auram: "auram",
  corporem: "corporem",
  corpus: "corporem",
  herbam: "herbam",
  ignem: "ignem",
  imagonem: "imagonem",
  imaginem: "imagonem",
  mentem: "mentem",
  terram: "terram",
  vim: "vim"
});

const TECH_IDS = Object.freeze({
  creo: "creo",
  intellego: "intellego",
  muto: "muto",
  perdo: "perdo",
  rego: "rego"
});

const TECH_ABBREV = Object.freeze({
  creo: "Cr",
  intellego: "In",
  muto: "Mu",
  perdo: "Pe",
  rego: "Re"
});

const FORM_ABBREV = Object.freeze({
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
});

const NAME_FIXES = Object.freeze({
  "The Wound the Weeps": "The Wound that Weeps",
  "Invocation ofW eariness": "Invocation of Weariness",
  "U nportended Plague": "Unportended Plague",
  "Un willing Marionette": "Unwilling Marionette",
  "LungsofWaterandDeath": "Lungs of Water and Death",
  "Charge of the Angey Winds": "Charge of the Angry Winds",
  "Air Oear and Pure": "Air Clear and Pure",
  "Ann of the Infant": "Arm of the Infant",
  "The Chirurgeon' s Healing Touch": "The Chirurgeon's Healing Touch",
  "Discern the Images of Ars Maglca Truth and Falsehood": "Discern the Images of Truth and Falsehood",
  "Muto Herbam.Spells": null
});

const TECH_FORM = /^(Creo|Intellego|Muto|Perdo|Rego)\s+(Animal|Aquam|Auram|Corporem|Corpus|Herbam|Ignem|Imagonem|Imaginem|Mentem|Terram|Vim)\s+Spells?\.?\s*$/i;
const FORM_ONLY = /^(Animal|Aquam|Auram|Corporem|Corpus|Herbam|Ignem|Imagonem|Imaginem|Mentem|Terram|Vim)\s+Spells?\.?\s*$/i;
const TECH_ONLY = /^(Creo|Intellego|Muto|Perdo|Rego)\s*$/i;
const DETAIL_TITLE = /^(.+?):\s*(Lv\s*\d+|Gen\.?)\s*$/i;
const LIST_ENTRY = /^(.+?)\s*(?::\s*)?(Gen\.?|\d{1,2})\s*[RIPC'’`·\uFFFDs\uFFFD]*$/i;
const RDT_LINE = /^(Body|Self|Touch|Reach|Eye|Near|Sight|Spec\.?|Special|Personal|\d[\d,]*)\b/i;
const SKIP_LINE = /^(The Wizard'?s Sigil|When you invent|Chapter\s+\d+|Ars Mag|Spell List|\d{2,3})$/i;

/**
 * @param {string} raw
 * @returns {string}
 */
function cleanText(raw) {
  return String(raw ?? "")
    .replace(/\u00ad/g, "")
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/**
 * @param {string} name
 * @returns {string}
 */
function conflictKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/^the\s+/, "")
    .replace(/,\s*the$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} name
 * @returns {string | null}
 */
function normalizeName(name) {
  let n = cleanText(name)
    .replace(/^[^A-Za-z“"']+/, "")
    .replace(/\s+/g, " ")
    .replace(/[:;.'’]+$/, "")
    .trim();

  // Description bleed: "… . The Real Title"
  const bled = n.match(/\.\s+((?:The\s+)?[A-Z][A-Za-z0-9'’,\-]*(?:\s+[A-Za-z0-9'’,\-]+)+)$/);
  if (bled) n = bled[1];

  if (Object.prototype.hasOwnProperty.call(NAME_FIXES, n)) {
    n = NAME_FIXES[n];
    if (!n) return null;
  }

  if (!n || n.length < 3 || n.length > 70) return null;
  if (/^[a-z]/.test(n)) return null;
  // Reject description fragments that leaked into title position.
  if (/\b(becomes|otherwise|required|order of hermes|tribunals)\b/i.test(n)) return null;
  if ((n.match(/\s+/g) || []).length > 10) return null;
  return n;
}

/**
 * @param {string} levelRaw
 * @returns {{ level: number, isGeneral: boolean }}
 */
function parseLevel(levelRaw) {
  const raw = String(levelRaw ?? "").trim();
  if (/^gen/i.test(raw)) return { level: 0, isGeneral: true };
  return { level: Number(raw.replace(/[^\d]/g, "")) || 0, isGeneral: false };
}

/**
 * @param {string} line
 * @returns {{ range: string, duration: string, target: string }}
 */
function parseRdt(line) {
  const cleaned = cleanText(line).replace(/\s*\/\s*/g, "/");
  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    range: parts[0] ?? "",
    duration: parts[1] ?? "",
    target: parts.slice(2).join(", ")
  };
}

/**
 * @param {string} technique
 * @param {string} form
 * @param {boolean} isGeneral
 */
function artAbbrev(technique, form, isGeneral) {
  const art = `${TECH_ABBREV[technique] ?? "?"}${FORM_ABBREV[form] ?? "?"}`;
  return isGeneral ? `${art} Gen` : art;
}

/**
 * @param {string} line
 * @returns {string}
 */
function fixOcrLine(line) {
  return line
    .replace(/C6rporem/gi, "Corporem")
    .replace(/COrporem/gi, "Corporem")
    .replace(/lmigonem/gi, "Imagonem")
    .replace(/Imaginem/gi, "Imagonem")
    .replace(/lgnem/gi, "Ignem")
    .replace(/Igncm/gi, "Ignem");
}

/**
 * @param {string[]} lines
 * @param {number} from
 * @param {number} to
 * @returns {Map<string, object>}
 */
function parseSpellList(lines, from, to) {
  /** @type {Map<string, object>} */
  const byKey = new Map();
  let technique = "";
  let form = "";
  let pendingTech = "";
  let carry = "";

  const push = (rawName, levelRaw) => {
    const joined = cleanText(`${carry} ${rawName}`.trim());
    carry = "";
    const name = normalizeName(joined);
    if (!name || !technique || !form) return;
    const { level, isGeneral } = parseLevel(levelRaw);
    const key = conflictKey(name);
    if (byKey.has(key)) return;
    byKey.set(key, {
      name,
      type: "spell",
      system: {
        level,
        technique,
        form,
        artAbbrev: artAbbrev(technique, form, isGeneral),
        isGeneral,
        range: "",
        duration: "",
        target: "",
        mastered: false,
        notes: "AG0201 2e spell — see core book for full text if notes were incomplete in the extract.",
        source: SOURCE,
        journal: ""
      }
    });
  };

  for (let i = from; i < to; i += 1) {
    let line = fixOcrLine(lines[i].trim());
    if (!line || SKIP_LINE.test(line)) {
      carry = "";
      continue;
    }
    if (/When you invent|personal affinity|wizard'?s sigil/i.test(line)) {
      carry = "";
      continue;
    }

    const techForm = line.match(TECH_FORM);
    if (techForm) {
      technique = TECH_IDS[techForm[1].toLowerCase()] ?? "";
      form = FORM_IDS[techForm[2].toLowerCase()] ?? "";
      pendingTech = "";
      carry = "";
      continue;
    }

    const formOnly = line.match(FORM_ONLY);
    if (formOnly) {
      form = FORM_IDS[formOnly[1].toLowerCase()] ?? form;
      if (pendingTech) {
        technique = TECH_IDS[pendingTech] ?? technique;
        pendingTech = "";
      }
      carry = "";
      continue;
    }

    const techOnly = line.match(TECH_ONLY);
    if (techOnly) {
      pendingTech = techOnly[1].toLowerCase();
      technique = TECH_IDS[pendingTech] ?? technique;
      carry = "";
      continue;
    }

    // Ignore detail-style titles in the list region.
    if (DETAIL_TITLE.test(line)) {
      carry = "";
      continue;
    }

    const entry = line.match(LIST_ENTRY);
    if (entry && /^(Gen\.?|\d{1,2})$/i.test(entry[2])) {
      const maybeName = entry[1].trim();
      if (maybeName.length >= 3 && /[A-Za-z]/.test(maybeName) && !/^(Gen|Lv)$/i.test(maybeName)) {
        const startsContinuation = /^(of|the|and|to|from|for|with|in)\b/i.test(maybeName);
        const carryIsOpen = /(?:of|the|and)$/i.test(carry);
        if (carry && !startsContinuation && !carryIsOpen) {
          const carryWords = carry.split(/\s+/).length;
          const joinedLen = `${carry} ${maybeName}`.length;
          // Allow short first lines of multi-line titles ("Opening the", "Transformation of the Ravenous").
          if (!(carryWords <= 4 && joinedLen <= 72)) {
            carry = "";
          }
        }
        push(maybeName.replace(/\s*:\s*$/, ""), entry[2]);
        continue;
      }
    }

    // Wrapped list titles: open phrases, or short unfinished title lines.
    if (
      /^(?:[A-Z][A-Za-z0-9'’,\-]*(?:\s+(?:of|the|a|an|and|to|from|for|with|in|against|[A-Z][A-Za-z0-9'’,\-]*))*)$/.test(line)
      && line.length <= 42
      && (/(?:of|the|and|against)$/i.test(line) || line.split(/\s+/).length <= 4)
    ) {
      carry = carry ? `${carry} ${line}` : line;
      continue;
    }

    // Lone level on following line after carry/name
    if (/^(Gen\.?|\d{1,2})$/i.test(line) && carry) {
      push("", line);
      continue;
    }

    carry = "";
  }

  return byKey;
}

/**
 * Overlay R/D/T + notes from full write-ups onto the catalog.
 * @param {string[]} lines
 * @param {number} from
 * @param {Map<string, object>} catalog
 */
function overlayDetails(lines, from, catalog) {
  let technique = "creo";
  let form = "animal";
  let pendingTech = "";
  let titleCarry = "";
  /** @type {null | { key: string, notes: string[], awaitingRdt: boolean }} */
  let current = null;

  const flushNotes = () => {
    if (!current) return;
    const spell = catalog.get(current.key);
    if (spell) {
      const notes = cleanText(current.notes.join(" "));
      if (notes.length > 20) {
        spell.system.notes = `${notes}\n\n(AG0201 2e spell text — cast with 2e Technique + Form + Stamina.)`;
      }
    }
    current = null;
  };

  for (let i = from; i < lines.length; i += 1) {
    let line = fixOcrLine(lines[i].trim());
    if (!line) continue;
    if (/^Ars Mag/i.test(line) && line.length < 40) continue;
    if (/^Chapter\s+\d+/i.test(line)) continue;
    if (/^\d{2,3}$/.test(line)) continue;

    const techForm = line.match(TECH_FORM);
    if (techForm) {
      flushNotes();
      technique = TECH_IDS[techForm[1].toLowerCase()] ?? technique;
      form = FORM_IDS[techForm[2].toLowerCase()] ?? form;
      pendingTech = "";
      titleCarry = "";
      continue;
    }

    const formOnly = line.match(FORM_ONLY);
    if (formOnly) {
      flushNotes();
      form = FORM_IDS[formOnly[1].toLowerCase()] ?? form;
      if (pendingTech) {
        technique = TECH_IDS[pendingTech] ?? technique;
        pendingTech = "";
      }
      titleCarry = "";
      continue;
    }

    const techOnly = line.match(TECH_ONLY);
    if (techOnly) {
      pendingTech = techOnly[1].toLowerCase();
      technique = TECH_IDS[pendingTech] ?? technique;
      titleCarry = "";
      continue;
    }

    const titleMatch = line.match(DETAIL_TITLE);
    if (titleMatch) {
      flushNotes();
      let rawTitle = titleMatch[1].trim();
      if (titleCarry) {
        rawTitle = `${titleCarry} ${rawTitle}`.replace(/\s+/g, " ").trim();
      } else if (/^(of|and|to|from|for|with|in)\b/.test(rawTitle) && i > 0) {
        const prev = lines[i - 1].trim();
        if (prev && !DETAIL_TITLE.test(prev) && /^[A-Z]/.test(prev) && prev.length <= 48) {
          rawTitle = `${prev} ${rawTitle}`.replace(/\s+/g, " ").trim();
        }
      }

      const name = normalizeName(rawTitle);
      titleCarry = "";
      if (!name) continue;

      const key = conflictKey(name);
      let spell = catalog.get(key);
      if (!spell) {
        // Detail-only orphan — add if arts known.
        const { level, isGeneral } = parseLevel(titleMatch[2]);
        if (technique && form) {
          spell = {
            name,
            type: "spell",
            system: {
              level,
              technique,
              form,
              artAbbrev: artAbbrev(technique, form, isGeneral),
              isGeneral,
              range: "",
              duration: "",
              target: "",
              mastered: false,
              notes: "",
              source: SOURCE,
              journal: ""
            }
          };
          catalog.set(key, spell);
        } else {
          continue;
        }
      }

      current = { key, notes: [], awaitingRdt: true };
      continue;
    }

    // Wrapped detail titles ("Gentle Touch" / "of the Purified Body: Lv 15")
    if (
      !current
      && /^[A-Z][A-Za-z0-9'’,\-]*(?:\s+(?:of|the|a|an|and|to|from|for|with|in|[A-Z][A-Za-z0-9'’,\-]*))*$/.test(line)
      && line.length <= 48
    ) {
      const next = fixOcrLine((lines[i + 1] ?? "").trim());
      if (DETAIL_TITLE.test(next) && /^(of|and|to|from|for|with|in|[a-z])/.test(next)) {
        titleCarry = line;
        continue;
      }
      if (DETAIL_TITLE.test(next) && /(?:of|the)$/i.test(line)) {
        titleCarry = line;
        continue;
      }
    }

    if (!current) continue;

    if (current.awaitingRdt && RDT_LINE.test(line)) {
      const spell = catalog.get(current.key);
      if (spell) {
        const rdt = parseRdt(line);
        spell.system.range = rdt.range;
        spell.system.duration = rdt.duration;
        spell.system.target = rdt.target;
      }
      current.awaitingRdt = false;
      continue;
    }

    if (current.awaitingRdt) current.awaitingRdt = false;
    if (/^Lv\s*\d+\s*:/i.test(line)) continue;
    current.notes.push(line);
  }

  flushNotes();
}

const raw = fs.readFileSync(inputPath, "utf8");
const lines = raw.replace(/\r/g, "").split("\n").map((line) => line.replace(/\s+$/g, ""));

const detailStart = lines.findIndex((line) => /^Soothe Pains of the Beast:\s*Lv\s*15\s*$/i.test(line));
const listStart = lines.findIndex((line, index) => (
  index < (detailStart < 0 ? lines.length : detailStart)
  && /^Creo Animal Spells\s*$/i.test(line)
));

const catalog = parseSpellList(
  lines,
  listStart < 0 ? 0 : listStart,
  detailStart < 0 ? lines.length : detailStart
);

if (detailStart >= 0) {
  overlayDetails(lines, detailStart, catalog);
}

const spells = [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(outputPath, `${JSON.stringify(spells, null, 2)}\n`);

const withNotes = spells.filter((spell) => !/incomplete in the extract/i.test(spell.system.notes)).length;
const free = spells.find((spell) => /accursed body/i.test(spell.name));

console.log(`Wrote ${spells.length} AG0201 spells to ${outputPath}`);
console.log(`  With detailed notes: ${withNotes}`);
if (free) {
  console.log(`  ${free.name} [${free.system.artAbbrev}] ${free.system.range}, ${free.system.duration}`);
  console.log(`    ${String(free.system.notes).slice(0, 160)}…`);
}

const byForm = spells.reduce((acc, spell) => {
  acc[spell.system.form] = (acc[spell.system.form] ?? 0) + 1;
  return acc;
}, /** @type {Record<string, number>} */ ({}));
console.log("  By form:", byForm);
