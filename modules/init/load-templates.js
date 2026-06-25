const TEMPLATE_ROOT = "systems/ars-magica-2e/templates";

const SHEET_TEMPLATES = [
  `${TEMPLATE_ROOT}/actor/character-sheet.html`,
  `${TEMPLATE_ROOT}/apps/creation-wizard.html`,
  `${TEMPLATE_ROOT}/actor/partials/header-band.html`,
  `${TEMPLATE_ROOT}/actor/partials/ability-row.html`,
  `${TEMPLATE_ROOT}/actor/partials/tab-character.html`,
  `${TEMPLATE_ROOT}/actor/partials/tab-abilities.html`,
  `${TEMPLATE_ROOT}/actor/partials/tab-virtues.html`,
  `${TEMPLATE_ROOT}/actor/partials/tab-combat.html`,
  `${TEMPLATE_ROOT}/actor/partials/tab-magic.html`,
  `${TEMPLATE_ROOT}/item/ability-sheet.html`,
  `${TEMPLATE_ROOT}/chat/roll-card.html`
];

/**
 * Preload actor sheet and wizard templates during world setup.
 */
export function registerTemplateLoading() {
  Hooks.once("setup", async () => {
    const systemId = game.system?.id ?? "unknown";
    console.log(`arm2e | setup hook — world system is "${systemId}"`);

    if (systemId !== "ars-magica-2e") return;

    const loadTemplates = foundry.applications.handlebars.loadTemplates;

    try {
      await loadTemplates(SHEET_TEMPLATES);
      console.log(`arm2e | Preloaded ${SHEET_TEMPLATES.length} templates`);
    } catch (error) {
      console.error("arm2e | Failed to preload templates", error);
    }
  });
}
