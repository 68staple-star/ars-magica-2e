import { ArM2eCreationWizard } from "../apps/creation-wizard.js";
import { attachRulesPdfViaPicker, openWorldRulesPdfJournal } from "../utils/journal.js";

const WIZARD_BUTTON = {
  label: "Character Wizard",
  class: "arm2e-character-wizard",
  icon: "fas fa-magic"
};

/**
 * @param {Actor} actor
 */
function openCreationWizard(actor) {
  if (!actor || actor.type !== "character") return;
  new ArM2eCreationWizard(actor).render(true);
}

/**
 * @param {HTMLElement} element
 * @returns {string | undefined}
 */
function resolveActorIdFromElement(element) {
  if (!element) return undefined;
  const li = element.closest?.("[data-document-id]") ?? element;
  return li.dataset?.documentId ?? element.dataset?.documentId;
}

/**
 * @param {Array<object>} entryOptions
 */
function addJournalPdfOptions(entryOptions) {
  if (!game.user.isGM) return;

  entryOptions.push({
    name: "Attach Rules PDF…",
    icon: '<i class="fas fa-file-pdf"></i>',
    callback: () => {
      attachRulesPdfViaPicker().catch((error) => {
        console.error("arm2e | Attach Rules PDF failed", error);
        ui.notifications.error("Could not attach rules PDF.");
      });
    }
  });

  entryOptions.push({
    name: "Open Rules PDF Journal",
    icon: '<i class="fas fa-book-open"></i>',
    callback: () => {
      openWorldRulesPdfJournal().catch((error) => {
        console.error("arm2e | Open Rules PDF failed", error);
      });
    }
  });
}

/**
 * Register UI hooks for actor directory shortcuts and sheet header controls.
 */
export function registerUiHooks() {
  const addWizardButton = (buttons, actor) => {
    if (!actor || actor.type !== "character") return;
    if (buttons.some((button) => button.class === WIZARD_BUTTON.class)) return;

    buttons.unshift({
      ...WIZARD_BUTTON,
      onclick: (event) => {
        event.preventDefault();
        openCreationWizard(actor);
      }
    });
  };

  Hooks.on("getActorContextOptions", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;

    entryOptions.push({
      name: "Character Wizard",
      icon: '<i class="fas fa-magic"></i>',
      callback: (li) => {
        const actorId = resolveActorIdFromElement(li);
        const actor = actorId ? game.actors.get(actorId) : undefined;
        openCreationWizard(actor);
      }
    });
  });

  // Legacy v11–v12 actor directory hook
  Hooks.on("getActorDirectoryEntryContext", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;

    entryOptions.push({
      name: "Character Wizard",
      icon: '<i class="fas fa-magic"></i>',
      callback: (li) => {
        const actorId = resolveActorIdFromElement(li) ?? li.data?.("documentId");
        const actor = actorId ? game.actors.get(actorId) : undefined;
        openCreationWizard(actor);
      }
    });
  });

  Hooks.on("getJournalEntryContextOptions", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;
    addJournalPdfOptions(entryOptions);
  });

  Hooks.on("getJournalDirectoryEntryContext", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;
    addJournalPdfOptions(entryOptions);
  });

  Hooks.on("getApplicationV1HeaderButtons", (app, buttons) => {
    if (game.system.id !== "ars-magica-2e") return;
    if (!app.actor || app.actor.type !== "character") return;
    if (!app.constructor?.name?.includes("ArM2e")) return;
    addWizardButton(buttons, app.actor);
  });

  // Legacy v11–v12 sheet header hook
  Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    if (game.system.id !== "ars-magica-2e") return;
    if (!app.actor || app.actor.type !== "character") return;
    if (!app.constructor?.name?.includes("ArM2e")) return;
    addWizardButton(buttons, app.actor);
  });
}
