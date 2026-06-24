/**
 * Open a journal entry by UUID or @UUID string.
 * @param {string} uuid
 */
export async function openJournalEntry(uuid) {
  if (!uuid?.trim()) {
    ui.notifications.warn("No journal link configured.");
    return;
  }

  const cleaned = uuid.trim().replace(/^@UUID\[(.+)\]$/i, "$1");
  const doc = await fromUuid(cleaned);

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
