const { ipcMain } = require("electron");
const activationService = require("../services/activation");
const logger = require("../helpers/logger");

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
      // Check if sync/activation is enabled in development
      const enableSyncAndActivation = process.env.ENABLE_SYNC_AND_ACTIVATION;
      const isEnabled = process.env.NODE_ENV === "production" || 
                       enableSyncAndActivation === "true" || 
                       enableSyncAndActivation === "1";
      
      if (!isEnabled && process.env.NODE_ENV === "development") {
        // Return active status without checking
        return {
          success: true,
          isActive: true,
          offline: false,
          error: null,
        };
      }
      
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
      return {
        success: false,
        error: "verification_failed",
        message: error.message,
      };
    }
  });

  logger.info("Activation handlers registered");
}

module.exports = setupActivationHandlers;

