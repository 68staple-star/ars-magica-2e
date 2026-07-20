import { createHotbarRollMacro, isArm2eRollDrag } from "../utils/roll-macros.js";

/**
 * Register hotbar drop handling for ArM2e roll macros.
 */
export function registerHotbarHooks() {
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (game.system.id !== "ars-magica-2e") return;
    if (!isArm2eRollDrag(data)) return;

    createHotbarRollMacro(data, slot).catch((error) => {
      console.error("arm2e | Failed to create hotbar roll macro", error);
      ui.notifications.error("Could not create ArM2e roll macro.");
    });

    // Prevent Foundry from creating a default document macro.
    return false;
  });
}
