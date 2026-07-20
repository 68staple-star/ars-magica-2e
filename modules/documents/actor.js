import { buildAbilityLookupFromActor, findAbilityItem } from "../utils/abilities.js";
import { defaultConfidence } from "../utils/creation.js";
import { defaultCovenantSystem } from "../utils/covenant.js";
import { defaultCharacterTokenBars } from "../utils/token-status.js";
import { FATIGUE_LEVELS, WOUND_LEVELS } from "../utils/wounds.js";

/**
 * @returns {typeof import("../config.js").ARM2E}
 */
function getRegistry() {
  return CONFIG.ARM2E;
}

/**
 * @param {object} data
 */
function applyCharacterDefaults(data) {
  const system = data.system ?? {};
  const characterType = system.identity?.characterType ?? "companion";
  const confidence = defaultConfidence(characterType);

  data.system = foundry.utils.mergeObject({
    identity: {
      covenant: "",
      covenantActor: "",
      covenantJournal: "",
      gender: "",
      yearBorn: 0,
      currentYear: 1220,
      decrepitude: 0
    },
    personality: {
      traits: "",
      reputation: "",
      locationScore: 0
    },
    wounds: {
      level: "unhurt",
      value: 0,
      max: WOUND_LEVELS.length - 1
    },
    fatigue: {
      level: "fresh",
      value: 0,
      max: FATIGUE_LEVELS.length - 1
    },
    references: {
      rulesJournal: "",
      orderJournal: "",
      rulesPdf: ""
    },
    confidence: { value: confidence, max: confidence }
  }, system, { inplace: false });

  data.prototypeToken = foundry.utils.mergeObject(
    defaultCharacterTokenBars(),
    data.prototypeToken ?? {},
    { inplace: false }
  );
}

/**
 * Register actor document lifecycle hooks.
 */
export function registerActorDocumentHooks() {
  Hooks.on("preCreateActor", (document, data, options, userId) => {
    data.type ??= "character";
    if (data.type === "character") {
      applyCharacterDefaults(data);
      return;
    }
    if (data.type === "beast") {
      data.system = foundry.utils.mergeObject({
        realm: "Magic",
        might: 0,
        mightForm: "",
        size: 0,
        soak: 0,
        characteristics: {
          intelligence: 0,
          perception: 0,
          strength: 0,
          stamina: 0,
          presence: 0,
          communication: 0,
          dexterity: 0,
          quickness: 0,
          cunning: 0
        },
        combat: "",
        powers: "",
        abilities: "",
        vis: "",
        description: "",
        source: ""
      }, data.system ?? {}, { inplace: false });
      return;
    }

    if (data.type === "covenant") {
      data.img ??= "icons/svg/castle.svg";
      data.system = foundry.utils.mergeObject(
        defaultCovenantSystem(),
        data.system ?? {},
        { inplace: false }
      );
    }
  });
}
