/**
 * Structured virtue/flaw creation grants (AG0201-first curation).
 *
 * ArM5 “+50 XP” virtues are adapted as +ARM5_XP50_AS_ABILITY_POINTS triangular
 * ability points with category / subgroup / key locks — not an XP engine.
 */

import { ABILITY_BY_KEY } from "../config/ability-registry.js";

/** Tunable: ArM5 +50 XP ≈ this many AG0201 ability points for curated grants. */
export const ARM5_XP50_AS_ABILITY_POINTS = 15;

/**
 * @typedef {{ key: string, category?: string, minScore?: number, free?: boolean }} AbilityGrant
 * @typedef {{ amount?: number, categories?: string[], subgroups?: string[], keys?: string[] }} AbilityPointPool
 * @typedef {{ abilities?: AbilityGrant[], abilityPoints?: AbilityPointPool }} VirtueGrants
 * @typedef {{
 *   abilityMins: Record<string, { key: string, category: string, minScore: number, free: boolean }>,
 *   pointPools: AbilityPointPool[]
 * }} CollectedGrants
 */

/**
 * @param {VirtueGrants | null | undefined} grants
 * @returns {{ hasGrants: boolean, abilities: string[], abilityPoints: string }}
 */
export function summarizeGrants(grants) {
  const abilities = [];
  for (const entry of grants?.abilities ?? []) {
    const key = String(entry?.key ?? "").trim();
    if (!key) continue;
    const def = ABILITY_BY_KEY[key];
    const label = def?.label ?? key;
    const min = Number(entry.minScore) || 1;
    abilities.push(`${label} ${min}`);
  }

  const amount = Number(grants?.abilityPoints?.amount) || 0;
  let abilityPoints = "";
  if (amount > 0) {
    const parts = [`+${amount}`];
    const categories = grants.abilityPoints?.categories ?? [];
    const subgroups = grants.abilityPoints?.subgroups ?? [];
    const keys = grants.abilityPoints?.keys ?? [];
    if (categories.length) parts.push(`categories: ${categories.join(", ")}`);
    if (subgroups.length) parts.push(`subgroups: ${subgroups.join(", ")}`);
    if (keys.length) parts.push(`keys: ${keys.join(", ")}`);
    abilityPoints = parts.join(" — ");
  }

  return {
    hasGrants: abilities.length > 0 || amount > 0,
    abilities,
    abilityPoints
  };
}

/**
 * @param {Iterable<{ system?: { grants?: VirtueGrants } } | VirtueGrants | null | undefined>} sources
 * @returns {CollectedGrants}
 */
export function collectVirtueGrants(sources) {
  /** @type {CollectedGrants} */
  const collected = {
    abilityMins: {},
    pointPools: []
  };

  for (const source of sources ?? []) {
    const grants = source?.system?.grants ?? source?.grants ?? source;
    if (!grants || typeof grants !== "object") continue;

    for (const entry of grants.abilities ?? []) {
      const key = String(entry?.key ?? "").trim();
      if (!key) continue;
      const def = ABILITY_BY_KEY[key];
      const category = entry.category || def?.category || "talents";
      const minScore = Math.max(0, Number(entry.minScore) || 1);
      const free = entry.free !== false;
      const existing = collected.abilityMins[key];
      if (!existing || minScore > existing.minScore) {
        collected.abilityMins[key] = { key, category, minScore, free };
      }
    }

    const pool = grants.abilityPoints;
    const amount = Number(pool?.amount) || 0;
    if (amount > 0) {
      collected.pointPools.push({
        amount,
        categories: [...(pool.categories ?? [])],
        subgroups: [...(pool.subgroups ?? [])],
        keys: [...(pool.keys ?? [])]
      });
    }
  }

  return collected;
}

/**
 * @param {CollectedGrants} grants
 * @returns {number}
 */
export function bonusAbilityPoints(grants) {
  return (grants?.pointPools ?? []).reduce((sum, pool) => sum + (Number(pool.amount) || 0), 0);
}

/**
 * Free ability floors from grants (only free:true mins).
 * @param {CollectedGrants} grants
 * @returns {Record<string, number>}
 */
export function getGrantAbilityBaseMap(grants) {
  /** @type {Record<string, number>} */
  const bases = {};
  for (const entry of Object.values(grants?.abilityMins ?? {})) {
    if (!entry.free) continue;
    bases[entry.key] = Math.max(bases[entry.key] ?? 0, entry.minScore);
  }
  return bases;
}

/**
 * Merge type starting bases with grant free mins (max per key).
 * @param {Record<string, number>} typeBases
 * @param {CollectedGrants} grants
 * @returns {Record<string, number>}
 */
export function mergeAbilityBaseMaps(typeBases = {}, grants) {
  const merged = { ...typeBases };
  for (const [key, value] of Object.entries(getGrantAbilityBaseMap(grants))) {
    merged[key] = Math.max(Number(merged[key]) || 0, value);
  }
  return merged;
}

/**
 * Raise ability scores to grant minimums. Does not lower scores above mins.
 * @param {object} abilityState
 * @param {CollectedGrants} grants
 * @returns {object}
 */
export function applyAbilityMins(abilityState, grants) {
  if (!abilityState) return abilityState;

  for (const entry of Object.values(grants?.abilityMins ?? {})) {
    const slot = abilityState[entry.category]?.[entry.key];
    if (!slot) continue;
    const current = Number(slot.value) || 0;
    if (current < entry.minScore) slot.value = entry.minScore;
  }

  return abilityState;
}

/**
 * When grants change, drop scores that were only at a removed grant floor back to type base.
 * @param {object} abilityState
 * @param {Record<string, number>} previousBases
 * @param {Record<string, number>} nextBases
 */
export function reconcileAbilityBases(abilityState, previousBases, nextBases) {
  if (!abilityState) return;

  const categories = ["talents", "skills", "knowledges"];
  const allKeys = new Set([...Object.keys(previousBases ?? {}), ...Object.keys(nextBases ?? {})]);

  for (const key of allKeys) {
    const prev = Number(previousBases?.[key]) || 0;
    const next = Number(nextBases?.[key]) || 0;
    if (next >= prev) continue;

    for (const category of categories) {
      const slot = abilityState[category]?.[key];
      if (!slot) continue;
      // Still sitting on the removed free floor — drop to the new floor.
      if ((Number(slot.value) || 0) === prev) slot.value = next;
    }
  }
}

/**
 * Whether an ability key may receive restricted (virtue bonus) points from a pool.
 * Unrestricted pool (no categories/subgroups/keys) matches everything.
 * Explicit keys OR (category + optional subgroup) filters.
 *
 * @param {string} key
 * @param {AbilityPointPool} pool
 * @returns {boolean}
 */
export function poolAllowsAbility(key, pool) {
  const def = ABILITY_BY_KEY[key];
  if (!def) return false;

  const categories = pool.categories ?? [];
  const subgroups = pool.subgroups ?? [];
  const keys = pool.keys ?? [];
  const unrestricted = !categories.length && !subgroups.length && !keys.length;
  if (unrestricted) return true;

  if (keys.includes(key)) return true;

  if (!categories.length && !subgroups.length) return false;

  if (categories.length && !categories.includes(def.category)) return false;
  if (subgroups.length && !subgroups.includes(def.subgroup)) return false;
  return categories.length > 0 || subgroups.length > 0;
}

/**
 * Incremental cost of ability scores that can be charged against restricted pools.
 * @param {object} abilityState
 * @param {Record<string, number>} bases
 * @param {AbilityPointPool[]} pools
 * @returns {number}
 */
export function restrictedAbilityPointsSpent(abilityState, bases, pools) {
  if (!pools?.length) return 0;

  let total = 0;
  for (const category of Object.values(abilityState ?? {})) {
    for (const [key, entry] of Object.entries(category ?? {})) {
      const value = Number(entry?.value) || 0;
      const base = Number(bases?.[key]) || 0;
      if (value <= base) continue;
      const allowed = pools.some((pool) => poolAllowsAbility(key, pool));
      if (!allowed) continue;
      // Triangular incremental cost above base — imported lazily via caller using triangularCost
      total += triangularDelta(value, base);
    }
  }
  return total;
}

/**
 * @param {number} value
 * @param {number} base
 * @returns {number}
 */
function triangularDelta(value, base) {
  return triangular(value) - triangular(base);
}

/**
 * @param {number} score
 * @returns {number}
 */
function triangular(score) {
  const value = Number(score) || 0;
  if (value === 0) return 0;
  const magnitude = Math.abs(value);
  const cost = (magnitude * (magnitude + 1)) / 2;
  return value > 0 ? cost : -cost;
}

/**
 * Points spent that must come from the unrestricted (age) budget.
 * Total spent minus the portion that fits in restricted pools (capped at pool totals).
 *
 * @param {number} totalSpent
 * @param {number} restrictedEligibleSpent
 * @param {number} restrictedBudget
 * @returns {{ unrestrictedSpent: number, restrictedSpent: number }}
 */
export function splitAbilitySpend(totalSpent, restrictedEligibleSpent, restrictedBudget) {
  const restrictedSpent = Math.min(
    Math.max(0, restrictedEligibleSpent),
    Math.max(0, restrictedBudget)
  );
  const unrestrictedSpent = Math.max(0, totalSpent - restrictedSpent);
  return { unrestrictedSpent, restrictedSpent };
}

/**
 * Helper to build a supernatural Ability virtue grant payload.
 * @param {string} key
 * @param {number} [minScore=1]
 * @returns {VirtueGrants}
 */
export function supernaturalAbilityGrant(key, minScore = 1) {
  const def = ABILITY_BY_KEY[key];
  return {
    abilities: [
      {
        key,
        category: def?.category ?? "talents",
        minScore,
        free: true
      }
    ],
    abilityPoints: { amount: 0, categories: [], subgroups: [], keys: [] }
  };
}

/**
 * Helper for +50 XP-style curated point pools.
 * @param {Partial<AbilityPointPool>} filters
 * @param {number} [amount=ARM5_XP50_AS_ABILITY_POINTS]
 * @returns {VirtueGrants}
 */
export function abilityPointGrant(filters = {}, amount = ARM5_XP50_AS_ABILITY_POINTS) {
  return {
    abilities: [],
    abilityPoints: {
      amount,
      categories: [...(filters.categories ?? [])],
      subgroups: [...(filters.subgroups ?? [])],
      keys: [...(filters.keys ?? [])]
    }
  };
}
