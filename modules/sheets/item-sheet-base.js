export class ArM2eItemSheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "item"],
      width: 480,
      height: "auto"
    });
  }
}
