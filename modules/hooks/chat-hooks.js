import { CONFIDENCE_BONUS, getConfidenceValue, spendConfidence } from "../utils/confidence.js";

/**
 * Chat card action buttons for rolls (spend confidence after the fact, open item).
 */
export function registerChatHooks() {
  const bind = (message, html) => {
    if (game.system.id !== "ars-magica-2e") return;
    const root = html instanceof jQuery ? html[0] : html;
    if (!root) return;

    root.querySelectorAll(".arm2e-chat-action").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        handleChatAction(message, button.dataset.action, button).catch((error) => {
          console.error("arm2e | Chat action failed", error);
          ui.notifications.error("Chat action failed.");
        });
      });
    });
  };

  Hooks.on("renderChatMessage", bind);
  Hooks.on("renderChatMessageHTML", bind);
}

/**
 * @param {ChatMessage} message
 * @param {string} action
 * @param {HTMLElement} button
 */
async function handleChatAction(message, action, button) {
  const flags = message.flags?.["ars-magica-2e"] ?? {};

  if (action === "open-item") {
    const uuid = flags.itemUuid || button.dataset.uuid;
    if (!uuid) {
      ui.notifications.warn("No item linked to this roll.");
      return;
    }
    const doc = await fromUuid(uuid);
    if (!doc?.sheet) {
      ui.notifications.warn("Linked item not found.");
      return;
    }
    doc.sheet.render(true);
    return;
  }

  if (action === "spend-confidence") {
    if (flags.confidenceSpent) {
      ui.notifications.info("Confidence was already spent on this roll.");
      return;
    }

    const actor = flags.actorUuid ? await fromUuid(flags.actorUuid) : null;
    if (!actor || actor.documentName !== "Actor") {
      ui.notifications.warn("No actor linked to this roll.");
      return;
    }
    if (!actor.isOwner) {
      ui.notifications.warn("You do not own this actor.");
      return;
    }

    const result = await spendConfidence(actor);
    if (!result.spent) {
      ui.notifications.warn(`${actor.name} has no Confidence to spend.`);
      return;
    }

    const bonus = CONFIDENCE_BONUS;
    const previousTotal = Number(flags.total);
    const newTotal = Number.isFinite(previousTotal) ? previousTotal + bonus : null;

    await message.setFlag("ars-magica-2e", "confidenceSpent", true);
    await message.setFlag("ars-magica-2e", "confidenceRemaining", result.remaining);
    if (newTotal !== null) await message.setFlag("ars-magica-2e", "total", newTotal);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="arm2e-chat-roll"><div class="arm2e-cast-outcome">Spent 1 Confidence (+${bonus}) on <em>${flags.label || "the prior roll"}</em>.${
        newTotal !== null ? ` Adjusted total <strong>${newTotal}</strong>.` : ""
      } ${result.remaining} Confidence remaining.</div></div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}

/**
 * Build HTML for roll-card action buttons.
 * @param {{
 *   actorUuid?: string,
 *   itemUuid?: string,
 *   confidenceSpent?: boolean,
 *   canSpendConfidence?: boolean
 * }} flags
 * @returns {string}
 */
export function buildChatActionsHtml(flags = {}) {
  const buttons = [];

  if (flags.itemUuid) {
    buttons.push(`<button type="button" class="arm2e-chat-action" data-action="open-item" data-uuid="${flags.itemUuid}"><i class="fas fa-external-link-alt"></i> Open Item</button>`);
  }

  if (flags.actorUuid && flags.canSpendConfidence && !flags.confidenceSpent) {
    buttons.push(`<button type="button" class="arm2e-chat-action" data-action="spend-confidence"><i class="fas fa-bolt"></i> Spend Confidence (+${CONFIDENCE_BONUS})</button>`);
  }

  if (!buttons.length) return "";
  return `<div class="arm2e-chat-actions">${buttons.join("")}</div>`;
}

/**
 * @param {Actor} [actor]
 * @param {boolean} [alreadySpent]
 * @returns {boolean}
 */
export function canOfferConfidence(actor, alreadySpent = false) {
  if (!actor || alreadySpent) return false;
  return getConfidenceValue(actor) > 0;
}
