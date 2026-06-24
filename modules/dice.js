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
 * @param {ArM2eDieResult} dieResult
 * @param {number} baseModifier
 * @param {string} label
 * @returns {string}
 */
function buildChatContent(dieResult, baseModifier, label) {
  const modifierLabel = baseModifier >= 0 ? `+${baseModifier}` : String(baseModifier);
  const total = dieResult.value + baseModifier;
  const rollTitle = dieResult.rollType === "simple" ? "Simple Roll" : "Stress Roll";
  const botchHtml = dieResult.potentialBotch
    ? `<div class="arm2e-botch-flag">Potential Botch</div>`
    : "";
  const explodeHtml = dieResult.exploded
    ? `<div class="arm2e-explode-flag">Exploding Stress Die</div>`
    : "";

  return `
<div class="arm2e-chat-roll">
  <div class="arm2e-chat-roll-header">
    <strong>${label || "Ars Magica 2e Roll"}</strong>
    <span class="arm2e-roll-type">${rollTitle}</span>
  </div>
  <div class="arm2e-chat-roll-steps">${formatDieSteps(dieResult)}</div>
  <div class="arm2e-chat-roll-total">
    <span class="die-result">${dieResult.value}</span>
    <span class="modifier">${modifierLabel}</span>
    <span class="equals">=</span>
    <strong class="total">${total}</strong>
  </div>
  ${explodeHtml}
  ${botchHtml}
</div>`;
}

/**
 * @param {"simple" | "stress"} rollType
 * @param {number} [baseModifier=0]
 * @param {string} [label=""]
 * @param {{ actor?: Actor, speaker?: object }} [options={}]
 * @returns {Promise<{ rollType: "simple" | "stress", value: number, modifier: number, total: number, potentialBotch: boolean, exploded: boolean, steps: DieStep[] }>}
 */
export async function rollArM2e(rollType, baseModifier = 0, label = "", options = {}) {
  const normalizedType = rollType === "simple" ? "simple" : "stress";
  const modifier = Number(baseModifier) || 0;
  const dieResult = normalizedType === "simple" ? rollSimpleDie() : rollStressDie();
  const total = dieResult.value + modifier;
  const speaker = options.speaker ?? ChatMessage.getSpeaker({ actor: options.actor });
  const roll = new Roll("1d10");
  await roll.evaluate();

  await ChatMessage.create({
    speaker,
    flavor: label || "Ars Magica 2e Roll",
    content: buildChatContent(dieResult, modifier, label),
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
    steps: dieResult.steps
  };
}
