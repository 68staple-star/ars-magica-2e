import { ARM2E } from "../config.js";
import {
  buildAbilityLookupFromActor,
  serializeAbilityItemsForActor
} from "../utils/abilities.js";
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
  CHARACTERISTIC_MAX,
  ABILITY_MIN,
  ABILITY_MAX
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
      covenant: system.identity?.covenant ?? "",
      house: system.identity?.house ?? "",
      gender: system.identity?.gender ?? "",
      yearBorn: Number(system.identity?.yearBorn) || 1195,
      currentYear: Number(system.identity?.currentYear) || 1220,
      biography: system.identity?.biography ?? "",
      traits: system.personality?.traits ?? ""
    },
    characteristics,
    abilities: buildEmptyAbilityState(registry, buildAbilityLookupFromActor(actor, registry)),
    arts: buildEmptyArts(registry, system.arts),
    virtuesFlaws: actor.items
      .filter((item) => item.type === "virtueFlaw")
      .map((item) => ({
        name: item.name,
        kind: item.system?.kind ?? "virtue",
        points: Number(item.system?.points) || 0,
        magnitude: item.system?.magnitude ?? "",
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
    const packIds = ["ars-magica-2e.arm2e-formulaic-spells", "ars-magica-2e.arm2e-spells"];
    const entries = [];

    for (const packId of packIds) {
      const pack = game.packs?.get(packId);
      if (!pack) continue;
      const index = await pack.getIndex();
      for (const entry of index) {
        entries.push({ id: entry._id, name: entry.name, pack: packId });
      }
    }

    return entries.sort((left, right) => left.name.localeCompare(right.name));
  }

  /**
   * @returns {Promise<object[]>}
   */
  async _loadCompendiumVirtuesFlaws() {
    const packIds = [
      "ars-magica-2e.arm2e-virtues-flaws-arm5",
      "ars-magica-2e.arm2e-virtues-flaws"
    ];
    const entries = [];

    for (const packId of packIds) {
      const pack = game.packs?.get(packId);
      if (!pack) continue;

      const documents = await pack.getDocuments();
      for (const doc of documents) {
        entries.push({
          id: doc.id,
          name: doc.name,
          pack: packId,
          kind: doc.system?.kind ?? "virtue",
          points: Number(doc.system?.points) || 0,
          magnitude: doc.system?.magnitude ?? "",
          category: doc.system?.category ?? "",
          description: doc.system?.description ?? ""
        });
      }
    }

    return entries.sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "virtue" ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
  }

  /** @override */
  async getData() {
    const registry = CONFIG.ARM2E ?? ARM2E;
    const type = this.state.identity.characterType;
    const age = Number(this.state.identity.age) || 0;
    const isMagus = this._isMagus(type);
    const skipsVirtues = this._skipsVirtuesStep(type);
    let step = this.state.currentStep;

    if (skipsVirtues && step === 3) step = 5;
    if (!isMagus && step === 4) step = skipsVirtues ? 5 : 3;
    if (step !== this.state.currentStep) this.state.currentStep = step;

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

    const compendiumVirtuesFlaws = await this._loadCompendiumVirtuesFlaws();
    this._compendiumVfById = new Map(compendiumVirtuesFlaws.map((entry) => [entry.id, entry]));

    return {
      actor: this.actor,
      registry,
      state: this.state,
      currentStep: step,
      isStep1: step === 1,
      isStep2: step === 2,
      isStep3: step === 3,
      isStep4: step === 4,
      isStep5: step === 5,
      isLastStep: step === TOTAL_STEPS,
      isMagus,
      skipsVirtues,
      abilityMin: ABILITY_MIN,
      abilityMax: ABILITY_MAX,
      steps: this._buildSteps(step),
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
      compendiumVirtues: compendiumVirtuesFlaws.filter((entry) => entry.kind === "virtue"),
      compendiumFlaws: compendiumVirtuesFlaws.filter((entry) => entry.kind === "flaw"),
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
   * @param {number} currentStep
   */
  _buildSteps(currentStep) {
    const type = this.state.identity.characterType;
    const skipsVirtues = this._skipsVirtuesStep(type);
    const isMagus = this._isMagus(type);

    return [
      { id: 1, label: "Identity", active: currentStep === 1, complete: currentStep > 1 },
      { id: 2, label: "Abilities", active: currentStep === 2, complete: currentStep > 2 },
      ...(!skipsVirtues
        ? [{ id: 3, label: "Virtues", active: currentStep === 3, complete: currentStep > 3 }]
        : []),
      ...(isMagus
        ? [{ id: 4, label: "Magic", active: currentStep === 4, complete: currentStep > 4 }]
        : []),
      { id: 5, label: "Finalize", active: currentStep === 5, complete: false }
    ];
  }

  _prepareAbilityGroups() {
    const registry = CONFIG.ARM2E ?? ARM2E;

    const mapCategory = (categoryKey, labels, title) => ({
      key: categoryKey,
      title,
      entries: labels.map((label) => {
        const id = registry.getAbilityByLabel?.(label)?.key
          ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

    html.find('[data-action="wizard-forge"]').on("click", this._onForge.bind(this));
    html.find('[data-action="wizard-step"]').on("click", this._onWizardStep.bind(this));
    html.find('[data-action="ability-adjust"]').on("click", this._onAbilityAdjust.bind(this));
    html.find('[data-action="add-spell"]').on("click", this._onAddSpell.bind(this));
    html.find('[data-action="remove-spell"]').on("click", this._onRemoveSpell.bind(this));
    html.find('[data-action="add-virtue-flaw"]').on("click", this._onAddVirtueFlaw.bind(this));
    html.find('[data-action="remove-virtue-flaw"]').on("click", this._onRemoveVirtueFlaw.bind(this));
    html.find('[data-action="import-compendium-spell"]').on("click", this._onImportCompendiumSpell.bind(this));
    html.find('[data-action="import-compendium-vf"]').on("click", this._onImportCompendiumVirtueFlaw.bind(this));
    html.find('[data-path="compendiumVfId"]').on("change", this._onCompendiumVfPreview.bind(this));

    html.find(".wizard-field").on("change", this._onFieldChange.bind(this));
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
    if (element.dataset.dtype === "Number") value = Number(value);
    if (Number.isNaN(value)) value = 0;

    foundry.utils.setProperty(this.state, path, value);

    const needsFullRender = path === "identity.characterType" || path.startsWith("identity.age");
    if (needsFullRender) {
      this._renderPreservingFocus();
      return;
    }

    this._refreshBudgetDisplays();
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onAbilityAdjust(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = button.dataset.path;
    const delta = Number(button.dataset.delta);
    if (!path || !Number.isFinite(delta)) return;

    const current = Number(foundry.utils.getProperty(this.state, path)) || 0;
    const next = Math.max(ABILITY_MIN, Math.min(ABILITY_MAX, current + delta));
    if (next === current) return;

    foundry.utils.setProperty(this.state, path, next);

    const row = button.closest(".wizard-ability-row");
    const valueEl = row?.querySelector(".wizard-ability-value");
    if (valueEl) valueEl.textContent = String(next);

    const costEl = row?.querySelector(".wizard-ability-cost");
    if (costEl) costEl.textContent = `Cost ${triangularCost(next)}`;

    this._refreshBudgetDisplays();
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  _onWizardStep(event) {
    event.preventDefault();
    let step = Number(event.currentTarget.dataset.wizardStep);
    if (!Number.isInteger(step) || step < 1 || step > TOTAL_STEPS) return;

    const type = this.state.identity.characterType;
    if (this._skipsVirtuesStep(type) && step === 3) step = 5;
    if (!this._isMagus(type) && step === 4) step = this._skipsVirtuesStep(type) ? 5 : 3;

    this.state.currentStep = step;
    this._renderPreservingFocus();
  }

  _renderPreservingFocus() {
    const body = this.element?.find(".wizard-body")?.[0];
    const scrollTop = body?.scrollTop ?? 0;
    const active = document.activeElement;
    const path = active?.dataset?.path;

    this.render(false);

    if (body) body.scrollTop = scrollTop;
    if (path) {
      const next = this.element?.find(`[data-path="${path}"]`)?.[0];
      next?.focus?.();
    }
  }

  _refreshBudgetDisplays() {
    const type = this.state.identity.characterType;
    const age = Number(this.state.identity.age) || 0;
    const charBudget = characteristicPointBudget(type);
    const charSpent = characteristicPointsSpent(this.state.characteristics);
    const abilityBudget = abilityPointBudget(type, age);
    const abilitySpent = abilityPointsSpent(this.state.abilities);

    this._setCounterText(".wizard-counter-characteristics", charSpent, charBudget);
    this._setCounterText(".wizard-counter-abilities", abilitySpent, abilityBudget);
  }

  /**
   * @param {string} selector
   * @param {number} spent
   * @param {number} budget
   */
  _setCounterText(selector, spent, budget) {
    const el = this.element?.find(selector)?.[0];
    if (!el) return;

    const remaining = budget - spent;
    el.innerHTML = `Points: <strong>${spent}</strong> / ${budget} (${remaining} remaining)`;
    el.classList.toggle("is-over", spent > budget);
  }

  async _onForge(event) {
    event.preventDefault();
    const type = this.state.identity.characterType;
    const errors = [
      ...this._validateStep1(),
      ...this._validateStep2(),
      ...(this._skipsVirtuesStep(type) ? [] : this._validateStep3()),
      ...(this._isMagus(type) ? this._validateStep4() : [])
    ];

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
    const selected = select?.selectedOptions?.[0];
    const itemId = select?.value;
    const packId = selected?.dataset?.pack ?? "ars-magica-2e.arm2e-formulaic-spells";
    if (!itemId) return;

    const pack = game.packs.get(packId);
    const item = await pack?.getDocument(itemId);
    if (!item) return;

    this.state.spells.push({
      name: item.name,
      level: Number(item.system?.level) || 0,
      technique: item.system?.technique ?? "creo",
      form: item.system?.form ?? "corporem",
      artAbbrev: item.system?.artAbbrev ?? "",
      isGeneral: Boolean(item.system?.isGeneral),
      source: item.system?.source ?? "",
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
  _onCompendiumVfPreview(event) {
    const select = event.currentTarget;
    const entry = this._compendiumVfById?.get(select.value);
    const preview = this.element.find(".wizard-vf-preview");
    preview.text(entry?.description ?? "");
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onImportCompendiumVirtueFlaw(event) {
    event.preventDefault();
    const select = this.element.find('[data-path="compendiumVfId"]')[0];
    const selected = select?.selectedOptions?.[0];
    const itemId = select?.value;
    const packId = selected?.dataset?.pack ?? "ars-magica-2e.arm2e-virtues-flaws-arm5";
    if (!itemId) return;

    const pack = game.packs.get(packId);
    const item = await pack?.getDocument(itemId);
    if (!item) return;

    this.state.virtuesFlaws.push({
      name: item.name,
      kind: item.system?.kind ?? "virtue",
      points: Number(item.system?.points) || 0,
      magnitude: item.system?.magnitude ?? "",
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
    const type = this.state.identity.characterType;
    const age = Number(this.state.identity.age) || 0;
    const budget = abilityPointBudget(type, age);
    const spent = abilityPointsSpent(this.state.abilities);
    if (spent > budget) errors.push(`Abilities overspent by ${spent - budget} points.`);
    return errors;
  }

  _validateStep3() {
    if (this._skipsVirtuesStep(this.state.identity.characterType)) return [];

    const virtuePoints = this.state.virtuesFlaws
      .filter((entry) => entry.kind === "virtue")
      .reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
    const flawPoints = this.state.virtuesFlaws
      .filter((entry) => entry.kind === "flaw")
      .reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);

    if (virtuePoints !== flawPoints) {
      return [`Virtues (${virtuePoints}) and Flaws (${flawPoints}) must balance.`];
    }

    return [];
  }

  _validateStep4() {
    if (!this._isMagus(this.state.identity.characterType)) return [];

    const errors = [];
    const artBudget = magusArtPointBudget();
    const artSpent = artPointsSpent(this.state.arts.techniques, this.state.arts.forms);
    if (artSpent > artBudget) errors.push(`Arts overspent by ${artSpent - artBudget} points.`);

    const spellBudget = magusSpellPointBudget();
    const spellSpent = spellPointsSpent(this.state.spells);
    if (spellSpent > spellBudget) errors.push(`Spells overspent by ${spellSpent - spellBudget} points.`);

    const intelligence = Number(this.state.characteristics.intelligence) || 0;
    for (const spell of this.state.spells) {
      const castingTotal = spellCastingTotal(spell, this.state.arts, intelligence);
      const level = Number(spell.level) || 0;
      if (level > castingTotal + 10) {
        errors.push(`"${spell.name}" (Lv ${level}) exceeds Tech+Form+Int+10 (${castingTotal + 10}).`);
      }
    }

    return errors;
  }

  async _commitCharacter() {
    const registry = CONFIG.ARM2E ?? ARM2E;
    const type = this.state.identity.characterType;
    const confidence = defaultConfidence(type);
    const serializedAbilities = serializeAbilitiesForActor(this.state.abilities);
    const abilityItemData = serializeAbilityItemsForActor(this.actor, registry, serializedAbilities);
    const isMagus = this._isMagus(type);
    const skipsVirtues = this._skipsVirtuesStep(type);

    await this.actor.update({
      name: this.state.identity.name.trim(),
      "system.identity.age": Number(this.state.identity.age) || 0,
      "system.identity.characterType": type,
      "system.identity.biography": this.state.identity.biography ?? "",
      "system.identity.covenant": this.state.identity.covenant ?? "",
      "system.identity.house": this.state.identity.house ?? "",
      "system.identity.gender": this.state.identity.gender ?? "",
      "system.identity.yearBorn": Number(this.state.identity.yearBorn) || 0,
      "system.identity.currentYear": Number(this.state.identity.currentYear) || 1220,
      "system.personality.traits": this.state.identity.traits ?? "",
      "system.characteristics": foundry.utils.deepClone(this.state.characteristics),
      "system.arts.techniques": foundry.utils.deepClone(this.state.arts.techniques),
      "system.arts.forms": foundry.utils.deepClone(this.state.arts.forms),
      "system.confidence.value": confidence,
      "system.confidence.max": confidence
    });

    // Upsert abilities by key; preserve custom (non-registry) ability Items
    const registryKeys = new Set(registry.ABILITY_ENTRIES.map((entry) => entry.key));
    const forgedKeys = new Set(abilityItemData.map((entry) => entry.system.key));
    const abilityUpdates = [];
    const abilityCreates = [];

    for (const data of abilityItemData) {
      const existing = this.actor.items.find(
        (item) => item.type === "ability" && item.system?.key === data.system.key
      );
      if (existing) {
        abilityUpdates.push({
          _id: existing.id,
          name: data.name,
          system: data.system
        });
      } else {
        const createData = { ...data };
        delete createData._id;
        abilityCreates.push(createData);
      }
    }

    const abilityDeletes = this.actor.items
      .filter((item) => (
        item.type === "ability"
        && registryKeys.has(item.system?.key)
        && !forgedKeys.has(item.system?.key)
      ))
      .map((item) => item.id);

    if (abilityDeletes.length) {
      await this.actor.deleteEmbeddedDocuments("Item", abilityDeletes);
    }
    if (abilityUpdates.length) {
      await this.actor.updateEmbeddedDocuments("Item", abilityUpdates);
    }
    if (abilityCreates.length) {
      await this.actor.createEmbeddedDocuments("Item", abilityCreates);
    }

    // Replace spells always; replace V&F for companions/magi, clear them for grogs
    const replaceIds = this.actor.items
      .filter((item) => item.type === "spell" || item.type === "virtueFlaw")
      .map((item) => item.id);
    if (replaceIds.length) {
      await this.actor.deleteEmbeddedDocuments("Item", replaceIds);
    }

    const items = [];

    if (isMagus) {
      for (const spell of this.state.spells) {
        items.push({
          name: spell.name,
          type: "spell",
          system: {
            level: Number(spell.level) || 0,
            technique: spell.technique,
            form: spell.form,
            artAbbrev: spell.artAbbrev ?? "",
            isGeneral: Boolean(spell.isGeneral),
            source: spell.source ?? "",
            range: spell.range ?? "",
            duration: spell.duration ?? "",
            target: spell.target ?? "",
            mastered: Boolean(spell.mastered),
            notes: spell.notes ?? ""
          }
        });
      }
    }

    if (!skipsVirtues) {
      for (const entry of this.state.virtuesFlaws) {
        items.push({
          name: entry.name,
          type: "virtueFlaw",
          system: {
            kind: entry.kind,
            points: Number(entry.points) || 0,
            magnitude: entry.magnitude ?? "",
            category: entry.category ?? "",
            description: entry.description ?? "",
            source: entry.source ?? ""
          }
        });
      }
    }

    if (items.length) await this.actor.createEmbeddedDocuments("Item", items);
  }
}
