import { COVENANT_SEASONS } from "./covenant.js";

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const SEASONAL_ACTIVITY_TYPES = Object.freeze([
  { id: "study", label: "Study" },
  { id: "lab", label: "Laboratory" },
  { id: "teach", label: "Teach / Train" },
  { id: "exposure", label: "Exposure" },
  { id: "adventure", label: "Adventure" },
  { id: "covenant", label: "Covenant Service" },
  { id: "other", label: "Other" }
]);

/**
 * @param {Actor} covenant
 * @returns {object}
 */
export function getSeasonalState(covenant) {
  const seasonal = covenant?.system?.seasonal ?? {};
  return {
    year: Number(seasonal.year) || Number(covenant?.system?.currentYear) || 1220,
    season: COVENANT_SEASONS.includes(seasonal.season)
      ? seasonal.season
      : (covenant?.system?.season || "Spring"),
    log: seasonal.log ?? "",
    activities: Array.isArray(seasonal.activities) ? seasonal.activities : []
  };
}

/**
 * @param {Partial<object>} [partial]
 * @returns {object}
 */
export function createSeasonalActivity(partial = {}) {
  return {
    id: foundry.utils.randomID(),
    actorUuid: partial.actorUuid ?? "",
    activity: partial.activity ?? "study",
    targetUuid: partial.targetUuid ?? "",
    summary: partial.summary ?? "",
    xpNote: partial.xpNote ?? "",
    resolved: Boolean(partial.resolved)
  };
}

/**
 * @param {Actor} covenant
 * @param {object[]} activities
 */
export async function setSeasonalActivities(covenant, activities) {
  const state = getSeasonalState(covenant);
  await covenant.update({
    "system.seasonal.year": state.year,
    "system.seasonal.season": state.season,
    "system.seasonal.log": state.log,
    "system.seasonal.activities": activities
  });
}

/**
 * Advance calendar season on the covenant (and seasonal planner).
 * @param {Actor} covenant
 * @param {{ clearResolved?: boolean }} [options]
 */
export async function advanceCovenantSeason(covenant, options = {}) {
  const state = getSeasonalState(covenant);
  const index = COVENANT_SEASONS.indexOf(state.season);
  const atEnd = index < 0 || index >= COVENANT_SEASONS.length - 1;
  const nextSeason = atEnd ? COVENANT_SEASONS[0] : COVENANT_SEASONS[index + 1];
  const nextYear = atEnd ? state.year + 1 : state.year;

  const remaining = options.clearResolved === false
    ? state.activities
    : state.activities.filter((entry) => !entry.resolved);

  const logLine = `${state.year} ${state.season} → ${nextYear} ${nextSeason}`;
  const log = state.log
    ? `${state.log}\n${logLine}`
    : logLine;

  await covenant.update({
    "system.season": nextSeason,
    "system.currentYear": nextYear,
    "system.seasonal.year": nextYear,
    "system.seasonal.season": nextSeason,
    "system.seasonal.activities": remaining,
    "system.seasonal.log": log
  });

  return { year: nextYear, season: nextSeason };
}

/**
 * Group covenant members for turb roster display.
 * @param {Actor[]} members
 * @returns {{ magi: Actor[], companions: Actor[], grogs: Actor[], other: Actor[] }}
 */
export function groupCovenantRoster(members) {
  const groups = { magi: [], companions: [], grogs: [], other: [] };
  for (const actor of members) {
    const type = actor.system?.identity?.characterType ?? "companion";
    if (type === "magus") groups.magi.push(actor);
    else if (type === "grog") groups.grogs.push(actor);
    else if (type === "companion") groups.companions.push(actor);
    else groups.other.push(actor);
  }
  return groups;
}
