import { ArM2eSeasonalActivityApp } from "../apps/seasonal-activity-app.js";
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
import { linkJournalToActor } from "../utils/journal.js";
import { groupCovenantRoster } from "../utils/seasonal.js";

/**
 * Saga-facing sheet for covenant Actors (aura, season, vis, members, library).
 */
export class ArM2eCovenantSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "actor", "covenant"],
      template: "systems/ars-magica-2e/templates/actor/covenant-sheet.html",
      width: 780,
      height: 860,
      resizable: true,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "overview"
      }],
      dragDrop: [{ dragSelector: ".arm2e-member-row, .arm2e-cov-item-row", dropSelector: null }]
    });
  }

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "Seasonal",
      class: "arm2e-seasonal-planner",
      icon: "fas fa-calendar-alt",
      onclick: (event) => {
        event.preventDefault();
        new ArM2eSeasonalActivityApp(this.actor).render(true);
      }
    });
    return buttons;
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
    const memberRows = members.map((actor) => ({
      id: actor.id,
      uuid: actor.uuid,
      name: actor.name,
      img: actor.img,
      characterType: actor.system?.identity?.characterType ?? "companion",
      house: actor.system?.identity?.house ?? ""
    }));
    context.members = memberRows;

    const roster = groupCovenantRoster(members);
    context.roster = {
      magi: roster.magi.map((actor) => memberRows.find((row) => row.id === actor.id)),
      companions: roster.companions.map((actor) => memberRows.find((row) => row.id === actor.id)),
      grogs: roster.grogs.map((actor) => memberRows.find((row) => row.id === actor.id)),
      other: roster.other.map((actor) => memberRows.find((row) => row.id === actor.id))
    };

    context.books = this.actor.items
      .filter((item) => item.type === "book")
      .map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.system?.kind ?? "summa",
        topic: item.system?.topic ?? "",
        level: item.system?.level ?? 0,
        quality: item.system?.quality ?? 0
      }));

    context.laboratories = this.actor.items
      .filter((item) => item.type === "laboratory")
      .map((item) => ({
        id: item.id,
        name: item.name,
        specialization: item.system?.specialization ?? "",
        size: item.system?.size ?? 0,
        generalQuality: item.system?.generalQuality ?? 0
      }));

    const seasonal = system.seasonal ?? {};
    context.seasonalSummary = `${seasonal.season || system.season || "Spring"} ${seasonal.year || system.currentYear || ""}`;
    context.seasonalCount = Array.isArray(seasonal.activities) ? seasonal.activities.length : 0;

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".arm2e-journal-link").on("click", this._onOpenChronicle.bind(this));
    html.find(".arm2e-open-member").on("click", this._onOpenMember.bind(this));
    html.find(".arm2e-unlink-member").on("click", this._onUnlinkMember.bind(this));
    html.find(".arm2e-open-seasonal").on("click", this._onOpenSeasonal.bind(this));
    html.find(".arm2e-item-create").on("click", this._onCreateItem.bind(this));
    html.find(".arm2e-item-edit").on("click", this._onEditItem.bind(this));
    html.find(".arm2e-item-delete").on("click", this._onDeleteItem.bind(this));

    const dropZone = html.find(".arm2e-member-drop");
    dropZone.on("dragover", (event) => {
      event.preventDefault();
      event.currentTarget.classList.add("is-dragover");
    });
    dropZone.on("dragleave", (event) => {
      event.currentTarget.classList.remove("is-dragover");
    });
    dropZone.on("drop", (event) => this._onDropMember(event));

    html.find(".arm2e-journal-drop").each((_, el) => {
      const zone = $(el);
      zone.on("dragover", (event) => {
        event.preventDefault();
        event.currentTarget.classList.add("is-dragover");
      });
      zone.on("dragleave", (event) => {
        event.currentTarget.classList.remove("is-dragover");
      });
      zone.on("drop", (event) => this._onDropJournalLink(event));
    });

    html.find(".arm2e-item-drop").each((_, el) => {
      const zone = $(el);
      zone.on("dragover", (event) => {
        event.preventDefault();
        event.currentTarget.classList.add("is-dragover");
      });
      zone.on("dragleave", (event) => {
        event.currentTarget.classList.remove("is-dragover");
      });
      zone.on("drop", (event) => this._onDropCovenantItem(event));
    });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onOpenSeasonal(event) {
    event.preventDefault();
    new ArM2eSeasonalActivityApp(this.actor).render(true);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onCreateItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    if (!["book", "laboratory"].includes(type)) return;

    const name = type === "book" ? "New Book" : "New Laboratory";
    const img = type === "book" ? "icons/svg/book.svg" : "icons/svg/castle.svg";
    await this.actor.createEmbeddedDocuments("Item", [{ name, type, img }]);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onEditItem(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    item?.sheet.render(true);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onDeleteItem(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title: "Delete Item",
      content: `<p>Delete <strong>${item.name}</strong>?</p>`,
      defaultYes: false
    });
    if (confirmed) await item.delete();
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

  /**
   * @param {JQuery.TriggeredEvent} event
   */
  async _onDropJournalLink(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove("is-dragover");

    const field = event.currentTarget.dataset.journalField;
    if (!field) return;

    const data = TextEditor.getDragEventData(event.originalEvent ?? event);
    if (!data?.uuid) return;

    const doc = await fromUuid(data.uuid);
    const linked = await linkJournalToActor(this.actor, field, doc);
    if (linked) {
      ui.notifications.info(`Linked ${doc.name}.`);
      this.render(false);
    }
  }

  /**
   * @param {JQuery.TriggeredEvent} event
   */
  async _onDropCovenantItem(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove("is-dragover");

    const expected = event.currentTarget.dataset.itemType;
    const data = TextEditor.getDragEventData(event.originalEvent ?? event);
    if (!data?.uuid) return;

    const doc = await fromUuid(data.uuid);
    if (!doc || doc.documentName !== "Item" || doc.type !== expected) {
      ui.notifications.warn(`Drop a ${expected} item here.`);
      return;
    }

    if (doc.parent?.id === this.actor.id) return;

    const itemData = doc.toObject();
    delete itemData._id;
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /** @override */
  _onDragStart(event) {
    const row = event.currentTarget.closest?.(".arm2e-member-row");
    if (row?.dataset?.uuid) {
      event.dataTransfer.setData("text/plain", JSON.stringify({
        type: "Actor",
        uuid: row.dataset.uuid
      }));
      return;
    }

    const itemRow = event.currentTarget.closest?.(".arm2e-cov-item-row");
    if (itemRow?.dataset?.itemId) {
      const item = this.actor.items.get(itemRow.dataset.itemId);
      if (item) {
        event.dataTransfer.setData("text/plain", JSON.stringify({
          type: "Item",
          uuid: item.uuid
        }));
        return;
      }
    }

    return super._onDragStart?.(event);
  }
}
