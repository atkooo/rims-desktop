const logger = require("../helpers/logger");
let syncServiceStatus = {
  running: false,
  port: null,
  pid: null,
  startTime: null,
  lastError: null,
  url: null,
  external: false,
  mode: "direct",
};

async function startSyncService() {
  if (syncServiceStatus.running) {
    logger.info("Sync service is already running");
    return { success: true, message: "Service already running", status: { ...syncServiceStatus } };
  }

  try {
    syncServiceStatus.running = true;
    syncServiceStatus.startTime = new Date().toISOString();
    syncServiceStatus.lastError = null;
    logger.info("Sync service running in direct mode (no HTTP server)");

    return {
      success: true,
      message: "Sync service ready (direct mode)",
      status: { ...syncServiceStatus },
    };
  } catch (error) {
    syncServiceStatus.lastError = error.message;
    return { success: false, error: error.message };
  }
}

async function stopSyncService() {
  try {
    syncServiceStatus.running = false;
    syncServiceStatus.pid = null;
    syncServiceStatus.startTime = null;
    syncServiceStatus.lastError = null;
    syncServiceStatus.external = false;

    logger.info("Sync service stopped (direct mode)");
    return { success: true, message: "Sync service stopped", status: { ...syncServiceStatus } };
  } catch (error) {
    logger.error("Error stopping sync service:", error);
    return { success: false, error: error.message };
  }
}

function getSyncServiceStatus() {
  return { ...syncServiceStatus };
}

module.exports = {
  startSyncService,
  stopSyncService,
  getSyncServiceStatus,
};

