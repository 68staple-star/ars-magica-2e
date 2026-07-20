/**
 * Ars Magica 2e character creation helpers (AG0201, Ch. 1).
 */

import { abilityKey } from "./abilities.js";

export const CHARACTERISTIC_MIN = -5;
export const CHARACTERISTIC_MAX = 5;
export const ABILITY_MIN = -6;
export const ABILITY_MAX = 10;

/** @type {ReadonlyArray<[string, string]>} */
export const CHARACTERISTIC_PAIRS = Object.freeze([
  ["intelligence", "perception"],
  ["strength", "stamina"],
  ["presence", "communication"],
  ["dexterity", "quickness"]
]);

/**
 * AG0201 Base Abilities Table — free starting scores by character type.
 * Raising above the base costs triangular(final) − triangular(base).
 * @type {Readonly<Record<"grog"|"companion"|"magus", ReadonlyArray<{ key: string, category: string, value: number, specialty?: string }>>>}
 */
export const STARTING_ABILITY_PACKAGES = Object.freeze({
  grog: Object.freeze([
    { key: "speak-own-language", category: "knowledges", value: 4 },
    { key: "brawl", category: "skills", value: 1 }
  ]),
  companion: Object.freeze([
    { key: "speak-own-language", category: "knowledges", value: 5 }
  ]),
  magus: Object.freeze([
    { key: "speak-own-language", category: "knowledges", value: 4 },
    { key: "speak-latin", category: "knowledges", value: 5 },
    { key: "scribe-latin", category: "knowledges", value: 3 },
    { key: "magic-theory", category: "knowledges", value: 5 },
    { key: "hermes-lore", category: "knowledges", value: 2 },
    { key: "hermes-history", category: "knowledges", value: 2 },
    { key: "parma-magica", category: "skills", value: 2 }
  ])
});

/**
 * @returns {ReadonlyArray<{ key: string, category: string, value: number }>}
 */
function allStartingPackageEntries() {
  return Object.values(STARTING_ABILITY_PACKAGES).flat();
}

/**
 * @param {"grog" | "companion" | "magus"} characterType
 * @returns {Record<string, number>}
 */
export function getStartingAbilityBaseMap(characterType) {
  /** @type {Record<string, number>} */
  const bases = {};
  for (const entry of STARTING_ABILITY_PACKAGES[characterType] ?? []) {
    bases[entry.key] = entry.value;
  }
  return bases;
}

/**
 * Apply AG0201 base abilities for a character type onto wizard ability state.
 * Clears other package keys first so switching type swaps packages cleanly.
 * @param {object} abilityState
 * @param {"grog" | "companion" | "magus"} characterType
 * @returns {object}
 */
export function applyStartingAbilityPackage(abilityState, characterType) {
  if (!abilityState) return abilityState;

  for (const entry of allStartingPackageEntries()) {
    const slot = abilityState[entry.category]?.[entry.key];
    if (!slot) continue;
    slot.value = 0;
  }

  for (const entry of STARTING_ABILITY_PACKAGES[characterType] ?? []) {
    const slot = abilityState[entry.category]?.[entry.key];
    if (!slot) continue;
    slot.value = entry.value;
    if (entry.specialty && !String(slot.specialty ?? "").trim()) {
      slot.specialty = entry.specialty;
    }
  }

  return abilityState;
}

/**
 * @param {object} abilityState
 * @returns {boolean}
 */
export function abilityStateHasScores(abilityState) {
  for (const category of Object.values(abilityState ?? {})) {
    for (const entry of Object.values(category ?? {})) {
      if ((Number(entry?.value) || 0) !== 0) return true;
    }
  }
  return false;
}
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
 * Ability points spent beyond free starting bases (AG0201).
 * @param {Record<string, { value?: number }>} categories
 * @param {"grog" | "companion" | "magus" | Record<string, number>} [characterTypeOrBases]
 * @returns {number}
 */
export function abilityPointsSpent(categories, characterTypeOrBases) {
  const bases =
    characterTypeOrBases && typeof characterTypeOrBases === "object"
      ? characterTypeOrBases
      : characterTypeOrBases
        ? getStartingAbilityBaseMap(characterTypeOrBases)
        : {};
  let total = 0;

  for (const category of Object.values(categories ?? {})) {
    for (const [key, entry] of Object.entries(category ?? {})) {
      const value = Number(entry?.value) || 0;
      const base = Number(bases[key]) || 0;
      if (value === base) continue;
      total += triangularCost(value) - triangularCost(base);
    }
  }

  return total;
}

/**
 * Incremental cost to display for an ability given its free base.
 * @param {number} value
 * @param {number} [base=0]
 * @returns {number}
 */
export function abilityIncrementalCost(value, base = 0) {
  const score = Number(value) || 0;
  const floor = Number(base) || 0;
  if (score === floor) return 0;
  return triangularCost(score) - triangularCost(floor);
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
        value: Number.isFinite(Number(entry.value)) ? Number(entry.value) : 0,
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
        value: Number.isFinite(Number(entry.value)) ? Number(entry.value) : 0,
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
