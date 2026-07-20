/**
 * Confidence point helpers (AG0201).
 * Default saga rule: spend 1 Confidence for +3 on a roll.
 */

export const CONFIDENCE_BONUS = 3;

/**
 * @param {Actor} actor
 * @returns {number}
 */
export function getConfidenceValue(actor) {
  return Number(actor?.system?.confidence?.value) || 0;
}

/**
 * Spend one Confidence point if available.
 * @param {Actor} actor
 * @returns {Promise<{ spent: boolean, remaining: number }>}
 */
export async function spendConfidence(actor) {
  const current = getConfidenceValue(actor);
  if (current < 1) {
    return { spent: false, remaining: current };
  }

  const remaining = current - 1;
  await actor.update({ "system.confidence.value": remaining });
  return { spent: true, remaining };
}
