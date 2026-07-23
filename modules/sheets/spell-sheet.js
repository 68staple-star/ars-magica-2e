import { ArM2eItemSheet } from "./item-sheet-base.js";

export class ArM2eSpellSheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/spell-sheet.html"
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const registry = CONFIG.ARM2E;
    const technique = String(context.system?.technique ?? "");
    const form = String(context.system?.form ?? "");

    context.techniques = (registry.TECHNIQUES ?? []).map((entry) => ({
      ...entry,
      selected: entry.id === technique
    }));
    context.forms = (registry.FORMS ?? []).map((entry) => ({
      ...entry,
      selected: entry.id === form
    }));
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".arm2e-journal-link").on("click", async (event) => {
      event.preventDefault();
      const { openJournalEntry } = await import("../utils/journal.js");
      await openJournalEntry(this.item.system.journal);
    });
  }
}
