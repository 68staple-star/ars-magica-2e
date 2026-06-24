import { ARM2E } from "./modules/config.js";
import { ArM2eCreationWizard } from "./modules/apps/creation-wizard.js";
import { registerCompendiumSeeding } from "./modules/compendium/seed.js";
import { registerActorDocumentHooks } from "./modules/documents/actor.js";
import { rollArM2e, rollSpellCast } from "./modules/dice.js";
import { ArM2eActorSheet } from "./modules/sheets/actor-sheet.js";
import { ArM2eArmorSheet } from "./modules/sheets/armor-sheet.js";
import { ArM2eEquipmentSheet } from "./modules/sheets/equipment-sheet.js";
import { ArM2eSpellSheet } from "./modules/sheets/spell-sheet.js";
import { ArM2eVirtueFlawSheet } from "./modules/sheets/virtue-flaw-sheet.js";
import { ArM2eWeaponSheet } from "./modules/sheets/weapon-sheet.js";

Hooks.on("init", () => {
  CONFIG.ARM2E = {
    ...ARM2E,
    roll: rollArM2e,
    rollSpellCast,
    CreationWizard: ArM2eCreationWizard
  };

  registerActorDocumentHooks();
  registerCompendiumSeeding();

  Actors.registerSheet("ars-magica-2e", ArM2eActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "ARM2e Character Sheet"
  });

  Items.registerSheet("ars-magica-2e", ArM2eSpellSheet, {
    types: ["spell"],
    makeDefault: true,
    label: "ARM2e Spell Sheet"
  });

  Items.registerSheet("ars-magica-2e", ArM2eWeaponSheet, {
    types: ["weapon"],
    makeDefault: true,
    label: "ARM2e Weapon Sheet"
  });

  Items.registerSheet("ars-magica-2e", ArM2eVirtueFlawSheet, {
    types: ["virtueFlaw"],
    makeDefault: true,
    label: "ARM2e Virtue/Flaw Sheet"
  });

  Items.registerSheet("ars-magica-2e", ArM2eArmorSheet, {
    types: ["armor"],
    makeDefault: true,
    label: "ARM2e Armor Sheet"
  });

  Items.registerSheet("ars-magica-2e", ArM2eEquipmentSheet, {
    types: ["equipment"],
    makeDefault: true,
    label: "ARM2e Equipment Sheet"
  });
});
