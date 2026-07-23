/**
 * Merge ArM5 Chapter IX spellbook with Appendix III index into one pack.
 * Chapter 9 wins on clashes (full R/D/T + text). Index-only stubs are kept.
 * Prefer cleaner Index titles when Ch9 OCR mangled the name.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ch9Path = path.join(root, "src/compendium-data/spells-arm5-ch9.json");
const indexPath = path.join(root, "src/compendium-data/spells-arm5-index.json");
const outPath = path.join(root, "src/compendium-data/spells.json");

/**
 * @param {string} name
 * @returns {string}
 */
function conflictKey(name) {
  let n = String(name)
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
    "transformation of thethorny staff": "transformation of the thorny staff"
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
    if (/\b(illusioon|dispair|pruification|thaumaturgcical|curseof|miniscule)\b/i.test(n)) s -= 5;
    if (/^[A-Z]/.test(n)) s += 1;
    if (/, The$/.test(n) || /^The /.test(n)) s += 1;
    s -= Math.abs(n.length - 40) * 0.01;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

const ch9 = JSON.parse(fs.readFileSync(ch9Path, "utf8"));
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

/** @type {Map<string, object>} */
const byKey = new Map();
/** @type {string[]} */
const order = [];

for (const item of ch9) {
  const key = conflictKey(item.name);
  const clone = structuredClone(item);
  byKey.set(key, clone);
  order.push(key);
}

let skipped = 0;
let renamed = 0;
const added = [];

for (const item of index) {
  const key = conflictKey(item.name);
  if (byKey.has(key)) {
    skipped += 1;
    const existing = byKey.get(key);
    const better = preferName(item.name, existing.name);
    if (better !== existing.name) {
      existing.name = better;
      renamed += 1;
    }
    // Fill empty R/D/T from index only if Ch9 blank (index usually blank too).
    for (const field of ["range", "duration", "target"]) {
      if (!existing.system?.[field] && item.system?.[field]) {
        existing.system[field] = item.system[field];
      }
    }
    continue;
  }

  const clone = structuredClone(item);
  clone.system = {
    ...clone.system,
    notes: [
      clone.system?.notes,
      "Appendix III index stub — not found in Chapter IX extract; R/D/T may be incomplete."
    ].filter(Boolean).join(" ")
  };
  byKey.set(key, clone);
  order.push(key);
  added.push(item.name);
}

const merged = order.map((key) => byKey.get(key));
fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`);

console.log(`Wrote ${merged.length} spells to ${outPath}`);
console.log(`  Chapter IX base: ${ch9.length}`);
console.log(`  Index overlaps skipped (Ch9 kept): ${skipped} (renamed ${renamed} from cleaner index titles)`);
console.log(`  Index-only stubs added: ${added.length}`);
for (const name of added) console.log(`    + ${name}`);
