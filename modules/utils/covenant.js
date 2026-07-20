import { FORMS, TECHNIQUES } from "../config.js";

/** Calendar seasons for seasonal activities. */
export const COVENANT_SEASONS = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);

/** Covenant lifecycle stage (Spring young → Winter declining). */
export const COVENANT_STAGES = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);

/** Aura realms used on covenant sheets. */
export const AURA_TYPES = Object.freeze(["Magic", "Faerie", "Divine", "Infernal"]);

/** Vis stock art keys in display order (Techniques then Forms). */
export const VIS_ARTS = Object.freeze([
  ...TECHNIQUES.map((art) => ({ id: art.id, label: art.label, abbrev: art.abbrev })),
  ...FORMS.map((art) => ({ id: art.id, label: art.label, abbrev: art.abbrev }))
]);

/**
 * @param {string} [uuid]
 * @returns {string}
 */
export function cleanDocumentUuid(uuid = "") {
  return String(uuid).trim().replace(/^@UUID\[(.+)\]$/i, "$1");
}

/**
 * Open an Actor or JournalEntry by UUID / @UUID string.
 * @param {string} uuid
 * @param {{ missing?: string, wrongType?: string }} [messages]
 */
export async function openLinkedDocument(uuid, messages = {}) {
  if (!cleanDocumentUuid(uuid)) {
    ui.notifications.warn(messages.missing ?? "No link configured.");
    return;
  }

  const doc = await fromUuid(cleanDocumentUuid(uuid));
  if (!doc) {
    ui.notifications.warn(messages.missing ?? "Linked document not found.");
    return;
  }

  if (doc.documentName === "JournalEntryPage" && doc.parent) {
    doc.parent.sheet.render(true, { pageId: doc.id });
    return;
  }

  if (doc.documentName === "JournalEntry" || doc.documentName === "Actor") {
    doc.sheet.render(true);
    return;
  }

  ui.notifications.warn(messages.wrongType ?? "Linked document cannot be opened here.");
}

/**
 * World characters linked to this covenant Actor.
 * @param {Actor} covenantActor
 * @returns {Actor[]}
 */
export function findCovenantMembers(covenantActor) {
  if (!covenantActor || covenantActor.type !== "covenant") return [];
  const target = covenantActor.uuid;

  return game.actors.filter((actor) => {
    if (actor.type !== "character") return false;
    return cleanDocumentUuid(actor.system?.identity?.covenantActor) === target;
  });
}

/**
 * Link a character to a covenant Actor (sets UUID + display name).
 * @param {Actor} character
 * @param {Actor} covenant
 */
export async function linkCharacterToCovenant(character, covenant) {
  if (character?.type !== "character") {
    ui.notifications.warn("Only characters can join a covenant.");
    return false;
  }
  if (covenant?.type !== "covenant") {
    ui.notifications.warn("Drop a Covenant actor to link.");
    return false;
  }

  await character.update({
    "system.identity.covenantActor": covenant.uuid,
    "system.identity.covenant": covenant.name
  });
  return true;
}

/**
 * Clear the covenant Actor link (keeps free-text name).
 * @param {Actor} character
 */
export async function unlinkCharacterFromCovenant(character) {
  if (character?.type !== "character") return;
  await character.update({ "system.identity.covenantActor": "" });
}

/**
 * Default system payload for a new covenant Actor.
 * @returns {object}
 */
export function defaultCovenantSystem() {
  const vis = { notes: "" };
  for (const art of VIS_ARTS) vis[art.id] = 0;

  return {
    location: "",
    tribunal: "",
    founded: 0,
    currentYear: 1220,
    stage: "Spring",
    season: "Spring",
    aura: { type: "Magic", level: 3 },
    wealth: "",
    income: "",
    vis,
    library: "",
    laboratories: "",
    turb: "",
    charter: "",
    hooks: "",
    boons: "",
    notes: "",
    chronicleJournal: "",
    seasonal: {
      year: 1220,
      season: "Spring",
      log: "",
      activities: []
    }
  };
}
