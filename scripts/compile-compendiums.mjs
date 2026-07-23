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
import {
  flattenVirtueFlawFolders,
  folderPathSegments,
  resolveVirtueFlawFolderKey
} from "../modules/utils/virtue-flaw-folders.js";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, "..");
const dataRoot = join(projectRoot, "src", "compendium-data");
const sourceRoot = join(projectRoot, "packs", "_source");
const packRoot = join(projectRoot, "packs");

const HTML_FORMAT = 1;
/** Foundry DOCUMENT_OWNERSHIP_LEVELS.INHERIT for embedded pages */
const OWNERSHIP_INHERIT = -1;

const PACKS = [
  { pack: "arm2e-abilities", file: "abilities.json", type: "Item" },
  { pack: "arm2e-spells", file: "spells.json", type: "Item" },
  { pack: "arm2e-weapons", file: "weapons.json", type: "Item" },
  {
    pack: "arm2e-virtues-flaws",
    file: "virtues-flaws.json",
    type: "Item",
    folders: "virtueFlaw"
  },
  { pack: "arm2e-rules-reference", file: "journals-rules.json", type: "JournalEntry" },
  { pack: "arm2e-covenant-template", file: "journals-covenant.json", type: "JournalEntry" },
  { pack: "arm2e-covenants", file: "covenants-sample.json", type: "Actor" },
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
  art: "icons/svg/dice-target.svg",
  book: "icons/svg/book.svg",
  laboratory: "icons/svg/castle.svg"
};

/**
 * @param {string} collection
 * @param {string} id
 */
function packKey(collection, id) {
  return `!${collection}!${id}`;
}

/** Foundry `randomID` alphabet — alphanumeric only (no `-` / `_`). */
const FOUNDRY_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Stable 16-char Foundry document id derived from pack + name.
 * Must match Foundry's ID charset; base64url is unsafe (`-`, `_`, leading `-`).
 * @param {string} pack
 * @param {string} name
 */
function deterministicId(pack, name) {
  const digest = createHash("sha256").update(`${pack}\0${name}`).digest();
  let id = "";
  for (let i = 0; i < 16; i += 1) {
    id += FOUNDRY_ID_CHARS[digest[i] % FOUNDRY_ID_CHARS.length];
  }
  return id;
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
 * Deterministic folder id map for Virtues & Flaws.
 * @param {string} pack
 * @returns {Map<string, string>}
 */
function buildVirtueFlawFolderIds(pack) {
  const ids = new Map();
  for (const folder of flattenVirtueFlawFolders()) {
    ids.set(folder.key, deterministicId(pack, `folder:${folder.key}`));
  }
  return ids;
}

/**
 * Write Foundry Folder documents into nested source dirs.
 * @param {string} sourceDir
 * @param {string} pack
 * @param {Map<string, string>} folderIds
 */
async function writeVirtueFlawFolders(sourceDir, pack, folderIds) {
  const folders = flattenVirtueFlawFolders();

  for (const folder of folders) {
    const id = folderIds.get(folder.key);
    const parentId = folder.parentKey ? folderIds.get(folder.parentKey) ?? null : null;
    const dir = join(sourceDir, ...folderPathSegments(folder.key));
    await mkdir(dir, { recursive: true });

    const document = {
      _id: id,
      _key: packKey("folders", id),
      name: folder.name,
      type: "Item",
      folder: parentId,
      sorting: "a",
      sort: folder.sort,
      color: "",
      flags: {}
    };

    await writeFile(join(dir, "_Folder.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

/**
 * @param {object} entry
 * @param {string} pack
 * @param {number} index
 * @param {string | null} [folderId]
 */
function prepareItemDocument(entry, pack, index, folderId = null) {
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
    folder: folderId,
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
  // OBSERVER (2) so players can read reference journals from the pack / imports.
  const ownership = entry.ownership ?? { default: 2 };

  return {
    _id: id,
    _key: packKey(COLLECTION_BY_TYPE.JournalEntry, id),
    name,
    pages: (entry.pages ?? []).map((page, pageIndex) => {
      const pageId = deterministicId(pack, `${name}:${page.name ?? pageIndex}`);
      return {
        _id: pageId,
        _key: `!journal.pages!${id}.${pageId}`,
        name: page.name,
        type: "text",
        sort: (pageIndex + 1) * 100000,
        title: { show: true, level: 1 },
        text: {
          content: page.text?.content ?? "",
          format: HTML_FORMAT
        },
        ownership: { default: OWNERSHIP_INHERIT }
      };
    }),
    folder: null,
    flags: entry.flags ?? {},
    ownership
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

  const items = (entry.items ?? []).map((item, itemIndex) => {
    const itemName = item.name ?? `Item ${itemIndex + 1}`;
    const itemId = item._id ?? deterministicId(pack, `${name}:${itemName}`);
    return {
      _id: itemId,
      _key: `!actors.items!${itemId}`,
      name: itemName,
      type: item.type ?? "equipment",
      img: item.img ?? DEFAULT_ITEM_IMG[item.type] ?? "icons/svg/item-bag.svg",
      system: item.system ?? {},
      flags: item.flags ?? {},
      effects: item.effects ?? []
    };
  });

  return {
    _id: id,
    _key: packKey(COLLECTION_BY_TYPE.Actor, id),
    name,
    type,
    img: entry.img ?? (type === "covenant" ? "icons/svg/castle.svg" : "icons/svg/mystery-man.svg"),
    system: entry.system ?? {},
    items,
    effects: entry.effects ?? [],
    flags: entry.flags ?? {},
    prototypeToken: entry.prototypeToken ?? {
      name,
      disposition: type === "covenant" ? 1 : -1,
      actorLink: true
    }
  };
}

/**
 * @param {{ pack: string, file: string, type: string, folders?: string }} config
 */
async function compileOne(config) {
  const { pack, file, type, folders } = config;
  const dataPath = join(dataRoot, file);
  const sourceDir = join(sourceRoot, pack);
  const destDir = join(packRoot, pack);

  const raw = JSON.parse(await readFile(dataPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : [raw];

  await rm(sourceDir, { recursive: true, force: true });
  await rm(destDir, { recursive: true, force: true });
  await mkdir(sourceDir, { recursive: true });

  const folderIds = folders === "virtueFlaw" ? buildVirtueFlawFolderIds(pack) : null;
  if (folderIds) {
    await writeVirtueFlawFolders(sourceDir, pack, folderIds);
  }

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

    let folderId = null;
    let outDir = sourceDir;

    if (folderIds && type === "Item") {
      const leafKey = resolveVirtueFlawFolderKey(entry.system ?? {});
      folderId = folderIds.get(leafKey) ?? null;
      const segments = folderPathSegments(leafKey);
      outDir = join(sourceDir, ...segments);
      await mkdir(outDir, { recursive: true });
    }

    let document;
    if (type === "JournalEntry") document = prepareJournalDocument(entry, pack);
    else if (type === "Actor") document = prepareActorDocument(entry, pack, index);
    else document = prepareItemDocument(entry, pack, index, folderId);

    await writeFile(join(outDir, `${filename}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }

  await mkdir(destDir, { recursive: true });
  const recursive = Boolean(folderIds);
  await compilePack(sourceDir, destDir, { recursive, log: true });
  console.log(`Compiled ${pack}: ${entries.length} entries${folderIds ? ` (+ ${folderIds.size} folders)` : ""}`);
}

await rm(sourceRoot, { recursive: true, force: true });

for (const config of PACKS) {
  await compileOne(config);
}

// Remove transient source tree after successful compile.
await rm(sourceRoot, { recursive: true, force: true });

const compiled = await readdir(packRoot);
console.log(`Compendium packs ready: ${compiled.filter((name) => !name.startsWith("_")).join(", ")}`);
