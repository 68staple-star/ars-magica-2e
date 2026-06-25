/**
 * Prepare categorized ability groups for the character sheet (Item-based).
 */

import { getAbilityByKey } from "../config/ability-registry.js";

/**
 * @param {Item[]} abilityItems
 * @param {"talents" | "skills" | "knowledges"} category
 * @param {Readonly<Record<string, ReadonlyArray<string>>>} categoryMap
 * @param {Readonly<Record<string, string>>} categoryLabels
 * @param {typeof import("../config.js").ARM2E} registry
 */
function prepareCategorizedAbilityItems(abilityItems, category, categoryMap, categoryLabels, registry) {
  const itemsInCategory = abilityItems.filter((item) => item.system?.category === category);

  return Object.entries(categoryMap).map(([categoryId, labels]) => {
    const abilities = itemsInCategory
      .filter((item) => {
        const definition = getAbilityByKey(item.system?.key) ?? registry.getAbilityByKey?.(item.system?.key);
        return definition && labels.includes(definition.label);
      })
      .map((item) => enrichAbilityItem(item, registry))
      .sort((left, right) => left.label.localeCompare(right.label));

    return {
      id: categoryId,
      title: categoryLabels[categoryId] ?? categoryId,
      abilities
    };
  }).filter((section) => section.abilities.length > 0);
}

/**
 * @param {Item} item
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function enrichAbilityItem(item, registry) {
  const definition = getAbilityByKey(item.system?.key) ?? registry.getAbilityByKey?.(item.system?.key);
  const rollCharacteristic = item.system?.rollCharacteristic ?? definition?.characteristic ?? "";
  const characteristic = registry.CHARACTERISTICS.find((entry) => entry.id === rollCharacteristic);

  return {
    id: item.id,
    itemId: item.id,
    key: item.system?.key ?? "",
    label: item.name,
    category: item.system?.category ?? "",
    value: Number(item.system?.value) || 0,
    xp: Number(item.system?.xp) || 0,
    specialty: item.system?.specialty ?? "",
    charAbbrev: characteristic?.abbrev ?? "—",
    rollCharacteristic,
    alternates: definition?.alternates ?? [],
    fieldBase: `items.${item.id}.system`
  };
}

/**
 * @param {Item[]} abilityItems
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function prepareAbilityColumns(abilityItems, registry) {
  const talents = prepareCategorizedAbilityItems(
    abilityItems,
    "talents",
    registry.TALENT_CATEGORIES,
    registry.TALENT_CATEGORY_LABELS,
    registry
  );
  const skills = prepareCategorizedAbilityItems(
    abilityItems,
    "skills",
    registry.SKILL_CATEGORIES,
    registry.SKILL_CATEGORY_LABELS,
    registry
  );
  const knowledges = prepareCategorizedAbilityItems(
    abilityItems,
    "knowledges",
    registry.KNOWLEDGE_CATEGORIES,
    registry.KNOWLEDGE_CATEGORY_LABELS,
    registry
  );

  return { talents, skills, knowledges };
}

/**
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {object} system
 */
export function prepareCharacteristicPairs(registry, system) {
  return [
    ["intelligence", "perception"],
    ["strength", "stamina"],
    ["presence", "communication"],
    ["dexterity", "quickness"]
  ].map(([leftId, rightId]) => {
    const left = registry.CHARACTERISTICS.find((entry) => entry.id === leftId);
    const right = registry.CHARACTERISTICS.find((entry) => entry.id === rightId);

    return {
      left: {
        ...left,
        value: system.characteristics?.[leftId] ?? 0,
        field: `system.characteristics.${leftId}`
      },
      right: {
        ...right,
        value: system.characteristics?.[rightId] ?? 0,
        field: `system.characteristics.${rightId}`
      }
    };
  });
}

/** @deprecated Use prepareAbilityColumns */
export function prepareAbilitySections(system, registry) {
  return prepareAbilityColumns([], registry);
}
