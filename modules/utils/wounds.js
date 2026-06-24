/**
 * Ars Magica 2e wound and fatigue level tracks (AG0201, Ch. 3).
 */

/** @type {ReadonlyArray<{ id: string, label: string, bodyPenalty: number, fatiguePenalty: number }>} */
export const WOUND_LEVELS = Object.freeze([
  { id: "unhurt", label: "Unhurt", bodyPenalty: 0, fatiguePenalty: 0 },
  { id: "hurt", label: "Hurt", bodyPenalty: 0, fatiguePenalty: 0 },
  { id: "light", label: "Light Wounds", bodyPenalty: -1, fatiguePenalty: -1 },
  { id: "medium", label: "Medium Wounds", bodyPenalty: -3, fatiguePenalty: -3 },
  { id: "heavy", label: "Heavy Wounds", bodyPenalty: -5, fatiguePenalty: -5 },
  { id: "incapacitated", label: "Incapacitated", bodyPenalty: null, fatiguePenalty: null },
  { id: "unconscious", label: "Unconscious", bodyPenalty: null, fatiguePenalty: null }
]);

/** @type {ReadonlyArray<{ id: string, label: string, penalty: number }>} */
export const FATIGUE_LEVELS = Object.freeze([
  { id: "fresh", label: "Fresh", penalty: 0 },
  { id: "winded", label: "Winded", penalty: 0 },
  { id: "weary", label: "Weary", penalty: -1 },
  { id: "tired", label: "Tired", penalty: -3 },
  { id: "dazed", label: "Dazed", penalty: -5 },
  { id: "unconscious", label: "Unconscious", penalty: null }
]);

/**
 * @param {string} levelId
 * @returns {object | undefined}
 */
export function getWoundLevel(levelId) {
  return WOUND_LEVELS.find((entry) => entry.id === levelId) ?? WOUND_LEVELS[0];
}

/**
 * @param {string} levelId
 * @returns {object | undefined}
 */
export function getFatigueLevel(levelId) {
  return FATIGUE_LEVELS.find((entry) => entry.id === levelId) ?? FATIGUE_LEVELS[0];
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
      active: level.id === currentId
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
      active: level.id === currentId
    }))
  };
}
