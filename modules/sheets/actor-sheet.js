import { ARM2E } from "../config.js";
import { rollArM2e, rollSpellCast } from "../dice.js";
import { ArM2eCreationWizard } from "../apps/creation-wizard.js";
import { promptAbilityRoll } from "../utils/ability-rolls.js";
import { findAbilityItem } from "../utils/abilities.js";
import { prepareCombatData } from "../utils/combat.js";
import { prepareSpellLists } from "../utils/spells.js";
import { prepareAbilityColumns, prepareCharacteristicPairs } from "../utils/sheet-data.js";
import { promptSpontaneousCast } from "../utils/spontaneous-cast.js";
import { prepareVirtueFlawList } from "../utils/virtues.js";
import {
  fatigueLevelUpdate,
  prepareFatigueTrack,
  prepareStatusStrip,
  prepareWoundTrack,
  woundLevelUpdate
} from "../utils/wounds.js";
import {
  getWorldRulesPdfJournalUuid,
  linkJournalToActor,
  openJournalEntry,
  openWorldRulesPdfJournal,
  pickPdfPathForActor
} from "../utils/journal.js";
import {
  linkCharacterToCovenant,
  openLinkedDocument,
  unlinkCharacterFromCovenant
} from "../utils/covenant.js";
import { buildRollDragData } from "../utils/roll-macros.js";

const DROP_TARGETS = {
  ability: "ability",
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
      width: 1280,
      height: 900,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "character"
      }],
      dragDrop: [{
        dragSelector: ".item-edit, .spell-row, .weapon-row, .armor-row, .equipment-row, .arm2e-vf-entry, .ability-row, .characteristic-row, .combat-roll-dodge, .arts-cell",
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

    const abilityItems = this.actor.items.filter((item) => item.type === "ability");

    context.isMagus = characterType === "magus";
    context.isGrog = characterType === "grog";
    context.characteristicPairs = prepareCharacteristicPairs(registry, system);
    context.abilityColumns = prepareAbilityColumns(abilityItems, registry);
    context.forms = this._prepareForms(system, registry);
    context.artRows = this._prepareArtRows(system, registry);
    context.weaponSkillsNote = registry.WEAPON_SKILLS.note;
    context.combat = this._prepareCombat(system);
    context.spellLists = this._prepareSpellLists(system, registry);
    context.virtueFlaws = prepareVirtueFlawList(this.actor.items);
    context.woundTrack = prepareWoundTrack(system);
    context.fatigueTrack = prepareFatigueTrack(system);
    context.status = prepareStatusStrip(system, context.combat?.encumbrance ?? 0);

    return context;
  }

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    if (!buttons.some((button) => button.class === "arm2e-character-wizard")) {
      buttons.unshift({
        label: "Character Wizard",
        class: "arm2e-character-wizard",
        icon: "fas fa-magic",
        onclick: (event) => {
          event.preventDefault();
          this._openCreationWizard();
        }
      });
    }
    return buttons;
  }

  _openCreationWizard() {
    new ArM2eCreationWizard(this.actor).render(true);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    this._ensurePrimaryTab(html);

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
    html.find(".arm2e-add-ability").on("click", this._onBrowseAbilities.bind(this));
    html.find(".item-edit").on("click", this._onEditItem.bind(this));
    html.find(".arm2e-journal-link").on("click", this._onOpenJournal.bind(this));
    html.find(".arm2e-open-world-pdf").on("click", this._onOpenWorldRulesPdf.bind(this));
    html.find(".arm2e-pick-rules-pdf").on("click", this._onPickRulesPdf.bind(this));
    html.find(".arm2e-open-covenant").on("click", this._onOpenCovenant.bind(this));
    html.find(".arm2e-unlink-covenant").on("click", this._onUnlinkCovenant.bind(this));
    html.find(".arm2e-collapse-toggle").on("click", this._onToggleCollapse.bind(this));
    html.find(".arm2e-ability-filter").on("input", this._onFilterAbilities.bind(this));

    const covenantDrop = html.find('[data-drop-target="covenant"]');
    if (covenantDrop.length) {
      covenantDrop.on("dragover", (event) => {
        event.preventDefault();
        event.currentTarget.classList.add("is-dragover");
      });
      covenantDrop.on("dragleave", (event) => {
        event.currentTarget.classList.remove("is-dragover");
      });
      covenantDrop.on("drop", (event) => this._onDropCovenant(event));
    }

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

    for (const [selector, type] of Object.entries(DROP_TARGETS)) {
      const panel = html.find(`[data-drop-target="${selector}"]`);
      if (!panel.length) continue;
      panel.on("dragover", (event) => event.preventDefault());
      panel.on("drop", (event) => this._onDropItem(event, type, event.currentTarget));
    }
  }

  /** @type {{ actor: Actor }} */
  _rollOptions() {
    return { actor: this.actor };
  }

  /**
   * Ensure a visible tab without clobbering Foundry's internal `this._tabs` array.
   * @param {JQuery} html
   */
  _ensurePrimaryTab(html) {
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
    const itemId = row.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const registry = CONFIG.ARM2E ?? ARM2E;
    await promptAbilityRoll(this.actor, item, registry);
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

    if (!techniqueId || !formId) return;
    await promptSpontaneousCast(this.actor, techniqueId, formId, registry);
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
    if (event.target.closest(".item-edit, .arm2e-item-delete, .arm2e-journal-link, .arm2e-open-covenant, .arm2e-unlink-covenant")) return;

    event.preventDefault();
    const row = event.currentTarget.closest(".spell-row");
    if (!row) return;

    const spellName = row.dataset.spellName ?? "Spell";
    const castingModifier = Number(row.dataset.castingModifier);
    const spellLevel = Number(row.dataset.spellLevel);
    const safeModifier = Number.isFinite(castingModifier) ? castingModifier : 0;
    const safeLevel = Number.isFinite(spellLevel) ? spellLevel : 0;

    await rollSpellCast(spellName, safeModifier, safeLevel, {
      ...this._rollOptions(),
      itemUuid: this.actor.items.get(row.dataset.itemId)?.uuid
    });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onSetWoundLevel(event) {
    event.preventDefault();
    const level = event.currentTarget.dataset.woundLevel;
    if (!level) return;
    await this.actor.update(woundLevelUpdate(level));
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onSetFatigueLevel(event) {
    event.preventDefault();
    const level = event.currentTarget.dataset.fatigueLevel;
    if (!level) return;
    await this.actor.update(fatigueLevelUpdate(level));
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
  async _onOpenCovenant(event) {
    event.preventDefault();
    event.stopPropagation();
    const uuid = event.currentTarget.dataset.uuid
      ?? this.actor.system?.identity?.covenantActor;
    await openLinkedDocument(uuid, {
      missing: "No covenant actor linked. Drop a Covenant onto the header field.",
      wrongType: "Linked document is not a covenant actor."
    });
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onUnlinkCovenant(event) {
    event.preventDefault();
    event.stopPropagation();
    await unlinkCharacterFromCovenant(this.actor);
    this.render(false);
  }

  /**
   * @param {JQuery.TriggeredEvent} event
   */
  async _onDropCovenant(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove("is-dragover");

    const data = TextEditor.getDragEventData(event.originalEvent ?? event);
    if (!data?.uuid) return;

    const doc = await fromUuid(data.uuid);
    if (!doc || doc.documentName !== "Actor" || doc.type !== "covenant") {
      ui.notifications.warn("Drop a Covenant actor to link this character.");
      return;
    }

    const linked = await linkCharacterToCovenant(this.actor, doc);
    if (linked) {
      ui.notifications.info(`Linked to ${doc.name}.`);
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
   * @param {JQuery.ClickEvent} event
   */
  async _onOpenWorldRulesPdf(event) {
    event.preventDefault();
    event.stopPropagation();
    const linked = this.actor.system?.references?.rulesJournal || getWorldRulesPdfJournalUuid();
    if (linked) {
      await openJournalEntry(linked);
      return;
    }
    await openWorldRulesPdfJournal();
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onPickRulesPdf(event) {
    event.preventDefault();
    event.stopPropagation();
    const path = await pickPdfPathForActor(this.actor, "system.references.rulesPdf");
    if (path) this.render(false);
  }

  /** @override */
  _onDragStart(event) {
    const target = event.currentTarget;

    if (target.classList?.contains("characteristic-row")) {
      const characteristicId = target.dataset.characteristic;
      const label = target.querySelector(".characteristic-label")?.textContent?.trim() || characteristicId;
      event.dataTransfer.setData("text/plain", JSON.stringify(buildRollDragData({
        roll: "characteristic",
        name: `${this.actor.name}: ${label}`,
        actorUuid: this.actor.uuid,
        characteristicId,
        img: this.actor.img
      })));
      return;
    }

    if (target.classList?.contains("ability-row")) {
      const item = this.actor.items.get(target.dataset.itemId);
      if (item) {
        event.dataTransfer.setData("text/plain", JSON.stringify(buildRollDragData({
          roll: "ability",
          name: `${this.actor.name}: ${item.name}`,
          actorUuid: this.actor.uuid,
          itemUuid: item.uuid,
          img: item.img
        })));
        return;
      }
    }

    if (target.classList?.contains("spell-row")) {
      const item = this.actor.items.get(target.dataset.itemId);
      if (item) {
        event.dataTransfer.setData("text/plain", JSON.stringify(buildRollDragData({
          roll: "spell",
          name: `${this.actor.name}: ${item.name}`,
          actorUuid: this.actor.uuid,
          itemUuid: item.uuid,
          img: item.img
        })));
        return;
      }
    }

    if (target.classList?.contains("weapon-row")) {
      const item = this.actor.items.get(target.dataset.itemId);
      if (item) {
        event.dataTransfer.setData("text/plain", JSON.stringify(buildRollDragData({
          roll: "weapon",
          name: `${this.actor.name}: ${item.name} Attack`,
          actorUuid: this.actor.uuid,
          itemUuid: item.uuid,
          totalKey: "attack",
          img: item.img
        })));
        return;
      }
    }

    if (target.classList?.contains("combat-roll-dodge")) {
      event.dataTransfer.setData("text/plain", JSON.stringify(buildRollDragData({
        roll: "dodge",
        name: `${this.actor.name}: Dodge`,
        actorUuid: this.actor.uuid,
        img: this.actor.img
      })));
      return;
    }

    if (target.classList?.contains("arts-cell")) {
      const techniqueId = target.dataset.technique;
      const formId = target.dataset.form;
      if (techniqueId && formId) {
        event.dataTransfer.setData("text/plain", JSON.stringify(buildRollDragData({
          roll: "spontaneous",
          name: `${this.actor.name}: Spontaneous ${techniqueId}/${formId}`,
          actorUuid: this.actor.uuid,
          techniqueId,
          formId,
          img: this.actor.img
        })));
        return;
      }
    }

    return super._onDragStart(event);
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
   * @param {HTMLElement} dropTarget
   */
  async _onDropItem(event, expectedType, dropTarget) {
    event.preventDefault();
    const data = TextEditor.getDragEventData(event);
    if (!data?.uuid) return;

    const doc = await fromUuid(data.uuid);
    if (!doc || doc.documentName !== "Item") return;
    if (doc.type !== expectedType) {
      ui.notifications.warn(`Expected a ${expectedType} item.`);
      return;
    }

    if (expectedType === "ability") {
      const expectedCategory = dropTarget?.dataset?.abilityCategory;
      const itemCategory = doc.system?.category;

      if (expectedCategory && itemCategory && expectedCategory !== itemCategory) {
        ui.notifications.warn(`That ability belongs in the ${itemCategory} column.`);
        return;
      }

      const duplicate = findAbilityItem(this.actor, doc.system?.key, doc.system?.specialty ?? "");
      if (duplicate) {
        ui.notifications.info(`${duplicate.name} is already on this character.`);
        return;
      }
    } else if (doc.parent?.id === this.actor.id) {
      return;
    }

    const itemData = doc.toObject();
    delete itemData._id;
    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onBrowseAbilities(event) {
    event.preventDefault();
    const category = event.currentTarget.dataset.abilityCategory;
    const pack = game.packs.get("ars-magica-2e.arm2e-abilities");

    if (!pack) {
      ui.notifications.warn("Abilities compendium not found. Reload the world as GM to seed compendiums.");
      return;
    }

    const documents = await pack.getDocuments();
    const filtered = documents
      .filter((doc) => !category || doc.system?.category === category)
      .sort((left, right) => left.name.localeCompare(right.name));

    if (!filtered.length) {
      ui.notifications.warn("No abilities available in the compendium.");
      return;
    }

    const options = filtered.map((doc) => {
      const owned = findAbilityItem(this.actor, doc.system?.key, doc.system?.specialty ?? "");
      const disabled = owned ? "disabled" : "";
      return `<option value="${doc.uuid}" ${disabled}>${doc.name}${owned ? " (owned)" : ""}</option>`;
    }).join("");

    const content = `
      <form>
        <div class="form-group">
          <label for="arm2e-add-ability-select">Ability</label>
          <select id="arm2e-add-ability-select" style="width:100%">${options}</select>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Ability",
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: async (html) => {
            const uuid = html.find("#arm2e-add-ability-select").val();
            if (!uuid) return;
            const doc = await fromUuid(uuid);
            if (!doc) return;

            const duplicate = findAbilityItem(this.actor, doc.system?.key, doc.system?.specialty ?? "");
            if (duplicate) {
              ui.notifications.info(`${duplicate.name} is already on this character.`);
              return;
            }

            const itemData = doc.toObject();
            delete itemData._id;
            await this.actor.createEmbeddedDocuments("Item", [itemData]);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "add"
    }, { width: 420 }).render(true);
  }

  /**
   * @param {object} system
   */
  _prepareCombat(system) {
    const weaponItems = this.actor.items.filter((item) => item.type === "weapon");
    const armorItems = this.actor.items.filter((item) => item.type === "armor");
    const equipmentItems = this.actor.items.filter((item) => item.type === "equipment");
    return prepareCombatData(system, weaponItems, armorItems, equipmentItems, this.actor);
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
