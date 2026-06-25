#!/usr/bin/env node
/**
 * Parse ArM5 Appendix III spell index markdown into Foundry spell Item seed data.
 * Source: Project Redcap OGL — https://www.redcap.org/page/Ars_Magica_5E_Standard_Edition,_Appendix_III:_Spells_Index
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2]
  ?? join(root, "..", "src", "compendium-data", "sources", "arm5-spells-index.md");
const outputPath = process.argv[3]
  ?? join(root, "..", "src", "compendium-data", "spells-arm5-index.json");

const TECHNIQUE_MAP = {
  Cr: "creo",
  In: "intellego",
  Mu: "muto",
  Pe: "perdo",
  Re: "rego"
};

const FORM_MAP = {
  An: "animal",
  Aq: "aquam",
  Au: "auram",
  Co: "corporem",
  He: "herbam",
  Ig: "ignem",
  Im: "imagonem",
  Me: "mentem",
  Te: "terram",
  Vi: "vim"
};

const SPELL_LINE = /^(.+?)\s+\((Cr|In|Mu|Pe|Re)(An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)(?:\s+(Gen|\d+))?\)\s*$/;

/**
 * @param {string} raw
 */
function parseSpellLine(raw) {
  const line = raw.trim().replace(/\s{2,}/g, " ");
  const match = line.match(SPELL_LINE);
  if (!match) return null;

  const [, name, techAbbrev, formAbbrev, levelToken] = match;
  const technique = TECHNIQUE_MAP[techAbbrev];
  const form = FORM_MAP[formAbbrev];
  if (!technique || !form) return null;

  const isGeneral = levelToken === "Gen";
  const level = isGeneral ? 0 : Number(levelToken) || 0;
  const artAbbrev = `${techAbbrev}${formAbbrev}`;

  return {
    name: name.trim(),
    type: "spell",
    system: {
      level,
      technique,
      form,
      artAbbrev,
      isGeneral,
      range: "",
      duration: "",
      target: "",
      mastered: false,
      notes: isGeneral
        ? `ArM5 OGL spell index — General (${artAbbrev} Gen). Range, duration, and target not listed in the index.`
        : `ArM5 OGL spell index (${artAbbrev} ${level}). Range, duration, and target not listed in the index.`,
      source: "ArM5 Appendix III (CC BY-SA 4.0)",
      journal: ""
    }
  };
}

const markdown = readFileSync(inputPath, "utf8");
const spells = [];
const skipped = [];

for (const rawLine of markdown.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#") || line.startsWith("|") || line.startsWith("*")
    || line.startsWith("Source ") || line.startsWith("Title:") || line.startsWith("Jump ")
    || line.startsWith("From Project") || line.startsWith("_This page") || line.startsWith("Retrieved ")
    || line.startsWith("**Attribution**") || line.startsWith("Content is") || line.startsWith("Privacy ")
    || line.startsWith("Search") || line.startsWith("Add topic") || line.startsWith("---")
    || line.includes("Open Content") && line.startsWith("|")) {
    continue;
  }

  const parsed = parseSpellLine(line);
  if (parsed) {
    spells.push(parsed);
  } else if (/^[A-Za-z].*\(.+\)/.test(line)) {
    skipped.push(line);
  }
}

// Deduplicate by name (case-sensitive)
const seen = new Set();
const unique = [];

for (const spell of spells) {
  if (seen.has(spell.name)) continue;
  seen.add(spell.name);
  unique.push(spell);
}

unique.sort((left, right) => left.name.localeCompare(right.name));

writeFileSync(outputPath, `${JSON.stringify(unique, null, 2)}\n`, "utf8");

console.log(`Parsed ${unique.length} spells -> ${outputPath}`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} unparseable lines:`);
  for (const line of skipped) console.log(`  - ${line}`);
}
