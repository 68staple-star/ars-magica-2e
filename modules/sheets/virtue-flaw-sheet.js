import { ArM2eItemSheet } from "./item-sheet-base.js";
import { summarizeGrants } from "../utils/virtue-grants.js";

export class ArM2eVirtueFlawSheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/virtue-flaw-sheet.html"
    });
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    context.grantSummary = summarizeGrants(this.item.system?.grants);
    return context;
  }
}
