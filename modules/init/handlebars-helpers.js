/**
 * Handlebars helpers for Foundry v13 (legacy helpers removed upstream).
 */

/**
 * Block helper: mark the matching <option> as selected.
 * Usage:
 *   <select name="system.technique">
 *     {{#select system.technique}}
 *       {{#each techniques}}<option value="{{id}}">{{label}}</option>{{/each}}
 *     {{/select}}
 *   </select>
 *
 * @param {unknown} selected
 * @param {Handlebars.HelperOptions} options
 * @returns {Handlebars.SafeString}
 */
function selectHelper(selected, options) {
  const escaped = Handlebars.escapeExpression(String(selected ?? ""));
  const html = options.fn(this);
  const marked = html.replace(
    new RegExp(`\\svalue=(["'])${escaped}\\1`),
    ` value=$1${escaped}$1 selected`
  );
  return new Handlebars.SafeString(marked);
}

/**
 * Register system Handlebars helpers. Safe to call once during init.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("select", selectHelper);
}
