#!/usr/bin/env node
/**
 * Parse the community Grand Grimoire of Hermetic Spells (Arm5 compilation)
 * into Foundry spell Item seed data for an optional reference pack.
 *
 * Source: src/compendium-data/sources/arm5-grand-grimoire-raw.txt
 * (pdftotext of arm5-grand-grimoire.pdf)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatSpellDisplayName } from "../modules/utils/spell-folders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = process.argv[2]
  ?? path.join(root, "src/compendium-data/sources/arm5-grand-grimoire-raw.txt");
const outputPath = process.argv[3]
  ?? path.join(root, "src/compendium-data/spells-grand-grimoire.json");

const SOURCE_DEFAULT = "Grand Grimoire of Hermetic Spells (Arm5 community compilation)";

const TECH_MAP = Object.freeze({
  Cr: "creo",
  In: "intellego",
  Mu: "muto",
  Pe: "perdo",
  Re: "rego"
});

const FORM_MAP = Object.freeze({
  An: "animal",
  Aq: "aquam",
  Au: "auram",
  Co: "corporem",
  He: "herbam",
  Ig: "ignem",
  Im: "imagonem",
  Me: "mentem",
  Te: "terram",
  Vi: "vim",
  Ae: "aethera"
});

const TECH_ABBREV = Object.freeze({
  creo: "Cr",
  intellego: "In",
  muto: "Mu",
  perdo: "Pe",
  rego: "Re"
});

const FORM_ABBREV = Object.freeze({
  animal: "An",
  aquam: "Aq",
  auram: "Au",
  corporem: "Co",
  herbam: "He",
  ignem: "Ig",
  imagonem: "Im",
  mentem: "Me",
  terram: "Te",
  vim: "Vi",
  aethera: "Ae"
});

const ART_LINE = /^(?<art>(?:Cr|In|Mu|Pe|Re)(?:\s*\([^)]+\))?(?:An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi|Ae)(?:\s*\([^)]+\))?)\s+(?<level>\d+|Gen)\s*$/;
const RDT_LINE = /^R:\s*(?<body>.+)$/i;
const ALLCAPS_TITLE = /^[A-Z0-9][A-Z0-9 ,'’\-/()]{1,90}$/;
const SECTION = /^(?:The Art of|Creo|Intellego|Muto|Perdo|Rego|Spell Index|Introduction|Table of Contents)\b/i;

/**
 * @param {string} raw
 * @returns {string}
 */
function cleanText(raw) {
  return String(raw ?? "")
    .replace(/\u00ad/g, "")
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/**
 * Convert ALL CAPS book titles to readable Title Case.
 * @param {string} name
 * @returns {string}
 */
function titleCaseName(name) {
  const cleaned = cleanText(name);
  if (!cleaned) return cleaned;
  if (!/^[A-Z0-9 ,'’\-/()]+$/.test(cleaned)) return cleaned;

  const small = new Set(["a", "an", "the", "of", "and", "or", "to", "for", "in", "on", "with", "from", "without"]);
  const words = cleaned.toLowerCase().split(" ");
  return words.map((word, index) => {
    if (index > 0 && small.has(word)) return word;
    if (word.includes("-")) {
      return word.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join("-");
    }
    return word ? word[0].toUpperCase() + word.slice(1) : word;
  }).join(" ");
}

/**
 * @param {string} artRaw
 * @returns {{ technique: string, form: string, artAbbrev: string, requisites: string }}
 */
function parseArt(artRaw) {
  const compact = String(artRaw).replace(/\s+/g, "");
  const techMatch = compact.match(/^(Cr|In|Mu|Pe|Re)/);
  const formMatch = compact.match(/(An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi|Ae)(?:\(|$)/);
  const technique = TECH_MAP[techMatch?.[1] ?? ""] ?? "";
  const form = FORM_MAP[formMatch?.[1] ?? ""] ?? "";

  // Keep the printed art string as artAbbrev when possible (includes requisites).
  const artAbbrev = compact || `${TECH_ABBREV[technique] ?? "?"}${FORM_ABBREV[form] ?? "?"}`;
  const requisites = [...compact.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]).join("; ");

  return { technique, form, artAbbrev, requisites };
}

/**
 * @param {string} rdt
 * @returns {{ range: string, duration: string, target: string }}
 */
function parseRdt(rdt) {
  const body = cleanText(String(rdt).replace(/^R:\s*/i, ""));
  // R: Touch, D: Sun, T: Ind, Ritual
  const range = (body.match(/\bR:\s*([^,]+)/i)?.[1]
    ?? body.split(",")[0]
    ?? "").trim();
  const duration = (body.match(/\bD:\s*([^,]+)/i)?.[1] ?? "").trim();
  const target = (body.match(/\bT:\s*(.+)$/i)?.[1] ?? "").trim();
  // When R: already stripped, first clause is range
  if (!body.match(/\bR:/i) && !range.includes(":")) {
    const parts = body.split(",").map((part) => part.trim());
    return {
      range: parts[0] ?? "",
      duration: (parts.find((part) => /^D:/i.test(part)) ?? "").replace(/^D:\s*/i, ""),
      target: parts.filter((part) => !/^D:/i.test(part)).slice(1).join(", ")
    };
  }
  return { range, duration, target };
}

/**
 * Prefer the simpler RDT parser for stripped "Touch, D: Sun, T: Ind" lines.
 * @param {string} rdtLine
 */
function parseRdtLine(rdtLine) {
  const body = cleanText(String(rdtLine).replace(/^R:\s*/i, ""));
  const range = (body.match(/^(?:R:\s*)?([^,]+)/i)?.[1] ?? "").trim();
  const duration = (body.match(/\bD:\s*([^,]+)/i)?.[1] ?? "").trim();
  const target = (body.match(/\bT:\s*(.+)$/i)?.[1] ?? "").trim();
  return { range, duration, target };
}

/**
 * @param {string} text
 * @returns {object[]}
 */
function parseGrandGrimoire(text) {
  const start = text.indexOf("Enjoy!");
  const end = text.lastIndexOf("Spell Index");
  const body = text.slice(start >= 0 ? start : 0, end > start ? end : text.length);
  const lines = body.replace(/\r/g, "").split("\n");

  /** @type {object[]} */
  const spells = [];

  for (let i = 0; i < lines.length - 1; i += 1) {
    const artMatch = lines[i].trim().match(ART_LINE);
    if (!artMatch) continue;
    if (!RDT_LINE.test(lines[i + 1].trim())) continue;

    /** @type {string[]} */
    const titleParts = [];
    for (let j = i - 1; j >= 0; j -= 1) {
      const prev = lines[j].trim();
      if (!prev || prev.isdigit?.() || /^\d+$/.test(prev)) break;
      if (/^Source:/i.test(prev) || /^\(Base/i.test(prev) || /^Req:/i.test(prev) || SECTION.test(prev)) break;
      if (ART_LINE.test(prev)) break;
      if (ALLCAPS_TITLE.test(prev)) {
        titleParts.push(prev);
        if (titleParts.length >= 3) break;
        continue;
      }
      break;
    }

    if (!titleParts.length) continue;
    const rawName = titleParts.reverse().join(" ");
    const name = titleCaseName(rawName);
    if (!name || name.length < 3) continue;

    const { technique, form, artAbbrev, requisites } = parseArt(artMatch.groups.art);
    if (!technique || !form) continue;

    const levelRaw = artMatch.groups.level;
    const isGeneral = /^gen$/i.test(levelRaw);
    const level = isGeneral ? 0 : Number(levelRaw) || 0;
    const rdt = parseRdtLine(lines[i + 1].trim());

    /** @type {string[]} */
    const noteLines = [];
    let source = "";
    let k = i + 2;
    while (k < lines.length) {
      const line = lines[k].trim();

      // Next spell starts with Art + R: or Title + Art + R:
      if (ART_LINE.test(line) && k + 1 < lines.length && RDT_LINE.test(lines[k + 1].trim())) break;
      if (
        ALLCAPS_TITLE.test(line)
        && k + 1 < lines.length
        && ART_LINE.test(lines[k + 1].trim())
        && k + 2 < lines.length
        && RDT_LINE.test(lines[k + 2].trim())
      ) break;
      if (SECTION.test(line) && /The Art of|Spell Index/i.test(line)) break;

      if (/^Source:/i.test(line)) {
        source = cleanText(line.replace(/^Source:\s*/i, ""));
        if (k + 1 < lines.length) {
          const next = lines[k + 1].trim();
          if (
            next
            && !ALLCAPS_TITLE.test(next)
            && !ART_LINE.test(next)
            && !RDT_LINE.test(next)
            && !/^\(Base/i.test(next)
            && !/^Source:/i.test(next)
            && !/^\d+$/.test(next)
            && !SECTION.test(next)
            && next.length < 70
            && !/[.!?]$/.test(next)
          ) {
            source = cleanText(`${source} ${next}`);
          }
        }
        break;
      }

      if (line && !/^\d+$/.test(line) && line !== "\f") {
        noteLines.push(line);
      }
      k += 1;
    }

    const notesCore = cleanText(noteLines.join(" "));
    const reqNote = requisites ? `Requisites: ${requisites}.` : "";
    const notes = [
      notesCore,
      reqNote,
      "Arm5 Grand Grimoire reference — use with 2e casting math; verify saga house rules for edition differences."
    ].filter(Boolean).join("\n\n");

    const system = {
      level,
      technique,
      form,
      artAbbrev: isGeneral ? `${artAbbrev} Gen` : artAbbrev,
      isGeneral,
      range: rdt.range,
      duration: rdt.duration,
      target: rdt.target,
      mastered: false,
      notes,
      source: source || SOURCE_DEFAULT,
      journal: ""
    };

    spells.push({
      name: formatSpellDisplayName(name, system),
      type: "spell",
      system
    });

    i = Math.max(i, k - 1);
  }

  return spells;
}

/**
 * @param {object[]} spells
 * @returns {object[]}
 */
function dedupe(spells) {
  /** @type {Map<string, object>} */
  const byKey = new Map();
  for (const spell of spells) {
    const key = String(spell.name)
      .toLowerCase()
      .replace(/\s+\[[^\]]+\]\s*$/, "")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const existing = byKey.get(key);
    if (!existing || String(spell.system.notes).length > String(existing.system.notes).length) {
      byKey.set(key, spell);
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const raw = fs.readFileSync(inputPath, "utf8");
const parsed = dedupe(parseGrandGrimoire(raw));
fs.writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`);

const byForm = parsed.reduce((acc, spell) => {
  acc[spell.system.form] = (acc[spell.system.form] ?? 0) + 1;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

console.log(`Wrote ${parsed.length} Grand Grimoire spells to ${outputPath}`);
console.log("  By form:", byForm);
console.log("  Sample:", parsed[0]?.name, "—", String(parsed[0]?.system?.notes).slice(0, 100));
