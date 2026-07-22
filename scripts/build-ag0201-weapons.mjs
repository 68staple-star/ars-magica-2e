/**
 * Build AG0201 weapons & armor seed JSON from transcribed pp. 58–59 charts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "src/compendium-data/weapons.json");

const SOURCE = "AG0201 Ars Magica 2nd Edition, pp. 58–59 (Melee / Missile / Armor Charts)";

/**
 * Compact Sp/Atk/Dam/Par tag for pack list visibility (Foundry only shows names).
 * @param {object} system
 * @returns {string}
 */
function weaponStatTag(system) {
  const s = (n) => {
    const v = Number(n) || 0;
    return v > 0 ? `+${v}` : String(v);
  };
  return `[${s(system.speed)}/${s(system.atkB)}/${s(system.wpnDam)}/${s(system.parB)}]`;
}

/**
 * @param {object} system
 * @returns {string}
 */
function armorStatTag(system) {
  return `[Prot ${Number(system.protection) || 0} · Load ${Number(system.load) || 0}]`;
}

/**
 * @param {string} baseName
 * @param {string} tag
 * @returns {string}
 */
function withStatTag(baseName, tag) {
  const cleaned = String(baseName).replace(/\s*\[[^\]]*]\s*$/, "").trim();
  return `${cleaned} ${tag}`;
}

function weapon(name, opts) {
  const {
    expense,
    speed,
    atkB,
    wpnDam,
    parB,
    str,
    load,
    space = "",
    ability = "",
    category = "",
    range = 0,
    isShield = false,
    notes = "",
    charging = false
  } = opts;

  const noteParts = [notes];
  if (charging) noteParts.push("WpnDam marked with • — see Charging rules.");
  if (str === "n") noteParts.push("No Str minimum (chart: n).");
  if (parB === "N/A") noteParts.push("ParB N/A.");
  if (space && space !== "N/A") noteParts.push(`Space: ${space}.`);
  if (space === "N/A") noteParts.push("Space: N/A.");

  const system = {
    expense,
    speed: Number(speed),
    atkB: Number(atkB),
    wpnDam: Number(String(wpnDam).replace("•", "")),
    parB: parB === "N/A" ? 0 : Number(parB),
    strReq: str === "n" ? 0 : Number(str),
    load: Number(load),
    attackSkill: 0,
    parrySkill: 0,
    equipped: false,
    category,
    ability,
    range: Number(range) || 0,
    availability: "",
    damageTypes: "",
    damageLevels: "",
    isShield: Boolean(isShield),
    notes: noteParts.filter(Boolean).join(" "),
    source: SOURCE,
    chartName: name
  };

  const tag = weaponStatTag(system);
  system.summary = `Sp/Atk/Dam/Par ${tag}`;

  return {
    name: withStatTag(name, tag),
    type: "weapon",
    system
  };
}

function armor(displayName, outfit, material, expense, protection, load) {
  const helmNote =
    outfit === "Hauberk Armor"
      ? "Includes half helm (−1 Perception)."
      : outfit === "Full Armor"
        ? "Includes full helm (−3 Perception)."
        : "Chest/abdomen/back only; no helm.";

  const system = {
    type: material,
    protection: Number(protection),
    load: Number(load),
    equipped: false,
    component: "body",
    outfit,
    material,
    cost: expense,
    notes: `${outfit}. Expense: ${expense}. ${helmNote}`,
    source: SOURCE,
    chartName: displayName
  };
  const tag = armorStatTag(system);
  system.summary = tag;

  return {
    name: withStatTag(displayName, tag),
    type: "armor",
    system
  };
}

const melee = [
  weapon("Dagger (1h)", { expense: "inex", speed: 1, atkB: 4, wpnDam: 2, parB: 1, str: "n", load: 0, space: "0'", ability: "Brawl", category: "melee" }),
  weapon("Shortsword (1h)", { expense: "stan", speed: 2, atkB: 4, wpnDam: 4, parB: 2, str: -2, load: 0.5, space: "0'", ability: "Single", category: "melee" }),
  weapon("Broadsword (1h)", { expense: "expn", speed: 3, atkB: 4, wpnDam: 6, parB: 3, str: 0, load: 0.5, space: "1'", ability: "Single", category: "melee" }),
  weapon("Bastard Sword (1h)", { expense: "expn", speed: 4, atkB: 3, wpnDam: 8, parB: 3, str: 2, load: 0.5, space: "2'", ability: "Single", category: "melee" }),
  weapon("Bastard Sword (2h)", { expense: "expn", speed: 4, atkB: 3, wpnDam: 10, parB: 4, str: 0, load: 0.5, space: "2'", ability: "Great", category: "melee" }),
  weapon("Greatsword (2h)", { expense: "expn", speed: 5, atkB: 3, wpnDam: 11, parB: 5, str: 1, load: 1, space: "3'", ability: "Great", category: "melee" }),
  weapon("Short Spear (1h)", { expense: "inex", speed: 5, atkB: 2, wpnDam: 3, parB: 1, str: -1, load: 0, space: "1'", ability: "Single", category: "melee" }),
  weapon("Short Spear (2h)", { expense: "inex", speed: 6, atkB: 3, wpnDam: 5, parB: 2, str: "n", load: 0, space: "0'", ability: "Great", category: "melee" }),
  weapon("Long Spear (2h)", { expense: "inex", speed: 8, atkB: 2, wpnDam: 6, parB: 3, str: -2, load: 0.5, space: "0'", ability: "Great", category: "melee" }),
  weapon("Lance (mtd) (1h)", { expense: "stan", speed: 7, atkB: 2, wpnDam: 8, parB: 1, str: 0, load: 1, space: "1'", ability: "Single", category: "melee", charging: true }),
  weapon("Hand Axe (1h)", { expense: "inex", speed: 2, atkB: 2, wpnDam: 7, parB: 1, str: 0, load: 0.5, space: "1'", ability: "Single", category: "melee" }),
  weapon("Battle Axe (2h)", { expense: "stan", speed: 4, atkB: 2, wpnDam: 12, parB: 2, str: 0, load: 1, space: "3'", ability: "Great", category: "melee" }),
  weapon("Pole Axe (2h)", { expense: "stan", speed: 5, atkB: 1, wpnDam: 13, parB: 3, str: 1, load: 1.5, space: "4'", ability: "Great", category: "melee" }),
  weapon("Halberd (2h)", { expense: "expn", speed: 5, atkB: 1, wpnDam: 15, parB: 3, str: 1, load: 2, space: "4'", ability: "Great", category: "melee" }),
  weapon("Club (1h)", { expense: "inex", speed: 2, atkB: 3, wpnDam: 2, parB: 1, str: -2, load: 0, space: "2'", ability: "Single", category: "melee" }),
  weapon("Club (2h)", { expense: "inex", speed: 2, atkB: 3, wpnDam: 3, parB: 2, str: "n", load: 0, space: "2'", ability: "Great", category: "melee" }),
  weapon("Quarterstaff (2h)", { expense: "inex", speed: 5, atkB: 2, wpnDam: 4, parB: 6, str: -3, load: 0, space: "2'", ability: "Great", category: "melee" }),
  weapon("Mace (1h)", { expense: "stan", speed: 2, atkB: 3, wpnDam: 5, parB: 1, str: 0, load: 0, space: "2'", ability: "Single", category: "melee" }),
  weapon("Mace (2h)", { expense: "stan", speed: 2, atkB: 3, wpnDam: 7, parB: 2, str: -2, load: 0, space: "2'", ability: "Great", category: "melee" }),
  weapon("War Maul (2h)", { expense: "stan", speed: 3, atkB: 2, wpnDam: 10, parB: 2, str: 1, load: 1.5, space: "2'", ability: "Great", category: "melee" }),
  weapon("Morning Star (1h)", { expense: "stan", speed: 3, atkB: 2, wpnDam: 8, parB: 1, str: 2, load: 0.5, space: "3'", ability: "Single", category: "melee" }),
  weapon("Morning Star (2h)", { expense: "stan", speed: 3, atkB: 2, wpnDam: 10, parB: 1, str: 0, load: 0.5, space: "3'", ability: "Great", category: "melee" }),
  weapon("Military Flail (2h)", { expense: "expn", speed: 4, atkB: 3, wpnDam: 10, parB: 2, str: -1, load: 1, space: "4'", ability: "Great", category: "melee" }),
  weapon("Throwing Knife", { expense: "inex", speed: -2, atkB: -1, wpnDam: 0, parB: "N/A", str: "n", load: 0, space: "N/A", ability: "Thrown", category: "thrown" }),
  weapon("Javelin", { expense: "stan", speed: -5, atkB: -1, wpnDam: 5, parB: "N/A", str: -2, load: 0, space: "N/A", ability: "Thrown", category: "thrown" }),
  weapon("Throwing Axe", { expense: "stan", speed: -4, atkB: -2, wpnDam: 6, parB: "N/A", str: -1, load: 0.5, space: "N/A", ability: "Thrown", category: "thrown" }),
  weapon("Target Shield", { expense: "inex", speed: 1, atkB: 3, wpnDam: -2, parB: 2, str: "n", load: 0, space: "1'", ability: "", category: "shield", isShield: true }),
  weapon("Round Shield", { expense: "inex", speed: 2, atkB: 2, wpnDam: -1, parB: 3, str: -2, load: 0.5, space: "1'", ability: "", category: "shield", isShield: true }),
  weapon("Knight Shield", { expense: "stan", speed: 2, atkB: 1, wpnDam: 0, parB: 4, str: 0, load: 1, space: "0'", ability: "", category: "shield", isShield: true }),
  weapon("Kite Shield", { expense: "expn", speed: 1, atkB: 1, wpnDam: 0, parB: 5, str: 1, load: 1.5, space: "1'", ability: "", category: "shield", isShield: true }),
  weapon("Tower Shield", { expense: "expn", speed: 0, atkB: 0, wpnDam: -1, parB: 6, str: 2, load: 2, space: "1'", ability: "", category: "shield", isShield: true })
];

const missile = [
  ["Sling", "inex", 2, 0, 4, "n", 0, 100, "Thrown"],
  ["Self Bow", "inex", 3, 0, 8, 0, 0, 120, "Bow"],
  ["Long Bow", "stan", 6, 0, 14, 2, 0.5, 250, "Bow"],
  ["Composite Bow", "expn", 4, 1, 9, -1, 0.5, 225, "Bow"],
  ["Light Crossbow", "expn", -8, 1, 10, 0, 0.5, 200, "Crossbow"],
  ["Heavy Crossbow", "expn", -15, 1, 15, -3, 1, 300, "Crossbow"],
  ["Arbalist", "expn", -23, 1, 19, 0, 1.5, 400, "Crossbow"]
].map(([name, expense, rate, atkB, wpnDam, str, load, range, ability]) =>
  weapon(name, {
    expense,
    speed: rate,
    atkB,
    wpnDam,
    parB: "N/A",
    str,
    load,
    space: "N/A",
    ability,
    category: "missile",
    range,
    notes: `Rate ${rate >= 0 ? `+${rate}` : rate} (stored as Speed for First Strike/Rate totals). Range ${range} paces.`
  })
);

const armors = [
  ["Cuirass Armor", "Leather/Fur/Quilted", "inex", 1, 0.5],
  ["Cuirass Armor", "Heavy/Hard Leather", "inex", 2, 1],
  ["Cuirass Armor", "Ring Mail", "stan", 4, 1.5],
  ["Cuirass Armor", "Scale Mail", "stan", 5, 2],
  ["Cuirass Armor", "Chain Mail", "expn", 8, 3.5],
  ["Cuirass Armor", "Plate", "expn", 10, 4],
  ["Hauberk Armor", "Leather/Fur/Quilted", "inex", 3, 1.5],
  ["Hauberk Armor", "Heavy/Hard Leather", "inex", 5, 2.5],
  ["Hauberk Armor", "Ring Mail", "stan", 7, 3],
  ["Hauberk Armor", "Scale Mail", "stan", 9, 4.5],
  ["Hauberk Armor", "Chain Mail", "expn", 12, 5],
  ["Hauberk Armor", "Plate", "expn", 15, 6],
  ["Full Armor", "Leather/Fur/Quilted", "inex", 4, 2],
  ["Full Armor", "Heavy/Hard Leather", "stan", 6, 2.5],
  ["Full Armor", "Ring Mail", "stan", 8, 4],
  ["Full Armor", "Chain Mail", "expn", 14, 6],
  ["Full Armor", "Plate", "expn", 17, 7]
].map(([outfit, material, expense, protection, load]) =>
  armor(`${outfit} — ${material}`, outfit, material, expense, protection, load)
);

const ag0201Items = [...melee, ...missile, ...armors];

/**
 * Canonical conflict key for weapons — AG0201 wins when LoM maps to the same key.
 * @param {string} name
 * @returns {string}
 */
function weaponConflictKey(name) {
  let n = String(name)
    .toLowerCase()
    .replace(/\s*\[[^\]]*]\s*/g, " ")
    .replace(/^lom\s*[—–-]\s*/i, "")
    .replace(/[—–]/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // "Sword, Short" / "Bow, Long" style → "short sword" / "long bow"
  const swapped = n.match(/^([a-z]+(?:\s+[a-z]+)?)\s+([a-z]+)$/);
  if (swapped && ["sword", "bow", "axe", "spear", "knife", "shield", "mace"].includes(swapped[1])) {
    n = `${swapped[2]} ${swapped[1]}`;
  }

  /** @type {Record<string, string>} */
  const aliases = {
    dagger: "dagger",
    "knife melee": "dagger",
    shortsword: "shortsword",
    "short sword": "shortsword",
    broadsword: "broadsword",
    "long sword": "broadsword",
    "bastard sword": "bastard sword",
    greatsword: "greatsword",
    "great sword": "greatsword",
    "short spear": "short spear",
    spear: "short spear",
    "long spear": "long spear",
    "spear long": "long spear",
    lance: "lance",
    "hand axe": "hand axe",
    axe: "hand axe",
    hatchet: "hand axe",
    "battle axe": "battle axe",
    "pole axe": "pole axe",
    halberd: "halberd",
    club: "club",
    cudgel: "club",
    bludgeon: "club",
    quarterstaff: "quarterstaff",
    staff: "quarterstaff",
    mace: "mace",
    "war maul": "war maul",
    warhammer: "war maul",
    "morning star": "morning star",
    "military flail": "military flail",
    flail: "military flail",
    "throwing knife": "throwing knife",
    "knife missile": "throwing knife",
    javelin: "javelin",
    "throwing axe": "throwing axe",
    "axe throwing": "throwing axe",
    "target shield": "target shield",
    "shield buckler": "target shield",
    buckler: "target shield",
    "round shield": "round shield",
    "shield round": "round shield",
    "knight shield": "knight shield",
    "shield heater": "knight shield",
    heater: "knight shield",
    "kite shield": "kite shield",
    "tower shield": "tower shield",
    sling: "sling",
    "self bow": "self bow",
    bow: "self bow",
    "long bow": "long bow",
    "bow long": "long bow",
    "composite bow": "composite bow",
    "bow composite": "composite bow",
    "light crossbow": "light crossbow",
    crossbow: "light crossbow",
    "heavy crossbow": "heavy crossbow",
    "arbalest heavy": "heavy crossbow",
    arbalist: "arbalist",
    arbalest: "arbalist"
  };

  return aliases[n] ?? n;
}

/**
 * LoM body outfits that overlap AG0201 Armor Chart (Cuirass / Hauberk / Full).
 * Keep LoM-only pieces (greaves, jambes, gambeson, etc.).
 * @param {string} name
 * @returns {boolean}
 */
function isLoMArmorChartConflict(name) {
  const n = String(name).toLowerCase();
  if (/\b(greaves|jambes|gambeson|coat of plates)\b/.test(n)) return false;
  return /—\s*(cuirass|jerkin|haubergeon|hauberk|full)\b/.test(n)
    || /\b(cuirass|haubergeon|hauberk|full)\b/.test(n) && /—/.test(n);
}

function mergeLoMReference(agItems) {
  const lomPath = path.join(root, "src/compendium-data/equipment-arm5-lom.json");
  const lom = JSON.parse(fs.readFileSync(lomPath, "utf8"));

  const agWeaponKeys = new Set(
    agItems.filter((i) => i.type === "weapon").map((i) => weaponConflictKey(i.name))
  );

  const kept = [];
  const skipped = [];

  for (const item of lom) {
    if (item.type === "weapon") {
      const key = weaponConflictKey(item.name);
      if (agWeaponKeys.has(key)) {
        skipped.push(`weapon ${item.name} → AG0201 key "${key}"`);
        continue;
      }
      const clone = structuredClone(item);
      const tag = weaponStatTag(clone.system ?? {});
      clone.system = {
        ...clone.system,
        chartName: item.name,
        summary: `Sp/Atk/Dam/Par ${tag}`,
        notes: [
          clone.system?.notes,
          "LoM/ArM5-scale reference. Prefer AG0201 chart items when both exist. Tag order: Sp/Atk/Dam/Par."
        ].filter(Boolean).join(" ")
      };
      clone.name = withStatTag(`LoM — ${item.name}`, tag);
      kept.push(clone);
      continue;
    }

    if (item.type === "armor") {
      if (isLoMArmorChartConflict(item.name)) {
        skipped.push(`armor ${item.name} (overlaps AG0201 Armor Chart outfits)`);
        continue;
      }
      const clone = structuredClone(item);
      const tag = armorStatTag(clone.system ?? {});
      clone.system = {
        ...clone.system,
        chartName: item.name,
        summary: tag,
        notes: [
          clone.system?.notes,
          "LoM component reference. Prefer AG0201 Armor Chart outfits for 2e Soak."
        ].filter(Boolean).join(" ")
      };
      clone.name = withStatTag(`LoM — ${item.name}`, tag);
      kept.push(clone);
      continue;
    }

    kept.push(item);
  }

  return { kept, skipped };
}

const { kept: lomExtras, skipped } = mergeLoMReference(ag0201Items);
const items = [...ag0201Items, ...lomExtras];
fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Wrote ${items.length} items to ${outPath}`);
console.log(`  AG0201: ${ag0201Items.length} (melee/thrown/shield ${melee.length}, missile ${missile.length}, armor ${armors.length})`);
console.log(`  LoM extras kept: ${lomExtras.length}; skipped conflicts: ${skipped.length}`);
for (const line of skipped) console.log(`    skip: ${line}`);
