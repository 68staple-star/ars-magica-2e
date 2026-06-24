import { ArM2eItemSheet } from "./item-sheet-base.js";

export class ArM2eVirtueFlawSheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/virtue-flaw-sheet.html"
    });
  }
}
