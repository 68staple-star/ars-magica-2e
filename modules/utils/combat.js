/**
 * Ars Magica 2e combat derived totals (AG0201, Ch. 3).
 */

/**
 * @param {number} totalLoad
 * @param {number} strength
 * @returns {number}
 */
export function calculateEncumbrance(totalLoad, strength) {
  return Math.max(0, (Number(totalLoad) || 0) - (Number(strength) || 0));
}

/**
 * @param {object} weapon
 * @param {object} characteristics
 * @param {number} encumbrance
 * @param {number} size
 * @returns {{ firstStrike: number, attack: number, damage: number, defense: number }}
 */
export function calculateWeaponTotals(weapon, characteristics, encumbrance, size) {
  const quickness = Number(characteristics?.quickness) || 0;
  const dexterity = Number(characteristics?.dexterity) || 0;
  const strength = Number(characteristics?.strength) || 0;
  const attackSkill = Number(weapon?.attackSkill) || 0;
  const parrySkill = Number(weapon?.parrySkill) || 0;
  const speed = Number(weapon?.speed) || 0;
  const atkB = Number(weapon?.atkB) || 0;
  const wpnDam = Number(weapon?.wpnDam) || 0;
  const parB = Number(weapon?.parB) || 0;
  const enc = Number(encumbrance) || 0;
  const actorSize = Number(size) || 0;

  return {
    firstStrike: speed + quickness + attackSkill - enc,
    attack: atkB + dexterity + attackSkill,
    damage: wpnDam + strength + attackSkill,
    defense: parB + parrySkill - actorSize
  };
}

/**
 * @param {Iterable<{ system: object }>} items
 * @param {number} [extraLoad=0]
 * @returns {number}
 */
export function calculateTotalLoad(items, extraLoad = 0) {
  let total = Number(extraLoad) || 0;

  for (const item of items) {
    if (!item?.system?.equipped) continue;
    total += Number(item.system.load) || 0;
  }

  return total;
}

/**
 * @param {object} system
 * @param {Iterable<Item>} weaponItems
 * @returns {{
 *   size: number,
 *   totalLoad: number,
 *   encumbrance: number,
 *   weapons: Array<object>
 * }}
 */
export function prepareCombatData(system, weaponItems) {
  const characteristics = system?.characteristics ?? {};
  const size = Number(system?.combat?.size) || 0;
  const extraLoad = Number(system?.combat?.extraLoad) || 0;
  const strength = Number(characteristics.strength) || 0;
  const totalLoad = calculateTotalLoad(weaponItems, extraLoad);
  const encumbrance = calculateEncumbrance(totalLoad, strength);

  const weapons = [...weaponItems].map((item) => {
    const weapon = item.system ?? {};
    const derived = weapon.equipped
      ? calculateWeaponTotals(weapon, characteristics, encumbrance, size)
      : null;

    return {
      id: item.id,
      name: item.name,
      expense: weapon.expense ?? "",
      speed: Number(weapon.speed) || 0,
      atkB: Number(weapon.atkB) || 0,
      wpnDam: Number(weapon.wpnDam) || 0,
      parB: Number(weapon.parB) || 0,
      strReq: Number(weapon.strReq) || 0,
      load: Number(weapon.load) || 0,
      attackSkill: Number(weapon.attackSkill) || 0,
      parrySkill: Number(weapon.parrySkill) || 0,
      equipped: Boolean(weapon.equipped),
      derived
    };
  });

  return { size, totalLoad, encumbrance, weapons };
}
