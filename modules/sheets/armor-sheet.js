import { ArM2eItemSheet } from "./item-sheet-base.js";
import { formatArmorSummary } from "../utils/equipment-summary.js";

export class ArM2eArmorSheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/armor-sheet.html",
      width: 520
    });
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    context.statSummary = formatArmorSummary(this.item.system);
    return context;
  }
}
