import { ArM2eItemSheet } from "./item-sheet-base.js";
import { formatWeaponSummary } from "../utils/equipment-summary.js";

export class ArM2eWeaponSheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/weapon-sheet.html",
      width: 520
    });
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    context.statSummary = formatWeaponSummary(this.item.system);
    return context;
  }
}
