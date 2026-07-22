/**
 * Spontaneous casting dialog (AG0201).
 */

import { rollSpontaneousCast } from "../dice.js";
import { CONFIDENCE_BONUS, getConfidenceValue } from "./confidence.js";
import {
  calculateSpontaneousModifier,
  describeSpontaneousArts
} from "./spontaneous.js";

/**
 * @param {Actor} actor
 * @param {string} techniqueId
 * @param {string} formId
 * @param {typeof import("../config.js").ARM2E} registry
 */
export async function promptSpontaneousCast(actor, techniqueId, formId, registry) {
  const arts = describeSpontaneousArts(actor.system, techniqueId, formId, registry);
  const confidence = getConfidenceValue(actor);
  const modifier = calculateSpontaneousModifier(actor.system, techniqueId, formId);

  const content = `
    <form class="arm2e-spontaneous-dialog">
      <p><strong>${arts.techniqueAbbrev}${arts.formAbbrev}</strong>
        = ${arts.techniqueAbbrev} ${arts.techniqueScore} + ${arts.formAbbrev} ${arts.formScore} + Int ${arts.intelligence}
        = <strong>${modifier}</strong></p>
      <p class="notes">Fatiguing spontaneous: (die + total) ÷ 2, costs 1 Fatigue.
        Careful: ÷ 5, no Fatigue.</p>
      <div class="form-group">
        <label>Effort</label>
        <select name="effort">
          <option value="fatigue" selected>Fatiguing (÷2, lose Fatigue)</option>
          <option value="careful">Careful (÷5, no Fatigue)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Die</label>
        <select name="rollType">
          <option value="stress" selected>Stress (0 = botch check, 1 = explode)</option>
          <option value="simple">Simple (0 counts as 10, no botch)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Suggested target Level (optional)</label>
        <input type="number" name="targetLevel" min="0" step="1" placeholder="e.g. 10" />
      </div>
      <div class="form-group">
        <label class="checkbox">
          <input type="checkbox" name="spendConfidence" ${confidence < 1 ? "disabled" : ""} />
          Spend 1 Confidence (+${CONFIDENCE_BONUS}) — have ${confidence}
        </label>
      </div>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: `Spontaneous ${arts.techniqueAbbrev}${arts.formAbbrev}`,
      content,
      buttons: {
        cast: {
          icon: '<i class="fas fa-hat-wizard"></i>',
          label: "Cast",
          callback: async (html) => {
            const fatiguing = html.find('[name="effort"]').val() !== "careful";
            const rollType = html.find('[name="rollType"]').val() === "simple" ? "simple" : "stress";
            const targetRaw = html.find('[name="targetLevel"]').val();
            const targetLevel = targetRaw === "" ? undefined : Number(targetRaw);
            const spendConfidence = Boolean(html.find('[name="spendConfidence"]').is(":checked"));

            await rollSpontaneousCast(arts, modifier, {
              actor,
              fatiguing,
              rollType,
              targetLevel,
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
      default: "cast"
    }, { width: 420 }).render(true);
  });
}
