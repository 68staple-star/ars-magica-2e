/**
 * Ars Magica 2e dice engine (AG0201, Ch. 0 pp. 7-9).
 * Foundry d10 results use 1-10; the 10 face maps to the ArM "0" die face.
 */

import { CONFIDENCE_BONUS, spendConfidence } from "./utils/confidence.js";
import {
  applyCastingFatigue,
  getConditionModifiers,
  getFatigueLevel
} from "./utils/wounds.js";
import { spontaneousLevelEquivalent } from "./utils/spontaneous.js";
import { buildChatActionsHtml, canOfferConfidence } from "./hooks/chat-hooks.js";

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

  const castingHtml = context.outcomeHtml
    ?? (spellLevel !== undefined
      ? buildSpellCastOutcome(total, spellLevel, {
        fatigueApplied: context.fatigueApplied,
        fatigueLabel: context.fatigueLabel
      })
      : "");

  const confidenceHtml = context.confidenceSpent
    ? `<div class="arm2e-cast-outcome">Spent 1 Confidence (+${context.confidenceBonus}) — ${context.confidenceRemaining} remaining.</div>`
    : "";

  const actionsHtml = context.actionsHtml ?? "";

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
    castingHtml: `${castingHtml}${confidenceHtml}`,
    explodeHtml: dieResult.exploded ? `<div class="arm2e-explode-flag">Exploding Stress Die</div>` : "",
    botchHtml: dieResult.potentialBotch
      ? `<div class="arm2e-botch-flag">Potential Botch — storyguide chooses botch dice and resolves.</div>`
      : "",
    inactiveHtml: context.inactiveHtml ?? "",
    actionsHtml
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
 *   applyCastingFatigue?: boolean,
 *   spendConfidence?: boolean,
 *   confidenceBonus?: number,
 *   outcomeHtml?: string,
 *   forceFatigue?: boolean
 * }} [options={}]
 */
export async function rollArM2e(rollType, baseModifier = 0, label = "", options = {}) {
  const normalizedType = rollType === "simple" ? "simple" : "stress";
  let modifier = Number(baseModifier) || 0;
  const applyConditions = options.applyConditions !== false
    && normalizedType === "stress"
    && Boolean(options.actor);
  const conditions = applyConditions
    ? getConditionModifiers(options.actor.system)
    : { total: 0, parts: [], canAct: true };

  let confidenceSpent = false;
  let confidenceRemaining = 0;
  const confidenceBonus = Number(options.confidenceBonus) || CONFIDENCE_BONUS;

  if (options.spendConfidence && options.actor) {
    const result = await spendConfidence(options.actor);
    confidenceSpent = result.spent;
    confidenceRemaining = result.remaining;
    if (confidenceSpent) {
      modifier += confidenceBonus;
    } else {
      ui.notifications.warn(`${options.actor.name} has no Confidence to spend.`);
    }
  }

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

  const shouldApplyFatigue = options.actor && options.applyCastingFatigue !== false && (
    options.forceFatigue
    || (spellLevel !== undefined && castingSuccess === false)
  );

  if (shouldApplyFatigue) {
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
      fatigueLabel,
      outcomeHtml: options.outcomeHtml,
      confidenceSpent,
      confidenceRemaining,
      confidenceBonus: confidenceSpent ? confidenceBonus : 0,
      actionsHtml: buildChatActionsHtml({
        actorUuid: options.actor?.uuid,
        itemUuid: options.itemUuid,
        confidenceSpent,
        canSpendConfidence: canOfferConfidence(options.actor, confidenceSpent)
      })
    }),
    rolls: [roll],
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    sound: CONFIG.sounds?.dice,
    flags: {
      "ars-magica-2e": {
        actorUuid: options.actor?.uuid ?? "",
        itemUuid: options.itemUuid ?? "",
        label: label || "Ars Magica 2e Roll",
        total,
        confidenceSpent,
        confidenceRemaining
      }
    }
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
    fatigueApplied,
    confidenceSpent,
    confidenceRemaining
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

/**
 * Spontaneous casting: die + Tech + Form + Int, then ÷2 (fatigue) or ÷5 (careful).
 * Fatiguing spontaneous always costs 1 Fatigue level.
 *
 * @param {object} arts
 * @param {number} castingModifier
 * @param {{
 *   actor?: Actor,
 *   speaker?: object,
 *   fatiguing?: boolean,
 *   rollType?: "simple" | "stress",
 *   targetLevel?: number,
 *   spendConfidence?: boolean
 * }} [options={}]
 */
export async function rollSpontaneousCast(arts, castingModifier, options = {}) {
  const fatiguing = options.fatiguing !== false;
  const rollType = options.rollType === "simple" ? "simple" : "stress";
  const artsLabel = `${arts.techniqueAbbrev ?? "?"}${arts.formAbbrev ?? "?"}`;
  const modeLabel = fatiguing ? "Fatiguing ÷2" : "Careful ÷5";
  const label = `Spontaneous ${artsLabel} — ${modeLabel}`;

  const result = await rollArM2e(rollType, castingModifier, label, {
    actor: options.actor,
    speaker: options.speaker,
    spendConfidence: options.spendConfidence,
    applyCastingFatigue: fatiguing,
    forceFatigue: fatiguing,
    applyConditions: rollType === "stress",
    outcomeHtml: "" // filled after we know total
  });

  if (result.cancelled) return result;

  const levelEquivalent = spontaneousLevelEquivalent(result.total, fatiguing);
  const rounded = Math.round(levelEquivalent * 10) / 10;
  const targetLevel = options.targetLevel !== undefined && options.targetLevel !== ""
    ? Number(options.targetLevel)
    : undefined;

  let outcome = `<div class="arm2e-cast-outcome arm2e-cast-success">Level equivalent: <strong>${rounded}</strong> (total ${result.total} ÷ ${fatiguing ? 2 : 5}).`;
  if (Number.isFinite(targetLevel)) {
    outcome += rounded + 0.0001 >= targetLevel
      ? ` Meets suggested Level ${targetLevel}.`
      : ` Short of suggested Level ${targetLevel}.`;
  }
  if (fatiguing && result.fatigueApplied) {
    outcome += ` Fatigue is now <strong>${getFatigueLevel(options.actor.system.fatigue.level).label}</strong>.`;
  } else if (fatiguing) {
    outcome += " Fatiguing spontaneous costs 1 Fatigue level.";
  }
  outcome += "</div>";

  // Re-post is noisy; append via a follow-up chat note instead
  await ChatMessage.create({
    speaker: options.speaker ?? ChatMessage.getSpeaker({ actor: options.actor }),
    content: outcome,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });

  return {
    ...result,
    levelEquivalent: rounded,
    fatiguing,
    targetLevel
  };
}
