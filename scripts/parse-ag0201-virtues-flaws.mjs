/**
 * Parse AG0201 Virtues & Flaws extract into virtues-flaws-2e.json.
 * Signed points: virtues +1…+5, flaws −1…−5, The Gift 0.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcPath = path.join(root, "src/compendium-data/sources/ag0201-virtues-flaws.txt");
const outPath = path.join(root, "src/compendium-data/virtues-flaws-2e.json");
const SOURCE = "AG0201 Ars Magica 2nd Edition, pp. 18–24 (Virtues & Flaws)";

const NAME_FIXES = Object.freeze({
  "Book-Leamer": "Book-Learner",
  "Fast Leamer": "Fast Learner",
  "Charmed Lifc": "Charmed Life",
  "Wcalth": "Wealth",
  "Missing F.ar": "Missing Ear",
  "Poor Mcmol')'": "Poor Memory",
  "S trong-willed": "Strong-willed",
  "Well-travelled": "Well-Travelled",
  "G host ly Warder": "Ghostly Warder",
  "R edcap": "Redcap",
  "Magic Rcsistance": "Magic Resistance",
  "The Gentle Gift": "Gentle Gift",
  "The Blatant Gift": "Blatant Gift",
  "H&:?nnetic Pre&tig&:?": "Hermetic Prestige",
  "Inv&:?ntiv&:? Genius": "Inventive Genius"
});

/** Force-correct known mis-tags from multi-column OCR. */
const FORCE = Object.freeze({
  Wealth: { kind: "virtue", points: 4, category: "General" },
  Werewolf: { kind: "virtue", points: 4, category: "General" },
  "Guardian Angel": { kind: "virtue", points: 5, category: "General" },
  "Ways of the Woods": { kind: "virtue", points: 4, category: "General" },
  "Free Study": { kind: "virtue", points: 2, category: "Hermetic" },
  "Loose Magic": { kind: "flaw", points: -1, category: "Hermetic" },
  "Minor Magic Deficiency (Rare)": { kind: "flaw", points: -1, category: "Hermetic" },
  "Necessary Condition": { kind: "flaw", points: -1, category: "Hermetic" },
  "Deleterious Circumstances (Uncommon & Minor)": { kind: "flaw", points: -1, category: "Hermetic" },
  "Infamous Master": { kind: "flaw", points: -1, category: "Hermetic" },
  "Blatant Gift": { kind: "flaw", points: -1, category: "Hermetic" },
  "Gentle Gift": { kind: "virtue", points: 1, category: "Hermetic" },
  "Book-Learner": { kind: "virtue", points: 1, category: "Hermetic" },
  "Inventive Genius": { kind: "virtue", points: 1, category: "Hermetic" },
  "Hermetic Prestige": { kind: "virtue", points: 1, category: "Hermetic" },
  "Mastered Spells": { kind: "virtue", points: 1, category: "Hermetic" },
  "Special Circumstances": { kind: "virtue", points: 1, category: "Hermetic" },
  "Weak Self-Confidence": { kind: "flaw", points: -2, category: "General" },
  "Ways of the Woods": { kind: "virtue", points: 4, category: "General" }
});

function cleanText(raw) {
  return String(raw)
    .replace(/\u00ad/g, "")
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function normalizeName(name) {
  let n = cleanText(name).replace(/\s+/g, " ").trim();
  n = NAME_FIXES[n] ?? n;
  return n.replace(/[:;]+$/, "").trim();
}

function matchEntryStart(line) {
  const trimmed = line.trim();
  // Allow particles between capitals: "Ways of the Woods", "Code of Honor", "Jack-of-All-Trades"
  const m = trimmed.match(
    /^((?:The\s+)?[A-Z][A-Za-z0-9'’&\-:?/]*(?:\s+(?:of|the|a|an|and|&|with|for|in|to|from|[A-Z][A-Za-z0-9'’&\-:?/]*))+|[A-Z][A-Za-z0-9'’&\-:?/]*)\s*\.\s*(.*)$/
  );
  if (!m) return null;
  const name = normalizeName(m[1]);
  if (name.length < 3 || name.length > 70) return null;
  if (/^(Virtues|Flaws|Virtue|Flaw|Chapter|Ars|Size|Hermetic|Age|Characteristics|Personality|Abilities)\b/i.test(name)) {
    return null;
  }
  // Reject sentences that aren't titles (too many lowercase filler words mid-name)
  const words = name.split(/\s+/);
  if (words.length > 6) return null;
  return { name, rest: m[2] ?? "" };
}

function parseAg0201(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let kind = "virtue";
  let points = 1;
  let hermetic = false;
  let current = null;
  let skipGrog = false;

  const flush = () => {
    if (!current) return;
    const description = cleanText(current.parts.join(" "));
    if (description.length < 12) {
      current = null;
      return;
    }

    let name = current.name;
    const force = FORCE[name];
    const finalKind = force?.kind ?? current.kind;
    const finalPoints = force?.points ?? current.points;
    const finalCategory = force?.category ?? current.category;

    const baseKey = name.toLowerCase();
    const sameBase = entries.filter(
      (e) => e.system._base === baseKey || e.name.toLowerCase() === baseKey
    );
    if (sameBase.length || entries.some((e) => e.system._base === baseKey)) {
      const sign = finalPoints > 0 ? `+${finalPoints}` : String(finalPoints);
      name = `${current.name} (${sign})`;
    }

    entries.push({
      name,
      type: "virtueFlaw",
      system: {
        kind: finalKind,
        points: finalPoints,
        magnitude: "",
        category: finalCategory,
        description,
        source: SOURCE,
        _base: baseKey
      }
    });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/Instant Groqs/i.test(line) || /generate a grog quickly/i.test(line)) {
      flush();
      skipGrog = true;
      continue;
    }

    // Page 23 resumes Flaws −2 after Instant Grogs sidebar (header already passed on prior page).
    if (skipGrog && (/^Missing Hand\b/i.test(line) || /^Flaws$/i.test(line))) {
      skipGrog = false;
      kind = "flaw";
      points = -2;
      hermetic = false;
      if (/^Flaws$/i.test(line)) continue;
    }

    if (/Hermetic Virtues/i.test(line)) {
      flush();
      skipGrog = false;
      hermetic = true;
      continue;
    }

    if (/and flaws that somehow work against/i.test(line) || /^Explaining your virtues/i.test(line) || /^Size$/i.test(line)) {
      flush();
      break;
    }

    const header =
      line.match(/^Virtues?:\s*\+?\s*(\d+)\s*$/i)
      || line.match(/^Flaws?:\s*-?\s*(\d+)\s*$/i)
      || line.match(/^Virtue:\s*\+?\s*(\d+)\s*$/i)
      || line.match(/^Flaw:\s*-?\s*(\d+)\s*$/i);

    if (header) {
      flush();
      skipGrog = false;
      const n = Number(header[1]);
      if (/^Flaw/i.test(line)) {
        kind = "flaw";
        points = -Math.abs(n);
      } else {
        kind = "virtue";
        points = Math.abs(n);
      }
      continue;
    }

    if (skipGrog) continue;
    if (/^Virtues$/i.test(line) || /^Flaws$/i.test(line)) continue;
    if (/^Chapter\b/i.test(line) || /^Ars Mag/i.test(line) || /^Character$/i.test(line) || /^\d{1,3}$/.test(line)) {
      continue;
    }

    if (/^Deleterious Circumstances$/i.test(line)) {
      flush();
      current = {
        name: "Deleterious Circumstances (Uncommon & Minor)",
        kind: "flaw",
        points: -1,
        category: "Hermetic",
        parts: []
      };
      continue;
    }

    if (/^Minor Magic Deficiency/i.test(line) && !/\./.test(line)) {
      flush();
      current = {
        name: "Minor Magic Deficiency (Rare)",
        kind: "flaw",
        points: -1,
        category: "Hermetic",
        parts: []
      };
      continue;
    }

    const start = matchEntryStart(line);
    if (start) {
      flush();
      let entryName = start.name;
      if (entryName === "The Gentle Gift") entryName = "Gentle Gift";
      if (entryName === "The Blatant Gift") entryName = "Blatant Gift";

      current = {
        name: entryName,
        kind,
        points,
        category: hermetic ? "Hermetic" : "General",
        parts: start.rest ? [start.rest] : []
      };
      continue;
    }

    if (current) current.parts.push(line);
  }

  flush();

  // Drop OCR ghosts: Magical Affinity must never be a flaw; Self-Confident never a flaw.
  const cleaned = entries.filter((e) => {
    if (/^Magical Affinity/i.test(e.name) && e.system.kind === "flaw") return false;
    if (/^Self-Confident/i.test(e.name) && e.system.kind === "flaw") return false;
    return true;
  });

  for (const e of cleaned) {
    const baseName = e.name.replace(/\s*\([+\-]?\d+\)\s*$/, "").trim();
    const f = FORCE[baseName];
    if (f) {
      e.system.kind = f.kind;
      e.system.points = f.points;
      e.system.category = f.category;
      if (/\([+\-]?\d+\)$/.test(e.name)) {
        const sign = f.points > 0 ? `+${f.points}` : String(f.points);
        e.name = `${baseName} (${sign})`;
      }
    }
    delete e.system._base;
  }

  // Ensure Magical Affinity (+2) exists (Hermetic column interleave often drops it).
  if (!cleaned.some((e) => e.name === "Magical Affinity (+2)")) {
    cleaned.push({
      name: "Magical Affinity (+2)",
      type: "virtueFlaw",
      system: {
        kind: "virtue",
        points: 2,
        magnitude: "",
        category: "Hermetic",
        description:
          "Like the +1 Virtue, but covering broader types of magic. Example +2 Affinities: healing, forests & forest animals, faeries, passions, and rock. Anything more comprehensive than these examples must be classified as at least a +3 Affinity.",
        source: SOURCE
      }
    });
  }

  if (!cleaned.some((e) => e.name === "Self-Confident (+4)")) {
    cleaned.push({
      name: "Self-Confident (+4)",
      type: "virtueFlaw",
      system: {
        kind: "virtue",
        points: 4,
        magnitude: "",
        category: "General",
        description: "You begin the game with 7 Cnf points.",
        source: SOURCE
      }
    });
  }

  // Drop OCR fragment entries
  const filtered = cleaned.filter((e) => e.name !== "Str" && e.name.length > 2);

  if (!filtered.some((e) => /Hermetic Prestige/i.test(e.name))) {
    filtered.push({
      name: "Hermetic Prestige",
      type: "virtueFlaw",
      system: {
        kind: "virtue",
        points: 1,
        magnitude: "",
        category: "Hermetic",
        description:
          "Because of your famous and well-respected master, other magi look up to you even if you haven't earned their respect. Some envy you, and most expect more from you than they would from other magi.",
        source: SOURCE
      }
    });
  }

  return filtered;
}

const text = fs.readFileSync(srcPath, "utf8");
const parsed = parseAg0201(text);

if (!parsed.some((e) => e.name === "The Gift")) {
  parsed.unshift({
    name: "The Gift",
    type: "virtueFlaw",
    system: {
      kind: "virtue",
      points: 0,
      magnitude: "",
      category: "Hermetic",
      description:
        "The character can learn and cast Hermetic magic. Required for magi; not purchased with virtue points.",
      source: SOURCE
    }
  });
}

// Curated grants
for (const entry of parsed) {
  if (entry.name === "Educated") {
    entry.system.grants = {
      abilities: [],
      abilityPoints: {
        amount: 15,
        categories: ["knowledges"],
        subgroups: ["formal"],
        keys: ["speak-latin", "speak-specific-alphabet"]
      }
    };
  }
  if (entry.name === "Arcane Lore") {
    entry.system.grants = {
      abilities: [],
      abilityPoints: {
        amount: 15,
        categories: ["knowledges"],
        subgroups: ["arcane"],
        keys: []
      }
    };
  }
}

// Sort: virtues by points asc, then name; flaws by points desc ( -1 before -5), then name
parsed.sort((a, b) => {
  if (a.system.kind !== b.system.kind) return a.system.kind === "virtue" ? -1 : 1;
  if (a.system.points !== b.system.points) {
    return a.system.kind === "virtue"
      ? a.system.points - b.system.points
      : b.system.points - a.system.points;
  }
  return a.name.localeCompare(b.name);
});

fs.writeFileSync(outPath, `${JSON.stringify(parsed, null, 2)}\n`);

const counts = {};
for (const e of parsed) {
  const k = `${e.system.kind}:${e.system.points}`;
  counts[k] = (counts[k] || 0) + 1;
}
console.log(`Wrote ${parsed.length} entries`);
console.log(Object.entries(counts).sort().map(([k, v]) => `  ${k} = ${v}`).join("\n"));
const suspect = parsed.filter((e) =>
  ["Missing Hand", "Mute", "Blind", "Wealth", "Werewolf", "Free Study", "Loose Magic"].includes(
    e.name.replace(/\s*\([+\-]?\d+\)\s*$/, "")
  )
);
for (const e of suspect) console.log(`check ${e.name} => ${e.system.kind} ${e.system.points}`);
