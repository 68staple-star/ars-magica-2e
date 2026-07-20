import {
  COVENANT_SEASONS,
  findCovenantMembers
} from "../utils/covenant.js";
import {
  SEASONAL_ACTIVITY_TYPES,
  advanceCovenantSeason,
  createSeasonalActivity,
  getSeasonalState,
  setSeasonalActivities
} from "../utils/seasonal.js";

/**
 * Seasonal activity planner for a covenant Actor.
 */
export class ArM2eSeasonalActivityApp extends FormApplication {
  /**
   * @param {Actor} covenantActor
   * @param {object} [options]
   */
  constructor(covenantActor, options = {}) {
    super(covenantActor, options);
    this.covenant = covenantActor;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "arm2e-seasonal-activity",
      classes: ["ars-magica-2e", "arm2e-seasonal-app"],
      template: "systems/ars-magica-2e/templates/apps/seasonal-activity.html",
      width: 720,
      height: 640,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      title: "Seasonal Activities"
    });
  }

  /** @override */
  get title() {
    return `Seasonal Activities — ${this.covenant?.name ?? "Covenant"}`;
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const state = getSeasonalState(this.covenant);
    const members = findCovenantMembers(this.covenant);
    const books = this.covenant.items.filter((item) => item.type === "book");
    const labs = this.covenant.items.filter((item) => item.type === "laboratory");

    context.covenant = this.covenant;
    context.seasons = COVENANT_SEASONS;
    context.activityTypes = SEASONAL_ACTIVITY_TYPES;
    context.year = state.year;
    context.season = state.season;
    context.log = state.log;
    context.members = members.map((actor) => ({
      uuid: actor.uuid,
      name: actor.name,
      type: actor.system?.identity?.characterType ?? "companion"
    }));
    context.targets = [
      ...books.map((item) => ({ uuid: item.uuid, name: `Book: ${item.name}` })),
      ...labs.map((item) => ({ uuid: item.uuid, name: `Lab: ${item.name}` }))
    ];
    context.activities = state.activities.map((entry) => ({
      ...entry,
      actorName: members.find((actor) => actor.uuid === entry.actorUuid)?.name
        ?? (entry.actorUuid ? "(missing)" : "—"),
      activityLabel: SEASONAL_ACTIVITY_TYPES.find((type) => type.id === entry.activity)?.label
        ?? entry.activity,
      targetName: context.targets.find((target) => target.uuid === entry.targetUuid)?.name
        ?? (entry.targetUuid ? "(missing)" : "—")
    }));

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".arm2e-seasonal-add").on("click", this._onAdd.bind(this));
    html.find(".arm2e-seasonal-remove").on("click", this._onRemove.bind(this));
    html.find(".arm2e-seasonal-toggle").on("click", this._onToggleResolved.bind(this));
    html.find(".arm2e-seasonal-advance").on("click", this._onAdvance.bind(this));
    html.find(".arm2e-seasonal-save-meta").on("click", this._onSaveMeta.bind(this));
  }

  /**
   * @returns {object[]}
   */
  _activities() {
    return getSeasonalState(this.covenant).activities;
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {Record<string, string>}
   */
  _readForm(form) {
    /** @type {Record<string, string>} */
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = String(value);
    });
    return data;
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onAdd(event) {
    event.preventDefault();
    const form = this.element.find("form")[0];
    const formData = this._readForm(form);
    const activity = createSeasonalActivity({
      actorUuid: formData.newActorUuid || "",
      activity: formData.newActivity || "study",
      targetUuid: formData.newTargetUuid || "",
      summary: formData.newSummary || "",
      xpNote: formData.newXpNote || ""
    });
    await setSeasonalActivities(this.covenant, [...this._activities(), activity]);
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRemove(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.activityId;
    await setSeasonalActivities(
      this.covenant,
      this._activities().filter((entry) => entry.id !== id)
    );
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onToggleResolved(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.activityId;
    const activities = this._activities().map((entry) => (
      entry.id === id ? { ...entry, resolved: !entry.resolved } : entry
    ));
    await setSeasonalActivities(this.covenant, activities);
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onSaveMeta(event) {
    event.preventDefault();
    const form = this.element.find("form")[0];
    const formData = this._readForm(form);
    const year = Number(formData.seasonalYear) || getSeasonalState(this.covenant).year;
    const season = formData.seasonalSeason || "Spring";
    await this.covenant.update({
      "system.seasonal.year": year,
      "system.seasonal.season": season,
      "system.seasonal.log": formData.seasonalLog ?? "",
      "system.currentYear": year,
      "system.season": season
    });
    ui.notifications.info("Seasonal planner updated.");
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onAdvance(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title: "Advance Season",
      content: "<p>Advance to the next season? Resolved activities are cleared; unresolved stay on the list.</p>",
      defaultYes: false
    });
    if (!confirmed) return;

    const next = await advanceCovenantSeason(this.covenant);
    ui.notifications.info(`Advanced to ${next.season} ${next.year}.`);
    this.render(false);
  }
}
