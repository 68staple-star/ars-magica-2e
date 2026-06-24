import { ArM2eCreationWizard } from "../apps/creation-wizard.js";

/**
 * Register UI hooks for actor directory shortcuts and sheet header controls.
 */
export function registerUiHooks() {
  Hooks.on("getActorDirectoryEntryContext", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;

    entryOptions.push({
      name: "Character Wizard",
      icon: '<i class="fas fa-magic"></i>',
      callback: (li) => {
        const actor = game.actors.get(li.data("documentId"));
        if (!actor || actor.type !== "character") return;
        new ArM2eCreationWizard(actor).render(true);
      }
    });
  });

  Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    if (game.system.id !== "ars-magica-2e") return;
    if (!app.actor || app.actor.type !== "character") return;
    if (!app.constructor?.name?.includes("ArM2e")) return;

    const alreadyAdded = buttons.some((button) => button.class === "arm2e-character-wizard");
    if (alreadyAdded) return;

    buttons.unshift({
      label: "Character Wizard",
      class: "arm2e-character-wizard",
      icon: "fas fa-magic",
      onclick: (event) => {
        event.preventDefault();
        new ArM2eCreationWizard(app.actor).render(true);
      }
    });
  });
}
