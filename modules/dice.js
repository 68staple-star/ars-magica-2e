/**
 * Ars Magica 2e dice engine (AG0201, Ch. 0 pp. 7-9).
 * Foundry d10 results use 1-10; the 10 face maps to the ArM "0" die face.
 */

import {
  applyCastingFatigue,
  getConditionModifiers,
  getFatigueLevel
} from "./utils/wounds.js";

/**
 * @returns {number} Raw Foundry d10 result (1-10).
 */
function rollD10() {
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * @param {number} raw
 * @returns {number} ArM die face (0-9).
 */
function toArMFace(raw) {
  return raw === 10 ? 0 : raw;
}

/**
 * @param {number} face
 * @returns {number}
 */
function simpleFaceValue(face) {
  return face === 0 ? 10 : face;
}

/**
 * @typedef {object} DieStep
 * @property {number} raw
 * @property {number} face
 * @property {number} multiplier
 */

/**
 * @typedef {object} ArM2eDieResult
 * @property {"simple" | "stress"} rollType
 * @property {number} value
 * @property {DieStep[]} steps
 * @property {boolean} potentialBotch
 * @property {boolean} exploded
 */

/**
 * @returns {ArM2eDieResult}
 */
export function rollSimpleDie() {
  const raw = rollD10();
  const face = toArMFace(raw);

  return {
    rollType: "simple",
    value: simpleFaceValue(face),
    steps: [{ raw, face, multiplier: 1 }],
    potentialBotch: false,
    exploded: false
  };
}

/**
 * @returns {ArM2eDieResult}
 */
export function rollStressDie() {
  /** @type {DieStep[]} */
  const steps = [];
  let multiplier = 1;
  let potentialBotch = false;

  while (true) {
    const raw = rollD10();
    const face = toArMFace(raw);
    steps.push({ raw, face, multiplier });

    if (multiplier === 1 && face === 0) {
      potentialBotch = true;
      return {
        rollType: "stress",
        value: 0,
        steps,
        potentialBotch,
        exploded: false
      };
    }

    if (face === 1) {
      multiplier *= 2;
      continue;
    }

    const faceValue = (multiplier > 1 && face === 0) ? 10 : face;

    return {
      rollType: "stress",
      value: faceValue * multiplier,
      steps,
      potentialBotch,
      exploded: steps.length > 1
    };
  }
}

/**
 * @param {ArM2eDieResult} dieResult
 * @returns {string}
 */
function formatDieSteps(dieResult) {
  return dieResult.steps.map((step, index) => {
    const faceLabel = step.face === 0 ? "0" : String(step.face);
    const suffix = step.multiplier > 1 ? ` x${step.multiplier}` : "";
    return `<span class="die-step">Roll ${index + 1}: ${faceLabel}${suffix}</span>`;
  }).join("");
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatSigned(value) {
  return value >= 0 ? `+${value}` : String(value);
}

/**
 * @param {number} total
 * @param {number} spellLevel
 * @param {{ fatigueApplied?: boolean, fatigueLabel?: string }} [fatigueInfo={}]
 * @returns {string}
 */
function buildSpellCastOutcome(total, spellLevel, fatigueInfo = {}) {
  const level = Number(spellLevel) || 0;
  const shortfall = level - total;

  if (total >= level) {
    return `<div class="arm2e-cast-outcome arm2e-cast-success">Casting total meets or exceeds Level ${level} — spell succeeds without Fatigue loss.</div>`;
  }

  const severeFailure = shortfall > 10
    ? " The spell fails to take effect (more than 10 short)."
    : "";

  const fatigueNote = fatigueInfo.fatigueApplied && fatigueInfo.fatigueLabel
    ? ` Fatigue is now <strong>${fatigueInfo.fatigueLabel}</strong>.`
    : " Lose 1 Fatigue level.";

  return `<div class="arm2e-cast-outcome arm2e-cast-failure">Casting total falls short of Level ${level}.${fatigueNote}${severeFailure}</div>`;
}

/**
 * @param {ArM2eDieResult} dieResult
 * @param {number} baseModifier
 * @param {string} label
 * @param {object} [context={}]
 * @returns {Promise<string>}
 */
async function buildChatContent(dieResult, baseModifier, label, context = {}) {
  const conditionParts = context.conditionParts ?? [];
  const conditionTotal = Number(context.conditionTotal) || 0;
  const total = dieResult.value + baseModifier + conditionTotal;
  const rollTitle = dieResult.rollType === "simple" ? "Simple Roll" : "Stress Roll";
  const spellLevel = context.spellLevel !== undefined ? Number(context.spellLevel) || 0 : undefined;
  const modifierRows = [
    { label: "Base modifier", value: baseModifier },
    ...conditionParts
  ];

  return renderTemplate("systems/ars-magica-2e/templates/chat/roll-card.html", {
    label: label || "Ars Magica 2e Roll",
    rollTitle,
    stepsHtml: formatDieSteps(dieResult),
    dieValue: dieResult.value,
    modifierRows: modifierRows.map((row) => ({
      label: row.label,
      valueLabel: formatSigned(row.value)
    })),
    total,
    castingHtml: spellLevel !== undefined
      ? buildSpellCastOutcome(total, spellLevel, {
        fatigueApplied: context.fatigueApplied,
        fatigueLabel: context.fatigueLabel
      })
      : "",
    explodeHtml: dieResult.exploded ? `<div class="arm2e-explode-flag">Exploding Stress Die</div>` : "",
    botchHtml: dieResult.potentialBotch ? `<div class="arm2e-botch-flag">Potential Botch</div>` : "",
    inactiveHtml: context.inactiveHtml ?? ""
  });
}

/**
 * @param {"simple" | "stress"} rollType
 * @param {number} [baseModifier=0]
 * @param {string} [label=""]
 * @param {{
 *   actor?: Actor,
 *   speaker?: object,
 *   spellLevel?: number,
 *   applyConditions?: boolean,
 *   applyCastingFatigue?: boolean
 * }} [options={}]
 */
export async function rollArM2e(rollType, baseModifier = 0, label = "", options = {}) {
  const normalizedType = rollType === "simple" ? "simple" : "stress";
  const modifier = Number(baseModifier) || 0;
  const applyConditions = options.applyConditions !== false
    && normalizedType === "stress"
    && Boolean(options.actor);
  const conditions = applyConditions
    ? getConditionModifiers(options.actor.system)
    : { total: 0, parts: [], canAct: true };

  if (applyConditions && !conditions.canAct) {
    const speaker = options.speaker ?? ChatMessage.getSpeaker({ actor: options.actor });
    const inactiveReason = conditions.woundLabel === "Incapacitated" || conditions.woundLabel === "Unconscious"
      ? conditions.woundLabel
      : conditions.fatigueLabel;

    await ChatMessage.create({
      speaker,
      flavor: label || "Ars Magica 2e Roll",
      content: await buildChatContent(
        { rollType: "stress", value: 0, steps: [], potentialBotch: false, exploded: false },
        modifier,
        label,
        {
          conditionParts: conditions.parts,
          conditionTotal: 0,
          inactiveHtml: `<div class="arm2e-cast-outcome arm2e-cast-failure">Cannot act while <strong>${inactiveReason}</strong>.</div>`
        }
      ),
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });

    return {
      rollType: "stress",
      value: 0,
      modifier,
      conditionTotal: 0,
      total: 0,
      potentialBotch: false,
      exploded: false,
      steps: [],
      cancelled: true,
      castingSuccess: false
    };
  }

  const dieResult = normalizedType === "simple" ? rollSimpleDie() : rollStressDie();
  const conditionTotal = Number(conditions.total) || 0;
  const total = dieResult.value + modifier + conditionTotal;
  const speaker = options.speaker ?? ChatMessage.getSpeaker({ actor: options.actor });
  const roll = new Roll("1d10");
  await roll.evaluate();
  const spellLevel = options.spellLevel !== undefined ? Number(options.spellLevel) || 0 : undefined;
  const castingSuccess = spellLevel === undefined ? undefined : total >= spellLevel;

  let fatigueApplied = false;
  let fatigueLabel = "";

  if (
    options.actor
    && spellLevel !== undefined
    && castingSuccess === false
    && options.applyCastingFatigue !== false
  ) {
    const result = await applyCastingFatigue(options.actor);
    fatigueApplied = result.changed;
    fatigueLabel = getFatigueLevel(result.next).label;

    if (fatigueApplied) {
      ui.notifications.info(`${options.actor.name} loses 1 Fatigue level → ${fatigueLabel}.`);
    }
  }

  await ChatMessage.create({
    speaker,
    flavor: label || "Ars Magica 2e Roll",
    content: await buildChatContent(dieResult, modifier, label, {
      spellLevel,
      conditionParts: conditions.parts,
      conditionTotal,
      fatigueApplied,
      fatigueLabel
    }),
    rolls: [roll],
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    sound: CONFIG.sounds?.dice
  });

  return {
    rollType: dieResult.rollType,
    value: dieResult.value,
    modifier,
    conditionTotal,
    total,
    potentialBotch: dieResult.potentialBotch,
    exploded: dieResult.exploded,
    steps: dieResult.steps,
    spellLevel,
    castingSuccess,
    fatigueApplied
  };
}

/**
 * @param {string} spellName
 * @param {number} castingModifier
 * @param {number} spellLevel
 * @param {{ actor?: Actor, speaker?: object }} [options={}]
 */
export async function rollSpellCast(spellName, castingModifier, spellLevel, options = {}) {
  const label = `${spellName} — Formulaic Casting (Lv ${Number(spellLevel) || 0})`;

  return rollArM2e("stress", castingModifier, label, {
    ...options,
    spellLevel,
    applyCastingFatigue: true
  });
}
