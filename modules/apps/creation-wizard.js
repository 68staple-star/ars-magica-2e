import { ARM2E } from "../config.js";
import { abilityKey, buildCharacterAbilities } from "../utils/abilities.js";
import {
  abilityPointBudget,
  abilityPointsSpent,
  artPointsSpent,
  buildEmptyAbilityState,
  buildEmptyArts,
  characteristicPointBudget,
  characteristicPointsSpent,
  defaultConfidence,
  magusArtPointBudget,
  magusSpellPointBudget,
  serializeAbilitiesForActor,
  spellCastingTotal,
  spellPointsSpent,
  triangularCost,
  validateCharacteristics,
  CHARACTERISTIC_MIN,
  CHARACTERISTIC_MAX
} from "../utils/creation.js";

/**
 * @param {Actor} actor
 * @returns {object}
 */
function buildInitialState(actor) {
  const registry = CONFIG.ARM2E ?? ARM2E;
  const system = actor.system ?? {};
  const characterType = system.identity?.characterType ?? "companion";
  const age = Number(system.identity?.age) || 25;
  const characteristics = { ...system.characteristics };

  for (const characteristic of registry.CHARACTERISTICS) {
    characteristics[characteristic.id] ??= 0;
  }

  return {
    currentStep: 1,
    identity: {
      name: actor.name ?? "",
      age,
      characterType,
      biography: system.identity?.biography ?? ""
    },
    characteristics,
    abilities: buildEmptyAbilityState(registry, system.abilities),
    arts: buildEmptyArts(registry, system.arts),
    spells: actor.items
      .filter((item) => item.type === "spell")
      .map((item) => ({
        name: item.name,
        level: Number(item.system?.level) || 0,
        technique: item.system?.technique ?? "creo",
        form: item.system?.form ?? "corporem",
        range: item.system?.range ?? "",
        duration: item.system?.duration ?? "",
        target: item.system?.target ?? "",
        mastered: Boolean(item.system?.mastered)
      }))
  };
}

export class ArM2eCreationWizard extends FormApplication {
  /**
   * @param {Actor} actor
   * @param {object} [options={}]
   */
  constructor(actor, options = {}) {
    super(actor, options);
    this.actor = actor;
    /** @type {ReturnType<typeof buildInitialState>} */
    this.state = buildInitialState(actor);
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "arm2e-creation-wizard",
      classes: ["arm2e", "creation-wizard"],
      template: "systems/ars-magica-2e/templates/apps/creation-wizard.html",
      width: 980,
      height: 860,
      resizable: true,
      closeOnSubmit: false
    });
  }

  /** @override */
  get title() {
    return `Character Wizard — ${this.state.identity.name || this.actor.name}`;
  }

  /** @override */
  getData() {
    const registry = CONFIG.ARM2E ?? ARM2E;
    const type = this.state.identity.characterType;
    const age = Number(this.state.identity.age) || 0;
    const isMagus = type === "magus";
    const step = this.state.currentStep;

    const charBudget = characteristicPointBudget(type);
    const charSpent = characteristicPointsSpent(this.state.characteristics);
    const abilityBudget = abilityPointBudget(type, age);
    const abilitySpent = abilityPointsSpent(this.state.abilities);
    const artBudget = isMagus ? magusArtPointBudget() : 0;
    const artSpent = artPointsSpent(this.state.arts.techniques, this.state.arts.forms);
    const spellBudget = isMagus ? magusSpellPointBudget() : 0;
    const spellSpent = spellPointsSpent(this.state.spells);
    const intelligence = Number(this.state.characteristics.intelligence) || 0;

    const spells = this.state.spells.map((spell, index) => {
      const castingTotal = spellCastingTotal(spell, this.state.arts, intelligence);
      return {
        ...spell,
        index,
        cost: triangularCost(spell.level),
        castingTotal,
        maxLevel: castingTotal + 10,
        allowed: (Number(spell.level) || 0) <= castingTotal + 10
      };
    });

    const charRemaining = charBudget - charSpent;
    const abilityRemaining = abilityBudget - abilitySpent;
    const artRemaining = artBudget - artSpent;
    const spellRemaining = spellBudget - spellSpent;

    return {
      actor: this.actor,
      registry,
      state: this.state,
      currentStep: step,
      isStep1: step === 1,
      isStep2: step === 2,
      isStep3: step === 3 && isMagus,
      isStep4: step === 4,
      isFirstStep: step === 1,
      isLastStep: step === 4,
      isMagus,
      steps: this._buildSteps(isMagus, step),
      characteristics: registry.CHARACTERISTICS.map((entry) => ({
        ...entry,
        value: Number(this.state.characteristics[entry.id]) || 0
      })),
      charMin: CHARACTERISTIC_MIN,
      charMax: CHARACTERISTIC_MAX,
      budgets: {
        characteristics: { budget: charBudget, spent: charSpent, remaining: charRemaining, isOver: charRemaining < 0 },
        abilities: { budget: abilityBudget, spent: abilitySpent, remaining: abilityRemaining, isOver: abilityRemaining < 0 },
        arts: { budget: artBudget, spent: artSpent, remaining: artRemaining, isOver: artRemaining < 0 },
        spells: { budget: spellBudget, spent: spellSpent, remaining: spellRemaining, isOver: spellRemaining < 0 }
      },
      abilityGroups: this._prepareAbilityGroups(),
      techniques: registry.TECHNIQUES.map((entry) => ({
        ...entry,
        value: Number(this.state.arts.techniques[entry.id]) || 0
      })),
      forms: registry.FORMS.map((entry) => ({
        ...entry,
        value: Number(this.state.arts.forms[entry.id]) || 0
      })),
      spells,
      summary: this._buildSummary(registry, {
        charBudget,
        charSpent,
        abilityBudget,
        abilitySpent,
        artBudget,
        artSpent,
        spellBudget,
        spellSpent
      })
    };
  }

  /**
   * @param {boolean} isMagus
   * @param {number} currentStep
   */
  _buildSteps(isMagus, currentStep) {
    return [
      { id: 1, label: "Attributes", active: currentStep === 1, complete: currentStep > 1 },
      { id: 2, label: "Abilities", active: currentStep === 2, complete: currentStep > 2 },
      { id: 3, label: "Magic", active: currentStep === 3, skipped: !isMagus, complete: currentStep > 3 },
      { id: 4, label: "Finalize", active: currentStep === 4, complete: false }
    ];
  }

  _prepareAbilityGroups() {
    const registry = CONFIG.ARM2E ?? ARM2E;

    const mapCategory = (categoryKey, labels, title) => ({
      key: categoryKey,
      title,
      entries: labels.map((label) => {
        const id = abilityKey(label);
        const entry = this.state.abilities[categoryKey][id] ?? { value: 0, specialty: "", label };

        return {
          id,
          label,
          value: Number(entry.value) || 0,
          specialty: entry.specialty ?? "",
          cost: triangularCost(entry.value)
        };
      })
    });

    return [
      mapCategory("talents", registry.TALENTS, "Talents"),
      mapCategory("skills", registry.SKILLS, "Skills"),
      mapCategory("knowledges", registry.KNOWLEDGES, "Knowledges")
    ];
  }

  /**
   * @param {typeof ARM2E} registry
   * @param {object} totals
   */
  _buildSummary(registry, totals) {
    const type = this.state.identity.characterType;
    const abilityHighlights = ["talents", "skills", "knowledges"].flatMap((category) => (
      Object.values(this.state.abilities[category])
        .filter((entry) => Number(entry.value) !== 0)
        .map((entry) => `${entry.label} ${entry.value}`)
    ));

    const artHighlights = [
      ...registry.TECHNIQUES.filter((entry) => this.state.arts.techniques[entry.id] > 0)
        .map((entry) => `${entry.abbrev} ${this.state.arts.techniques[entry.id]}`),
      ...registry.FORMS.filter((entry) => this.state.arts.forms[entry.id] > 0)
        .map((entry) => `${entry.abbrev} ${this.state.arts.forms[entry.id]}`)
    ];

    return {
      identity: this.state.identity,
      characteristics: registry.CHARACTERISTICS.map((entry) => ({
        label: entry.label,
        abbrev: entry.abbrev,
        value: Number(this.state.characteristics[entry.id]) || 0
      })),
      totals,
      abilityHighlights: abilityHighlights.join(", ") || "None",
      artHighlights: artHighlights.join(", ") || "None",
      spells: this.state.spells,
      confidence: defaultConfidence(type)
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-action="wizard-back"]').on("click", this._onBack.bind(this));
    html.find('[data-action="wizard-next"]').on("click", this._onNext.bind(this));
    html.find('[data-action="wizard-forge"]').on("click", this._onForge.bind(this));
    html.find('[data-action="add-spell"]').on("click", this._onAddSpell.bind(this));
    html.find('[data-action="remove-spell"]').on("click", this._onRemoveSpell.bind(this));

    html.find(".wizard-field").on("change input", this._onFieldChange.bind(this));
  }

  /** @override */
  async _updateObject() {
    return;
  }

  /**
   * @param {JQuery.TriggeredEvent} event
   */
  _onFieldChange(event) {
    const element = event.currentTarget;
    const path = element.dataset.path;
    if (!path) return;

    let value = element.value;
    if (element.type === "checkbox") value = element.checked;
    if (element.dataset.dtype === "Number") value = Number(value) || 0;

    foundry.utils.setProperty(this.state, path, value);
    this.render(false);
  }

  _onBack(event) {
    event.preventDefault();
    if (this.state.currentStep <= 1) return;

    if (this.state.currentStep === 4 && this.state.identity.characterType !== "magus") {
      this.state.currentStep = 2;
    } else {
      this.state.currentStep -= 1;
    }

    this.render(false);
  }

  async _onNext(event) {
    event.preventDefault();
    const errors = this._validateCurrentStep();
    if (errors.length) {
      ui.notifications.warn(errors.join(" "));
      return;
    }

    if (this.state.currentStep === 2 && this.state.identity.characterType !== "magus") {
      this.state.currentStep = 4;
    } else if (this.state.currentStep < 4) {
      this.state.currentStep += 1;
    }

    this.render(false);
  }

  async _onForge(event) {
    event.preventDefault();
    const errors = [
      ...this._validateStep1(),
      ...this._validateStep2()
    ];

    if (this.state.identity.characterType === "magus") {
      errors.push(...this._validateStep3());
    }

    if (errors.length) {
      ui.notifications.error(errors.join(" "));
      return;
    }

    await this._commitCharacter();
    await this.close();
    ui.notifications.info(`Forged character "${this.state.identity.name}".`);
  }

  _onAddSpell(event) {
    event.preventDefault();
    this.state.spells.push({
      name: `Spell ${this.state.spells.length + 1}`,
      level: 1,
      technique: "creo",
      form: "corporem",
      range: "",
      duration: "",
      target: "",
      mastered: false
    });
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onRemoveSpell(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.spellIndex);
    if (!Number.isInteger(index)) return;
    this.state.spells.splice(index, 1);
    this.render(false);
  }

  _validateCurrentStep() {
    switch (this.state.currentStep) {
      case 1: return this._validateStep1();
      case 2: return this._validateStep2();
      case 3: return this._validateStep3();
      default: return [];
    }
  }

  _validateStep1() {
    const errors = [];

    if (!this.state.identity.name?.trim()) errors.push("A character name is required.");
    if ((Number(this.state.identity.age) || 0) < 1) errors.push("Age must be at least 1.");

    errors.push(...validateCharacteristics(this.state.characteristics));

    const budget = characteristicPointBudget(this.state.identity.characterType);
    const spent = characteristicPointsSpent(this.state.characteristics);
    if (spent > budget) errors.push(`Characteristics overspent by ${spent - budget} points.`);

    return errors;
  }

  _validateStep2() {
    const errors = [];
    const budget = abilityPointBudget(this.state.identity.characterType, this.state.identity.age);
    const spent = abilityPointsSpent(this.state.abilities);
    if (spent > budget) errors.push(`Ability points overspent by ${spent - budget}.`);
    return errors;
  }

  _validateStep3() {
    const errors = [];
    if (this.state.identity.characterType !== "magus") return errors;

    const artBudget = magusArtPointBudget();
    const artSpent = artPointsSpent(this.state.arts.techniques, this.state.arts.forms);
    if (artSpent > artBudget) errors.push(`Art points overspent by ${artSpent - artBudget}.`);

    const spellBudget = magusSpellPointBudget();
    const spellSpent = spellPointsSpent(this.state.spells);
    if (spellSpent > spellBudget) errors.push(`Spell points overspent by ${spellSpent - spellBudget}.`);

    const intelligence = Number(this.state.characteristics.intelligence) || 0;
    for (const spell of this.state.spells) {
      const total = spellCastingTotal(spell, this.state.arts, intelligence);
      if (spell.level > total + 10) {
        errors.push(`"${spell.name}" exceeds allowed spell level (max ${total + 10} for its arts).`);
      }
    }

    return errors;
  }

  async _commitCharacter() {
    const registry = CONFIG.ARM2E ?? ARM2E;
    const type = this.state.identity.characterType;
    const confidence = defaultConfidence(type);
    const abilities = serializeAbilitiesForActor(this.state.abilities);

    await this.actor.update({
      name: this.state.identity.name.trim(),
      "system.identity.age": Number(this.state.identity.age) || 0,
      "system.identity.characterType": type,
      "system.identity.biography": this.state.identity.biography ?? "",
      "system.characteristics": foundry.utils.deepClone(this.state.characteristics),
      "system.abilities": buildCharacterAbilities(registry, abilities),
      "system.arts.techniques": foundry.utils.deepClone(this.state.arts.techniques),
      "system.arts.forms": foundry.utils.deepClone(this.state.arts.forms),
      "system.confidence.value": confidence,
      "system.confidence.max": confidence
    });

    const existingSpells = this.actor.items.filter((item) => item.type === "spell");
    if (existingSpells.length) await this.actor.deleteEmbeddedDocuments("Item", existingSpells.map((item) => item.id));

    if (this.state.spells.length) {
      const items = this.state.spells.map((spell) => ({
        name: spell.name,
        type: "spell",
        system: {
          level: Number(spell.level) || 0,
          technique: spell.technique,
          form: spell.form,
          range: spell.range ?? "",
          duration: spell.duration ?? "",
          target: spell.target ?? "",
          mastered: Boolean(spell.mastered)
        }
      }));

      await this.actor.createEmbeddedDocuments("Item", items);
    }
  }
}
