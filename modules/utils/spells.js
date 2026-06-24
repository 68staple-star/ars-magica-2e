/**
 * Hermetic formulaic spell preparation (AG0201, Ch. 4–5).
 */

/**
 * @param {object} system
 * @param {string} techniqueId
 * @param {string} formId
 * @returns {number}
 */
export function calculateCastingModifier(system, techniqueId, formId) {
  const techniqueScore = Number(system?.arts?.techniques?.[techniqueId]) || 0;
  const formScore = Number(system?.arts?.forms?.[formId]) || 0;
  const stamina = Number(system?.characteristics?.stamina) || 0;

  return techniqueScore + formScore + stamina;
}

/**
 * @param {Item} item
 * @param {object} system
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function prepareSpell(item, system, registry) {
  const spell = item.system ?? {};
  const techniqueId = spell.technique ?? "";
  const formId = spell.form ?? "";
  const technique = registry.TECHNIQUES.find((entry) => entry.id === techniqueId);
  const form = registry.FORMS.find((entry) => entry.id === formId);

  return {
    id: item.id,
    name: item.name,
    level: Number(spell.level) || 0,
    technique: techniqueId,
    form: formId,
    techniqueLabel: technique?.label ?? (techniqueId || "—"),
    techniqueAbbrev: technique?.abbrev ?? "—",
    formLabel: form?.label ?? (formId || "—"),
    formAbbrev: form?.abbrev ?? "—",
    range: spell.range ?? "",
    duration: spell.duration ?? "",
    target: spell.target ?? "",
    mastered: Boolean(spell.mastered),
    notes: spell.notes ?? "",
    journal: spell.journal ?? "",
    castingModifier: calculateCastingModifier(system, techniqueId, formId)
  };
}

/**
 * @param {object} system
 * @param {Iterable<Item>} spellItems
 * @param {typeof import("../config.js").ARM2E} registry
 */
export function prepareSpellLists(system, spellItems, registry) {
  const spells = [...spellItems]
    .map((item) => prepareSpell(item, system, registry))
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));

  const groups = registry.TECHNIQUES.map((technique) => ({
    technique,
    spells: spells.filter((spell) => spell.technique === technique.id)
  })).filter((group) => group.spells.length > 0);

  const knownTechniqueIds = new Set(registry.TECHNIQUES.map((technique) => technique.id));
  const unmatched = spells.filter((spell) => !knownTechniqueIds.has(spell.technique));

  if (unmatched.length) {
    groups.push({
      technique: { id: "other", label: "Other", abbrev: "?" },
      spells: unmatched
    });
  }

  return { groups, spells };
}
