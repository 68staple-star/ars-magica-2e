const PARTIAL_PATHS = [
  "systems/ars-magica-2e/templates/actor/partials/header-band.html",
  "systems/ars-magica-2e/templates/actor/partials/tab-character.html",
  "systems/ars-magica-2e/templates/actor/partials/tab-abilities.html",
  "systems/ars-magica-2e/templates/actor/partials/tab-virtues.html",
  "systems/ars-magica-2e/templates/actor/partials/tab-combat.html",
  "systems/ars-magica-2e/templates/actor/partials/tab-magic.html"
];

/**
 * Preload actor sheet partial templates during world setup.
 */
export function registerTemplateLoading() {
  Hooks.once("setup", async () => {
    const systemId = game.system?.id ?? "unknown";
    console.log(`arm2e | setup hook — world system is "${systemId}"`);

    if (systemId !== "ars-magica-2e") return;

    try {
      await loadTemplates(PARTIAL_PATHS);
      console.log("arm2e | Preloaded actor sheet templates");
    } catch (error) {
      console.error("arm2e | Failed to preload actor sheet templates", error);
    }
  });
}
