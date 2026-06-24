/**
 * Ars Magica 2e character creation helpers (AG0201, Ch. 1).
 */

import { abilityKey } from "./abilities.js";

export const CHARACTERISTIC_MIN = -5;
export const CHARACTERISTIC_MAX = 5;

/** @type {ReadonlyArray<[string, string]>} */
export const CHARACTERISTIC_PAIRS = Object.freeze([
  ["intelligence", "perception"],
  ["strength", "stamina"],
  ["presence", "communication"],
  ["dexterity", "quickness"]
]);

/**
 * @param {number} score
 * @returns {number}
 */
export function triangularCost(score) {
  const value = Number(score) || 0;
  if (value === 0) return 0;
  const magnitude = Math.abs(value);
  const cost = (magnitude * (magnitude + 1)) / 2;
  return value > 0 ? cost : -cost;
}

/**
 * @param {Record<string, number>} characteristics
 * @returns {number}
 */
export function characteristicPointsSpent(characteristics = {}) {
  return Object.values(characteristics).reduce((total, score) => total + (Number(score) || 0), 0);
}

/**
 * @param {"grog" | "companion" | "magus"} characterType
 * @returns {number}
 */
export function characteristicPointBudget(characterType) {
  if (characterType === "grog") return 5;
  return 7;
}

/**
 * @param {"grog" | "companion" | "magus"} characterType
 * @param {number} age
 * @returns {number}
 */
export function abilityPointBudget(characterType, age) {
  const years = Math.max(0, Number(age) || 0);

  if (characterType === "grog") return years + 10;
  if (characterType === "companion") return years * 2;
  return years;
}

/**
 * @returns {number}
 */
export function magusArtPointBudget() {
  return 150;
}

/**
 * @returns {number}
 */
export function magusSpellPointBudget() {
  return 150;
}

/**
 * @param {"grog" | "companion" | "magus"} characterType
 * @returns {number}
 */
export function defaultConfidence(characterType) {
  if (characterType === "grog") return 1;
  if (characterType === "magus") return 3;
  return 2;
}

/**
 * @param {Record<string, { value?: number }>} categories
 * @returns {number}
 */
export function abilityPointsSpent(categories) {
  let total = 0;

  for (const category of Object.values(categories ?? {})) {
    for (const entry of Object.values(category ?? {})) {
      total += triangularCost(entry?.value ?? 0);
    }
  }

  return total;
}

/**
 * @param {Record<string, number>} techniques
 * @param {Record<string, number>} forms
 * @returns {number}
 */
export function artPointsSpent(techniques = {}, forms = {}) {
  let total = 0;

  for (const score of Object.values(techniques)) total += triangularCost(score);
  for (const score of Object.values(forms)) total += triangularCost(score);

  return total;
}

/**
 * @param {Array<{ level?: number }>} spells
 * @returns {number}
 */
export function spellPointsSpent(spells = []) {
  return spells.reduce((total, spell) => total + triangularCost(spell?.level ?? 0), 0);
}

/**
 * @param {object} arts
 * @param {number} intelligence
 * @param {number} spellLevel
 * @returns {boolean}
 */
export function isSpellLevelAllowed(arts, intelligence, spellLevel) {
  const level = Number(spellLevel) || 0;
  const int = Number(intelligence) || 0;
  const maxArtTotal = Math.max(
    0,
    ...Object.values(arts?.techniques ?? {}).map(Number),
    ...Object.values(arts?.forms ?? {}).map(Number)
  );

  // Spells are validated against the character's highest relevant art total + Int.
  return level <= maxArtTotal + int + 10;
}

/**
 * @param {object} spell
 * @param {object} arts
 * @param {number} intelligence
 * @returns {number}
 */
export function spellCastingTotal(spell, arts, intelligence) {
  const technique = Number(arts?.techniques?.[spell.technique]) || 0;
  const form = Number(arts?.forms?.[spell.form]) || 0;
  return technique + form + (Number(intelligence) || 0);
}

/**
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {object} [existing={}]
 */
export function buildEmptyAbilityState(registry, existing = {}) {
  const buildCategory = (labels, categoryKey) => {
    const output = {};

    for (const label of labels) {
      const id = abilityKey(label);
      const entry = existing?.[categoryKey]?.[id] ?? {};
      output[id] = {
        label,
        value: Number(entry.value) || 0,
        specialty: entry.specialty ?? ""
      };
    }

    return output;
  };

  return {
    talents: buildCategory(registry.TALENTS, "talents"),
    skills: buildCategory(registry.SKILLS, "skills"),
    knowledges: buildCategory(registry.KNOWLEDGES, "knowledges")
  };
}

/**
 * @param {object} abilityState
 * @returns {object}
 */
export function serializeAbilitiesForActor(abilityState) {
  const serializeCategory = (category) => {
    const output = {};

    for (const [id, entry] of Object.entries(category ?? {})) {
      output[id] = {
        value: Number(entry.value) || 0,
        xp: 0,
        specialty: entry.specialty ?? ""
      };
    }

    return output;
  };

  return {
    talents: serializeCategory(abilityState.talents),
    skills: serializeCategory(abilityState.skills),
    knowledges: serializeCategory(abilityState.knowledges)
  };
}

/**
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {object} [existing={}]
 */
export function buildEmptyArts(registry, existing = {}) {
  const techniques = {};
  const forms = {};

  for (const technique of registry.TECHNIQUES) {
    techniques[technique.id] = Number(existing?.techniques?.[technique.id]) || 0;
  }

  for (const form of registry.FORMS) {
    forms[form.id] = Number(existing?.forms?.[form.id]) || 0;
  }

  return { techniques, forms };
}

/**
 * @param {Record<string, number>} characteristics
 * @returns {string[]}
 */
export function validateCharacteristics(characteristics) {
  const errors = [];

  for (const [left, right] of CHARACTERISTIC_PAIRS) {
    for (const id of [left, right]) {
      const score = Number(characteristics[id]) || 0;
      if (score < CHARACTERISTIC_MIN || score > CHARACTERISTIC_MAX) {
        errors.push(`${id} must be between ${CHARACTERISTIC_MIN} and ${CHARACTERISTIC_MAX}.`);
      }
    }
  }

  return errors;
}
