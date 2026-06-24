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

const TOTAL_STEPS = 5;

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
      biography: system.identity?.biography ?? "",
      covenant: system.identity?.covenant ?? "",
      gender: system.identity?.gender ?? "",
      yearBorn: Number(system.identity?.yearBorn) || 0,
      currentYear: Number(system.identity?.currentYear) || 1220,
      traits: system.personality?.traits ?? ""
    },
    characteristics,
    abilities: buildEmptyAbilityState(registry, system.abilities),
    arts: buildEmptyArts(registry, system.arts),
    virtuesFlaws: actor.items
      .filter((item) => item.type === "virtueFlaw")
      .map((item) => ({
        name: item.name,
        kind: item.system?.kind ?? "virtue",
        points: Number(item.system?.points) || 0,
        category: item.system?.category ?? "",
        description: item.system?.description ?? "",
        source: item.system?.source ?? ""
      })),
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
        mastered: Boolean(item.system?.mastered),
        notes: item.system?.notes ?? ""
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
      width: 1000,
      height: 880,
      resizable: true,
      closeOnSubmit: false
    });
  }

  /** @override */
  get title() {
    return `Character Wizard — ${this.state.identity.name || this.actor.name}`;
  }

  /**
   * @param {"grog" | "companion" | "magus"} characterType
   */
  _skipsVirtuesStep(characterType) {
    return characterType === "grog";
  }

  /**
   * @param {"grog" | "companion" | "magus"} characterType
   */
  _isMagus(characterType) {
    return characterType === "magus";
  }

  /**
   * @returns {Promise<object[]>}
   */
  async _loadCompendiumSpells() {
    const pack = game.packs?.get("ars-magica-2e.arm2e-spells");
    if (!pack) return [];
    const index = await pack.getIndex();
    return index.map((entry) => ({ id: entry._id, name: entry.name }));
  }

  /**
   * @returns {Promise<object[]>}
   */
  async _loadCompendiumVirtuesFlaws() {
    const pack = game.packs?.get("ars-magica-2e.arm2e-virtues-flaws");
    if (!pack) return [];
    const index = await pack.getIndex();
    return index.map((entry) => ({ id: entry._id, name: entry.name }));
  }

  /** @override */
  async getData() {
    const registry = CONFIG.ARM2E ?? ARM2E;
    const type = this.state.identity.characterType;
    const age = Number(this.state.identity.age) || 0;
    const isMagus = this._isMagus(type);
    const skipsVirtues = this._skipsVirtuesStep(type);
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

    const virtuePoints = this.state.virtuesFlaws
      .filter((entry) => entry.kind === "virtue")
      .reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
    const flawPoints = this.state.virtuesFlaws
      .filter((entry) => entry.kind === "flaw")
      .reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);

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

    return {
      actor: this.actor,
      registry,
      state: this.state,
      currentStep: step,
      isStep1: step === 1,
      isStep2: step === 2,
      isStep3: step === 3 && !skipsVirtues,
      isStep4: step === 4 && isMagus,
      isStep5: step === 5,
      isFirstStep: step === 1,
      isLastStep: step === TOTAL_STEPS,
      isMagus,
      skipsVirtues,
      steps: this._buildSteps(type, step),
      characteristics: registry.CHARACTERISTICS.map((entry) => ({
        ...entry,
        value: Number(this.state.characteristics[entry.id]) || 0
      })),
      charMin: CHARACTERISTIC_MIN,
      charMax: CHARACTERISTIC_MAX,
      budgets: {
        characteristics: { budget: charBudget, spent: charSpent, remaining: charBudget - charSpent, isOver: charSpent > charBudget },
        abilities: { budget: abilityBudget, spent: abilitySpent, remaining: abilityBudget - abilitySpent, isOver: abilitySpent > abilityBudget },
        arts: { budget: artBudget, spent: artSpent, remaining: artBudget - artSpent, isOver: artSpent > artBudget },
        spells: { budget: spellBudget, spent: spellSpent, remaining: spellBudget - spellSpent, isOver: spellSpent > spellBudget },
        virtuesFlaws: { virtues: virtuePoints, flaws: flawPoints, balance: virtuePoints - flawPoints, isBalanced: virtuePoints === flawPoints }
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
      virtuesFlaws: this.state.virtuesFlaws.map((entry, index) => ({ ...entry, index })),
      compendiumSpells: await this._loadCompendiumSpells(),
      compendiumVirtuesFlaws: await this._loadCompendiumVirtuesFlaws(),
      summary: this._buildSummary(registry, {
        charBudget,
        charSpent,
        abilityBudget,
        abilitySpent,
        artBudget,
        artSpent,
        spellBudget,
        spellSpent,
        virtuePoints,
        flawPoints
      })
    };
  }

  /**
   * @param {"grog" | "companion" | "magus"} characterType
   * @param {number} currentStep
   */
  _buildSteps(characterType, currentStep) {
    const skipsVirtues = this._skipsVirtuesStep(characterType);
    const isMagus = this._isMagus(characterType);

    return [
      { id: 1, label: "Identity", active: currentStep === 1, complete: currentStep > 1 },
      { id: 2, label: "Abilities", active: currentStep === 2, complete: currentStep > 2 },
      { id: 3, label: "Virtues", active: currentStep === 3, skipped: skipsVirtues, complete: currentStep > 3 },
      { id: 4, label: "Magic", active: currentStep === 4, skipped: !isMagus, complete: currentStep > 4 },
      { id: 5, label: "Finalize", active: currentStep === 5, complete: false }
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
      virtuesFlaws: this.state.virtuesFlaws,
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
    html.find('[data-action="add-virtue-flaw"]').on("click", this._onAddVirtueFlaw.bind(this));
    html.find('[data-action="remove-virtue-flaw"]').on("click", this._onRemoveVirtueFlaw.bind(this));
    html.find('[data-action="import-compendium-spell"]').on("click", this._onImportCompendiumSpell.bind(this));
    html.find('[data-action="import-compendium-vf"]').on("click", this._onImportCompendiumVirtueFlaw.bind(this));

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

  /**
   * @param {number} step
   */
  _advanceFrom(step) {
    const type = this.state.identity.characterType;

    if (step === 2 && this._skipsVirtuesStep(type)) return 5;
    if (step === 3 && !this._isMagus(type)) return 5;
    return Math.min(TOTAL_STEPS, step + 1);
  }

  /**
   * @param {number} step
   */
  _retreatFrom(step) {
    const type = this.state.identity.characterType;

    if (step === 5 && !this._isMagus(type) && !this._skipsVirtuesStep(type)) return 3;
    if (step === 5 && this._skipsVirtuesStep(type)) return 2;
    if (step === 5 && this._isMagus(type)) return 4;
    return Math.max(1, step - 1);
  }

  _onBack(event) {
    event.preventDefault();
    if (this.state.currentStep <= 1) return;
    this.state.currentStep = this._retreatFrom(this.state.currentStep);
    this.render(false);
  }

  async _onNext(event) {
    event.preventDefault();
    const errors = this._validateCurrentStep();
    if (errors.length) {
      ui.notifications.warn(errors.join(" "));
      return;
    }

    this.state.currentStep = this._advanceFrom(this.state.currentStep);
    this.render(false);
  }

  async _onForge(event) {
    event.preventDefault();
    const errors = [
      ...this._validateStep1(),
      ...this._validateStep2()
    ];

    if (!this._skipsVirtuesStep(this.state.identity.characterType)) {
      errors.push(...this._validateStep3());
    }

    if (this._isMagus(this.state.identity.characterType)) {
      errors.push(...this._validateStep4());
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
      mastered: false,
      notes: ""
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

  _onAddVirtueFlaw(event) {
    event.preventDefault();
    this.state.virtuesFlaws.push({
      name: "New Virtue",
      kind: "virtue",
      points: 1,
      category: "",
      description: "",
      source: ""
    });
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onRemoveVirtueFlaw(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.vfIndex);
    if (!Number.isInteger(index)) return;
    this.state.virtuesFlaws.splice(index, 1);
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onImportCompendiumSpell(event) {
    event.preventDefault();
    const select = this.element.find('[data-path="compendiumSpellId"]')[0];
    const itemId = select?.value;
    if (!itemId) return;

    const pack = game.packs.get("ars-magica-2e.arm2e-spells");
    const item = await pack?.getDocument(itemId);
    if (!item) return;

    this.state.spells.push({
      name: item.name,
      level: Number(item.system?.level) || 0,
      technique: item.system?.technique ?? "creo",
      form: item.system?.form ?? "corporem",
      range: item.system?.range ?? "",
      duration: item.system?.duration ?? "",
      target: item.system?.target ?? "",
      mastered: Boolean(item.system?.mastered),
      notes: item.system?.notes ?? ""
    });
    this.render(false);
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onImportCompendiumVirtueFlaw(event) {
    event.preventDefault();
    const select = this.element.find('[data-path="compendiumVfId"]')[0];
    const itemId = select?.value;
    if (!itemId) return;

    const pack = game.packs.get("ars-magica-2e.arm2e-virtues-flaws");
    const item = await pack?.getDocument(itemId);
    if (!item) return;

    this.state.virtuesFlaws.push({
      name: item.name,
      kind: item.system?.kind ?? "virtue",
      points: Number(item.system?.points) || 0,
      category: item.system?.category ?? "",
      description: item.system?.description ?? "",
      source: item.system?.source ?? ""
    });
    this.render(false);
  }

  _validateCurrentStep() {
    switch (this.state.currentStep) {
      case 1: return this._validateStep1();
      case 2: return this._validateStep2();
      case 3: return this._validateStep3();
      case 4: return this._validateStep4();
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
    if (this._skipsVirtuesStep(this.state.identity.characterType)) return errors;

    const virtuePoints = this.state.virtuesFlaws
      .filter((entry) => entry.kind === "virtue")
      .reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
    const flawPoints = this.state.virtuesFlaws
      .filter((entry) => entry.kind === "flaw")
      .reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);

    if (virtuePoints !== flawPoints) {
      errors.push(`Virtue points (${virtuePoints}) must equal flaw points (${flawPoints}).`);
    }

    return errors;
  }

  _validateStep4() {
    const errors = [];
    if (!this._isMagus(this.state.identity.characterType)) return errors;

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
      "system.identity.covenant": this.state.identity.covenant ?? "",
      "system.identity.gender": this.state.identity.gender ?? "",
      "system.identity.yearBorn": Number(this.state.identity.yearBorn) || 0,
      "system.identity.currentYear": Number(this.state.identity.currentYear) || 1220,
      "system.personality.traits": this.state.identity.traits ?? "",
      "system.characteristics": foundry.utils.deepClone(this.state.characteristics),
      "system.abilities": buildCharacterAbilities(registry, abilities),
      "system.arts.techniques": foundry.utils.deepClone(this.state.arts.techniques),
      "system.arts.forms": foundry.utils.deepClone(this.state.arts.forms),
      "system.confidence.value": confidence,
      "system.confidence.max": confidence
    });

    const removableTypes = new Set(["spell", "virtueFlaw"]);
    const existing = this.actor.items.filter((item) => removableTypes.has(item.type));
    if (existing.length) {
      await this.actor.deleteEmbeddedDocuments("Item", existing.map((item) => item.id));
    }

    const items = [];

    for (const spell of this.state.spells) {
      items.push({
        name: spell.name,
        type: "spell",
        system: {
          level: Number(spell.level) || 0,
          technique: spell.technique,
          form: spell.form,
          range: spell.range ?? "",
          duration: spell.duration ?? "",
          target: spell.target ?? "",
          mastered: Boolean(spell.mastered),
          notes: spell.notes ?? ""
        }
      });
    }

    for (const entry of this.state.virtuesFlaws) {
      items.push({
        name: entry.name,
        type: "virtueFlaw",
        system: {
          kind: entry.kind,
          points: Number(entry.points) || 0,
          category: entry.category ?? "",
          description: entry.description ?? "",
          source: entry.source ?? ""
        }
      });
    }

    if (items.length) await this.actor.createEmbeddedDocuments("Item", items);
  }
}
