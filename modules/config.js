/**
 * Ars Magica 2nd Edition system registry.
 * Source: AG0201 core rules, Ch. 1 (Character) & Ch. 2 (Abilities).
 */

import {
  ABILITY_BY_KEY,
  ABILITY_ENTRIES,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGES,
  SKILL_CATEGORIES,
  SKILLS,
  TALENT_CATEGORIES,
  TALENTS,
  getAbilityByKey,
  getAbilityByLabel
} from "./config/ability-registry.js";

export {
  ABILITY_BY_KEY,
  ABILITY_ENTRIES,
  getAbilityByKey,
  getAbilityByLabel,
  TALENTS,
  SKILLS,
  KNOWLEDGES,
  TALENT_CATEGORIES,
  SKILL_CATEGORIES,
  KNOWLEDGE_CATEGORIES
};

/** @type {ReadonlyArray<{ id: string, label: string, abbrev: string }>} */
export const CHARACTERISTICS = Object.freeze([
  { id: "intelligence", label: "Intelligence", abbrev: "Int" },
  { id: "perception", label: "Perception", abbrev: "Per" },
  { id: "strength", label: "Strength", abbrev: "Str" },
  { id: "stamina", label: "Stamina", abbrev: "Stm" },
  { id: "presence", label: "Presence", abbrev: "Prs" },
  { id: "communication", label: "Communication", abbrev: "Com" },
  { id: "dexterity", label: "Dexterity", abbrev: "Dex" },
  { id: "quickness", label: "Quickness", abbrev: "Qik" }
]);

/** @type {ReadonlyArray<{ id: string, label: string, abbrev: string }>} */
export const TECHNIQUES = Object.freeze([
  { id: "creo", label: "Creo", abbrev: "Cr" },
  { id: "intellego", label: "Intellego", abbrev: "In" },
  { id: "muto", label: "Muto", abbrev: "Mu" },
  { id: "perdo", label: "Perdo", abbrev: "Pe" },
  { id: "rego", label: "Rego", abbrev: "Re" }
]);

/** @type {ReadonlyArray<{ id: string, label: string, abbrev: string }>} */
export const FORMS = Object.freeze([
  { id: "animal", label: "Animal", abbrev: "An" },
  { id: "aquam", label: "Aquam", abbrev: "Aq" },
  { id: "auram", label: "Auram", abbrev: "Au" },
  { id: "corporem", label: "Corporem", abbrev: "Co" },
  { id: "herbam", label: "Herbam", abbrev: "He" },
  { id: "ignem", label: "Ignem", abbrev: "Ig" },
  { id: "imagonem", label: "Imagonem", abbrev: "Im" },
  { id: "mentem", label: "Mentem", abbrev: "Me" },
  { id: "terram", label: "Terram", abbrev: "Te" },
  { id: "vim", label: "Vim", abbrev: "Vi" }
]);

/**
 * Weapon combat skills.
 * Classic 2e treats attack/parry per weapon; LoM/ArM5 gear uses group abilities
 * (Brawl, Single, Great, Bow, Thrown, Crossbow) linked via weapon.system.ability.
 * @type {Readonly<{ note: string, groups: ReadonlyArray<string> }>}
 */
export const WEAPON_SKILLS = Object.freeze({
  note: "Link a weapon Ability (Brawl / Single Weapon / Great Weapon / Bow / Thrown Weapon / Crossbow). Combat totals use that ability score; otherwise Attack Skill and Parry Skill fields apply.",
  groups: Object.freeze([
    "brawl",
    "single-weapon",
    "great-weapon",
    "bow",
    "thrown-weapon",
    "crossbow"
  ])
});

/** @type {Readonly<Record<string, string>>} */
export const TALENT_CATEGORY_LABELS = Object.freeze({
  arcane: "Arcane Talents",
  awareness: "Awareness Talents",
  exceptional: "Exceptional Talents",
  physical: "Physical Talents",
  social: "Social Talents"
});

/** @type {Readonly<Record<string, string>>} */
export const SKILL_CATEGORY_LABELS = Object.freeze({
  arcane: "Arcane Skills",
  forester: "Forester Skills",
  mental: "Mental Skills",
  performance: "Performance Skills",
  physical: "Physical Skills",
  rogue: "Rogue Skills",
  social: "Social Skills",
  work: "Work Skills"
});

/** @type {Readonly<Record<string, string>>} */
export const KNOWLEDGE_CATEGORY_LABELS = Object.freeze({
  arcane: "Arcane Knowledges",
  casual: "Casual Knowledges",
  formal: "Formal Knowledges"
});

export const ARM2E = Object.freeze({
  CHARACTERISTICS,
  TECHNIQUES,
  FORMS,
  TALENTS,
  SKILLS,
  KNOWLEDGES,
  ABILITY_ENTRIES,
  ABILITY_BY_KEY,
  getAbilityByKey,
  getAbilityByLabel,
  WEAPON_SKILLS,
  TALENT_CATEGORIES,
  SKILL_CATEGORIES,
  KNOWLEDGE_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  SKILL_CATEGORY_LABELS,
  KNOWLEDGE_CATEGORY_LABELS
});
