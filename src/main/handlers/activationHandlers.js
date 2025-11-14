const { ipcMain } = require("electron");
const activationService = require("../services/activation");
const logger = require("../helpers/logger");

let activationStatusCallback = null;

function setupActivationHandlers() {
  // Get machine ID
  ipcMain.handle("activation:getMachineId", async () => {
    try {
      const machineId = await activationService.getOrGenerateMachineId();
      return { success: true, machineId };
    } catch (error) {
      logger.error("Error getting machine ID:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Check activation status
  ipcMain.handle("activation:checkStatus", async (event, forceRefresh = false) => {
    try {
      const status = await activationService.checkActivationStatus(forceRefresh);
      return {
        success: true,
        ...status,
      };
    } catch (error) {
      logger.error("Error checking activation status:", error);
      return {
        success: false,
        error: error.message,
        isActive: false,
      };
    }
  });

  // Verify activation
  ipcMain.handle("activation:verify", async () => {
    try {
      return await activationService.verifyActivation();
    } catch (error) {
      logger.error("Error verifying activation:", error);
      return { success: false, error: "verification_failed", message: error.message };
    }
  });

  // Register callback for activation status changes
  ipcMain.handle("activation:registerStatusCallback", (event) => {
    // Note: This is a placeholder. In practice, we'll use periodic checks
    // and the renderer can poll or listen for status updates
    activationStatusCallback = (status) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("activation:statusChanged", status);
      }
    };
    return { success: true };
  });

  logger.info("Activation handlers registered");
}

module.exports = setupActivationHandlers;

