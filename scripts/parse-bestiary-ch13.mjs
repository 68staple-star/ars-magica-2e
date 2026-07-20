#!/usr/bin/env node
/**
 * Parse ArM5 Chapter 13 Bestiary OGL into Actor (beast) seed documents.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, "..");
const sourcesDir = join(projectRoot, "src", "compendium-data", "sources");
const outPath = join(projectRoot, "src", "compendium-data", "beasts-arm5-ch13.json");
const agentSource = join(
  "C:",
  "Users",
  "Ralphs Study",
  ".cursor",
  "projects",
  "c-Users-Ralphs-Study-ars-magica-ars-magica-2e",
  "agent-tools",
  "070b6357-cfd1-4004-84da-b62855f23a95.txt"
);
const localSource = join(sourcesDir, "arm5-bestiary-ch13.md");

const SOURCE = "ArM5 Chapter XIII Bestiary (CC BY-SA 4.0)";

const REALM_HEADINGS = {
  "Creatures of Magic": "Magic",
  "Creatures of Faerie": "Faerie",
  "Infernal Creatures": "Infernal",
  "Creatures of the Divine": "Divine"
};

/**
 * @param {string} block
 * @param {string} label
 */
function sectionAfter(block, label) {
  const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:Powers|Combat|Virtues|Abilities|Equipment|Encumbrance|Vis|Appearance|Fatigue|Wound|Characteristics|Size|Age|Confidence|Reputations|Personality):|\\n### |\\n## |$)`, "i");
  const match = block.match(re);
  return match ? match[1].trim() : "";
}

/**
 * @param {string} markdown
 */
function parseBeasts(markdown) {
  let realm = "Magic";
  /** @type {object[]} */
  const beasts = [];

  const lines = markdown.split(/\r?\n/);
  /** @type {{ name: string, realm: string, body: string[] } | null} */
  let current = null;

  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n").trim();
    if (body.length < 40) {
      current = null;
      return;
    }

    const combat = sectionAfter(body, "Combat");
    const powers = sectionAfter(body, "Powers");
    const vis = sectionAfter(body, "Vis");
    const appearance = sectionAfter(body, "Appearance");
    const abilities = sectionAfter(body, "Abilities");

    // Narrative = body without structured combat/powers headers preference
    let description = body
      .replace(/^Powers:[\s\S]*?(?=\n[A-Z][^\n]{20,}|\nCombat:|$)/i, "")
      .replace(/^Combat:[\s\S]*?(?=\nPowers:|\n[A-Z][^\n]{40,}|$)/i, "")
      .trim();

    // Prefer trailing prose paragraphs
    const proseChunks = body
      .split(/\n\n+/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => (
        chunk.length > 80
        && !/^Powers:/i.test(chunk)
        && !/^Combat:/i.test(chunk)
        && !/^- /.test(chunk)
      ));

    if (proseChunks.length) {
      description = proseChunks.join("\n\n");
    }

    if (appearance) {
      description = `${description}\n\nAppearance: ${appearance}`.trim();
    }

    description = `${description}\n\nArM5 Ch.13 OGL creature — Might/combat numbers use later-edition framing; adapt Soak/Init/Atk for 2e table play as needed.`.trim();

    const mightMatch = body.match(/(Magic|Faerie|Infernal|Divine)\s+Might:\s*(\d+)/i);
    const sizeMatch = body.match(/Size:\s*([+-]?\d+)/i);
    const soakMatch = body.match(/Soak:\s*([+-]?\d+)/i);

    beasts.push({
      name: current.name,
      type: "beast",
      img: "icons/svg/mystery-man.svg",
      system: {
        realm: current.realm,
        might: mightMatch ? Number(mightMatch[2]) : 0,
        mightForm: "",
        size: sizeMatch ? Number(sizeMatch[1]) : 0,
        soak: soakMatch ? Number(soakMatch[1]) : 0,
        characteristics: {
          intelligence: 0,
          perception: 0,
          strength: 0,
          stamina: 0,
          presence: 0,
          communication: 0,
          dexterity: 0,
          quickness: 0,
          cunning: 0
        },
        combat: combat || "",
        powers: powers || "",
        abilities: abilities || "",
        vis: vis || "",
        description,
        source: SOURCE
      }
    });

    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("## ")) {
      flush();
      const heading = line.replace(/^##\s+/, "").trim();
      if (REALM_HEADINGS[heading]) realm = REALM_HEADINGS[heading];
      continue;
    }

    if (line.startsWith("### ")) {
      flush();
      const name = line.replace(/^###\s+/, "").trim();
      if (/^Creating Creatures|^Creature /i.test(name)) continue;
      current = { name, realm, body: [] };
      continue;
    }

    if (!current) continue;
    if (line.startsWith("Attribution ") || line.startsWith("| Ars Magica") || line.startsWith("Retrieved from")) {
      flush();
      continue;
    }
    current.body.push(raw);
  }

  flush();
  return beasts;
}

mkdirSync(sourcesDir, { recursive: true });
try {
  copyFileSync(agentSource, localSource);
} catch {
  // already present
}

const markdown = readFileSync(localSource, "utf8");
const beasts = parseBeasts(markdown);
beasts.sort((a, b) => a.name.localeCompare(b.name));

/** Sample human NPCs (character Actors) for quick story use */
const sampleNpcs = [
  {
    name: "Veteran Covenant Grog",
    type: "character",
    img: "icons/svg/sword.svg",
    system: {
      identity: {
        age: 34,
        characterType: "grog",
        biography: "A scarred turb sergeant who has guarded the covenant for a decade. Practical, loyal when paid, and suspicious of Gifted strangers until proven useful.",
        covenant: "",
        house: "",
        gender: "",
        yearBorn: 1186,
        currentYear: 1220,
        decrepitude: 0
      },
      characteristics: {
        intelligence: 0,
        perception: 1,
        strength: 2,
        stamina: 2,
        presence: 0,
        communication: -1,
        dexterity: 1,
        quickness: 1
      },
      confidence: { value: 1, max: 1 },
      personality: { traits: "Loyal, Suspicious, Brave", reputation: "Steady turb", locationScore: 0 },
      combat: { size: 0, extraLoad: 0 },
      arts: { techniques: {}, forms: {} }
    }
  },
  {
    name: "Village Priest",
    type: "character",
    img: "icons/svg/holy-symbol.svg",
    system: {
      identity: {
        age: 48,
        characterType: "companion",
        biography: "Parish priest of a nearby village. Educated enough to read Latin, worried about faeries and magic near his flock, but willing to bargain if the covenant protects his people.",
        covenant: "",
        house: "",
        gender: "",
        yearBorn: 1172,
        currentYear: 1220,
        decrepitude: 0
      },
      characteristics: {
        intelligence: 1,
        perception: 1,
        strength: -1,
        stamina: 0,
        presence: 1,
        communication: 2,
        dexterity: 0,
        quickness: -1
      },
      confidence: { value: 2, max: 2 },
      personality: { traits: "Pious, Cautious, Compassionate", reputation: "Village pastor", locationScore: 2 },
      combat: { size: 0, extraLoad: 0 },
      arts: { techniques: {}, forms: {} }
    }
  },
  {
    name: "Traveling Merchant",
    type: "character",
    img: "icons/svg/coins.svg",
    system: {
      identity: {
        age: 29,
        characterType: "companion",
        biography: "A cloth merchant on the road between towns. Knows gossip, tolls, and who bribes whom. Useful contact — and a magnet for bandits and demons of greed.",
        covenant: "",
        house: "",
        gender: "",
        yearBorn: 1191,
        currentYear: 1220,
        decrepitude: 0
      },
      characteristics: {
        intelligence: 1,
        perception: 1,
        strength: 0,
        stamina: 0,
        presence: 1,
        communication: 2,
        dexterity: 0,
        quickness: 0
      },
      confidence: { value: 2, max: 2 },
      personality: { traits: "Shrewd, Gregarious, Greedy", reputation: "Fair trader", locationScore: 1 },
      combat: { size: 0, extraLoad: 0 },
      arts: { techniques: {}, forms: {} }
    }
  }
];

const all = [...beasts, ...sampleNpcs];
writeFileSync(outPath, `${JSON.stringify(all, null, 2)}\n`, "utf8");
console.log(`Parsed ${beasts.length} beasts + ${sampleNpcs.length} sample NPCs -> ${outPath}`);
for (const beast of beasts) {
  console.log(`  - [${beast.system.realm}] ${beast.name} (desc ${beast.system.description.length}c)`);
}
