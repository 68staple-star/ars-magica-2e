/**
 * Seed compendium packs on first world load when packs are empty.
 * Foundry v13 locks system compendiums by default — unlock briefly to import.
 */

const PACK_SEEDS = [
  { pack: "arm2e-abilities", file: "abilities.json" },
  { pack: "arm2e-formulaic-spells", file: "spells-arm5-index.json" },
  { pack: "arm2e-spells", file: "spells-arm5-ch9.json" },
  { pack: "arm2e-equipment-lom", file: "equipment-arm5-lom.json" },
  { pack: "arm2e-weapons", file: "weapons.json" },
  { pack: "arm2e-virtues-flaws-arm5", file: "virtues-flaws-arm5.json" },
  { pack: "arm2e-virtues-flaws", file: "virtues-flaws.json" },
  { pack: "arm2e-rules-reference", file: "journals-rules.json" },
  { pack: "arm2e-covenant-template", file: "journals-covenant.json" },
  { pack: "arm2e-covenants", file: "covenants-sample.json" },
  { pack: "arm2e-order-reference", file: "journals-order.json" },
  { pack: "arm2e-ability-reference", file: "journals-abilities.json" },
  { pack: "arm2e-bestiary", file: "beasts-arm5-ch13.json" }
];

/**
 * @param {string} filename
 */
async function loadSeedData(filename) {
  const path = `systems/ars-magica-2e/src/compendium-data/${filename}`;

  try {
    const response = await fetch(path);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn(`arm2e | Could not load seed data ${filename}`, error);
    return [];
  }
}

/**
 * @param {object[]} entries
 */
function normalizeJournalEntries(entries) {
  const htmlFormat = CONST.JOURNAL_ENTRY_TEXT_FORMATS?.HTML ?? 1;

  return entries.map((entry) => ({
    name: entry.name,
    pages: (entry.pages ?? []).map((page) => ({
      name: page.name,
      type: "text",
      text: {
        content: page.text?.content ?? "",
        format: htmlFormat
      }
    }))
  }));
}

/**
 * @param {CompendiumCollection} pack
 * @param {object[]} data
 */
async function importPackData(pack, data) {
  if (!data.length) return;

  const documentClass = pack.documentClass;
  const documents = pack.metadata.type === "JournalEntry"
    ? normalizeJournalEntries(data)
    : data;

  const wasLocked = pack.locked;

  if (wasLocked) {
    await pack.configure({ locked: false });
  }

  const BATCH_SIZE = 50;

  try {
    for (let offset = 0; offset < documents.length; offset += BATCH_SIZE) {
      const batch = documents.slice(offset, offset + BATCH_SIZE);
      await documentClass.createDocuments(batch, { pack: pack.collection });
    }
  } finally {
    if (wasLocked) {
      await pack.configure({ locked: true });
    }
  }
}

/**
 * Register compendium seeding hook.
 */
export function registerCompendiumSeeding() {
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;

    for (const seed of PACK_SEEDS) {
      const packId = `ars-magica-2e.${seed.pack}`;

      try {
        const pack = game.packs.get(packId);
        if (!pack) {
          console.warn(`arm2e | Compendium pack not found: ${packId}`);
          continue;
        }

        const index = await pack.getIndex();
        if (index.size > 0) continue;

        const data = await loadSeedData(seed.file);
        if (!data.length) {
          console.warn(`arm2e | No seed data loaded for ${seed.pack}`);
          continue;
        }

        await importPackData(pack, data);
        console.log(`arm2e | Seeded compendium ${seed.pack} (${data.length} entries)`);
      } catch (error) {
        console.error(`arm2e | Failed to seed compendium ${seed.pack}`, error);
      }
    }
  });
}
