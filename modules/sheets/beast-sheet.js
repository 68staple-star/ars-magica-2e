/**
 * Lightweight sheet for bestiary / creature Actors.
 */
export class ArM2eBeastSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "actor", "beast"],
      template: "systems/ars-magica-2e/templates/actor/beast-sheet.html",
      width: 620,
      height: 720,
      resizable: true
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.actor.system;
    context.realms = ["Magic", "Faerie", "Infernal", "Divine", "Mundane"];
    return context;
  }
}
