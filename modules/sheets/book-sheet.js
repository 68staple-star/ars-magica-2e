import { ArM2eItemSheet } from "./item-sheet-base.js";

export class ArM2eBookSheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/book-sheet.html",
      width: 520
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    context.bookKinds = ["summa", "tractatus", "labText", "other"];
    return context;
  }
}
