/**
 * Ars Magica 2e wound and fatigue level tracks (AG0201, Ch. 3).
 */

/** @type {ReadonlyArray<{ id: string, label: string, short: string, bodyPenalty: number|null }>} */
export const WOUND_LEVELS = Object.freeze([
  { id: "unhurt", label: "Unhurt", short: "Unhurt", bodyPenalty: 0 },
  { id: "hurt", label: "Hurt", short: "Hurt", bodyPenalty: 0 },
  { id: "light", label: "Light Wounds", short: "Light", bodyPenalty: -1 },
  { id: "medium", label: "Medium Wounds", short: "Medium", bodyPenalty: -3 },
  { id: "heavy", label: "Heavy Wounds", short: "Heavy", bodyPenalty: -5 },
  { id: "incapacitated", label: "Incapacitated", short: "Incap.", bodyPenalty: null },
  { id: "unconscious", label: "Unconscious", short: "Unc.", bodyPenalty: null }
]);

/** @type {ReadonlyArray<{ id: string, label: string, short: string, penalty: number|null }>} */
export const FATIGUE_LEVELS = Object.freeze([
  { id: "fresh", label: "Fresh", short: "Fresh", penalty: 0 },
  { id: "winded", label: "Winded", short: "Winded", penalty: 0 },
  { id: "weary", label: "Weary", short: "Weary", penalty: -1 },
  { id: "tired", label: "Tired", short: "Tired", penalty: -3 },
  { id: "dazed", label: "Dazed", short: "Dazed", penalty: -5 },
  { id: "unconscious", label: "Unconscious", short: "Unc.", penalty: null }
]);

/**
 * @param {string} levelId
 * @returns {object}
 */
export function getWoundLevel(levelId) {
  return WOUND_LEVELS.find((entry) => entry.id === levelId) ?? WOUND_LEVELS[0];
}

/**
 * @param {string} levelId
 * @returns {object}
 */
export function getFatigueLevel(levelId) {
  return FATIGUE_LEVELS.find((entry) => entry.id === levelId) ?? FATIGUE_LEVELS[0];
}

/**
 * @param {string} levelId
 * @returns {number}
 */
export function woundLevelIndex(levelId) {
  const index = WOUND_LEVELS.findIndex((entry) => entry.id === levelId);
  return index >= 0 ? index : 0;
}

/**
 * @param {string} levelId
 * @returns {number}
 */
export function fatigueLevelIndex(levelId) {
  const index = FATIGUE_LEVELS.findIndex((entry) => entry.id === levelId);
  return index >= 0 ? index : 0;
}

/**
 * @param {number} index
 * @returns {string}
 */
export function woundLevelFromIndex(index) {
  const safe = Math.max(0, Math.min(WOUND_LEVELS.length - 1, Number(index) || 0));
  return WOUND_LEVELS[safe].id;
}

/**
 * @param {number} index
 * @returns {string}
 */
export function fatigueLevelFromIndex(index) {
  const safe = Math.max(0, Math.min(FATIGUE_LEVELS.length - 1, Number(index) || 0));
  return FATIGUE_LEVELS[safe].id;
}

/**
 * Build an actor update that keeps wound level and bar value in sync.
 * @param {string} levelId
 * @returns {object}
 */
export function woundLevelUpdate(levelId) {
  const level = getWoundLevel(levelId).id;
  return {
    "system.wounds.level": level,
    "system.wounds.value": woundLevelIndex(level),
    "system.wounds.max": WOUND_LEVELS.length - 1
  };
}

/**
 * Build an actor update that keeps fatigue level and bar value in sync.
 * @param {string} levelId
 * @returns {object}
 */
export function fatigueLevelUpdate(levelId) {
  const level = getFatigueLevel(levelId).id;
  return {
    "system.fatigue.level": level,
    "system.fatigue.value": fatigueLevelIndex(level),
    "system.fatigue.max": FATIGUE_LEVELS.length - 1
  };
}

/**
 * Numeric penalty applied to most stress rolls from the current wound level.
 * Incapacitated / Unconscious return null (cannot act).
 * @param {object} system
 * @returns {number|null}
 */
export function getWoundPenalty(system) {
  const level = getWoundLevel(system?.wounds?.level);
  return level.bodyPenalty;
}

/**
 * Numeric penalty applied to most stress rolls from the current fatigue level.
 * Unconscious returns null (cannot act).
 * @param {object} system
 * @returns {number|null}
 */
export function getFatiguePenalty(system) {
  const level = getFatigueLevel(system?.fatigue?.level);
  return level.penalty;
}

/**
 * Combined wound + fatigue modifiers for a stress roll.
 * @param {object} system
 * @returns {{
 *   woundPenalty: number,
 *   fatiguePenalty: number,
 *   total: number,
 *   canAct: boolean,
 *   woundLabel: string,
 *   fatigueLabel: string,
 *   parts: Array<{ label: string, value: number }>
 * }}
 */
export function getConditionModifiers(system) {
  const wound = getWoundLevel(system?.wounds?.level);
  const fatigue = getFatigueLevel(system?.fatigue?.level);
  const woundPenalty = typeof wound.bodyPenalty === "number" ? wound.bodyPenalty : 0;
  const fatiguePenalty = typeof fatigue.penalty === "number" ? fatigue.penalty : 0;
  const canAct = wound.bodyPenalty !== null && fatigue.penalty !== null;
  /** @type {Array<{ label: string, value: number }>} */
  const parts = [];

  if (woundPenalty) {
    parts.push({ label: `Wound (${wound.short})`, value: woundPenalty });
  }

  if (fatiguePenalty) {
    parts.push({ label: `Fatigue (${fatigue.short})`, value: fatiguePenalty });
  }

  return {
    woundPenalty,
    fatiguePenalty,
    total: woundPenalty + fatiguePenalty,
    canAct,
    woundLabel: wound.label,
    fatigueLabel: fatigue.label,
    parts
  };
}

/**
 * Advance one fatigue level (e.g. failed formulaic casting).
 * @param {string} currentId
 * @returns {string}
 */
export function nextFatigueLevel(currentId) {
  const index = FATIGUE_LEVELS.findIndex((entry) => entry.id === currentId);

  if (index < 0) return FATIGUE_LEVELS[1].id;
  if (index >= FATIGUE_LEVELS.length - 1) return FATIGUE_LEVELS[FATIGUE_LEVELS.length - 1].id;

  return FATIGUE_LEVELS[index + 1].id;
}

/**
 * @param {Actor} actor
 * @returns {Promise<{ previous: string, next: string, changed: boolean }>}
 */
export async function applyCastingFatigue(actor) {
  const previous = actor.system?.fatigue?.level ?? "fresh";
  const next = nextFatigueLevel(previous);

  if (previous === next) {
    return { previous, next, changed: false };
  }

  if (!actor.isOwner) {
    return { previous, next, changed: false };
  }

  await actor.update(fatigueLevelUpdate(next));
  return { previous, next, changed: true };
}

/**
 * @param {object} system
 * @param {number} [encumbrance=0]
 * @returns {object}
 */
export function prepareStatusStrip(system, encumbrance = 0) {
  const conditions = getConditionModifiers(system);
  const wound = getWoundLevel(system?.wounds?.level);
  const fatigue = getFatigueLevel(system?.fatigue?.level);
  const confidenceValue = Number(system?.confidence?.value) || 0;
  const confidenceMax = Number(system?.confidence?.max) || 0;
  const penaltyTotal = conditions.total;
  const penaltyLabel = penaltyTotal === 0
    ? "±0"
    : penaltyTotal > 0
      ? `+${penaltyTotal}`
      : String(penaltyTotal);

  return {
    wound,
    fatigue,
    woundPenalty: conditions.woundPenalty,
    fatiguePenalty: conditions.fatiguePenalty,
    penaltyTotal,
    penaltyLabel,
    canAct: conditions.canAct,
    confidenceValue,
    confidenceMax,
    encumbrance: Number(encumbrance) || 0,
    woundLevels: WOUND_LEVELS.map((level) => ({
      ...level,
      active: level.id === wound.id,
      penaltyLabel: level.bodyPenalty === null ? "—" : (level.bodyPenalty || "0")
    })),
    fatigueLevels: FATIGUE_LEVELS.map((level) => ({
      ...level,
      active: level.id === fatigue.id,
      penaltyLabel: level.penalty === null ? "—" : (level.penalty || "0")
    }))
  };
}

/**
 * @param {object} system
 * @returns {{ current: object, levels: object[] }}
 */
export function prepareWoundTrack(system) {
  const currentId = system?.wounds?.level ?? "unhurt";
  const current = getWoundLevel(currentId);

  return {
    current,
    levels: WOUND_LEVELS.map((level) => ({
      ...level,
      active: level.id === currentId,
      penaltyLabel: level.bodyPenalty === null
        ? "—"
        : (level.bodyPenalty === 0 ? "0" : String(level.bodyPenalty))
    }))
  };
}

/**
 * @param {object} system
 * @returns {{ current: object, levels: object[] }}
 */
export function prepareFatigueTrack(system) {
  const currentId = system?.fatigue?.level ?? "fresh";
  const current = getFatigueLevel(currentId);

  return {
    current,
    levels: FATIGUE_LEVELS.map((level) => ({
      ...level,
      active: level.id === currentId,
      penaltyLabel: level.penalty === null
        ? "—"
        : (level.penalty === 0 ? "0" : String(level.penalty))
    }))
  };
}
