/**
 * Build Virtues & Flaws pack from AG0201 2e data (signed points).
 * Arm5 OGL catalog is kept as source reference but is not merged — 2e uses
 * +1…+5 / −1…−5, not Minor/Major 1/3.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const stubPath = path.join(root, "src/compendium-data/virtues-flaws-2e.json");
const outPath = path.join(root, "src/compendium-data/virtues-flaws.json");

const stubs = JSON.parse(fs.readFileSync(stubPath, "utf8"));
const items = stubs.map((item) => {
  const clone = structuredClone(item);
  clone.system = {
    ...clone.system,
    magnitude: clone.system?.magnitude ?? ""
  };
  return clone;
});

fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Wrote ${items.length} AG0201 virtues/flaws to ${outPath}`);
