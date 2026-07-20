import {
  AURA_TYPES,
  COVENANT_SEASONS,
  COVENANT_STAGES,
  VIS_ARTS,
  findCovenantMembers,
  linkCharacterToCovenant,
  openLinkedDocument,
  unlinkCharacterFromCovenant
} from "../utils/covenant.js";

/**
 * Saga-facing sheet for covenant Actors (aura, season, vis, members).
 */
export class ArM2eCovenantSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "actor", "covenant"],
      template: "systems/ars-magica-2e/templates/actor/covenant-sheet.html",
      width: 760,
      height: 820,
      resizable: true,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "overview"
      }],
      dragDrop: [{ dragSelector: ".arm2e-member-row", dropSelector: null }]
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.actor.system ?? {};

    context.system = system;
    context.seasons = COVENANT_SEASONS;
    context.stages = COVENANT_STAGES;
    context.auraTypes = AURA_TYPES;
    context.visArts = VIS_ARTS.map((art) => ({
      ...art,
      value: Number(system.vis?.[art.id] ?? 0)
    }));
    context.visTotal = context.visArts.reduce((sum, art) => sum + art.value, 0);

    const members = findCovenantMembers(this.actor);
    context.members = members.map((actor) => ({
      id: actor.id,
      uuid: actor.uuid,
      name: actor.name,
      img: actor.img,
      characterType: actor.system?.identity?.characterType ?? "companion",
      house: actor.system?.identity?.house ?? ""
    }));

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".arm2e-journal-link").on("click", this._onOpenChronicle.bind(this));
    html.find(".arm2e-open-member").on("click", this._onOpenMember.bind(this));
    html.find(".arm2e-unlink-member").on("click", this._onUnlinkMember.bind(this));

    const dropZone = html.find(".arm2e-member-drop");
    dropZone.on("dragover", (event) => {
      event.preventDefault();
      event.currentTarget.classList.add("is-dragover");
    });
    dropZone.on("dragleave", (event) => {
      event.currentTarget.classList.remove("is-dragover");
    });
    dropZone.on("drop", (event) => this._onDropMember(event));
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onOpenChronicle(event) {
    event.preventDefault();
    event.stopPropagation();
    const uuid = event.currentTarget.dataset.journalUuid
      ?? this.actor.system?.chronicleJournal;
    await openLinkedDocument(uuid, {
      missing: "No chronicle journal linked. Paste a Journal UUID under Notes."
    });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onOpenMember(event) {
    event.preventDefault();
    event.stopPropagation();
    const uuid = event.currentTarget.dataset.uuid;
    await openLinkedDocument(uuid, { missing: "Member actor not found." });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onUnlinkMember(event) {
    event.preventDefault();
    event.stopPropagation();
    const id = event.currentTarget.dataset.actorId;
    const member = game.actors.get(id);
    if (!member) return;

    const confirmed = await Dialog.confirm({
      title: "Unlink Member",
      content: `<p>Remove <strong>${member.name}</strong> from this covenant?</p>`,
      defaultYes: false
    });
    if (!confirmed) return;

    await unlinkCharacterFromCovenant(member);
    this.render(false);
  }

  /**
   * @param {JQuery.TriggeredEvent} event
   */
  async _onDropMember(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("is-dragover");

    const data = TextEditor.getDragEventData(event.originalEvent ?? event);
    if (!data?.uuid) return;

    const doc = await fromUuid(data.uuid);
    if (!doc || doc.documentName !== "Actor") {
      ui.notifications.warn("Drop a Character actor to add them to this covenant.");
      return;
    }

    const linked = await linkCharacterToCovenant(doc, this.actor);
    if (linked) {
      ui.notifications.info(`${doc.name} joined ${this.actor.name}.`);
      this.render(false);
    }
  }

  /** @override */
  _onDragStart(event) {
    const row = event.currentTarget.closest?.(".arm2e-member-row");
    if (!row?.dataset?.uuid) return super._onDragStart?.(event);

    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Actor",
      uuid: row.dataset.uuid
    }));
  }
}
