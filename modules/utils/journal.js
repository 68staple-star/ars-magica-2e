/**
 * Journal / PDF link helpers for character and covenant sheets.
 */

/**
 * @param {string} [uuid]
 * @returns {string}
 */
export function cleanJournalUuid(uuid = "") {
  return String(uuid).trim().replace(/^@UUID\[(.+)\]$/i, "$1");
}

/**
 * Open a journal entry by UUID or @UUID string.
 * @param {string} uuid
 */
export async function openJournalEntry(uuid) {
  if (!cleanJournalUuid(uuid)) {
    ui.notifications.warn("No journal link configured.");
    return;
  }

  const doc = await fromUuid(cleanJournalUuid(uuid));

  if (!doc) {
    ui.notifications.warn("Journal entry not found. Import compendium references into your world first.");
    return;
  }

  if (doc.documentName === "JournalEntryPage" && doc.parent) {
    doc.parent.sheet.render(true, { pageId: doc.id });
    return;
  }

  if (doc.documentName === "JournalEntry") {
    doc.sheet.render(true);
    return;
  }

  ui.notifications.warn("Linked document is not a journal entry.");
}

/**
 * Resolve a dropped document to a JournalEntry or JournalEntryPage.
 * @param {Document} doc
 * @returns {JournalEntry|JournalEntryPage|null}
 */
export function asJournalDocument(doc) {
  if (!doc) return null;
  if (doc.documentName === "JournalEntry" || doc.documentName === "JournalEntryPage") return doc;
  return null;
}

/**
 * @param {Actor} actor
 * @param {string} systemPath e.g. system.references.rulesJournal
 * @param {JournalEntry|JournalEntryPage} journalDoc
 */
export async function linkJournalToActor(actor, systemPath, journalDoc) {
  const journal = asJournalDocument(journalDoc);
  if (!actor || !systemPath || !journal) {
    ui.notifications.warn("Drop a Journal Entry (or page) to link.");
    return false;
  }

  await actor.update({ [systemPath]: journal.uuid });
  return true;
}

/**
 * Open Foundry FilePicker and return the chosen path.
 * @param {{ type?: string, current?: string, title?: string }} [options]
 * @returns {Promise<string|null>}
 */
export function browseFilePath(options = {}) {
  const { type = "any", current = "", title = "Select File" } = options;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (path) => {
      if (settled) return;
      settled = true;
      resolve(path || null);
    };

    const picker = new FilePicker({
      type,
      current,
      title,
      callback: (path) => finish(path)
    });
    picker.render(true);
  });
}

/**
 * Browse for a PDF and store the path on an actor field.
 * @param {Actor} actor
 * @param {string} systemPath
 * @param {string} [current]
 */
export async function pickPdfPathForActor(actor, systemPath, current = "") {
  const path = await browseFilePath({
    type: "any",
    current: current || actor.system?.references?.rulesPdf || "",
    title: "Select Rules PDF"
  });
  if (!path) return null;
  if (!/\.pdf$/i.test(path)) {
    ui.notifications.warn("Please choose a .pdf file.");
    return null;
  }

  await actor.update({ [systemPath]: path });
  return path;
}

const RULES_PDF_JOURNAL_NAME = "ArM2 Core Rules (PDF)";
const SETTING_PDF_PATH = "rulesPdfPath";
const SETTING_PDF_JOURNAL = "rulesPdfJournalUuid";

/**
 * Register world settings for the licensed core PDF.
 */
export function registerRulesPdfSettings() {
  game.settings.register("ars-magica-2e", SETTING_PDF_PATH, {
    name: "Core Rules PDF Path",
    hint: "Path to your licensed Ars Magica 2e PDF (e.g. AG0201). Not shipped with the system — place it in your world or user data folder.",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register("ars-magica-2e", SETTING_PDF_JOURNAL, {
    name: "Core Rules PDF Journal UUID",
    hint: "Auto-filled when you use Attach Rules PDF. Characters can also link this journal manually.",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });
}

/**
 * Ensure a world JournalEntry with a PDF page pointing at the given path.
 * @param {string} pdfPath
 * @returns {Promise<JournalEntry|null>}
 */
export async function ensureRulesPdfJournal(pdfPath) {
  if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can attach the rules PDF.");
    return null;
  }

  if (!pdfPath || !/\.pdf$/i.test(pdfPath)) {
    ui.notifications.warn("Choose a .pdf file path first.");
    return null;
  }

  await game.settings.set("ars-magica-2e", SETTING_PDF_PATH, pdfPath);

  const existingUuid = game.settings.get("ars-magica-2e", SETTING_PDF_JOURNAL);
  let journal = existingUuid ? await fromUuid(cleanJournalUuid(existingUuid)) : null;

  if (!journal || journal.documentName !== "JournalEntry") {
    journal = game.journal.find((entry) => entry.name === RULES_PDF_JOURNAL_NAME) ?? null;
  }

  if (!journal) {
    journal = await JournalEntry.create({
      name: RULES_PDF_JOURNAL_NAME,
      pages: [{
        name: "Core Rules PDF",
        type: "pdf",
        src: pdfPath,
        title: { show: true, level: 1 }
      }]
    });
  } else {
    const pdfPage = journal.pages.find((page) => page.type === "pdf");
    if (pdfPage) {
      await pdfPage.update({ src: pdfPath });
    } else {
      await journal.createEmbeddedDocuments("JournalEntryPage", [{
        name: "Core Rules PDF",
        type: "pdf",
        src: pdfPath
      }]);
    }
  }

  await game.settings.set("ars-magica-2e", SETTING_PDF_JOURNAL, journal.uuid);
  ui.notifications.info(`Rules PDF linked in journal “${journal.name}”.`);
  return journal;
}

/**
 * FilePicker → create/update the world PDF journal.
 * @returns {Promise<JournalEntry|null>}
 */
export async function attachRulesPdfViaPicker() {
  const current = game.settings.get("ars-magica-2e", SETTING_PDF_PATH) || "";
  const path = await browseFilePath({
    type: "any",
    current,
    title: "Select Ars Magica 2e Rules PDF"
  });
  if (!path) return null;
  return ensureRulesPdfJournal(path);
}

/**
 * Open the world rules PDF journal if configured.
 */
export async function openWorldRulesPdfJournal() {
  const uuid = game.settings.get("ars-magica-2e", SETTING_PDF_JOURNAL);
  if (uuid) {
    await openJournalEntry(uuid);
    return;
  }

  const path = game.settings.get("ars-magica-2e", SETTING_PDF_PATH);
  if (path) {
    const journal = await ensureRulesPdfJournal(path);
    if (journal) journal.sheet.render(true);
    return;
  }

  ui.notifications.warn("No rules PDF configured. GM: use Journal directory → Attach Rules PDF.");
}

/**
 * @returns {string}
 */
export function getWorldRulesPdfJournalUuid() {
  return game.settings.get("ars-magica-2e", SETTING_PDF_JOURNAL) || "";
}
