import { ARM2E } from "../config.js";
import { rollArM2e, rollSpellCast } from "../dice.js";
import { ArM2eCreationWizard } from "../apps/creation-wizard.js";
import { prepareCombatData } from "../utils/combat.js";
import { prepareSpellLists } from "../utils/spells.js";
import { prepareAbilitySections, prepareCharacteristicPairs } from "../utils/sheet-data.js";
import { prepareVirtueFlawList } from "../utils/virtues.js";
import { prepareFatigueTrack, prepareWoundTrack } from "../utils/wounds.js";
import { openJournalEntry } from "../utils/journal.js";

const DROP_TARGETS = {
  spell: "spell",
  weapon: "weapon",
  virtueFlaw: "virtueFlaw",
  armor: "armor",
  equipment: "equipment"
};

export class ArM2eActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "actor", "character"],
      template: "systems/ars-magica-2e/templates/actor/character-sheet.html",
      width: 1040,
      height: 980,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "character"
      }],
      dragDrop: [{
        dragSelector: ".item-edit, .spell-row, .weapon-row, .armor-row, .equipment-row, .arm2e-vf-entry",
        dropSelector: null
      }]
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.actor.system ?? context.system ?? {};
    const registry = CONFIG.ARM2E ?? ARM2E;
    const characterType = system.identity?.characterType ?? "companion";

    context.system = system;
    context.actor = this.actor;

    context.isMagus = characterType === "magus";
    context.isGrog = characterType === "grog";
    context.characteristicPairs = prepareCharacteristicPairs(registry, system);
    context.abilitySections = prepareAbilitySections(system, registry);
    context.forms = this._prepareForms(system, registry);
    context.artRows = this._prepareArtRows(system, registry);
    context.weaponSkillsNote = registry.WEAPON_SKILLS.note;
    context.combat = this._prepareCombat(system);
    context.spellLists = this._prepareSpellLists(system, registry);
    context.virtueFlaws = prepareVirtueFlawList(this.actor.items);
    context.woundTrack = prepareWoundTrack(system);
    context.fatigueTrack = prepareFatigueTrack(system);

    return context;
  }

  /** @override */
  getHeaderButtons() {
    const buttons = super.getHeaderButtons();
    buttons.unshift({
      label: "Character Wizard",
      class: "arm2e-character-wizard",
      icon: "fas fa-magic",
      onclick: (event) => {
        event.preventDefault();
        new ArM2eCreationWizard(this.actor).render(true);
      }
    });
    return buttons;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    this._bindPrimaryTabs(html);

    html.find(".characteristic-label").on("click", this._onRollCharacteristic.bind(this));
    html.find(".ability-row").on("click", this._onRollAbility.bind(this));
    html.find(".arts-cell").on("click", this._onRollArtCell.bind(this));
    html.find(".weapon-equipped, .item-equipped").on("change", this._onToggleEquipped.bind(this));
    html.find(".combat-roll-attack").on("click", this._onRollWeaponAttack.bind(this));
    html.find(".combat-roll-damage").on("click", this._onRollWeaponDamage.bind(this));
    html.find(".combat-roll-first-strike").on("click", this._onRollWeaponFirstStrike.bind(this));
    html.find(".combat-roll-defense").on("click", this._onRollWeaponDefense.bind(this));
    html.find(".combat-roll-dodge").on("click", this._onRollDodge.bind(this));
    html.find(".spell-roll-name, .spell-roll-cast").on("click", this._onRollSpellCast.bind(this));
    html.find(".wound-step").on("click", this._onSetWoundLevel.bind(this));
    html.find(".fatigue-step").on("click", this._onSetFatigueLevel.bind(this));
    html.find(".arm2e-item-create").on("click", this._onCreateItem.bind(this));
    html.find(".arm2e-item-delete").on("click", this._onDeleteItem.bind(this));
    html.find(".item-edit").on("click", this._onEditItem.bind(this));
    html.find(".arm2e-journal-link").on("click", this._onOpenJournal.bind(this));
    html.find(".arm2e-collapse-toggle").on("click", this._onToggleCollapse.bind(this));
    html.find(".arm2e-ability-filter").on("input", this._onFilterAbilities.bind(this));

    for (const [selector, type] of Object.entries(DROP_TARGETS)) {
      const panel = html.find(`[data-drop-target="${type}"]`);
      if (!panel.length) continue;
      panel.on("dragover", (event) => event.preventDefault());
      panel.on("drop", (event) => this._onDropItem(event, type));
    }
  }

  /** @type {{ actor: Actor }} */
  _rollOptions() {
    return { actor: this.actor };
  }

  /**
   * Ensure tab navigation works on Foundry v13 where AppV1 tab binding may not run.
   * @param {JQuery} html
   */
  _bindPrimaryTabs(html) {
    const root = html[0] ?? this.element?.[0];
    if (!root) return;

    const TabsClass = foundry.applications?.api?.Tabs ?? globalThis.Tabs;
    if (!TabsClass) {
      this._activateFallbackTab(html);
      return;
    }

    try {
      this._tabs = new TabsClass({
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "character"
      });
      this._tabs.bind(root);
    } catch (error) {
      console.error("arm2e | Failed to bind sheet tabs", error);
      this._activateFallbackTab(html);
    }

    if (!html.find(".sheet-body .tab.active").length) {
      this._activateFallbackTab(html);
    }
  }

  /**
   * @param {JQuery} html
   */
  _activateFallbackTab(html) {
    html.find(".sheet-tabs .item").removeClass("active");
    html.find(".sheet-body .tab").removeClass("active");
    html.find('.sheet-tabs .item[data-tab="character"]').addClass("active");
    html.find('.sheet-body .tab[data-tab="character"]').addClass("active");
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollCharacteristic(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".characteristic-row");
    if (!row) return;

    const label = row.querySelector(".characteristic-label")?.textContent?.trim() ?? "Characteristic";
    const abbrev = row.querySelector(".characteristic-abbrev")?.textContent?.trim() ?? "";
    const value = Number(row.querySelector(".characteristic-value")?.value) || 0;

    await rollArM2e("stress", value, `${label} (${abbrev})`, this._rollOptions());
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollAbility(event) {
    if (event.target.closest("input, select, textarea, button, a")) return;

    const row = event.currentTarget;
    const label = row.dataset.abilityLabel ?? row.querySelector(".ability-name")?.textContent?.trim() ?? "Ability";
    const abilityType = row.dataset.abilityType ?? "ability";
    const value = Number(row.querySelector(".ability-value input")?.value) || 0;
    const specialty = row.querySelector(".ability-specialty input")?.value?.trim();
    const specialtyBonus = specialty ? 1 : 0;
    const modifier = value + specialtyBonus;
    const specialtyNote = specialty ? `, specialty: ${specialty}` : "";

    await rollArM2e("stress", modifier, `${label} (${abilityType}${specialtyNote})`, this._rollOptions());
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollArtCell(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const techniqueId = cell.dataset.technique ?? "";
    const formId = cell.dataset.form ?? "";
    const registry = CONFIG.ARM2E ?? ARM2E;
    const technique = registry.TECHNIQUES.find((entry) => entry.id === techniqueId);
    const form = registry.FORMS.find((entry) => entry.id === formId);
    const modifier = Number(cell.querySelector(".art-total")?.textContent) || 0;
    const techniqueLabel = technique?.abbrev ?? techniqueId;
    const formLabel = form?.abbrev ?? formId;

    await rollArM2e("stress", modifier, `${techniqueLabel}${formLabel} Casting Total`, this._rollOptions());
  }

  /**
   * @param {JQuery.ChangeEvent} event
   */
  async _onToggleEquipped(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    await item.update({ "system.equipped": event.currentTarget.checked });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollWeaponAttack(event) {
    event.preventDefault();
    await this._rollWeaponTotal(event, "attack", "Attack");
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollWeaponDamage(event) {
    event.preventDefault();
    await this._rollWeaponTotal(event, "damage", "Damage");
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollWeaponFirstStrike(event) {
    event.preventDefault();
    await this._rollWeaponTotal(event, "firstStrike", "First Strike");
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollWeaponDefense(event) {
    event.preventDefault();
    await this._rollWeaponTotal(event, "defense", "Parry Defense");
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollDodge(event) {
    event.preventDefault();
    const modifier = Number(event.currentTarget.dataset.modifier);
    const safeModifier = Number.isFinite(modifier) ? modifier : 0;
    await rollArM2e("stress", safeModifier, "Dodge Defense", this._rollOptions());
  }

  /**
   * @param {JQuery.ClickEvent} event
   * @param {"attack" | "damage" | "firstStrike" | "defense"} totalKey
   * @param {string} labelPrefix
   */
  async _rollWeaponTotal(event, _totalKey, labelPrefix) {
    const row = event.currentTarget.closest(".weapon-row");
    if (!row) return;

    const weaponName = row.dataset.weaponName ?? "Weapon";
    const modifier = Number(event.currentTarget.dataset.modifier);
    const safeModifier = Number.isFinite(modifier) ? modifier : 0;

    await rollArM2e("stress", safeModifier, `${weaponName} — ${labelPrefix}`, this._rollOptions());
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollSpellCast(event) {
    if (event.target.closest(".item-edit, .arm2e-item-delete, .arm2e-journal-link")) return;

    event.preventDefault();
    const row = event.currentTarget.closest(".spell-row");
    if (!row) return;

    const spellName = row.dataset.spellName ?? "Spell";
    const castingModifier = Number(row.dataset.castingModifier);
    const spellLevel = Number(row.dataset.spellLevel);
    const safeModifier = Number.isFinite(castingModifier) ? castingModifier : 0;
    const safeLevel = Number.isFinite(spellLevel) ? spellLevel : 0;

    await rollSpellCast(spellName, safeModifier, safeLevel, this._rollOptions());
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onSetWoundLevel(event) {
    event.preventDefault();
    const level = event.currentTarget.dataset.woundLevel;
    if (!level) return;
    await this.actor.update({ "system.wounds.level": level });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onSetFatigueLevel(event) {
    event.preventDefault();
    const level = event.currentTarget.dataset.fatigueLevel;
    if (!level) return;
    await this.actor.update({ "system.fatigue.level": level });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onCreateItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.itemType;
    if (!type) return;

    const defaults = {
      spell: { name: "New Spell", type: "spell" },
      weapon: { name: "New Weapon", type: "weapon" },
      virtueFlaw: { name: "New Virtue", type: "virtueFlaw", system: { kind: "virtue", points: 1 } },
      armor: { name: "New Armor", type: "armor" },
      equipment: { name: "New Equipment", type: "equipment" }
    };

    const itemData = defaults[type];
    if (!itemData) return;

    const created = await Item.create(itemData, { parent: this.actor });
    if (created) created.sheet?.render(true);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onDeleteItem(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId ?? event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
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
  _onEditItem(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onOpenJournal(event) {
    event.preventDefault();
    event.stopPropagation();
    const uuid = event.currentTarget.dataset.journalUuid;
    await openJournalEntry(uuid);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onToggleCollapse(event) {
    event.preventDefault();
    const panel = event.currentTarget.closest(".arm2e-collapsible");
    if (!panel) return;

    const isOpen = panel.classList.toggle("is-open");
    event.currentTarget.setAttribute("aria-expanded", String(isOpen));
  }

  /**
   * @param {JQuery.TriggeredEvent} event
   */
  _onFilterAbilities(event) {
    const query = String(event.currentTarget.value ?? "").trim().toLowerCase();
    const rows = this.element.find(".arm2e-tab-abilities .ability-row");

    rows.each((_, row) => {
      const label = row.dataset.abilityLabel?.toLowerCase() ?? row.querySelector(".ability-name")?.textContent?.toLowerCase() ?? "";
      row.style.display = !query || label.includes(query) ? "" : "none";
    });
  }

  /**
   * @param {DragEvent} event
   * @param {string} expectedType
   */
  async _onDropItem(event, expectedType) {
    event.preventDefault();
    const data = TextEditor.getDragEventData(event);
    if (!data?.uuid) return;

    const doc = await fromUuid(data.uuid);
    if (!doc || doc.documentName !== "Item") return;
    if (doc.type !== expectedType) {
      ui.notifications.warn(`Expected a ${expectedType} item.`);
      return;
    }

    if (doc.parent?.id === this.actor.id) return;

    const itemData = doc.toObject();
    delete itemData._id;
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * @param {object} system
   */
  _prepareCombat(system) {
    const weaponItems = this.actor.items.filter((item) => item.type === "weapon");
    const armorItems = this.actor.items.filter((item) => item.type === "armor");
    const equipmentItems = this.actor.items.filter((item) => item.type === "equipment");
    return prepareCombatData(system, weaponItems, armorItems, equipmentItems);
  }

  /**
   * @param {object} system
   * @param {typeof ARM2E} registry
   */
  _prepareSpellLists(system, registry) {
    const spellItems = this.actor.items.filter((item) => item.type === "spell");
    return prepareSpellLists(system, spellItems, registry);
  }

  /**
   * @param {object} system
   * @param {typeof ARM2E} registry
   */
  _prepareForms(system, registry) {
    return registry.FORMS.map((form) => ({
      ...form,
      score: system.arts?.forms?.[form.id] ?? 0,
      field: `system.arts.forms.${form.id}`
    }));
  }

  /**
   * @param {object} system
   * @param {typeof ARM2E} registry
   */
  _prepareArtRows(system, registry) {
    return registry.TECHNIQUES.map((technique) => {
      const techniqueScore = system.arts?.techniques?.[technique.id] ?? 0;

      return {
        technique: {
          ...technique,
          score: techniqueScore,
          field: `system.arts.techniques.${technique.id}`
        },
        cells: registry.FORMS.map((form) => ({
          form,
          total: techniqueScore + (system.arts?.forms?.[form.id] ?? 0)
        }))
      };
    });
  }
}
