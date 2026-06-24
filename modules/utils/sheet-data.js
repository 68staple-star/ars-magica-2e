/**
 * Prepare categorized ability groups for the character sheet.
 */

import { abilityKey } from "./abilities.js";

/**
 * @param {object} system
 * @param {"talents" | "skills" | "knowledges"} category
 * @param {Readonly<Record<string, ReadonlyArray<string>>>} categoryMap
 * @param {Readonly<Record<string, string>>} categoryLabels
 */
function prepareCategorizedAbilities(system, category, categoryMap, categoryLabels) {
  return Object.entries(categoryMap).map(([categoryId, labels]) => ({
    id: categoryId,
    title: categoryLabels[categoryId] ?? categoryId,
    abilities: labels.map((label) => {
      const id = abilityKey(label);
      const entry = system.abilities?.[category]?.[id] ?? {};

      return {
        id,
        label,
        value: entry.value ?? 0,
        xp: entry.xp ?? 0,
        specialty: entry.specialty ?? "",
        fieldBase: `system.abilities.${category}.${id}`
      };
    })
  }));
}

/**
 * @param {object} system
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function prepareAbilitySections(system, registry) {
  return {
    talents: prepareCategorizedAbilities(
      system,
      "talents",
      registry.TALENT_CATEGORIES,
      registry.TALENT_CATEGORY_LABELS
    ),
    skills: prepareCategorizedAbilities(
      system,
      "skills",
      registry.SKILL_CATEGORIES,
      registry.SKILL_CATEGORY_LABELS
    ),
    knowledges: prepareCategorizedAbilities(
      system,
      "knowledges",
      registry.KNOWLEDGE_CATEGORIES,
      registry.KNOWLEDGE_CATEGORY_LABELS
    )
  };
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
