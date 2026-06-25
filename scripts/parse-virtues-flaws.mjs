#!/usr/bin/env node
/**
 * Parse ArM5 Chapter Four virtues and flaws markdown into Foundry virtueFlaw Item seed data.
 * Source: Project Redcap OGL — https://www.redcap.org/page/Ars_Magica_5E_Standard_Edition,_Chapter_Four:_Virtues_and_Flaws
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2]
  ?? join(root, "..", "src", "compendium-data", "sources", "arm5-virtues-flaws-ch4.md");
const outputPath = process.argv[3]
  ?? join(root, "..", "src", "compendium-data", "virtues-flaws-arm5.json");

const SOURCE = "ArM5 Chapter IV (CC BY-SA 4.0)";

const META_PATTERNS = [
  {
    regex: /^(Major or Minor),\s*(Personality|Story)(?:\s+(.*))?$/i,
    parse: ([, , category, rest]) => ({ magnitude: "major-or-minor", category, description: rest ?? "" })
  },
  {
    regex: /^(Personality|Story),\s*Major or Minor(?:\s+(.*))?$/i,
    parse: ([, category, rest]) => ({ magnitude: "major-or-minor", category, description: rest ?? "" })
  },
  {
    regex: /^(Minor|Major),\s*(Hermetic|General|Supernatural|Social Status|Personality|Story)(?:\s+(.*))?$/i,
    parse: ([, magnitude, category, rest]) => ({
      magnitude: magnitude.toLowerCase(),
      category,
      description: rest ?? ""
    })
  },
  {
    regex: /^(Social Status),\s*Free$/i,
    parse: ([, category]) => ({ magnitude: "free", category, description: "" })
  },
  {
    regex: /^Special$/i,
    parse: () => ({ magnitude: "special", category: "Hermetic", description: "" })
  }
];

/**
 * @param {string} line
 */
function parseMetaLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  for (const pattern of META_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) return pattern.parse(match);
  }

  return null;
}

/**
 * @param {string} magnitude
 */
function pointsForMagnitude(magnitude) {
  switch (magnitude) {
    case "major": return 3;
    case "minor": return 1;
    case "free":
    case "special": return 0;
    default: return 1;
  }
}

/**
 * @param {string} text
 */
function cleanDescription(text) {
  return text
    .split(/\n\*\*Attribution\*\*/)[0]
    .split(/\n#{1,6}\s*Attribution/i)[0]
    .split(/\n---\n/)[0]
    .split(/\nRetrieved from /)[0]
    .replace(/\n\|[^\n]*\|/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * @param {string} block
 * @param {"virtue"|"flaw"} kind
 */
function parseEntryBlock(block, kind) {
  const lines = block.split(/\r?\n/);
  const name = lines[0]?.trim();
  if (!name) return [];

  let meta = null;
  let descriptionParts = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    if (!meta) {
      const parsed = parseMetaLine(line);
      if (parsed) {
        meta = parsed;
        if (parsed.description) descriptionParts.push(parsed.description);
      }
      continue;
    }

    descriptionParts.push(lines[index]);
  }

  if (!meta) return [];

  const description = cleanDescription(descriptionParts.join("\n"));
  const results = [];

  /**
   * @param {string} entryName
   * @param {string} magnitude
   * @param {number} points
   */
  function pushEntry(entryName, magnitude, points) {
    results.push({
      name: entryName,
      type: "virtueFlaw",
      system: {
        kind,
        points,
        magnitude,
        category: meta.category,
        description,
        source: SOURCE
      }
    });
  }

  if (meta.magnitude === "major-or-minor") {
    pushEntry(`${name} (Major)`, "major", 3);
    pushEntry(`${name} (Minor)`, "minor", 1);
    return results;
  }

  pushEntry(name, meta.magnitude, pointsForMagnitude(meta.magnitude));
  return results;
}

/**
 * @param {string} markdown
 * @param {string} heading
 * @param {"virtue"|"flaw"} kind
 */
function parseSection(markdown, heading, kind) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start < 0) return [];

  const after = markdown.slice(start + marker.length);
  const nextHeading = kind === "virtue"
    ? after.indexOf("\n## Flaws")
    : after.search(/\n\*\*Attribution\*\*/);
  const section = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
  const items = [];

  for (const block of section.split(/\n#### /).slice(1)) {
    items.push(...parseEntryBlock(block, kind));
  }

  return items;
}

const markdown = readFileSync(inputPath, "utf8");
const virtues = parseSection(markdown, "Virtues", "virtue");
const flaws = parseSection(markdown, "Flaws", "flaw");
const items = [...virtues, ...flaws].sort((left, right) => {
  if (left.system.kind !== right.system.kind) {
    return left.system.kind === "virtue" ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
});

writeFileSync(outputPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");

console.log(`Parsed ${virtues.length} virtues and ${flaws.length} flaws -> ${outputPath}`);
console.log(`  Total entries: ${items.length}`);
