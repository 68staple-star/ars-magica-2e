import { ARM2E } from "./modules/config.js";
import { ArM2eCreationWizard } from "./modules/apps/creation-wizard.js";
import { registerCompendiumSeeding } from "./modules/compendium/seed.js";
import { registerActorDocumentHooks } from "./modules/documents/actor.js";
import { rollArM2e, rollSpellCast } from "./modules/dice.js";
import { registerUiHooks } from "./modules/hooks/ui-hooks.js";
import { registerTemplateLoading } from "./modules/init/load-templates.js";
import { registerSheets } from "./modules/init/register-sheets.js";

Hooks.on("init", () => {
  CONFIG.ARM2E = {
    ...ARM2E,
    roll: rollArM2e,
    rollSpellCast,
    CreationWizard: ArM2eCreationWizard
  };

  registerActorDocumentHooks();
  registerCompendiumSeeding();
  registerTemplateLoading();
  registerUiHooks();
  registerSheets();
});

Hooks.once("ready", () => {
  if (game.system.id !== "ars-magica-2e") return;
  console.log(`arm2e | Ready on Foundry ${game.version} — system v${game.system.version}`);
});
