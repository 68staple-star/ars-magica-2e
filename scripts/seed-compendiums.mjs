#!/usr/bin/env node
/**
 * Dev helper: validates compendium seed JSON files parse correctly.
 * Foundry seeds packs at runtime via modules/compendium/seed.js
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "compendium-data");
const files = [
  "abilities.json",
  "spells-arm5-index.json",
  "spells.json",
  "equipment-arm5-lom.json",
  "weapons.json",
  "virtues-flaws.json",
  "journals-rules.json",
  "journals-covenant.json",
  "journals-order.json",
  "journals-abilities.json"
];

for (const file of files) {
  const data = JSON.parse(readFileSync(join(root, file), "utf8"));
  console.log(`${file}: ${Array.isArray(data) ? data.length : 0} entries`);
}

console.log("All compendium seed files are valid JSON.");
