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
 * @param {number} encumbrance
 * @returns {number}
 */
export function calculateDodge(system, encumbrance) {
  const dodgeSkill = Number(system?.abilities?.talents?.dodge?.value) || 0;
  const quickness = Number(system?.characteristics?.quickness) || 0;
  const size = Number(system?.combat?.size) || 0;
  const enc = Number(encumbrance) || 0;

  return dodgeSkill + quickness - enc - size;
}

/**
 * @param {Iterable<{ system: object }>} armorItems
 * @returns {number}
 */
export function calculateSoak(armorItems) {
  let soak = 0;

  for (const item of armorItems) {
    if (!item?.system?.equipped) continue;
    soak += Number(item.system.protection) || 0;
  }

  return soak;
}

/**
 * @param {object} system
 * @param {Iterable<Item>} weaponItems
 * @param {Iterable<Item>} [armorItems=[]]
 * @param {Iterable<Item>} [equipmentItems=[]]
 * @returns {{
 *   size: number,
 *   totalLoad: number,
 *   encumbrance: number,
 *   dodge: number,
 *   soak: number,
 *   weapons: Array<object>,
 *   armor: Array<object>,
 *   equipment: Array<object>
 * }}
 */
export function prepareCombatData(system, weaponItems, armorItems = [], equipmentItems = []) {
  const characteristics = system?.characteristics ?? {};
  const size = Number(system?.combat?.size) || 0;
  const extraLoad = Number(system?.combat?.extraLoad) || 0;
  const strength = Number(characteristics.strength) || 0;
  const allLoadItems = [...weaponItems, ...armorItems, ...equipmentItems];
  const totalLoad = calculateTotalLoad(allLoadItems, extraLoad);
  const encumbrance = calculateEncumbrance(totalLoad, strength);
  const dodge = calculateDodge(system, encumbrance);
  const soak = calculateSoak(armorItems);

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

  const armor = [...armorItems].map((item) => ({
    id: item.id,
    name: item.name,
    type: item.system?.type ?? "",
    protection: Number(item.system?.protection) || 0,
    load: Number(item.system?.load) || 0,
    equipped: Boolean(item.system?.equipped)
  }));

  const equipment = [...equipmentItems].map((item) => ({
    id: item.id,
    name: item.name,
    load: Number(item.system?.load) || 0,
    equipped: Boolean(item.system?.equipped),
    description: item.system?.description ?? ""
  }));

  return { size, totalLoad, encumbrance, dodge, soak, weapons, armor, equipment };
}
