/**
 * Human-readable combat summaries for weapons and armor (AG0201 / LoM).
 */

/**
 * @param {number | string | null | undefined} value
 * @param {string} [prefix="+"]
 * @returns {string}
 */
function signed(value, prefix = "+") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n > 0) return `${prefix}${n}`;
  return String(n);
}

/**
 * @param {object} system
 * @returns {string}
 */
export function formatWeaponSummary(system = {}) {
  const parts = [
    `Sp ${signed(system.speed)}`,
    `Atk ${signed(system.atkB)}`,
    `Dam ${signed(system.wpnDam)}`,
    `Par ${signed(system.parB)}`,
    `Str ${system.strReq === 0 && /no Str minimum/i.test(String(system.notes ?? "")) ? "n" : signed(system.strReq, "")}`,
    `Load ${Number(system.load) || 0}`
  ];

  if (Number(system.range) > 0) parts.push(`Rng ${system.range}`);
  if (system.ability) parts.push(String(system.ability));
  if (system.category) parts.push(String(system.category));

  return parts.join(" · ");
}

/**
 * @param {object} system
 * @returns {string}
 */
export function formatArmorSummary(system = {}) {
  const parts = [
    `Prot ${Number(system.protection) || 0}`,
    `Load ${Number(system.load) || 0}`
  ];
  if (system.cost || system.expense) parts.push(String(system.cost || system.expense));
  if (system.outfit) parts.push(String(system.outfit));
  return parts.join(" · ");
}

/**
 * @param {object} indexEntry
 * @returns {string}
 */
export function formatPackEntrySummary(indexEntry) {
  const system = indexEntry?.system ?? {};
  if (system.summary) return String(system.summary);
  const type = indexEntry?.type;
  if (type === "weapon") return formatWeaponSummary(system);
  if (type === "armor") return formatArmorSummary(system);
  return "";
}
