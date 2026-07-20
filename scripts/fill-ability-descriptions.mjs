#!/usr/bin/env node
/**
 * Fill ability descriptions from ArM5 Ch.5 OGL (clean) + 2e-only fallbacks.
 * Prefer existing non-empty descriptions unless --force.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, "..");
const abilitiesPath = join(projectRoot, "src", "compendium-data", "abilities.json");
const sourcesDir = join(projectRoot, "src", "compendium-data", "sources");
const arm5Source = join(sourcesDir, "arm5-abilities-ch5.md");
const agentSource = join(
  "C:",
  "Users",
  "Ralphs Study",
  ".cursor",
  "projects",
  "c-Users-Ralphs-Study-ars-magica-ars-magica-2e",
  "agent-tools",
  "7afb300c-6594-4011-95f5-f4b54c9a2a55.txt"
);

const force = process.argv.includes("--force");
const SOURCE_NOTE = "\n\n(ArM5 Ch.5 OGL reference text — concepts map to 2e ability use; verify saga house rules.)";

/** 2e-only or OCR-fallback blurbs when ArM5 has no matching entry */
const MANUAL_2E = {
  Contortions: "Add your score to any roll to break free of a hold or restraint, squeeze into a small space, or get through a small opening. Specialties: ropes, breaking people's holds, crawl, squeeze. (Dex, Str)",
  "Direction Sense": "You can determine which way is north on a roll of 9+. Specialties: underground, in towns, in woods, at sea. (Per)",
  Empathy: "You can intuitively understand the emotional needs of others and can therefore respond to them correctly. Add your score to appropriate Com, Prs, and Folk Ken rolls. Specialties: warriors, those in need, anger.",
  Subterfuge: "Figuring out the motivations and temperaments of others and using that insight to your favor. Subterfuge can be used to justify conduct, escape blame, or navigate social traps. Specialties: excuses, politics, court, clergy.",
  Jongleur: "Entertaining with juggling, tumbling, and popular humor. Jongleurs can be found in the marketplace and at noble gatherings. Specialties: juggling, tumbling, jokes, a particular audience. (Dex, Com)",
  Forgery: "Forging documents and wax seals. Requires the ability to scribe the relevant alphabet. Specialties: seals, papal documents, local charters. (Dex, Int)",
  "Hermes History": "Knowledge of the Order's history, including its founders, schisms, and famous covenants. Specialties: a House, a Tribunal, the Schism War. (Int)",
  "Hermes Lore": "Knowledge concerning the mystical Order of Hermes — customs, politics, famous magi, and how the Order works day to day. Specialties: a House, Quaesitores, Redcaps. (Int)",
  "Church Knowledge": "Formal knowledge of Church doctrine, hierarchy, and practice beyond casual Church Lore. Specialties: canon law, liturgy, a religious order. (Int)",
  Alertness: "Noticing something that you're not looking or listening for — surprise, ambush, or something interesting happening nearby. Specialties: bodyguarding, traps, ambushes. (Per)",
  Scan: "Noticing things that you are looking or listening for — faint sounds, distant riders, whispered speech. Specialties: keeping watch, quick scan, sea, woods. (Per)",
  Search: "Looking for something in a small area — a ring in a larder, concealed doors, hidden people. Specialties: in the dark, sounds, places. (Per)",
  Pretend: "Acting a role or feigning an identity in social situations. Related to Guile and Acting. Specialties: nobility, peasantry, clergy. (Com)",
  Charisma: "Personal force of presence that draws attention and loyalty beyond mere Charm. Specialties: inspiring crowds, commanding respect. (Prs)",
  "Weather Sense": "Sensing coming weather changes. Specialties: storms, fair weather, mountains, sea. (Per)",
  Visions: "Receiving prophetic or symbolic visions. Specialties: personal danger, the covenant, the Church. (Per)",
  Hex: "Laying curses through folk magic. Specialties: livestock, love, illness. (Int)",
  Healer: "Folk healing without formal Chirurgy training. Specialties: herbs, childbirth, fever. (Int)",
  Mimicry: "Imitating voices and sounds. Specialties: birds, specific people, animals. (Com)",
  "Perfect Balance": "Keeping your footing in precarious places. Specialties: rooftops, ships, ice. (Dex)",
  Premonitions: "Vague forewarnings of danger or significant events. Specialties: personal harm, betrayal, weather disasters. (Per)",
  "Read Lips": "Understanding speech by watching mouths. Specialties: court, marketplace, distance. (Per)",
  "Second Sight": "Seeing spirits, faeries, and other invisible supernatural things. Specialties: ghosts, faeries, regio boundaries. (Per)",
  "Magic Sensitivity": "Feeling the presence and nature of magic. Specialties: auras, enchanted items, active spells. (Per)",
  Entrancement: "Holding others' attention and influencing them with your gaze and presence. Specialties: seduction, intimidation, animals. (Prs)",
  Meditation: "Focused contemplation useful for recovering Fatigue and mental clarity. Specialties: ignoring pain, recovering Fatigue, prayer. (Stm)",
  Concentration: "Maintaining focus despite distraction — vital for spells and delicate work. Specialties: while wounded, in combat, noisy places. (Stm)",
  "Animal Handling": "Care and training of animals. Specialties: horses, hounds, falcons. (Com)",
  Survival: "Living off the land and enduring wilderness hardship. Specialties: mountains, forests, winter. (Per)",
  Track: "Following trails and reading signs of passage. Specialties: people, animals, in snow. (Per)",
  Acting: "Theatrical performance and assuming a character. Specialties: tragedy, comedy, improvisation. (Com)",
  Storytelling: "Holding an audience with tales. Specialties: heroic epics, local legends, frightening stories. (Com)",
  Sing: "Vocal music. Specialties: liturgical, courtly, folk. (Com)",
  Diplomacy: "Formal negotiation between parties. Specialties: treaties, Church, merchants. (Com)",
  Drinking: "Holding your liquor and social drinking contests. Specialties: staying sober, drinking songs. (Stm)",
  Intimidation: "Cowwing others through threat or force of personality. Specialties: physical menace, status, blackmail. (Prs)",
  Leadership: "Commanding and organizing people. Specialties: grogs, peasants, in battle. (Prs)",
  Boating: "Handling small craft on rivers and coasts. Specialties: rivers, coastal waters, in storms. (Dex)",
  Stealth: "Moving unseen and unheard. Specialties: urban, wilderness, shadowing. (Qik)",
  Ride: "Controlling a mount. Specialties: combat, long travel, difficult terrain. (Dex)",
  Swim: "Moving through water without drowning. Specialties: rivers, armor, distance. (Stm)",
  "Pick Locks": "Opening locks without keys. Specialties: padlocks, chests, doors. (Dex)",
  Legerdemain: "Sleight of hand and filching. Specialties: cutting purses, card tricks, concealing objects. (Dex)",
  "Speak (Specific Alphabet)": "Speaking a specific language you name in the specialty. (Int)",
  "Scribe (Specific Alphabet)": "Reading and writing a specific alphabet you name in the specialty. (Int)",
  "(Area) Lore": "Knowledge of a particular region you name — places, people, legends, and politics. (Int)",
  "Craft (Specify)": "A specific craft trade you name. (Dex or Int)",
  "Evaluate (Specific Items)": "Appraising a category of goods you name. (Int)",
  "Play (Specific Instrument)": "Playing a musical instrument you name. (Dex)",
  "Fantastic Beast Lore": "Knowledge of magical and legendary beasts. Specialties: dragons, unicorns, sea monsters. (Int)",
  "Occult Lore": "Knowledge of hedge magic, superstition, and forbidden practices outside Hermetic theory. Specialties: witches, folk charms, demons. (Int)",
  "Legend Lore": "Knowledge of myths, heroes, and legendary places. Specialties: a region, a hero, relics. (Int)",
  "Faerie Lore": "Knowledge of faeries and their ways. Specialties: a court, bargains, regio. (Int)",
  "Church Lore": "Casual knowledge of the Church as an institution and local practice. Specialties: a diocese, monastic orders, saints. (Int)",
  "Magic Theory": "Hermetic understanding of how magic works — essential for laboratory work. Specialties: inventing spells, enchanting items, vis. (Int)",
  Humanities: "Classical learning — rhetoric, history, and letters. Specialties: poetry, history, philosophy. (Int)",
  Medicine: "Formal medical theory and treatment of disease (distinct from Chirurgy for wounds). Specialties: diagnosis, humors, herbs. (Int)",
  Certámen: "Formal Hermetic magical contest between magi. Specialties: a Technique, a Form. (Int)",
  "Parma Magica": "The Hermetic ritual shield against magic. Score × 5 contributes to magic resistance (plus Form). Specialties: a Form. (Int)",
  "Single Weapon": "Fighting with a one-handed melee weapon. Used with LoM/ArM5 Single ability weapons. Specialties: any one weapon.",
  "Great Weapon": "Fighting with two-handed or pole weapons. Used with LoM/ArM5 Great ability weapons. Specialties: any one weapon.",
  Bow: "Shooting bows. Used with LoM/ArM5 Bow ability weapons. Specialties: any one weapon.",
  "Thrown Weapon": "Throwing weapons such as knives, javelins, and axes. Specialties: any one weapon.",
  Crossbow: "Shooting crossbows. Specialties: any one weapon.",
  Brawl: "Fighting unarmed and with casual weapons such as knives or improvised clubs. Specialties: punches, grapples, knives.",
  Dodge: "Getting out of the way of attacks and other dangers. Specialties: missiles, melee, in crowds.",
  Climb: "Ascending and descending surfaces. Specialties: cliffs, walls, trees. (Stm)",
  Finesse: "Manipulating your spells and performing special feats with them — targeting, delicate placement, graceful magic. Specialties: grace, precision, any one Form. (Per)",
  Penetration: "Getting your spell through a target's magic resistance. Add to the casting roll when comparing to resistance. Specialties: any one Form or Technique."
};

/** Map our ability names → ArM5 Ch.5 headings */
const ARM5_NAME_MAP = {
  Athletics: "Athletics",
  Charm: "Charm",
  Chirurgy: "Chirurgy (Kie-Ruhr-Gee)*",
  Intrigue: "Intrigue",
  "Enchanting Music": "Enchanting Music",
  "Sense Holiness & Unholiness": "Sense Holiness and Unholiness",
  "Hermes Lore": "Code of Hermes*", // partial — better use Magic Lore? Actually Order of Hermes lore is often Code + Magic. Prefer Code of Hermes for Hermes Lore custom below
  Brawl: "Brawl",
  Bow: "Bows",
  "Single Weapon": "Single Weapon",
  "Great Weapon": "Great Weapon",
  "Thrown Weapon": "Thrown Weapon",
  Ride: "Ride",
  Swim: "Swim",
  Stealth: "Stealth",
  Survival: "Survival",
  "Animal Handling": "Animal Handling",
  Concentration: "Concentration",
  Leadership: "Leadership",
  Legerdemain: "Legerdemain*",
  Guile: "Guile",
  "Folk Ken": "Folk Ken",
  Finesse: "Finesse",
  Penetration: "Penetration",
  "Parma Magica": "Parma Magica*",
  "Magic Theory": "Magic Theory*",
  "Faerie Lore": "Faerie Lore*",
  "Animal Ken": "Animal Ken",
  "Second Sight": "Second Sight",
  Premonitions: "Premonitions",
  "Magic Sensitivity": "Magic Sensitivity",
  Entrancement: "Entrancement",
  "(Area) Lore": "(Area) Lore*",
  Medicine: "Medicine*",
  "Craft (Specify)": "Craft (Type)",
  "Play (Specific Instrument)": "Music"
};

/**
 * @param {string} markdown
 */
function parseArm5Abilities(markdown) {
  const map = new Map();
  const parts = markdown.split(/\n### /);
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    if (nl < 0) continue;
    const heading = part.slice(0, nl).trim();
    const body = part.slice(nl + 1).trim().split(/\n## /)[0].trim();
    if (!heading || body.length < 20) continue;
    map.set(heading.toLowerCase(), body);
    // also key without asterisks / pronunciation
    const simple = heading.replace(/\*|^\([^)]+\)\s*/g, "").replace(/\s*\([^)]*\)\*?$/g, "").trim();
    map.set(simple.toLowerCase(), body);
  }
  return map;
}

/**
 * @param {string} name
 * @param {Map<string, string>} arm5
 */
function resolveDescription(name, arm5) {
  const mapped = ARM5_NAME_MAP[name];
  if (mapped) {
    const key = mapped.toLowerCase();
    if (arm5.has(key)) return `${arm5.get(key)}${SOURCE_NOTE}`;
    const simple = mapped.replace(/\*/g, "").toLowerCase();
    if (arm5.has(simple)) return `${arm5.get(simple)}${SOURCE_NOTE}`;
  }

  const direct = arm5.get(name.toLowerCase());
  if (direct) return `${direct}${SOURCE_NOTE}`;

  if (MANUAL_2E[name]) return MANUAL_2E[name];
  return "";
}

mkdirSync(sourcesDir, { recursive: true });
try {
  copyFileSync(agentSource, arm5Source);
} catch {
  // source may already exist
}

const markdown = readFileSync(arm5Source, "utf8");
const arm5 = parseArm5Abilities(markdown);
const abilities = JSON.parse(readFileSync(abilitiesPath, "utf8"));

let filled = 0;
let updated = 0;
let already = 0;

for (const ability of abilities) {
  const next = resolveDescription(ability.name, arm5);
  const current = String(ability.system.description ?? "").trim();

  if (current && !force) {
    already += 1;
    continue;
  }

  if (next) {
    ability.system.description = next;
    ability.system.source = ability.system.source || "ArM5 Ch.5 / ArM2e Abilities (CC BY-SA 4.0 where OGL)";
    if (current) updated += 1;
    else filled += 1;
  }
}

writeFileSync(abilitiesPath, `${JSON.stringify(abilities, null, 2)}\n`, "utf8");

const stillEmpty = abilities.filter((a) => !String(a.system.description ?? "").trim()).map((a) => a.name);
console.log(`Abilities: filled ${filled}, updated ${updated}, kept existing ${already}, total ${abilities.length}`);
console.log(`Still empty (${stillEmpty.length}): ${stillEmpty.join(", ") || "none"}`);
