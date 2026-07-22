/**
 * Compendium seeding is disabled.
 *
 * Packs ship as compiled LevelDB under packs/ and must not be unlocked or
 * re-imported at world ready. Doing so can copy large Item/Actor sets into the
 * world data directory and leave Foundry stuck on "Downloading world data".
 *
 * To rebuild packs during development, run: npm run compile:packs
 */

/**
 * No-op registration kept so arm2e.js import stays stable.
 */
export function registerCompendiumSeeding() {
  Hooks.once("ready", () => {
    if (game.system?.id !== "ars-magica-2e") return;
    console.log("arm2e | Compendium auto-seed disabled (packs are precompiled)");
  });
}
