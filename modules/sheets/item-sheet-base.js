/**
 * Base AppV1 item sheet — always expose `system` for Handlebars templates.
 */
export class ArM2eItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "item"],
      width: 480,
      height: "auto"
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const document = this.document ?? this.object;
    context.item = document;
    context.system = foundry.utils.deepClone(document?.system ?? {});
    return context;
  }
}
