/**
 * Ars Magica 2e dice engine (AG0201, Ch. 0 pp. 7-9).
 * Foundry d10 results use 1-10; the 10 face maps to the ArM "0" die face.
 */

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
 * @param {number} total
 * @param {number} spellLevel
 * @returns {string}
 */
function buildSpellCastOutcome(total, spellLevel) {
  const level = Number(spellLevel) || 0;
  const shortfall = level - total;

  if (total >= level) {
    return `<div class="arm2e-cast-outcome arm2e-cast-success">Casting total meets or exceeds Level ${level} — spell succeeds without Fatigue loss.</div>`;
  }

  const severeFailure = shortfall > 10
    ? " The spell fails to take effect (more than 10 short)."
    : "";

  return `<div class="arm2e-cast-outcome arm2e-cast-failure">Casting total falls short of Level ${level} — lose 1 Fatigue level.${severeFailure}</div>`;
}

/**
 * @param {ArM2eDieResult} dieResult
 * @param {number} baseModifier
 * @param {string} label
 * @param {{ spellLevel?: number }} [context={}]
 * @returns {Promise<string>}
 */
async function buildChatContent(dieResult, baseModifier, label, context = {}) {
  const modifierLabel = baseModifier >= 0 ? `+${baseModifier}` : String(baseModifier);
  const total = dieResult.value + baseModifier;
  const rollTitle = dieResult.rollType === "simple" ? "Simple Roll" : "Stress Roll";
  const spellLevel = context.spellLevel !== undefined ? Number(context.spellLevel) || 0 : undefined;

  return renderTemplate("systems/ars-magica-2e/templates/chat/roll-card.html", {
    label: label || "Ars Magica 2e Roll",
    rollTitle,
    stepsHtml: formatDieSteps(dieResult),
    dieValue: dieResult.value,
    modifierLabel,
    total,
    castingHtml: spellLevel !== undefined ? buildSpellCastOutcome(total, spellLevel) : "",
    explodeHtml: dieResult.exploded ? `<div class="arm2e-explode-flag">Exploding Stress Die</div>` : "",
    botchHtml: dieResult.potentialBotch ? `<div class="arm2e-botch-flag">Potential Botch</div>` : ""
  });
}

/**
 * @param {"simple" | "stress"} rollType
 * @param {number} [baseModifier=0]
 * @param {string} [label=""]
 * @param {{ actor?: Actor, speaker?: object, spellLevel?: number }} [options={}]
 */
export async function rollArM2e(rollType, baseModifier = 0, label = "", options = {}) {
  const normalizedType = rollType === "simple" ? "simple" : "stress";
  const modifier = Number(baseModifier) || 0;
  const dieResult = normalizedType === "simple" ? rollSimpleDie() : rollStressDie();
  const total = dieResult.value + modifier;
  const speaker = options.speaker ?? ChatMessage.getSpeaker({ actor: options.actor });
  const roll = new Roll("1d10");
  await roll.evaluate();
  const spellLevel = options.spellLevel !== undefined ? Number(options.spellLevel) || 0 : undefined;

  await ChatMessage.create({
    speaker,
    flavor: label || "Ars Magica 2e Roll",
    content: await buildChatContent(dieResult, modifier, label, { spellLevel }),
    rolls: [roll],
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    sound: CONFIG.sounds?.dice
  });

  return {
    rollType: dieResult.rollType,
    value: dieResult.value,
    modifier,
    total,
    potentialBotch: dieResult.potentialBotch,
    exploded: dieResult.exploded,
    steps: dieResult.steps,
    spellLevel,
    castingSuccess: spellLevel === undefined ? undefined : total >= spellLevel
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
    spellLevel
  });
}
