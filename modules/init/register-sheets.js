import { ArM2eAbilitySheet } from "../sheets/ability-sheet.js";
import { ArM2eActorSheet } from "../sheets/actor-sheet.js";
import { ArM2eArmorSheet } from "../sheets/armor-sheet.js";
import { ArM2eBeastSheet } from "../sheets/beast-sheet.js";
import { ArM2eEquipmentSheet } from "../sheets/equipment-sheet.js";
import { ArM2eSpellSheet } from "../sheets/spell-sheet.js";
import { ArM2eVirtueFlawSheet } from "../sheets/virtue-flaw-sheet.js";
import { ArM2eWeaponSheet } from "../sheets/weapon-sheet.js";

/**
 * @returns {{ ActorSheet: typeof ActorSheet, ItemSheet: typeof ItemSheet }}
 */
function resolveAppV1Sheets() {
  const appV1 = foundry.appv1?.sheets;
  const ActorSheet = appV1?.ActorSheet ?? globalThis.ActorSheet;
  const ItemSheet = appV1?.ItemSheet ?? globalThis.ItemSheet;

  if (!ActorSheet || !ItemSheet) {
    throw new Error("arm2e | AppV1 ActorSheet/ItemSheet base classes are unavailable");
  }

  return { ActorSheet, ItemSheet };
}

/**
 * Register actor and item sheets for Foundry v11–v13.
 */
export function registerSheets() {
  const { Actors, Items } = foundry.documents.collections;
  const { DocumentSheetConfig } = foundry.applications.apps;
  const { ActorSheet, ItemSheet } = resolveAppV1Sheets();
  const systemId = game.system.id;

  if (systemId !== "ars-magica-2e") {
    console.warn(`arm2e | Skipping sheet registration — expected ars-magica-2e, got "${systemId}"`);
    return;
  }

  try {
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);
  } catch (error) {
    console.warn("arm2e | Core sheet unregister skipped", error);
  }

  Actors.registerSheet(systemId, ArM2eActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "ARM2e Character Sheet"
  });

  Actors.registerSheet(systemId, ArM2eBeastSheet, {
    types: ["beast"],
    makeDefault: true,
    label: "ARM2e Beast Sheet"
  });

  Items.registerSheet(systemId, ArM2eAbilitySheet, {
    types: ["ability"],
    makeDefault: true,
    label: "ARM2e Ability Sheet"
  });

  Items.registerSheet(systemId, ArM2eSpellSheet, {
    types: ["spell"],
    makeDefault: true,
    label: "ARM2e Spell Sheet"
  });

  Items.registerSheet(systemId, ArM2eWeaponSheet, {
    types: ["weapon"],
    makeDefault: true,
    label: "ARM2e Weapon Sheet"
  });

  Items.registerSheet(systemId, ArM2eVirtueFlawSheet, {
    types: ["virtueFlaw"],
    makeDefault: true,
    label: "ARM2e Virtue/Flaw Sheet"
  });

  Items.registerSheet(systemId, ArM2eArmorSheet, {
    types: ["armor"],
    makeDefault: true,
    label: "ARM2e Armor Sheet"
  });

  Items.registerSheet(systemId, ArM2eEquipmentSheet, {
    types: ["equipment"],
    makeDefault: true,
    label: "ARM2e Equipment Sheet"
  });

  DocumentSheetConfig.updateDefaultSheets?.();
  console.log(`arm2e | Registered sheets for ${systemId}`);
}
