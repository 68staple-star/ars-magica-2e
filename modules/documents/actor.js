import { buildAbilityLookupFromActor, findAbilityItem } from "../utils/abilities.js";
import { defaultConfidence } from "../utils/creation.js";

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
    wounds: { level: "unhurt" },
    fatigue: { level: "fresh", value: 0, max: 5 },
    references: {
      rulesJournal: "",
      orderJournal: ""
    },
    confidence: { value: confidence, max: confidence }
  }, system, { inplace: false });
}

/**
 * Register actor document lifecycle hooks.
 */
export function registerActorDocumentHooks() {
  Hooks.on("preCreateActor", (document, data, options, userId) => {
    data.type ??= "character";
    if (data.type !== "character") return;
    applyCharacterDefaults(data);
  });
}
