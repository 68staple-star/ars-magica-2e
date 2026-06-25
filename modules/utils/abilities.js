/**
 * Ability utilities — keys, item helpers, and legacy system.abilities support.
 */

import { getAbilityByKey, getAbilityByLabel } from "../config/ability-registry.js";

/**
 * @param {string} label
 * @returns {string}
 */
export function abilityKey(label) {
  const known = getAbilityByLabel(label);
  if (known) return known.key;

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

/**
 * @param {Actor} actor
 * @returns {Item[]}
 */
export function getAbilityItems(actor) {
  return actor.items.filter((item) => item.type === "ability");
}

/**
 * @param {Actor} actor
 * @param {string} key
 * @param {string} [specialty=""]
 * @returns {Item | undefined}
 */
export function findAbilityItem(actor, key, specialty = "") {
  const normalizedSpecialty = specialty.trim().toLowerCase();

  return getAbilityItems(actor).find((item) => {
    if (item.system?.key !== key) return false;
    const itemSpecialty = String(item.system?.specialty ?? "").trim().toLowerCase();
    return itemSpecialty === normalizedSpecialty;
  });
}

/**
 * @param {Actor} actor
 * @param {string} key
 * @returns {number}
 */
export function getAbilityValue(actor, key) {
  const item = getAbilityItems(actor).find((entry) => entry.system?.key === key);
  if (item) return Number(item.system?.value) || 0;

  const definition = getAbilityByKey(key);
  if (!definition) return 0;

  const legacy = actor.system?.abilities?.[definition.category]?.[key];
  return Number(legacy?.value) || 0;
}

/**
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {import("../config/ability-registry.js").AbilityDefinition} definition
 * @returns {object}
 */
export function buildAbilityItemData(registry, definition) {
  return {
    name: definition.label,
    type: "ability",
    system: {
      category: definition.category,
      key: definition.key,
      value: 0,
      xp: 0,
      specialty: "",
      rollCharacteristic: definition.characteristic
    }
  };
}

/**
 * @param {object} entry
 * @param {typeof import("../config.js").ARM2E} registry
 * @returns {boolean}
 */
export function isAbilityEntryPopulated(entry) {
  return (Number(entry?.value) || 0) !== 0
    || (Number(entry?.xp) || 0) !== 0
    || Boolean(String(entry?.specialty ?? "").trim());
}

/**
 * Merge legacy system.abilities and ability Items into wizard/sheet lookup shape.
 * @param {Actor} actor
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function buildAbilityLookupFromActor(actor, registry) {
  const lookup = {
    talents: {},
    skills: {},
    knowledges: {}
  };

  for (const definition of registry.ABILITY_ENTRIES) {
    lookup[definition.category][definition.key] = defaultAbilityEntry();
  }

  const legacy = actor.system?.abilities ?? {};
  for (const category of ["talents", "skills", "knowledges"]) {
    for (const [key, entry] of Object.entries(legacy[category] ?? {})) {
      if (!lookup[category][key]) continue;
      lookup[category][key] = {
        value: Number(entry.value) || 0,
        xp: Number(entry.xp) || 0,
        specialty: entry.specialty ?? ""
      };
    }
  }

  for (const item of getAbilityItems(actor)) {
    const category = item.system?.category;
    const key = item.system?.key;
    if (!category || !key || !lookup[category]?.[key]) continue;

    lookup[category][key] = {
      value: Number(item.system?.value) || 0,
      xp: Number(item.system?.xp) || 0,
      specialty: item.system?.specialty ?? ""
    };
  }

  return lookup;
}

/**
 * @param {Actor} actor
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {object} abilityState
 * @returns {object[]}
 */
export function serializeAbilityItemsForActor(actor, registry, abilityState) {
  const items = [];

  for (const definition of registry.ABILITY_ENTRIES) {
    const entry = abilityState?.[definition.category]?.[definition.key];
    if (!entry || !isAbilityEntryPopulated(entry)) continue;

    const existing = findAbilityItem(actor, definition.key, entry.specialty ?? "");
    const rollCharacteristic = existing?.system?.rollCharacteristic
      ?? definition.characteristic;

    items.push({
      _id: existing?.id,
      name: definition.label,
      type: "ability",
      system: {
        category: definition.category,
        key: definition.key,
        value: Number(entry.value) || 0,
        xp: Number(entry.xp) || 0,
        specialty: entry.specialty ?? "",
        rollCharacteristic
      }
    });
  }

  return items;
}
