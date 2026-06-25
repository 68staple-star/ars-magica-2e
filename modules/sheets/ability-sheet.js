import { ArM2eItemSheet } from "./item-sheet-base.js";

export class ArM2eAbilitySheet extends ArM2eItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ars-magica-2e/templates/item/ability-sheet.html",
      width: 420
    });
  }

  /** @override */
  getData() {
    const context = super.getData();
    const registry = CONFIG.ARM2E;
    context.characteristics = registry.CHARACTERISTICS;
    context.definition = registry.getAbilityByKey?.(this.item.system?.key)
      ?? registry.ABILITY_BY_KEY?.[this.item.system?.key];
    return context;
  }
}
