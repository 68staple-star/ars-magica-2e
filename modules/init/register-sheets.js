import { ArM2eActorSheet } from "../sheets/actor-sheet.js";
import { ArM2eArmorSheet } from "../sheets/armor-sheet.js";
import { ArM2eEquipmentSheet } from "../sheets/equipment-sheet.js";
import { ArM2eSpellSheet } from "../sheets/spell-sheet.js";
import { ArM2eVirtueFlawSheet } from "../sheets/virtue-flaw-sheet.js";
import { ArM2eWeaponSheet } from "../sheets/weapon-sheet.js";

/**
 * Register actor and item sheets for Foundry v11–v13.
 */
export function registerSheets() {
  const { Actors, Items } = foundry.documents.collections;
  const { ActorSheet, ItemSheet } = foundry.appv1.sheets;
  const { DocumentSheetConfig } = foundry.applications.apps;
  const systemId = game.system.id;

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
