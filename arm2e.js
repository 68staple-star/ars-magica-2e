import { ARM2E } from "./modules/config.js";
import { registerActorDocumentHooks } from "./modules/documents/actor.js";
import { rollArM2e, rollSpellCast } from "./modules/dice.js";
import { ArM2eActorSheet } from "./modules/sheets/actor-sheet.js";

Hooks.on("init", () => {
  CONFIG.ARM2E = {
    ...ARM2E,
    roll: rollArM2e,
    rollSpellCast
  };

  registerActorDocumentHooks();

  Actors.registerSheet("ars-magica-2e", ArM2eActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "ARM2e Character Sheet"
  });
});
