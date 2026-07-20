/**
 * Structured ability registry with characteristic mappings (AG0201 Ch. 2, pp. 157–160).
 * @typedef {"talents" | "skills" | "knowledges"} AbilityCategory
 * @typedef {{ key: string, label: string, category: AbilityCategory, subgroup: string, characteristic: string, alternates?: string[] }} AbilityDefinition
 */

/** @type {ReadonlyArray<AbilityDefinition>} */
export const ABILITY_ENTRIES = Object.freeze([
  // Arcane Talents
  { key: "finesse", label: "Finesse", category: "talents", subgroup: "arcane", characteristic: "intelligence" },
  { key: "penetration", label: "Penetration", category: "talents", subgroup: "arcane", characteristic: "intelligence" },
  // Awareness Talents
  { key: "alertness", label: "Alertness", category: "talents", subgroup: "awareness", characteristic: "perception" },
  { key: "scan", label: "Scan", category: "talents", subgroup: "awareness", characteristic: "perception" },
  { key: "search", label: "Search", category: "talents", subgroup: "awareness", characteristic: "perception" },
  // Exceptional Talents
  { key: "alchemy", label: "Alchemy", category: "talents", subgroup: "exceptional", characteristic: "intelligence" },
  { key: "animal-ken", label: "Animal Ken", category: "talents", subgroup: "exceptional", characteristic: "intelligence" },
  { key: "contortions", label: "Contortions", category: "talents", subgroup: "exceptional", characteristic: "dexterity" },
  { key: "direction-sense", label: "Direction Sense", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "empathy", label: "Empathy", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "enchanting-music", label: "Enchanting Music", category: "talents", subgroup: "exceptional", characteristic: "communication" },
  { key: "entrancement", label: "Entrancement", category: "talents", subgroup: "exceptional", characteristic: "presence" },
  { key: "healer", label: "Healer", category: "talents", subgroup: "exceptional", characteristic: "intelligence" },
  { key: "hex", label: "Hex", category: "talents", subgroup: "exceptional", characteristic: "intelligence" },
  { key: "magic-sensitivity", label: "Magic Sensitivity", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "mimicry", label: "Mimicry", category: "talents", subgroup: "exceptional", characteristic: "communication" },
  { key: "perfect-balance", label: "Perfect Balance", category: "talents", subgroup: "exceptional", characteristic: "dexterity" },
  { key: "premonitions", label: "Premonitions", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "read-lips", label: "Read Lips", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "second-sight", label: "Second Sight", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "sense-holiness-unholiness", label: "Sense Holiness & Unholiness", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "visions", label: "Visions", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  { key: "weather-sense", label: "Weather Sense", category: "talents", subgroup: "exceptional", characteristic: "perception" },
  // Physical Talents
  { key: "athletics", label: "Athletics", category: "talents", subgroup: "physical", characteristic: "stamina" },
  { key: "climb", label: "Climb", category: "talents", subgroup: "physical", characteristic: "stamina" },
  { key: "dodge", label: "Dodge", category: "talents", subgroup: "physical", characteristic: "quickness" },
  // Social Talents
  { key: "charisma", label: "Charisma", category: "talents", subgroup: "social", characteristic: "presence" },
  { key: "charm", label: "Charm", category: "talents", subgroup: "social", characteristic: "communication" },
  { key: "guile", label: "Guile", category: "talents", subgroup: "social", characteristic: "communication" },
  { key: "folk-ken", label: "Folk Ken", category: "talents", subgroup: "social", characteristic: "perception" },
  { key: "pretend", label: "Pretend", category: "talents", subgroup: "social", characteristic: "communication" },
  { key: "subterfuge", label: "Subterfuge", category: "talents", subgroup: "social", characteristic: "intelligence" },
  // Arcane Skills
  { key: "certamen", label: "Certámen", category: "skills", subgroup: "arcane", characteristic: "intelligence" },
  { key: "parma-magica", label: "Parma Magica", category: "skills", subgroup: "arcane", characteristic: "intelligence" },
  // Forester Skills
  { key: "animal-handling", label: "Animal Handling", category: "skills", subgroup: "forester", characteristic: "communication" },
  { key: "survival", label: "Survival", category: "skills", subgroup: "forester", characteristic: "perception" },
  { key: "track", label: "Track", category: "skills", subgroup: "forester", characteristic: "perception" },
  // Mental Skills
  { key: "concentration", label: "Concentration", category: "skills", subgroup: "mental", characteristic: "stamina" },
  { key: "meditation", label: "Meditation", category: "skills", subgroup: "mental", characteristic: "stamina" },
  // Performance Skills
  { key: "acting", label: "Acting", category: "skills", subgroup: "performance", characteristic: "communication" },
  { key: "storytelling", label: "Storytelling", category: "skills", subgroup: "performance", characteristic: "communication" },
  { key: "jongleur", label: "Jongleur", category: "skills", subgroup: "performance", characteristic: "dexterity" },
  { key: "sing", label: "Sing", category: "skills", subgroup: "performance", characteristic: "communication" },
  { key: "play-specific-instrument", label: "Play (Specific Instrument)", category: "skills", subgroup: "performance", characteristic: "dexterity" },
  // Physical Skills (weapon groups map to LoM/ArM5 ability field on weapons)
  { key: "brawl", label: "Brawl", category: "skills", subgroup: "physical", characteristic: "dexterity" },
  { key: "single-weapon", label: "Single Weapon", category: "skills", subgroup: "physical", characteristic: "dexterity", alternates: ["Single"] },
  { key: "great-weapon", label: "Great Weapon", category: "skills", subgroup: "physical", characteristic: "dexterity", alternates: ["Great"] },
  { key: "bow", label: "Bow", category: "skills", subgroup: "physical", characteristic: "dexterity" },
  { key: "thrown-weapon", label: "Thrown Weapon", category: "skills", subgroup: "physical", characteristic: "dexterity", alternates: ["Thrown"] },
  { key: "crossbow", label: "Crossbow", category: "skills", subgroup: "physical", characteristic: "dexterity" },
  { key: "ride", label: "Ride", category: "skills", subgroup: "physical", characteristic: "dexterity" },
  { key: "swim", label: "Swim", category: "skills", subgroup: "physical", characteristic: "stamina" },
  // Rogue Skills
  { key: "forgery", label: "Forgery", category: "skills", subgroup: "rogue", characteristic: "dexterity" },
  { key: "legerdemain", label: "Legerdemain", category: "skills", subgroup: "rogue", characteristic: "dexterity" },
  { key: "pick-locks", label: "Pick Locks", category: "skills", subgroup: "rogue", characteristic: "dexterity" },
  { key: "stealth", label: "Stealth", category: "skills", subgroup: "rogue", characteristic: "quickness" },
  // Social Skills
  { key: "diplomacy", label: "Diplomacy", category: "skills", subgroup: "social", characteristic: "communication" },
  { key: "drinking", label: "Drinking", category: "skills", subgroup: "social", characteristic: "stamina" },
  { key: "intimidation", label: "Intimidation", category: "skills", subgroup: "social", characteristic: "presence" },
  { key: "intrigue", label: "Intrigue", category: "skills", subgroup: "social", characteristic: "intelligence" },
  { key: "leadership", label: "Leadership", category: "skills", subgroup: "social", characteristic: "presence" },
  // Work Skills
  { key: "boating", label: "Boating", category: "skills", subgroup: "work", characteristic: "dexterity" },
  { key: "chirurgy", label: "Chirurgy", category: "skills", subgroup: "work", characteristic: "intelligence" },
  { key: "craft-specify", label: "Craft (Specify)", category: "skills", subgroup: "work", characteristic: "dexterity", alternates: ["intelligence"] },
  { key: "evaluate-specific-items", label: "Evaluate (Specific Items)", category: "skills", subgroup: "work", characteristic: "intelligence" },
  // Arcane Knowledges
  { key: "hermes-history", label: "Hermes History", category: "knowledges", subgroup: "arcane", characteristic: "intelligence" },
  { key: "hermes-lore", label: "Hermes Lore", category: "knowledges", subgroup: "arcane", characteristic: "intelligence" },
  { key: "magic-theory", label: "Magic Theory", category: "knowledges", subgroup: "arcane", characteristic: "intelligence" },
  // Casual Knowledges
  { key: "area-lore", label: "(Area) Lore", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "church-lore", label: "Church Lore", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "faerie-lore", label: "Faerie Lore", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "fantastic-beast-lore", label: "Fantastic Beast Lore", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "legend-lore", label: "Legend Lore", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "occult-lore", label: "Occult Lore", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "speak-own-language", label: "Speak Own Language", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "speak-latin", label: "Speak Latin", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  { key: "speak-specific-alphabet", label: "Speak (Specific Alphabet)", category: "knowledges", subgroup: "casual", characteristic: "intelligence" },
  // Formal Knowledges
  { key: "church-knowledge", label: "Church Knowledge", category: "knowledges", subgroup: "formal", characteristic: "intelligence" },
  { key: "humanities", label: "Humanities", category: "knowledges", subgroup: "formal", characteristic: "intelligence" },
  { key: "medicine", label: "Medicine", category: "knowledges", subgroup: "formal", characteristic: "intelligence" },
  { key: "scribe-latin", label: "Scribe Latin", category: "knowledges", subgroup: "formal", characteristic: "intelligence" },
  { key: "scribe-specific-alphabet", label: "Scribe (Specific Alphabet)", category: "knowledges", subgroup: "formal", characteristic: "intelligence" }
]);

/**
 * @param {AbilityCategory} category
 * @returns {ReadonlyArray<string>}
 */
function labelsForCategory(category) {
  return Object.freeze(ABILITY_ENTRIES.filter((entry) => entry.category === category).map((entry) => entry.label));
}

/**
 * @param {AbilityCategory} category
 * @returns {Readonly<Record<string, ReadonlyArray<string>>>}
 */
function buildCategoryMap(category) {
  /** @type {Record<string, string[]>} */
  const map = {};

  for (const entry of ABILITY_ENTRIES) {
    if (entry.category !== category) continue;
    map[entry.subgroup] ??= [];
    map[entry.subgroup].push(entry.label);
  }

  return Object.freeze(
    Object.fromEntries(Object.entries(map).map(([key, labels]) => [key, Object.freeze(labels)]))
  );
}

/** @type {ReadonlyArray<string>} */
export const TALENTS = labelsForCategory("talents");

/** @type {ReadonlyArray<string>} */
export const SKILLS = labelsForCategory("skills");

/** @type {ReadonlyArray<string>} */
export const KNOWLEDGES = labelsForCategory("knowledges");

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const TALENT_CATEGORIES = buildCategoryMap("talents");

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const SKILL_CATEGORIES = buildCategoryMap("skills");

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const KNOWLEDGE_CATEGORIES = buildCategoryMap("knowledges");

/** @type {Readonly<Record<string, AbilityDefinition>>} */
export const ABILITY_BY_KEY = Object.freeze(
  Object.fromEntries(ABILITY_ENTRIES.map((entry) => [entry.key, entry]))
);

/**
 * @param {string} label
 * @returns {AbilityDefinition | undefined}
 */
export function getAbilityByLabel(label) {
  const normalized = String(label ?? "").trim().toLowerCase();
  if (!normalized) return undefined;
  return ABILITY_ENTRIES.find((entry) => {
    if (entry.label.toLowerCase() === normalized) return true;
    return (entry.alternates ?? []).some((alt) => alt.toLowerCase() === normalized);
  });
}

/**
 * @param {string} key
 * @returns {AbilityDefinition | undefined}
 */
export function getAbilityByKey(key) {
  return ABILITY_BY_KEY[key];
}
