#!/usr/bin/env node
/**
 * Parse Lords of Men Supplement: Arms & Armor markdown into Foundry Item seed data.
 * Source: Project Redcap OGL — https://www.redcap.org/page/Lords_of_Men_Supplement:_Arms_%26_Armor
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2]
  ?? join(root, "..", "src", "compendium-data", "sources", "lords-of-men-arms-armor.md");
const outputPath = process.argv[3]
  ?? join(root, "..", "src", "compendium-data", "equipment-arm5-lom.json");

const SOURCE = "Lords of Men: Arms & Armor (CC BY-SA 4.0)";

const COST_MAP = {
  inexp: "inex",
  inexpensive: "inex",
  std: "stan",
  standard: "stan",
  exp: "expe",
  expensive: "expe"
};

const BODY_OUTFITS = [
  { key: "cuirass", label: "Cuirass/Jerkin" },
  { key: "haubergeon", label: "Haubergeon" },
  { key: "hauberk", label: "Hauberk" },
  { key: "full", label: "Full" }
];

/**
 * @param {string} raw
 */
function normalizeDash(raw) {
  if (raw == null) return "";
  return String(raw).replace(/\u2013/g, "-").trim();
}

/**
 * @param {string} raw
 * @returns {number|null}
 */
function parseStat(raw) {
  const value = normalizeDash(raw).replace(/\*/g, "");
  if (!value || /^n\/a$/i.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * @param {string} raw
 */
function parseCost(raw) {
  const key = normalizeDash(raw).replace(/\.$/, "").toLowerCase();
  return COST_MAP[key] ?? "stan";
}

/**
 * @param {string} raw
 */
function cleanName(raw) {
  return raw
    .replace(/\\\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

const WEAPON_ABILITIES = new Set(["Brawl", "Single", "Great", "Thrown", "Bow", "Crossbow"]);

/**
 * @param {string} line
 */
function parseTableRow(line) {
  const trimmed = line.trim().replace(/^>\s*/, "");
  if (!trimmed.startsWith("|")) return null;
  if (/^\|\s*-+\s*\|/.test(trimmed)) return null;
  if (/^\\/.test(trimmed)) return null;

  const cells = trimmed
    .slice(1, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());

  if (cells.length < 2 || /^item$/i.test(cells[0]) || /^armor$/i.test(cells[0])) return null;
  return cells;
}

/**
 * @param {object} fields
 */
function buildWeaponItem(fields) {
  const name = cleanName(fields.name);
  const isShield = /^shield\b/i.test(name);
  const atk = parseStat(fields.atk);
  const dfn = parseStat(fields.dfn);
  const dam = parseStat(fields.dam);
  const str = parseStat(fields.str);
  const load = parseStat(fields.load);
  const init = parseStat(fields.init);
  const range = parseStat(fields.range) ?? 0;

  const notes = [fields.notes, fields.category === "missile" && range ? `Range increment: ${range} paces.` : ""]
    .filter(Boolean)
    .join(" ");

  return {
    name,
    type: "weapon",
    system: {
      expense: parseCost(fields.cost),
      speed: init ?? 0,
      atkB: isShield ? 0 : (atk ?? 0),
      wpnDam: isShield ? 0 : (dam ?? 0),
      parB: dfn ?? 0,
      strReq: str ?? 0,
      load: load ?? 0,
      attackSkill: 0,
      parrySkill: 0,
      equipped: false,
      category: fields.category,
      ability: fields.ability ?? "",
      range,
      availability: fields.availability ?? "",
      damageTypes: fields.damageTypes ?? "",
      damageLevels: fields.damageLevels ?? "",
      isShield,
      notes,
      source: SOURCE
    }
  };
}

/**
 * @param {string} markdown
 */
function parseMeleeWeapons(markdown) {
  const items = [];
  const section = markdown.match(/> ## Melee Weapon Table[\s\S]*?(?=>\s*## Missile Weapon Table)/);
  if (!section) return items;

  for (const line of section[0].split(/\r?\n/)) {
    const cells = parseTableRow(line);
    if (!cells || cells.length < 12) continue;
    if (!WEAPON_ABILITIES.has(cells[1])) continue;

    items.push(buildWeaponItem({
      name: cells[0],
      ability: cells[1],
      init: cells[2],
      atk: cells[3],
      dfn: cells[4],
      dam: cells[5],
      str: cells[6],
      load: cells[7],
      cost: cells[8],
      availability: cells[9],
      damageTypes: cells[10],
      damageLevels: cells[11],
      notes: cells[12] ?? "",
      category: "melee"
    }));
  }

  return items;
}

/**
 * @param {string} markdown
 */
function parseMissileWeapons(markdown) {
  const items = [];
  const section = markdown.match(/> ## Missile Weapon Table[\s\S]*?(?=### Option: The Clash of Weapons)/);
  if (!section) return items;

  for (const line of section[0].split(/\r?\n/)) {
    const cells = parseTableRow(line);
    if (!cells || cells.length < 13) continue;
    if (!WEAPON_ABILITIES.has(cells[1])) continue;

    items.push(buildWeaponItem({
      name: cells[0],
      ability: cells[1],
      init: cells[2],
      atk: cells[3],
      dfn: cells[4],
      dam: cells[5],
      range: cells[6],
      str: cells[7],
      load: cells[8],
      cost: cells[9],
      availability: cells[10],
      damageTypes: cells[11],
      damageLevels: cells[12],
      notes: cells[13] ?? "",
      category: "missile"
    }));
  }

  return items;
}

/**
 * @param {string} protRaw
 * @param {string} loadRaw
 */
function parseArmorStats(protRaw, loadRaw) {
  const prot = parseStat(protRaw.replace(/^\+/, ""));
  const load = parseStat(loadRaw.replace(/^\+/, ""));
  if (prot === null || load === null) return null;
  return { protection: prot, load };
}

/**
 * @param {string} markdown
 */
function parseBodyArmor(markdown) {
  const items = [];
  const section = markdown.match(/#### Body Armors[\s\S]*?(?=#### Surcoats and Greaves)/);
  if (!section) return items;

  for (const line of section[0].split(/\r?\n/)) {
    const cells = parseTableRow(line);
    if (!cells || cells.length < 9) continue;

    const material = cells[0];
    if (/^armor$/i.test(material)) continue;

    for (let index = 0; index < BODY_OUTFITS.length; index += 1) {
      const outfit = BODY_OUTFITS[index];
      const protCell = cells[1 + index * 2];
      const loadCell = cells[2 + index * 2];
      const stats = parseArmorStats(protCell, loadCell);
      if (!stats) continue;

      items.push({
        name: `${material} — ${outfit.label}`,
        type: "armor",
        system: {
          type: material,
          protection: stats.protection,
          load: stats.load,
          equipped: false,
          component: "body",
          outfit: outfit.label,
          material,
          cost: "",
          notes: outfit.key === "full"
            ? "Greaves included in full armor; do not add greaves again."
            : "",
          source: SOURCE
        }
      });
    }
  }

  return items;
}

/**
 * @param {string} markdown
 */
function parseSurcoats(markdown) {
  const items = [];
  const section = markdown.match(/#### Surcoats and Greaves[\s\S]*?(?=#### Helmets)/);
  if (!section) return items;

  for (const line of section[0].split(/\r?\n/)) {
    const cells = parseTableRow(line);
    if (!cells || cells.length < 4) continue;
    if (/^surcoat/i.test(cells[0])) continue;

    const name = cleanName(cells[0]);
    const protection = parseStat(cells[1].replace(/^\+/, ""));
    const load = parseStat(cells[2].replace(/^\+/, ""));
    if (protection === null || load === null) continue;

    const note = /greaves|jambes/i.test(name)
      ? "Already included in full armor listings; do not add again when wearing full armor."
      : "";

    items.push({
      name,
      type: "armor",
      system: {
        type: name,
        protection,
        load,
        equipped: false,
        component: "surcoat",
        outfit: "",
        material: "",
        cost: parseCost(cells[3]),
        notes: note,
        source: SOURCE
      }
    });
  }

  return items;
}

/**
 * @param {object[]} weapons
 */
function resolveWeaponNameCollisions(weapons) {
  const counts = new Map();

  for (const weapon of weapons) {
    counts.set(weapon.name, (counts.get(weapon.name) ?? 0) + 1);
  }

  return weapons.map((weapon) => {
    if ((counts.get(weapon.name) ?? 0) <= 1) return weapon;

    const suffix = weapon.system.category === "missile" ? " (Missile)" : " (Melee)";
    return {
      ...weapon,
      name: `${weapon.name}${suffix}`
    };
  });
}

const markdown = readFileSync(inputPath, "utf8");
const weapons = resolveWeaponNameCollisions([
  ...parseMeleeWeapons(markdown),
  ...parseMissileWeapons(markdown)
]);
const armor = [
  ...parseBodyArmor(markdown),
  ...parseSurcoats(markdown)
];

const items = [...weapons, ...armor].sort((left, right) => {
  if (left.type !== right.type) return left.type.localeCompare(right.type);
  return left.name.localeCompare(right.name);
});

writeFileSync(outputPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");

console.log(`Parsed ${weapons.length} weapons and ${armor.length} armor pieces -> ${outputPath}`);
console.log(`  Melee: ${weapons.filter((entry) => entry.system.category === "melee").length}`);
console.log(`  Missile: ${weapons.filter((entry) => entry.system.category === "missile").length}`);
console.log(`  Body armor: ${armor.filter((entry) => entry.system.component === "body").length}`);
console.log(`  Surcoats/greaves: ${armor.filter((entry) => entry.system.component === "surcoat").length}`);
