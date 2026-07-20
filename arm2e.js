import { ARM2E } from "./modules/config.js";
import { ArM2eCreationWizard } from "./modules/apps/creation-wizard.js";
import { ArM2eSeasonalActivityApp } from "./modules/apps/seasonal-activity-app.js";
import { registerCompendiumSeeding } from "./modules/compendium/seed.js";
import { registerActorDocumentHooks } from "./modules/documents/actor.js";
import { rollArM2e, rollSpellCast, rollSpontaneousCast } from "./modules/dice.js";
import { registerChatHooks } from "./modules/hooks/chat-hooks.js";
import { registerHotbarHooks } from "./modules/hooks/hotbar-hooks.js";
import { registerStatusHooks } from "./modules/hooks/status-hooks.js";
import { registerUiHooks } from "./modules/hooks/ui-hooks.js";
import { registerTemplateLoading } from "./modules/init/load-templates.js";
import { registerSheets } from "./modules/init/register-sheets.js";
import {
  registerAbilityMigration,
  registerMigrationSettings
} from "./modules/migrations/migrate-abilities-to-items.js";
import { promptAbilityRoll } from "./modules/utils/ability-rolls.js";
import { registerRulesPdfSettings } from "./modules/utils/journal.js";
import { executeHotbarRoll } from "./modules/utils/roll-macros.js";
import { promptSpontaneousCast } from "./modules/utils/spontaneous-cast.js";

const SYSTEM_ID = "ars-magica-2e";

console.log(`arm2e | Loading system module (${SYSTEM_ID})`);

Hooks.on("init", () => {
  console.log(`arm2e | init hook — world system is "${game.system?.id}"`);

  try {
    CONFIG.ARM2E = {
      ...ARM2E,
      roll: rollArM2e,
      rollSpellCast,
      rollSpontaneousCast,
      promptAbilityRoll,
      promptSpontaneousCast,
      executeHotbarRoll,
      CreationWizard: ArM2eCreationWizard,
      SeasonalActivityApp: ArM2eSeasonalActivityApp
    };

    registerRulesPdfSettings();
    registerActorDocumentHooks();
    registerMigrationSettings();
    registerCompendiumSeeding();
    registerTemplateLoading();
    registerUiHooks();
    registerStatusHooks();
    registerHotbarHooks();
    registerChatHooks();
    registerSheets();
    registerAbilityMigration();
    console.log("arm2e | init hook complete");
  } catch (error) {
    console.error("arm2e | init hook failed — sheets and wizard will not work", error);
    throw error;
  }
});

Hooks.once("ready", () => {
  const activeSystem = game.system?.id ?? "unknown";
  const activeVersion = game.system?.version ?? "unknown";
  const foundryVersion = game.version ?? "unknown";

  console.log(`arm2e | ready hook — active system "${activeSystem}" v${activeVersion} (Foundry ${foundryVersion})`);

  if (activeSystem !== SYSTEM_ID) {
    console.warn(
      `arm2e | This world is not using ${SYSTEM_ID}. ` +
      "Create or switch the world to Ars Magica 2nd Edition (Custom) to enable the character sheet and wizard."
    );
    return;
  }

  console.log(`arm2e | Ready — Ars Magica 2e v${activeVersion} on Foundry ${foundryVersion}`);
});
