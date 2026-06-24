/**
 * Ars Magica 2nd Edition system registry.
 * Source: AG0201 core rules, Ch. 1 (Character) & Ch. 2 (Abilities).
 */

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

/** @type {ReadonlyArray<string>} */
export const TALENTS = Object.freeze([
  // Arcane Talents
  "Finesse",
  "Penetration",
  // Awareness Talents
  "Alertness",
  "Scan",
  "Search",
  // Exceptional Talents
  "Alchemy",
  "Animal Ken",
  "Contortions",
  "Direction Sense",
  "Empathy",
  "Enchanting Music",
  "Entrancement",
  "Healer",
  "Hex",
  "Magic Sensitivity",
  "Mimicry",
  "Perfect Balance",
  "Premonitions",
  "Read Lips",
  "Second Sight",
  "Sense Holiness & Unholiness",
  "Visions",
  "Weather Sense",
  // Physical Talents
  "Athletics",
  "Climb",
  "Dodge",
  // Social Talents
  "Charisma",
  "Charm",
  "Guile",
  "Folk Ken",
  "Pretend",
  "Subterfuge"
]);

/** @type {ReadonlyArray<string>} */
export const SKILLS = Object.freeze([
  // Arcane Skills
  "Certámen",
  "Parma Magica",
  // Forester Skills
  "Animal Handling",
  "Survival",
  "Track",
  // Mental Skills
  "Concentration",
  "Meditation",
  // Performance Skills
  "Acting",
  "Storytelling",
  "Jongleur",
  "Sing",
  "Play (Specific Instrument)",
  // Physical Skills
  "Brawl",
  "Ride",
  "Swim",
  // Rogue Skills
  "Forgery",
  "Legerdemain",
  "Pick Locks",
  "Stealth",
  // Social Skills
  "Diplomacy",
  "Drinking",
  "Intimidation",
  "Intrigue",
  "Leadership",
  // Work Skills
  "Boating",
  "Chirurgy",
  "Craft (Specify)",
  "Evaluate (Specific Items)"
]);

/**
 * Weapon skills in 2e are chosen per specific weapon (attack and parry separately).
 * @type {Readonly<{ note: string }>}
 */
export const WEAPON_SKILLS = Object.freeze({
  note: "Choose a specific weapon; attack and parry are separate skills (see Combat chapter)."
});

/** @type {ReadonlyArray<string>} */
export const KNOWLEDGES = Object.freeze([
  // Arcane Knowledges
  "Hermes History",
  "Hermes Lore",
  "Magic Theory",
  // Casual Knowledges
  "(Area) Lore",
  "Church Lore",
  "Faerie Lore",
  "Fantastic Beast Lore",
  "Legend Lore",
  "Occult Lore",
  "Speak (Specific Alphabet)",
  // Formal Knowledges
  "Church Knowledge",
  "Humanities",
  "Medicine",
  "Scribe (Specific Alphabet)"
]);

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const TALENT_CATEGORIES = Object.freeze({
  arcane: Object.freeze(["Finesse", "Penetration"]),
  awareness: Object.freeze(["Alertness", "Scan", "Search"]),
  exceptional: Object.freeze([
    "Alchemy",
    "Animal Ken",
    "Contortions",
    "Direction Sense",
    "Empathy",
    "Enchanting Music",
    "Entrancement",
    "Healer",
    "Hex",
    "Magic Sensitivity",
    "Mimicry",
    "Perfect Balance",
    "Premonitions",
    "Read Lips",
    "Second Sight",
    "Sense Holiness & Unholiness",
    "Visions",
    "Weather Sense"
  ]),
  physical: Object.freeze(["Athletics", "Climb", "Dodge"]),
  social: Object.freeze(["Charisma", "Charm", "Guile", "Folk Ken", "Pretend", "Subterfuge"])
});

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const SKILL_CATEGORIES = Object.freeze({
  arcane: Object.freeze(["Certámen", "Parma Magica"]),
  forester: Object.freeze(["Animal Handling", "Survival", "Track"]),
  mental: Object.freeze(["Concentration", "Meditation"]),
  performance: Object.freeze(["Acting", "Storytelling", "Jongleur", "Sing", "Play (Specific Instrument)"]),
  physical: Object.freeze(["Brawl", "Ride", "Swim"]),
  rogue: Object.freeze(["Forgery", "Legerdemain", "Pick Locks", "Stealth"]),
  social: Object.freeze(["Diplomacy", "Drinking", "Intimidation", "Intrigue", "Leadership"]),
  work: Object.freeze(["Boating", "Chirurgy", "Craft (Specify)", "Evaluate (Specific Items)"])
});

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const KNOWLEDGE_CATEGORIES = Object.freeze({
  arcane: Object.freeze(["Hermes History", "Hermes Lore", "Magic Theory"]),
  casual: Object.freeze([
    "(Area) Lore",
    "Church Lore",
    "Faerie Lore",
    "Fantastic Beast Lore",
    "Legend Lore",
    "Occult Lore",
    "Speak (Specific Alphabet)"
  ]),
  formal: Object.freeze(["Church Knowledge", "Humanities", "Medicine", "Scribe (Specific Alphabet)"])
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

/** @type {Readonly<{
 *   CHARACTERISTICS: typeof CHARACTERISTICS,
 *   TECHNIQUES: typeof TECHNIQUES,
 *   FORMS: typeof FORMS,
 *   TALENTS: typeof TALENTS,
 *   SKILLS: typeof SKILLS,
 *   KNOWLEDGES: typeof KNOWLEDGES,
 *   WEAPON_SKILLS: typeof WEAPON_SKILLS,
 *   TALENT_CATEGORIES: typeof TALENT_CATEGORIES,
 *   SKILL_CATEGORIES: typeof SKILL_CATEGORIES,
 *   KNOWLEDGE_CATEGORIES: typeof KNOWLEDGE_CATEGORIES,
 *   TALENT_CATEGORY_LABELS: typeof TALENT_CATEGORY_LABELS,
 *   SKILL_CATEGORY_LABELS: typeof SKILL_CATEGORY_LABELS,
 *   KNOWLEDGE_CATEGORY_LABELS: typeof KNOWLEDGE_CATEGORY_LABELS
 * }>} */
export const ARM2E = Object.freeze({
  CHARACTERISTICS,
  TECHNIQUES,
  FORMS,
  TALENTS,
  SKILLS,
  KNOWLEDGES,
  WEAPON_SKILLS,
  TALENT_CATEGORIES,
  SKILL_CATEGORIES,
  KNOWLEDGE_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  SKILL_CATEGORY_LABELS,
  KNOWLEDGE_CATEGORY_LABELS
});
