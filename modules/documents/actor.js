import { ARM2E } from "../config.js";
import { buildCharacterAbilities } from "../utils/abilities.js";

/**
 * @returns {typeof ARM2E}
 */
function getRegistry() {
  return CONFIG.ARM2E ?? ARM2E;
}

/**
 * @param {Actor} document
 * @param {object} data
 */
function populateCharacterAbilityData(document, data) {
  if (data.type !== "character") return;

  const registry = getRegistry();
  data.system ??= {};
  data.system.abilities = buildCharacterAbilities(registry, data.system.abilities);
}

/**
 * Register actor document lifecycle hooks.
 */
export function registerActorDocumentHooks() {
  Hooks.on("preCreateActor", (document, data, options, userId) => {
    populateCharacterAbilityData(document, data);
  });
}
