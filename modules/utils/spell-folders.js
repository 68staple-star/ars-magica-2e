/**
 * Foundry folder layout for Formulaic Spells (Technique → Form).
 */

import { FORMS, TECHNIQUES } from "../config.js";

/**
 * @returns {Array<{ key: string, name: string, sort: number, children: Array<{ key: string, name: string, sort: number, technique: string, form: string }> }>}
 */
export function buildSpellFolderTree() {
  return TECHNIQUES.map((technique, techIndex) => ({
    key: technique.id,
    name: `${technique.label} (${technique.abbrev})`,
    sort: techIndex * 100_000,
    children: FORMS.map((form, formIndex) => ({
      key: `${technique.id}-${form.id}`,
      name: `${form.label} (${form.abbrev})`,
      sort: formIndex * 100_000,
      technique: technique.id,
      form: form.id
    }))
  }));
}

/**
 * @param {object} [system]
 * @returns {string}
 */
export function resolveSpellFolderKey(system = {}) {
  const technique = String(system.technique ?? "").trim().toLowerCase() || "creo";
  const form = String(system.form ?? "").trim().toLowerCase() || "vim";
  const knownTech = TECHNIQUES.some((entry) => entry.id === technique);
  const knownForm = FORMS.some((entry) => entry.id === form);
  if (!knownTech || !knownForm) return "other";
  return `${technique}-${form}`;
}

/**
 * @returns {Array<{ key: string, name: string, sort: number, parentKey: string | null }>}
 */
export function flattenSpellFolders() {
  /** @type {Array<{ key: string, name: string, sort: number, parentKey: string | null }>} */
  const list = [];

  for (const root of buildSpellFolderTree()) {
    list.push({
      key: root.key,
      name: root.name,
      sort: root.sort,
      parentKey: null
    });

    for (const child of root.children) {
      list.push({
        key: child.key,
        name: child.name,
        sort: child.sort,
        parentKey: root.key
      });
    }
  }

  list.push({
    key: "other",
    name: "Other",
    sort: 900_000,
    parentKey: null
  });

  return list;
}

/**
 * @param {string} leafKey
 * @returns {string[]}
 */
export function spellFolderPathSegments(leafKey) {
  const flat = flattenSpellFolders();
  const leaf = flat.find((folder) => folder.key === leafKey);
  if (!leaf) return ["Other"];

  if (!leaf.parentKey) return [slugFolderDir(leaf.name)];

  const parent = flat.find((folder) => folder.key === leaf.parentKey);
  return [slugFolderDir(parent?.name ?? leaf.parentKey), slugFolderDir(leaf.name)];
}

/**
 * @param {string} name
 * @returns {string}
 */
function slugFolderDir(name) {
  return String(name)
    .replace(/[()]/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/\+/g, "plus-")
    .trim()
    .replace(/\s+/g, "-")
    || "folder";
}

/**
 * Strip a trailing `[CrIg 15]` display suffix from a spell name.
 * @param {string} name
 * @returns {string}
 */
export function stripSpellDisplaySuffix(name) {
  return String(name ?? "").replace(/\s+\[[^\]]+\]\s*$/, "").trim();
}

/**
 * Bake Technique/Form/Level into the pack list name.
 * @param {string} baseName
 * @param {object} [system]
 * @returns {string}
 */
export function formatSpellDisplayName(baseName, system = {}) {
  const bare = stripSpellDisplaySuffix(baseName);
  let art = String(system.artAbbrev ?? "").trim();
  if (!art) {
    art = [system.technique, system.form].filter(Boolean).join("/") || "?";
  }

  // artAbbrev may already include "Gen" for general guidelines.
  const artHasGen = /\bgen\b/i.test(art);
  if (system.isGeneral) {
    return artHasGen ? `${bare} [${art}]` : `${bare} [${art} Gen]`;
  }

  const level = String(Number(system.level) || 0);
  return `${bare} [${art} ${level}]`;
}

/**
 * One-line pack list summary under the spell name.
 * @param {object} [system]
 * @returns {string}
 */
export function formatSpellSummary(system = {}) {
  const art = String(system.artAbbrev ?? "").trim();
  const level = system.isGeneral ? "Gen" : `Lv ${Number(system.level) || 0}`;
  const parts = [];
  if (art) parts.push(art);
  parts.push(level);

  const rdt = [system.range, system.duration, system.target]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (rdt.length) parts.push(rdt.join(" / "));

  return parts.join(" · ");
}
