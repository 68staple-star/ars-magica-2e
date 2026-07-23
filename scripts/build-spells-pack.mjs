/**
 * Merge AG0201 (2e) spells with ArM5 Chapter IX + Appendix III.
 * Priority on clashes: AG0201 > Chapter IX > Index stubs.
 * Prefer cleaner Index titles when Ch9 OCR mangled the name (Arm5-only).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatSpellDisplayName, stripSpellDisplaySuffix } from "../modules/utils/spell-folders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const agPath = path.join(root, "src/compendium-data/spells-ag0201.json");
const ch9Path = path.join(root, "src/compendium-data/spells-arm5-ch9.json");
const indexPath = path.join(root, "src/compendium-data/spells-arm5-index.json");
const outPath = path.join(root, "src/compendium-data/spells.json");

/**
 * @param {string} name
 * @returns {string}
 */
function conflictKey(name) {
  let n = String(stripSpellDisplaySuffix(name))
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[—–]/g, " ")
    .replace(/^the\s+/, "")
    .replace(/,\s*the$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /** @type {Record<string, string>} */
  const aliases = {
    "beast of miniscule proportions": "beast of minuscule proportions",
    "curseof circe": "curse of circe",
    "dispair of the quivering manacles": "despair of the quivering manacles",
    "illusioon of the shifted image": "illusion of the shifted image",
    "incantation of the putrid wine": "incantation of putrid wine",
    "opening of the animals mind": "opening the tome of the animals mind",
    "opening the tome of the animals mind": "opening the tome of the animals mind",
    "pruification of the festering wounds": "purification of the festering wounds",
    "soothe the raging flame": "soothe the raging flames",
    "thaumaturgcical transformation of plants to iron": "thaumaturgical transformation of plants to iron",
    "touch of the goose feathers": "touch of the goose feather",
    "ward against faeries of the water": "ward against faeries of the waters",
    "invocation of weariness": "incantation of weariness",
    "transformation of thethorny staff": "transformation of the thorny staff",
    "wound the weeps": "wound that weeps",
    "the wound the weeps": "wound that weeps",
    "beast to the torpid toad": "transformation of the ravenous beast to the torpid toad",
    "transformation of the ravenous beast to the torpid toad": "transformation of the ravenous beast to the torpid toad"
  };

  return aliases[n] ?? n;
}

/**
 * Prefer the tidier display name (fewer obvious OCR artifacts).
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function preferName(a, b) {
  const score = (n) => {
    let s = 0;
    if (/\b(illusioon|dispair|pruification|thaumaturgcical|curseof|miniscule|angey)\b/i.test(n)) s -= 5;
    if (/^[A-Z]/.test(n)) s += 1;
    if (/, The$/.test(n) || /^The /.test(n)) s += 1;
    s -= Math.abs(n.length - 40) * 0.01;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

/**
 * @param {object} spell
 * @returns {object}
 */
function cloneSpell(spell) {
  return structuredClone(spell);
}

const ag = JSON.parse(fs.readFileSync(agPath, "utf8"));
const ch9 = JSON.parse(fs.readFileSync(ch9Path, "utf8"));
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

/** @type {Map<string, object>} */
const byKey = new Map();
/** @type {string[]} */
const order = [];

let agCount = 0;
for (const item of ag) {
  const key = conflictKey(item.name);
  const isNew = !byKey.has(key);
  byKey.set(key, cloneSpell(item));
  if (isNew) {
    order.push(key);
    agCount += 1;
  }
}

let ch9Added = 0;
let ch9Skipped = 0;
for (const item of ch9) {
  const key = conflictKey(item.name);
  if (byKey.has(key)) {
    ch9Skipped += 1;
    continue;
  }
  const clone = cloneSpell(item);
  clone.system = {
    ...clone.system,
    notes: [
      clone.system?.notes,
      "ArM5 Chapter IX OGL — not found under this title in the AG0201 extract; use 2e casting math."
    ].filter(Boolean).join("\n\n")
  };
  byKey.set(key, clone);
  order.push(key);
  ch9Added += 1;
}

let indexSkipped = 0;
let indexRenamed = 0;
const indexAdded = [];

for (const item of index) {
  const key = conflictKey(item.name);
  if (byKey.has(key)) {
    indexSkipped += 1;
    const existing = byKey.get(key);
    // Only rename Arm5-sourced entries; keep AG0201 titles intact.
    if (!String(existing.system?.source ?? "").includes("AG0201")) {
      const better = preferName(item.name, existing.name);
      if (better !== existing.name) {
        existing.name = better;
        indexRenamed += 1;
      }
    }
    for (const field of ["range", "duration", "target"]) {
      if (!existing.system?.[field] && item.system?.[field]) {
        existing.system[field] = item.system[field];
      }
    }
    continue;
  }

  const clone = cloneSpell(item);
  clone.system = {
    ...clone.system,
    notes: [
      clone.system?.notes,
      "Appendix III index stub — not found in AG0201 or Chapter IX extracts; R/D/T may be incomplete."
    ].filter(Boolean).join(" ")
  };
  byKey.set(key, clone);
  order.push(key);
  indexAdded.push(item.name);
}

const merged = order.map((key) => {
  const spell = byKey.get(key);
  spell.name = formatSpellDisplayName(stripSpellDisplaySuffix(spell.name), spell.system ?? {});
  return spell;
});
fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`);

console.log(`Wrote ${merged.length} spells to ${outPath}`);
console.log(`  AG0201 (2e) base: ${agCount}`);
console.log(`  Chapter IX added (no AG0201 title): ${ch9Added} (skipped overlaps: ${ch9Skipped})`);
console.log(`  Index overlaps skipped: ${indexSkipped} (renamed ${indexRenamed} Arm5 titles)`);
console.log(`  Index-only stubs added: ${indexAdded.length}`);
for (const name of indexAdded) console.log(`    + ${name}`);
