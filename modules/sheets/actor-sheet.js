import { ARM2E } from "../config.js";
import { rollArM2e } from "../dice.js";
import { abilityKey } from "../utils/abilities.js";
import { prepareCombatData } from "../utils/combat.js";

export class ArM2eActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ars-magica-2e", "sheet", "actor", "character"],
      template: "systems/ars-magica-2e/templates/actor/character-sheet.html",
      width: 920,
      height: 960,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "core"
      }]
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.actor.system;
    const registry = CONFIG.ARM2E ?? ARM2E;

    context.characteristics = this._prepareCharacteristics(system, registry);
    context.talents = this._prepareAbilities(system, "talents", registry.TALENTS);
    context.skills = this._prepareAbilities(system, "skills", registry.SKILLS);
    context.knowledges = this._prepareAbilities(system, "knowledges", registry.KNOWLEDGES);
    context.forms = this._prepareForms(system, registry);
    context.artRows = this._prepareArtRows(system, registry);
    context.weaponSkillsNote = registry.WEAPON_SKILLS.note;
    context.combat = this._prepareCombat(system);

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".characteristic-label").on("click", this._onRollCharacteristic.bind(this));
    html.find(".ability-row").on("click", this._onRollAbility.bind(this));
    html.find(".arts-cell").on("click", this._onRollArtCell.bind(this));
    html.find(".weapon-equipped").on("change", this._onToggleWeaponEquipped.bind(this));
    html.find(".combat-roll-attack").on("click", this._onRollWeaponAttack.bind(this));
    html.find(".combat-roll-damage").on("click", this._onRollWeaponDamage.bind(this));
    html.find(".combat-roll-first-strike").on("click", this._onRollWeaponFirstStrike.bind(this));
    html.find(".combat-roll-defense").on("click", this._onRollWeaponDefense.bind(this));
  }

  /** @type {{ actor: Actor }} */
  _rollOptions() {
    return { actor: this.actor };
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
    const value = Number(row.querySelector(".characteristic-value input")?.value) || 0;

    await rollArM2e("stress", value, `${label} (${abbrev})`, this._rollOptions());
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onRollAbility(event) {
    if (event.target.closest("input, select, textarea, button, a")) return;

    const row = event.currentTarget;
    const label = row.querySelector(".ability-name")?.textContent?.trim() ?? "Ability";
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
  async _onToggleWeaponEquipped(event) {
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
   * @param {object} system
   */
  _prepareCombat(system) {
    const weaponItems = this.actor.items.filter((item) => item.type === "weapon");
    return prepareCombatData(system, weaponItems);
  }

  /**
   * @param {object} system
   * @param {typeof ARM2E} registry
   */
  _prepareCharacteristics(system, registry) {
    return registry.CHARACTERISTICS.map((characteristic) => ({
      ...characteristic,
      value: system.characteristics?.[characteristic.id] ?? 0,
      field: `system.characteristics.${characteristic.id}`
    }));
  }

  /**
   * @param {object} system
   * @param {"talents" | "skills" | "knowledges"} category
   * @param {readonly string[]} labels
   */
  _prepareAbilities(system, category, labels) {
    return labels.map((label) => {
      const id = abilityKey(label);
      const entry = system.abilities?.[category]?.[id] ?? {};

      return {
        id,
        label,
        value: entry.value ?? 0,
        xp: entry.xp ?? 0,
        specialty: entry.specialty ?? "",
        fieldBase: `system.abilities.${category}.${id}`
      };
    });
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
