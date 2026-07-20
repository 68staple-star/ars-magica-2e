/**
 * Ars Magica 2e combat derived totals (AG0201, Ch. 3).
 */

/** LoM / ArM5 ability shorthand → ability item key */
const WEAPON_ABILITY_ALIASES = Object.freeze({
  brawl: "brawl",
  single: "single-weapon",
  "single weapon": "single-weapon",
  "single-weapon": "single-weapon",
  great: "great-weapon",
  "great weapon": "great-weapon",
  "great-weapon": "great-weapon",
  bow: "bow",
  thrown: "thrown-weapon",
  "thrown weapon": "thrown-weapon",
  "thrown-weapon": "thrown-weapon",
  crossbow: "crossbow"
});

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeWeaponAbilityKey(raw) {
  const cleaned = String(raw ?? "").trim().toLowerCase();
  if (!cleaned) return "";
  return WEAPON_ABILITY_ALIASES[cleaned] ?? cleaned.replace(/\s+/g, "-");
}

/**
 * Resolve a weapon's linked ability score from the actor's ability Items.
 * Falls back to stored attackSkill / parrySkill when no ability is linked or found.
 *
 * @param {Actor | null} actor
 * @param {object} weapon
 * @returns {{ attackSkill: number, parrySkill: number, abilityKey: string, abilityLabel: string }}
 */
export function resolveWeaponSkills(actor, weapon) {
  const abilityKey = normalizeWeaponAbilityKey(weapon?.ability);
  const storedAttack = Number(weapon?.attackSkill) || 0;
  const storedParry = Number(weapon?.parrySkill) || 0;

  if (!abilityKey || !actor) {
    return {
      attackSkill: storedAttack,
      parrySkill: storedParry,
      abilityKey,
      abilityLabel: ""
    };
  }

  const abilityItem = actor.items.find(
    (item) => item.type === "ability" && (
      item.system?.key === abilityKey
      || normalizeWeaponAbilityKey(item.name) === abilityKey
      || normalizeWeaponAbilityKey(item.system?.key) === abilityKey
    )
  );

  if (!abilityItem) {
    return {
      attackSkill: storedAttack,
      parrySkill: storedParry,
      abilityKey,
      abilityLabel: abilityKey
    };
  }

  const score = Number(abilityItem.system?.value) || 0;
  return {
    attackSkill: score,
    parrySkill: score,
    abilityKey,
    abilityLabel: abilityItem.name ?? abilityKey
  };
}

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
 * @param {{ attackSkill?: number, parrySkill?: number }} [skills]
 * @returns {{ firstStrike: number, attack: number, damage: number, defense: number }}
 */
export function calculateWeaponTotals(weapon, characteristics, encumbrance, size, skills = null) {
  const quickness = Number(characteristics?.quickness) || 0;
  const dexterity = Number(characteristics?.dexterity) || 0;
  const strength = Number(characteristics?.strength) || 0;
  const attackSkill = Number(skills?.attackSkill ?? weapon?.attackSkill) || 0;
  const parrySkill = Number(skills?.parrySkill ?? weapon?.parrySkill) || 0;
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
 * @param {Actor} [actor]
 * @returns {number}
 */
export function calculateDodge(system, encumbrance, actor = null) {
  let dodgeSkill = 0;

  if (actor) {
    const dodgeItem = actor.items.find((item) => item.type === "ability" && item.system?.key === "dodge");
    dodgeSkill = Number(dodgeItem?.system?.value) || 0;
  }

  if (!dodgeSkill) {
    dodgeSkill = Number(system?.abilities?.talents?.dodge?.value) || 0;
  }

  const quickness = Number(system?.characteristics?.quickness) || 0;
  const size = Number(system?.combat?.size) || 0;
  const enc = Number(encumbrance) || 0;

  return dodgeSkill + quickness - enc - size;
}

/**
 * Soak = Stamina + equipped armor Protection (2e combat).
 *
 * @param {object} characteristics
 * @param {Iterable<{ system: object }>} armorItems
 * @returns {{ soak: number, stamina: number, protection: number }}
 */
export function calculateSoak(characteristics, armorItems) {
  const stamina = Number(characteristics?.stamina) || 0;
  let protection = 0;

  for (const item of armorItems) {
    if (!item?.system?.equipped) continue;
    protection += Number(item.system.protection) || 0;
  }

  return {
    soak: stamina + protection,
    stamina,
    protection
  };
}

/**
 * @param {object} system
 * @param {Iterable<Item>} weaponItems
 * @param {Iterable<Item>} [armorItems=[]]
 * @param {Iterable<Item>} [equipmentItems=[]]
 * @param {Actor} [actor=null]
 * @returns {{
 *   size: number,
 *   totalLoad: number,
 *   encumbrance: number,
 *   dodge: number,
 *   soak: number,
 *   soakStamina: number,
 *   soakProtection: number,
 *   weapons: Array<object>,
 *   armor: Array<object>,
 *   equipment: Array<object>
 * }}
 */
export function prepareCombatData(system, weaponItems, armorItems = [], equipmentItems = [], actor = null) {
  const characteristics = system?.characteristics ?? {};
  const size = Number(system?.combat?.size) || 0;
  const extraLoad = Number(system?.combat?.extraLoad) || 0;
  const strength = Number(characteristics.strength) || 0;
  const allLoadItems = [...weaponItems, ...armorItems, ...equipmentItems];
  const totalLoad = calculateTotalLoad(allLoadItems, extraLoad);
  const encumbrance = calculateEncumbrance(totalLoad, strength);
  const dodge = calculateDodge(system, encumbrance, actor);
  const soakParts = calculateSoak(characteristics, armorItems);

  const weapons = [...weaponItems].map((item) => {
    const weapon = item.system ?? {};
    const skills = resolveWeaponSkills(actor, weapon);
    const derived = weapon.equipped
      ? calculateWeaponTotals(weapon, characteristics, encumbrance, size, skills)
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
      ability: skills.abilityKey || weapon.ability || "",
      abilityLabel: skills.abilityLabel,
      attackSkill: skills.attackSkill,
      parrySkill: skills.parrySkill,
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

  return {
    size,
    totalLoad,
    encumbrance,
    dodge,
    soak: soakParts.soak,
    soakStamina: soakParts.stamina,
    soakProtection: soakParts.protection,
    weapons,
    armor,
    equipment
  };
}
