import { rollArM2e, rollSpellCast } from "../dice.js";
import { promptAbilityRoll } from "./ability-rolls.js";
import { prepareCombatData } from "./combat.js";
import { promptSpontaneousCast } from "./spontaneous-cast.js";

export const ARM2E_ROLL_DRAG_TYPE = "Arm2eRoll";

/**
 * @param {object} data
 * @returns {boolean}
 */
export function isArm2eRollDrag(data) {
  return data?.type === ARM2E_ROLL_DRAG_TYPE && Boolean(data.roll);
}

/**
 * @param {object} payload
 * @returns {object}
 */
export function buildRollDragData(payload) {
  return {
    type: ARM2E_ROLL_DRAG_TYPE,
    ...payload
  };
}

/**
 * @param {object} data
 * @returns {string}
 */
function macroNameFor(data) {
  return data.name || `ArM2e ${data.roll}`;
}

/**
 * @param {object} data
 * @returns {string}
 */
function buildMacroCommand(data) {
  const payload = JSON.stringify({
    roll: data.roll,
    actorUuid: data.actorUuid,
    itemUuid: data.itemUuid ?? null,
    characteristicId: data.characteristicId ?? null,
    techniqueId: data.techniqueId ?? null,
    formId: data.formId ?? null,
    totalKey: data.totalKey ?? null
  });

  return `await CONFIG.ARM2E.executeHotbarRoll(${payload});`;
}

/**
 * Create a script macro and assign it to a hotbar slot.
 * @param {object} data
 * @param {number} slot
 * @returns {Promise<Macro|null>}
 */
export async function createHotbarRollMacro(data, slot) {
  if (!isArm2eRollDrag(data) || !data.actorUuid) return null;

  const macro = await Macro.create({
    name: macroNameFor(data),
    type: "script",
    img: data.img || "icons/svg/d20-grey.svg",
    command: buildMacroCommand(data),
    flags: { "ars-magica-2e": { rollMacro: true } }
  });

  if (macro && Number.isFinite(slot)) {
    await game.user.assignHotbarMacro(macro, slot);
  }

  return macro;
}

/**
 * Execute a stored hotbar roll payload against live actor/item data.
 * @param {object} data
 */
export async function executeHotbarRoll(data) {
  if (!data?.roll || !data.actorUuid) {
    ui.notifications.warn("Invalid ArM2e hotbar macro.");
    return;
  }

  const actor = await fromUuid(data.actorUuid);
  if (!actor || actor.documentName !== "Actor") {
    ui.notifications.warn("Linked actor not found for hotbar macro.");
    return;
  }

  const registry = CONFIG.ARM2E;
  const options = { actor };

  switch (data.roll) {
    case "characteristic": {
      const id = data.characteristicId;
      const characteristic = registry.CHARACTERISTICS.find((entry) => entry.id === id);
      const value = Number(actor.system?.characteristics?.[id]) || 0;
      const label = characteristic
        ? `${characteristic.label} (${characteristic.abbrev})`
        : id;
      await rollArM2e("stress", value, label, options);
      break;
    }
    case "ability": {
      const item = data.itemUuid ? await fromUuid(data.itemUuid) : null;
      if (!item || item.type !== "ability") {
        ui.notifications.warn("Ability item not found for hotbar macro.");
        return;
      }
      await promptAbilityRoll(actor, item, registry);
      break;
    }
    case "spell": {
      const item = data.itemUuid ? await fromUuid(data.itemUuid) : null;
      if (!item || item.type !== "spell") {
        ui.notifications.warn("Spell item not found for hotbar macro.");
        return;
      }
      const techniqueId = item.system?.technique;
      const formId = item.system?.form;
      const tech = Number(actor.system?.arts?.techniques?.[techniqueId]) || 0;
      const form = Number(actor.system?.arts?.forms?.[formId]) || 0;
      const stamina = Number(actor.system?.characteristics?.stamina) || 0;
      const castingModifier = tech + form + stamina;
      const level = Number(item.system?.level) || 0;
      await rollSpellCast(item.name, castingModifier, level, options);
      break;
    }
    case "spontaneous": {
      await promptSpontaneousCast(actor, data.techniqueId, data.formId, registry);
      break;
    }
    case "weapon": {
      const item = data.itemUuid ? await fromUuid(data.itemUuid) : null;
      if (!item || item.type !== "weapon") {
        ui.notifications.warn("Weapon item not found for hotbar macro.");
        return;
      }
      const combat = prepareCombatData(
        actor.system,
        actor.items.filter((entry) => entry.type === "weapon"),
        actor.items.filter((entry) => entry.type === "armor"),
        actor.items.filter((entry) => entry.type === "equipment"),
        actor
      );
      const weapon = combat.weapons?.find((entry) => entry.id === item.id);
      if (!weapon?.derived) {
        ui.notifications.warn("Equip the weapon before rolling from the hotbar.");
        return;
      }
      const key = data.totalKey || "attack";
      const labelMap = {
        attack: "Attack",
        damage: "Damage",
        firstStrike: "First Strike",
        defense: "Parry Defense"
      };
      const modifier = Number(weapon.derived?.[key]) || 0;
      await rollArM2e("stress", modifier, `${weapon.name} — ${labelMap[key] ?? key}`, options);
      break;
    }
    case "dodge": {
      const combat = prepareCombatData(
        actor.system,
        actor.items.filter((entry) => entry.type === "weapon"),
        actor.items.filter((entry) => entry.type === "armor"),
        actor.items.filter((entry) => entry.type === "equipment"),
        actor
      );
      const modifier = Number(combat.dodge) || 0;
      await rollArM2e("stress", modifier, "Dodge Defense", options);
      break;
    }
    default:
      ui.notifications.warn(`Unknown ArM2e roll type: ${data.roll}`);
  }
}
