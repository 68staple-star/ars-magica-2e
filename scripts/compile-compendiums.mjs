#!/usr/bin/env node
/**
 * Compile src/compendium-data JSON into Foundry LevelDB compendium packs.
 * Foundry cannot read the JSON arrays directly — packs must be built databases.
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, "..");
const dataRoot = join(projectRoot, "src", "compendium-data");
const sourceRoot = join(projectRoot, "packs", "_source");
const packRoot = join(projectRoot, "packs");

const HTML_FORMAT = 1;

const PACKS = [
  { pack: "arm2e-abilities", file: "abilities.json", type: "Item" },
  { pack: "arm2e-formulaic-spells", file: "spells-arm5-index.json", type: "Item" },
  { pack: "arm2e-spells", file: "spells-arm5-ch9.json", type: "Item" },
  { pack: "arm2e-equipment-lom", file: "equipment-arm5-lom.json", type: "Item" },
  { pack: "arm2e-weapons", file: "weapons.json", type: "Item" },
  { pack: "arm2e-virtues-flaws-arm5", file: "virtues-flaws-arm5.json", type: "Item" },
  { pack: "arm2e-virtues-flaws", file: "virtues-flaws.json", type: "Item" },
  { pack: "arm2e-rules-reference", file: "journals-rules.json", type: "JournalEntry" },
  { pack: "arm2e-covenant-template", file: "journals-covenant.json", type: "JournalEntry" },
  { pack: "arm2e-order-reference", file: "journals-order.json", type: "JournalEntry" },
  { pack: "arm2e-ability-reference", file: "journals-abilities.json", type: "JournalEntry" },
  { pack: "arm2e-bestiary", file: "beasts-arm5-ch13.json", type: "Actor" }
];

const COLLECTION_BY_TYPE = {
  Item: "items",
  JournalEntry: "journal",
  Actor: "actors"
};

const DEFAULT_ITEM_IMG = {
  ability: "icons/svg/book.svg",
  spell: "icons/svg/fire.svg",
  weapon: "icons/svg/sword.svg",
  armor: "icons/svg/shield.svg",
  virtueFlaw: "icons/svg/aura.svg",
  equipment: "icons/svg/chest.svg",
  art: "icons/svg/dice-target.svg"
};

/**
 * @param {string} collection
 * @param {string} id
 */
function packKey(collection, id) {
  return `!${collection}!${id}`;
}

/**
 * @param {string} pack
 * @param {string} name
 */
function deterministicId(pack, name) {
  return createHash("sha256").update(`${pack}\0${name}`).digest("base64url").slice(0, 16);
}

/**
 * @param {string} name
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "entry";
}

/**
 * @param {object} entry
 * @param {string} pack
 * @param {number} index
 */
function prepareItemDocument(entry, pack, index) {
  const name = entry.name ?? `Entry ${index + 1}`;
  const type = entry.type ?? "equipment";
  const id = entry._id ?? deterministicId(pack, name);

  return {
    _id: id,
    _key: packKey(COLLECTION_BY_TYPE.Item, id),
    name,
    type,
    img: entry.img ?? DEFAULT_ITEM_IMG[type] ?? "icons/svg/item-bag.svg",
    system: entry.system ?? {},
    flags: entry.flags ?? {},
    effects: entry.effects ?? []
  };
}

/**
 * @param {object} entry
 * @param {string} pack
 */
function prepareJournalDocument(entry, pack) {
  const name = entry.name ?? "Journal Entry";
  const id = entry._id ?? deterministicId(pack, name);

  return {
    _id: id,
    _key: packKey(COLLECTION_BY_TYPE.JournalEntry, id),
    name,
    pages: (entry.pages ?? []).map((page, pageIndex) => {
      const pageId = deterministicId(pack, `${name}:${page.name ?? pageIndex}`);
      return {
        _id: pageId,
        _key: `!journal.pages!${pageId}`,
        name: page.name,
        type: "text",
        text: {
          content: page.text?.content ?? "",
          format: HTML_FORMAT
        }
      };
    }),
    folder: null,
    flags: entry.flags ?? {},
    ownership: { default: 0 }
  };
}

/**
 * @param {object} entry
 * @param {string} pack
 * @param {number} index
 */
function prepareActorDocument(entry, pack, index) {
  const name = entry.name ?? `Actor ${index + 1}`;
  const type = entry.type ?? "beast";
  const id = entry._id ?? deterministicId(pack, name);

  return {
    _id: id,
    _key: packKey(COLLECTION_BY_TYPE.Actor, id),
    name,
    type,
    img: entry.img ?? "icons/svg/mystery-man.svg",
    system: entry.system ?? {},
    items: entry.items ?? [],
    effects: entry.effects ?? [],
    flags: entry.flags ?? {},
    prototypeToken: entry.prototypeToken ?? {
      name,
      disposition: -1,
      actorLink: true
    }
  };
}

/**
 * @param {{ pack: string, file: string, type: string }} config
 */
async function compileOne(config) {
  const { pack, file, type } = config;
  const dataPath = join(dataRoot, file);
  const sourceDir = join(sourceRoot, pack);
  const destDir = join(packRoot, pack);

  const raw = JSON.parse(await readFile(dataPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : [raw];

  await rm(sourceDir, { recursive: true, force: true });
  await rm(destDir, { recursive: true, force: true });
  await mkdir(sourceDir, { recursive: true });

  const usedNames = new Set();

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    let filename = slugify(entry.name ?? `entry-${index + 1}`);
    let suffix = 2;

    while (usedNames.has(filename)) {
      filename = `${slugify(entry.name ?? `entry-${index + 1}`)}-${suffix}`;
      suffix += 1;
    }

    usedNames.add(filename);

    let document;
    if (type === "JournalEntry") document = prepareJournalDocument(entry, pack);
    else if (type === "Actor") document = prepareActorDocument(entry, pack, index);
    else document = prepareItemDocument(entry, pack, index);

    await writeFile(join(sourceDir, `${filename}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }

  await mkdir(destDir, { recursive: true });
  await compilePack(sourceDir, destDir, { recursive: false, log: true });
  console.log(`Compiled ${pack}: ${entries.length} entries`);
}

await rm(sourceRoot, { recursive: true, force: true });

for (const config of PACKS) {
  await compileOne(config);
}

// Remove transient source tree after successful compile.
await rm(sourceRoot, { recursive: true, force: true });

const compiled = await readdir(packRoot);
console.log(`Compendium packs ready: ${compiled.filter((name) => !name.startsWith("_")).join(", ")}`);
