/**
 * Seed compendium packs on first world load when packs are empty.
 */

const PACK_SEEDS = [
  { pack: "arm2e-spells", file: "spells.json", documentClass: Item },
  { pack: "arm2e-weapons", file: "weapons.json", documentClass: Item },
  { pack: "arm2e-virtues-flaws", file: "virtues-flaws.json", documentClass: Item },
  { pack: "arm2e-rules-reference", file: "journals-rules.json", documentClass: JournalEntry },
  { pack: "arm2e-covenant-template", file: "journals-covenant.json", documentClass: JournalEntry },
  { pack: "arm2e-order-reference", file: "journals-order.json", documentClass: JournalEntry },
  { pack: "arm2e-ability-reference", file: "journals-abilities.json", documentClass: JournalEntry }
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
  return entries.map((entry) => ({
    name: entry.name,
    pages: (entry.pages ?? []).map((page) => ({
      name: page.name,
      type: "text",
      text: {
        content: page.text?.content ?? "",
        format: CONST.JOURNAL_ENTRY_TEXT_FORMATS.HTML
      }
    }))
  }));
}

/**
 * @param {CompendiumCollection} pack
 * @param {object[]} data
 * @param {typeof Item | typeof JournalEntry} documentClass
 */
async function importPackData(pack, data, documentClass) {
  if (!data.length) return;

  const documents = documentClass.name === "JournalEntry"
    ? normalizeJournalEntries(data)
    : data;

  await documentClass.createDocuments(documents, { pack: pack.collection });
}

/**
 * Register compendium seeding hook.
 */
export function registerCompendiumSeeding() {
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;

    for (const seed of PACK_SEEDS) {
      const pack = game.packs.get(`ars-magica-2e.${seed.pack}`);
      if (!pack) continue;

      const index = await pack.getIndex();
      if (index.size > 0) continue;

      const data = await loadSeedData(seed.file);
      if (!data.length) continue;

      await importPackData(pack, data, seed.documentClass);
      console.log(`arm2e | Seeded compendium ${seed.pack} (${data.length} entries)`);
    }
  });
}
