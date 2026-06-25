/**
 * One-time migration from actor.system.abilities to embedded ability Items.
 */

import {
  buildAbilityItemData,
  getAbilityItems,
  isAbilityEntryPopulated
} from "../utils/abilities.js";
import { ARM2E } from "../config.js";

const SETTING_KEY = "abilitiesMigrated";

/**
 * Register migration setting.
 */
export function registerMigrationSettings() {
  game.settings.register("ars-magica-2e", SETTING_KEY, {
    name: "Abilities Migrated to Items",
    hint: "Internal flag — abilities stored as Item documents.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}

/**
 * @param {Actor} actor
 * @param {typeof ARM2E} registry
 */
async function migrateActorAbilities(actor, registry) {
  if (getAbilityItems(actor).length > 0) return;

  const legacy = actor.system?.abilities;
  if (!legacy) return;

  const toCreate = [];

  for (const definition of registry.ABILITY_ENTRIES) {
    const entry = legacy?.[definition.category]?.[definition.key];
    if (!entry || !isAbilityEntryPopulated(entry)) continue;

    toCreate.push({
      ...buildAbilityItemData(registry, definition),
      system: {
        category: definition.category,
        key: definition.key,
        value: Number(entry.value) || 0,
        xp: Number(entry.xp) || 0,
        specialty: entry.specialty ?? "",
        rollCharacteristic: definition.characteristic
      }
    });
  }

  if (!toCreate.length) return;

  await actor.createEmbeddedDocuments("Item", toCreate);
  console.log(`arm2e | Migrated ${toCreate.length} abilities to Items on ${actor.name}`);
}

/**
 * Run world migration once.
 */
export async function runAbilityMigration() {
  if (game.system.id !== "ars-magica-2e") return;
  if (!game.user.isGM) return;
  if (game.settings.get("ars-magica-2e", SETTING_KEY)) return;

  const registry = CONFIG.ARM2E ?? ARM2E;

  for (const actor of game.actors.contents) {
    if (actor.type !== "character") continue;

    try {
      await migrateActorAbilities(actor, registry);
    } catch (error) {
      console.error(`arm2e | Failed to migrate abilities for ${actor.name}`, error);
    }
  }

  await game.settings.set("ars-magica-2e", SETTING_KEY, true);
  console.log("arm2e | Ability Item migration complete");
}

/**
 * Register migration hook.
 */
export function registerAbilityMigration() {
  Hooks.once("ready", runAbilityMigration);
}
