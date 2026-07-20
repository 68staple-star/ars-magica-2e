import {
  buildConditionStatusEffects,
  syncConditionEffects,
  syncConditionTracks
} from "../utils/token-status.js";

/**
 * Register wound/fatigue status effects and keep token icons/bars in sync.
 */
export function registerStatusHooks() {
  const custom = buildConditionStatusEffects();
  const existingIds = new Set((CONFIG.statusEffects ?? []).map((entry) => entry.id));
  for (const effect of custom) {
    if (!existingIds.has(effect.id)) CONFIG.statusEffects.push(effect);
  }

  Hooks.on("updateActor", async (actor, changed, options) => {
    if (game.system.id !== "ars-magica-2e") return;
    if (actor.type !== "character") return;
    if (options?.arm2eSyncTracks || options?.arm2eSyncEffects) return;

    const tracksTouched = foundry.utils.hasProperty(changed, "system.wounds")
      || foundry.utils.hasProperty(changed, "system.fatigue");
    if (!tracksTouched) return;

    await syncConditionTracks(actor, changed);
    await syncConditionEffects(actor);
  });

  Hooks.on("createActor", async (actor) => {
    if (game.system.id !== "ars-magica-2e") return;
    if (actor.type !== "character" || !actor.isOwner) return;
    await syncConditionTracks(actor);
    await syncConditionEffects(actor);
  });
}
