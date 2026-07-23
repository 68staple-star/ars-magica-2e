import { ArM2eCreationWizard } from "../apps/creation-wizard.js";
import { attachRulesPdfViaPicker, openWorldRulesPdfJournal } from "../utils/journal.js";
import { formatPackEntrySummary } from "../utils/equipment-summary.js";

/**
 * @param {Application} app
 * @returns {{ pack: object, packName: string, root: HTMLElement } | null}
 */
function resolveCompendiumContext(app, html) {
  if (game.system.id !== "ars-magica-2e") return null;

  const pack = app.collection ?? app.documentCollection;
  const packName = pack?.metadata?.name ?? pack?.collection?.split(".")?.pop();
  const root = html instanceof jQuery ? html[0] : html;
  if (!pack || !packName || !root) return null;
  return { pack, packName, root };
}

/**
 * Append a one-line summary under each matching pack row.
 * @param {HTMLElement} root
 * @param {Iterable<object>} index
 * @param {(entry: object) => boolean} filter
 */
function appendPackSummaries(root, index, filter) {
  for (const entry of index) {
    if (!filter(entry)) continue;
    const summary = formatPackEntrySummary(entry);
    if (!summary) continue;

    const row = root.querySelector(
      `[data-document-id="${entry._id}"], [data-entry-id="${entry._id}"], [data-uuid$=".${entry._id}"]`
    );
    if (!row || row.querySelector(".arm2e-pack-stats")) continue;

    const nameEl = row.querySelector(".document-name, .entry-name, .name, h4, a");
    const stats = document.createElement("div");
    stats.className = "arm2e-pack-stats";
    stats.textContent = summary;
    if (nameEl?.parentElement) nameEl.parentElement.append(stats);
    else row.append(stats);
  }
}

/**
 * Show Speed/Atk/Dam (etc.) under each entry in the Weapons & Armor pack list.
 * Foundry's default directory only shows names.
 *
 * @param {Application} app
 * @param {JQuery | HTMLElement} html
 */
async function enrichWeaponsArmorCompendium(app, html) {
  const ctx = resolveCompendiumContext(app, html);
  if (!ctx || ctx.packName !== "arm2e-weapons") return;

  const index = await ctx.pack.getIndex({
    fields: [
      "type",
      "system.summary",
      "system.speed",
      "system.atkB",
      "system.wpnDam",
      "system.parB",
      "system.strReq",
      "system.load",
      "system.range",
      "system.ability",
      "system.category",
      "system.protection",
      "system.outfit",
      "system.cost",
      "system.notes"
    ]
  });

  appendPackSummaries(ctx.root, index, (entry) => entry.type === "weapon" || entry.type === "armor");
}

/**
 * Show Technique/Form/Level (and R/D/T) under Formulaic Spells pack entries.
 *
 * @param {Application} app
 * @param {JQuery | HTMLElement} html
 */
async function enrichSpellsCompendium(app, html) {
  const ctx = resolveCompendiumContext(app, html);
  if (!ctx || ctx.packName !== "arm2e-spells") return;

  const index = await ctx.pack.getIndex({
    fields: [
      "type",
      "system.summary",
      "system.technique",
      "system.form",
      "system.artAbbrev",
      "system.level",
      "system.isGeneral",
      "system.range",
      "system.duration",
      "system.target"
    ]
  });

  appendPackSummaries(ctx.root, index, (entry) => entry.type === "spell");
}

/**
 * @param {Actor} actor
 */
function openCreationWizard(actor) {
  if (!actor || actor.type !== "character") return;
  new ArM2eCreationWizard(actor).render(true);
}

/**
 * @param {HTMLElement} element
 * @returns {string | undefined}
 */
function resolveActorIdFromElement(element) {
  if (!element) return undefined;
  const li = element.closest?.("[data-document-id]") ?? element;
  return li.dataset?.documentId ?? element.dataset?.documentId;
}

/**
 * @param {Array<object>} entryOptions
 */
function addJournalPdfOptions(entryOptions) {
  if (!game.user.isGM) return;

  entryOptions.push({
    name: "Attach Rules PDF…",
    icon: '<i class="fas fa-file-pdf"></i>',
    callback: () => {
      attachRulesPdfViaPicker().catch((error) => {
        console.error("arm2e | Attach Rules PDF failed", error);
        ui.notifications.error("Could not attach rules PDF.");
      });
    }
  });

  entryOptions.push({
    name: "Open Rules PDF Journal",
    icon: '<i class="fas fa-book-open"></i>',
    callback: () => {
      openWorldRulesPdfJournal().catch((error) => {
        console.error("arm2e | Open Rules PDF failed", error);
      });
    }
  });
}

/**
 * Register UI hooks for actor directory shortcuts and journal PDF helpers.
 */
export function registerUiHooks() {
  // Do NOT expand CONFIG.Item.compendiumIndexFields globally — that forces every
  // Item pack (spells, virtues, abilities, …) to ship bloated indexes on world load.
  // Weapons enrichment requests fields only when that pack is opened (see getIndex above).

  Hooks.on("renderCompendium", (app, html) => {
    enrichWeaponsArmorCompendium(app, html).catch((error) => {
      console.warn("arm2e | Compendium stat enrichment failed", error);
    });
    enrichSpellsCompendium(app, html).catch((error) => {
      console.warn("arm2e | Spell pack enrichment failed", error);
    });
  });

  // Foundry v13 ApplicationV2 also fires this family of hooks.
  Hooks.on("renderApplicationV2", (app, element) => {
    const name = app?.constructor?.name ?? "";
    if (name !== "Compendium" && !name.includes("Compendium")) return;
    enrichWeaponsArmorCompendium(app, element).catch((error) => {
      console.warn("arm2e | Compendium V2 stat enrichment failed", error);
    });
    enrichSpellsCompendium(app, element).catch((error) => {
      console.warn("arm2e | Spell pack V2 enrichment failed", error);
    });
  });

  Hooks.on("getActorContextOptions", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;

    entryOptions.push({
      name: "Character Wizard",
      icon: '<i class="fas fa-magic"></i>',
      callback: (li) => {
        const actorId = resolveActorIdFromElement(li);
        const actor = actorId ? game.actors.get(actorId) : undefined;
        openCreationWizard(actor);
      }
    });
  });

  // Legacy v11–v12 actor directory hook
  Hooks.on("getActorDirectoryEntryContext", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;

    entryOptions.push({
      name: "Character Wizard",
      icon: '<i class="fas fa-magic"></i>',
      callback: (li) => {
        const actorId = resolveActorIdFromElement(li) ?? li.data?.("documentId");
        const actor = actorId ? game.actors.get(actorId) : undefined;
        openCreationWizard(actor);
      }
    });
  });

  Hooks.on("getJournalEntryContextOptions", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;
    addJournalPdfOptions(entryOptions);
  });

  Hooks.on("getJournalDirectoryEntryContext", (application, entryOptions) => {
    if (game.system.id !== "ars-magica-2e") return;
    addJournalPdfOptions(entryOptions);
  });
}
