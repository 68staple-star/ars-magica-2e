/**
 * Merge AG0201/2e stub virtues-flaws with Arm5 OGL catalog.
 * On name clashes, the 2e entry wins (description, points, grants, etc.).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const stubPath = path.join(root, "src/compendium-data/virtues-flaws-2e.json");
const arm5Path = path.join(root, "src/compendium-data/virtues-flaws-arm5.json");
const outPath = path.join(root, "src/compendium-data/virtues-flaws.json");

/**
 * Exact-title conflict key (keeps parentheticals so Poor ≠ Poor (Characteristic)).
 * @param {string} name
 * @returns {string}
 */
function conflictKey(name) {
  let n = String(name)
    .toLowerCase()
    .replace(/[—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /** @type {Record<string, string>} */
  const aliases = {
    "affinity with art": "affinity with art",
    "affinity with (art)": "affinity with art"
  };

  return aliases[n] ?? n;
}

const stubs = JSON.parse(fs.readFileSync(stubPath, "utf8"));
const arm5 = JSON.parse(fs.readFileSync(arm5Path, "utf8"));

/** Prefer 2e stubs first; track which conflict keys they own. */
const byKey = new Map();
const order = [];

for (const item of stubs) {
  const key = conflictKey(item.name);
  const clone = structuredClone(item);
  const source = clone.system?.source || "AG0201 / Core";
  clone.system = {
    ...clone.system,
    source: source === "Core" || source === "Covenants" || source === "Order of Hermes"
      ? `${source} (2e)`
      : source,
    magnitude: clone.system?.magnitude ?? ""
  };
  byKey.set(key, clone);
  order.push(key);
}

const skipped = [];
const added = [];

for (const item of arm5) {
  const key = conflictKey(item.name);
  if (byKey.has(key)) {
    skipped.push(`${item.name} → kept 2e "${byKey.get(key).name}"`);
    continue;
  }
  const clone = structuredClone(item);
  byKey.set(key, clone);
  order.push(key);
  added.push(item.name);
}

const merged = order.map((key) => byKey.get(key));
fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`);

console.log(`Wrote ${merged.length} entries to ${outPath}`);
console.log(`  2e stubs kept: ${stubs.length}`);
console.log(`  Arm5 unique added: ${added.length}`);
console.log(`  Arm5 skipped (2e wins): ${skipped.length}`);
for (const line of skipped) console.log(`    skip: ${line}`);
