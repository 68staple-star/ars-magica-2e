/**
 * Ability roll helpers — characteristic + ability + specialty.
 */

import { getAbilityByKey } from "../config/ability-registry.js";
import { rollArM2e } from "../dice.js";
import { CONFIDENCE_BONUS, getConfidenceValue } from "./confidence.js";

/**
 * @param {object} actorSystem
 * @param {string} characteristicId
 * @returns {number}
 */
export function getCharacteristicValue(actorSystem, characteristicId) {
  return Number(actorSystem?.characteristics?.[characteristicId]) || 0;
}

/**
 * @param {Item} abilityItem
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {object} actorSystem
 * @param {string} [characteristicOverride]
 * @param {boolean} [applySpecialty=true]
 */
export function buildAbilityRollModifier(abilityItem, registry, actorSystem, characteristicOverride, applySpecialty = true) {
  const definition = getAbilityByKey(abilityItem.system?.key);
  const characteristicId = characteristicOverride
    || abilityItem.system?.rollCharacteristic
    || definition?.characteristic
    || "";

  const characteristicValue = getCharacteristicValue(actorSystem, characteristicId);
  const abilityValue = Number(abilityItem.system?.value) || 0;
  const specialty = String(abilityItem.system?.specialty ?? "").trim();
  const specialtyBonus = applySpecialty && specialty ? 1 : 0;
  const modifier = characteristicValue + abilityValue + specialtyBonus;

  const characteristic = registry.CHARACTERISTICS.find((entry) => entry.id === characteristicId);

  return {
    characteristicId,
    characteristicLabel: characteristic?.label ?? characteristicId,
    characteristicAbbrev: characteristic?.abbrev ?? "",
    characteristicValue,
    abilityValue,
    specialty,
    specialtyBonus,
    modifier
  };
}

/**
 * @param {object} breakdown
 * @param {string} abilityLabel
 * @param {string} abilityType
 */
export function formatAbilityRollLabel(breakdown, abilityLabel, abilityType) {
  const parts = [];

  if (breakdown.characteristicAbbrev) {
    parts.push(`${breakdown.characteristicAbbrev} ${breakdown.characteristicValue >= 0 ? "+" : ""}${breakdown.characteristicValue}`);
  }

  parts.push(`${abilityLabel} ${breakdown.abilityValue >= 0 ? "+" : ""}${breakdown.abilityValue}`);

  if (breakdown.specialtyBonus) {
    parts.push(`specialty +${breakdown.specialtyBonus} (${breakdown.specialty})`);
  }

  return `${abilityLabel} (${abilityType}) — ${parts.join(", ")}`;
}

/**
 * @param {Actor} actor
 * @param {Item} abilityItem
 * @param {typeof import("../config.js").ARM2E} registry
 * @param {string} characteristicId
 * @param {{ applySpecialty?: boolean, spendConfidence?: boolean }} [options={}]
 */
export async function executeAbilityRoll(actor, abilityItem, registry, characteristicId, options = {}) {
  const breakdown = buildAbilityRollModifier(
    abilityItem,
    registry,
    actor.system,
    characteristicId,
    options.applySpecialty !== false
  );

  if (!breakdown.characteristicId) {
    ui.notifications.warn("Select a characteristic before rolling this ability.");
    return;
  }

  const abilityType = abilityItem.system?.category?.replace(/s$/, "") ?? "ability";
  const label = formatAbilityRollLabel(breakdown, abilityItem.name, abilityType);

  await rollArM2e("stress", breakdown.modifier, label, {
    actor,
    spendConfidence: Boolean(options.spendConfidence)
  });
}

/**
 * Prompt the player to confirm or override the roll characteristic.
 * @param {Actor} actor
 * @param {Item} abilityItem
 * @param {typeof import("../config.js").ARM2E} registry
 */
export async function promptAbilityRoll(actor, abilityItem, registry) {
  const definition = getAbilityByKey(abilityItem.system?.key);
  const defaultCharacteristic = abilityItem.system?.rollCharacteristic
    ?? definition?.characteristic
    ?? "";
  const specialty = String(abilityItem.system?.specialty ?? "").trim();
  const confidence = getConfidenceValue(actor);

  const options = registry.CHARACTERISTICS.map((entry) => {
    const selected = entry.id === defaultCharacteristic ? "selected" : "";
    return `<option value="${entry.id}" ${selected}>${entry.label} (${entry.abbrev})</option>`;
  }).join("");

  const alternatesNote = definition?.alternates?.length
    ? `<p class="notes">Rules allow alternate characteristics: ${definition.alternates.join(", ")}.</p>`
    : "";

  const specialtyBlock = specialty
    ? `<div class="form-group">
        <label class="checkbox">
          <input type="checkbox" name="applySpecialty" checked />
          Apply specialty <em>${specialty}</em> (+1)
        </label>
      </div>`
    : "";

  const content = `
    <form class="arm2e-ability-roll-dialog">
      <p>Roll <strong>${abilityItem.name}</strong> using stress die + characteristic + ability.</p>
      <div class="form-group">
        <label for="arm2e-roll-characteristic">Characteristic</label>
        <select id="arm2e-roll-characteristic" name="characteristic">${options}</select>
      </div>
      ${specialtyBlock}
      <div class="form-group">
        <label class="checkbox">
          <input type="checkbox" name="spendConfidence" ${confidence < 1 ? "disabled" : ""} />
          Spend 1 Confidence (+${CONFIDENCE_BONUS}) — have ${confidence}
        </label>
      </div>
      ${alternatesNote}
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: `Roll ${abilityItem.name}`,
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Roll",
          callback: async (html) => {
            const characteristicId = html.find('[name="characteristic"]').val();
            const applySpecialty = specialty
              ? Boolean(html.find('[name="applySpecialty"]').is(":checked"))
              : false;
            const spendConfidence = Boolean(html.find('[name="spendConfidence"]').is(":checked"));
            await executeAbilityRoll(actor, abilityItem, registry, characteristicId, {
              applySpecialty,
              spendConfidence
            });
            resolve(true);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(false)
        }
      },
      default: "roll"
    }, { width: 380 }).render(true);
  });
}
