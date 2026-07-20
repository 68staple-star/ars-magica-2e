/**
 * Spontaneous magic helpers (AG0201 Magic chapter).
 * Casting total = Technique + Form + Intelligence.
 * Fatiguing: divide by 2 (always costs 1 Fatigue). Careful: divide by 5 (no Fatigue).
 */

/**
 * @param {object} system
 * @param {string} techniqueId
 * @param {string} formId
 * @returns {number}
 */
export function calculateSpontaneousModifier(system, techniqueId, formId) {
  const techniqueScore = Number(system?.arts?.techniques?.[techniqueId]) || 0;
  const formScore = Number(system?.arts?.forms?.[formId]) || 0;
  const intelligence = Number(system?.characteristics?.intelligence) || 0;

  return techniqueScore + formScore + intelligence;
}

/**
 * @param {number} undividedTotal
 * @param {boolean} fatiguing
 * @returns {number}
 */
export function spontaneousLevelEquivalent(undividedTotal, fatiguing) {
  const divisor = fatiguing ? 2 : 5;
  return (Number(undividedTotal) || 0) / divisor;
}

/**
 * @param {object} system
 * @param {string} techniqueId
 * @param {string} formId
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function describeSpontaneousArts(system, techniqueId, formId, registry) {
  const technique = registry.TECHNIQUES.find((entry) => entry.id === techniqueId);
  const form = registry.FORMS.find((entry) => entry.id === formId);
  const techniqueScore = Number(system?.arts?.techniques?.[techniqueId]) || 0;
  const formScore = Number(system?.arts?.forms?.[formId]) || 0;
  const intelligence = Number(system?.characteristics?.intelligence) || 0;

  return {
    techniqueId,
    formId,
    techniqueLabel: technique?.label ?? techniqueId,
    techniqueAbbrev: technique?.abbrev ?? "?",
    formLabel: form?.label ?? formId,
    formAbbrev: form?.abbrev ?? "?",
    techniqueScore,
    formScore,
    intelligence,
    modifier: techniqueScore + formScore + intelligence
  };
}
