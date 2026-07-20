import {
  FATIGUE_LEVELS,
  WOUND_LEVELS,
  fatigueLevelFromIndex,
  fatigueLevelIndex,
  fatigueLevelUpdate,
  woundLevelFromIndex,
  woundLevelIndex,
  woundLevelUpdate
} from "./wounds.js";

const WOUND_STATUS_PREFIX = "arm2e-wound-";
const FATIGUE_STATUS_PREFIX = "arm2e-fatigue-";

const WOUND_ICONS = {
  hurt: "icons/svg/blood.svg",
  light: "icons/svg/blood.svg",
  medium: "icons/svg/terror.svg",
  heavy: "icons/svg/skull.svg",
  incapacitated: "icons/svg/falling.svg",
  unconscious: "icons/svg/unconscious.svg"
};

const FATIGUE_ICONS = {
  winded: "icons/svg/downgrade.svg",
  weary: "icons/svg/downgrade.svg",
  tired: "icons/svg/aura.svg",
  dazed: "icons/svg/lightning.svg",
  unconscious: "icons/svg/unconscious.svg"
};

/**
 * Status effect definitions for CONFIG.statusEffects (non-baseline levels only).
 * @returns {object[]}
 */
export function buildConditionStatusEffects() {
  const wounds = WOUND_LEVELS
    .filter((level) => level.id !== "unhurt")
    .map((level) => ({
      id: `${WOUND_STATUS_PREFIX}${level.id}`,
      name: level.label,
      img: WOUND_ICONS[level.id] ?? "icons/svg/blood.svg",
      description: "Ars Magica 2e wound level"
    }));

  const fatigue = FATIGUE_LEVELS
    .filter((level) => level.id !== "fresh")
    .map((level) => ({
      id: `${FATIGUE_STATUS_PREFIX}${level.id}`,
      name: `Fatigue: ${level.label}`,
      img: FATIGUE_ICONS[level.id] ?? "icons/svg/downgrade.svg",
      description: "Ars Magica 2e fatigue level"
    }));

  return [...wounds, ...fatigue];
}

/**
 * Keep wound/fatigue level strings and token-bar numerics aligned.
 * @param {Actor} actor
 * @param {object} [changed]
 * @returns {Promise<void>}
 */
export async function syncConditionTracks(actor, changed = {}) {
  if (!actor || actor.type !== "character" || !actor.isOwner) return;

  const system = actor.system ?? {};
  const updates = {};

  const woundChanged = foundry.utils.hasProperty(changed, "system.wounds");
  const fatigueChanged = foundry.utils.hasProperty(changed, "system.fatigue");

  if (woundChanged || system.wounds?.value === undefined || system.wounds?.max === undefined) {
    const levelFromValue = foundry.utils.hasProperty(changed, "system.wounds.value")
      && !foundry.utils.hasProperty(changed, "system.wounds.level");
    const level = levelFromValue
      ? woundLevelFromIndex(system.wounds?.value)
      : (system.wounds?.level ?? "unhurt");
    const expected = woundLevelUpdate(level);
    for (const [key, value] of Object.entries(expected)) {
      if (foundry.utils.getProperty(actor, key) !== value) updates[key] = value;
    }
  }

  if (fatigueChanged || system.fatigue?.value === undefined || system.fatigue?.max !== FATIGUE_LEVELS.length - 1) {
    const levelFromValue = foundry.utils.hasProperty(changed, "system.fatigue.value")
      && !foundry.utils.hasProperty(changed, "system.fatigue.level");
    const level = levelFromValue
      ? fatigueLevelFromIndex(system.fatigue?.value)
      : (system.fatigue?.level ?? "fresh");
    const expected = fatigueLevelUpdate(level);
    for (const [key, value] of Object.entries(expected)) {
      if (foundry.utils.getProperty(actor, key) !== value) updates[key] = value;
    }
  }

  if (Object.keys(updates).length) {
    await actor.update(updates, { arm2eSyncTracks: true });
  }
}

/**
 * @param {ActiveEffect} effect
 * @returns {Set<string>}
 */
function effectStatuses(effect) {
  if (effect.statuses instanceof Set) return effect.statuses;
  if (Array.isArray(effect.statuses)) return new Set(effect.statuses);
  if (effect.getFlag?.("core", "statusId")) return new Set([effect.getFlag("core", "statusId")]);
  return new Set();
}

/**
 * Sync token ActiveEffect status icons to current wound/fatigue levels.
 * Penalties still come from wounds.js — effects are visual only.
 * @param {Actor} actor
 */
export async function syncConditionEffects(actor) {
  if (!actor || actor.type !== "character" || !actor.isOwner) return;

  const woundId = actor.system?.wounds?.level ?? "unhurt";
  const fatigueId = actor.system?.fatigue?.level ?? "fresh";
  const desired = new Set();

  if (woundId !== "unhurt") desired.add(`${WOUND_STATUS_PREFIX}${woundId}`);
  if (fatigueId !== "fresh") desired.add(`${FATIGUE_STATUS_PREFIX}${fatigueId}`);

  const managed = actor.effects.filter((effect) => {
    const statuses = effectStatuses(effect);
    return [...statuses].some((id) => id.startsWith(WOUND_STATUS_PREFIX) || id.startsWith(FATIGUE_STATUS_PREFIX));
  });

  const toDelete = [];
  const present = new Set();

  for (const effect of managed) {
    const statuses = [...effectStatuses(effect)];
    const keep = statuses.some((id) => desired.has(id));
    if (!keep) toDelete.push(effect.id);
    else statuses.forEach((id) => present.add(id));
  }

  if (toDelete.length) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete, { arm2eSyncEffects: true });
  }

  const toCreate = [];
  for (const statusId of desired) {
    if (present.has(statusId)) continue;
    const def = CONFIG.statusEffects.find((entry) => entry.id === statusId);
    if (!def) continue;

    toCreate.push({
      name: def.name,
      img: def.img ?? def.icon,
      statuses: [statusId],
      disabled: false,
      transfer: false,
      flags: {
        "ars-magica-2e": { conditionSync: true }
      }
    });
  }

  if (toCreate.length) {
    await actor.createEmbeddedDocuments("ActiveEffect", toCreate, { arm2eSyncEffects: true });
  }
}

/**
 * Default prototype token bars for new characters.
 * @returns {object}
 */
export function defaultCharacterTokenBars() {
  const display = CONST.TOKEN_DISPLAY_MODES?.OWNER_HOVER
    ?? CONST.TOKEN_DISPLAY_MODES?.HOVER
    ?? 30;

  return {
    bar1: { attribute: "wounds" },
    bar2: { attribute: "fatigue" },
    displayBars: display
  };
}

/**
 * @param {Actor} actor
 * @returns {{ woundIndex: number, fatigueIndex: number }}
 */
export function conditionBarSnapshot(actor) {
  return {
    woundIndex: woundLevelIndex(actor.system?.wounds?.level),
    fatigueIndex: fatigueLevelIndex(actor.system?.fatigue?.level)
  };
}
