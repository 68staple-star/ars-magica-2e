/**
 * @param {string} label
 * @returns {string}
 */
export function abilityKey(label) {
  return label
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** @returns {{ value: number, xp: number, specialty: string }} */
export function defaultAbilityEntry() {
  return { value: 0, xp: 0, specialty: "" };
}

/**
 * @param {Record<string, object> | undefined} existing
 * @param {readonly string[]} labels
 * @returns {Record<string, { value: number, xp: number, specialty: string }>}
 */
export function ensureAbilityCategory(existing = {}, labels) {
  /** @type {Record<string, { value: number, xp: number, specialty: string }>} */
  const category = {};

  for (const label of labels) {
    const id = abilityKey(label);
    const entry = existing[id] ?? {};

    category[id] = {
      value: Number(entry.value) || 0,
      xp: Number(entry.xp) || 0,
      specialty: entry.specialty ?? ""
    };
  }

  return category;
}

/**
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {object} [existingAbilities]
 * @returns {{ talents: object, skills: object, knowledges: object }}
 */
export function buildCharacterAbilities(registry, existingAbilities = {}) {
  return {
    talents: ensureAbilityCategory(existingAbilities.talents, registry.TALENTS),
    skills: ensureAbilityCategory(existingAbilities.skills, registry.SKILLS),
    knowledges: ensureAbilityCategory(existingAbilities.knowledges, registry.KNOWLEDGES)
  };
}

/**
 * @param {object} system
 * @param {typeof import("../config.js").ARM2E} registry
 * @returns {object}
 */
export function ensureCharacterAbilities(system = {}, registry) {
  return buildCharacterAbilities(registry, system.abilities);
}
