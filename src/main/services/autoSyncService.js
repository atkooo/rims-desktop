const logger = require('../helpers/logger');
const settingsUtils = require('../helpers/settingsUtils');
const syncService = require('./syncService');

let autoSyncInterval = null;
let isRunning = false;

/**
 * Start auto sync service
 */
async function startAutoSync() {
  if (isRunning) {
    logger.warn('Auto sync is already running');
    return;
  }

  try {
    const settings = await settingsUtils.loadSettings();
    const autoSyncEnabled = settings.sync?.autoSyncEnabled ?? false;
    const autoSyncIntervalMs = settings.sync?.autoSyncInterval ?? 300000; // Default: 5 minutes

    if (!autoSyncEnabled) {
      logger.info('Auto sync is disabled in settings');
      return;
    }

    logger.info(`Starting auto sync with interval: ${autoSyncIntervalMs}ms (${autoSyncIntervalMs / 1000}s)`);
    
    // Schedule periodic sync
    autoSyncInterval = setInterval(async () => {
      await performAutoSync();
    }, autoSyncIntervalMs);
    
    // Run first sync after a short delay (5 seconds) to allow app to fully initialize
    setTimeout(async () => {
      await performAutoSync();
    }, 5000);

    isRunning = true;
    logger.info('Auto sync started successfully');
  } catch (error) {
    logger.error('Error starting auto sync:', error);
  }
}

/**
 * Stop auto sync service
 */
function stopAutoSync() {
  if (!isRunning) {
    return;
  }

  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  isRunning = false;
  logger.info('Auto sync stopped');
}

/**
 * Restart auto sync service (stop and start again)
 */
async function restartAutoSync() {
  logger.info('Restarting auto sync...');
  stopAutoSync();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await startAutoSync();
}

/**
 * Perform automatic sync
 */
async function performAutoSync() {
  try {
    logger.info('Starting automatic sync...');
    
    // Check if sync service is available
    const statusResult = await syncService.checkSyncServiceStatus();
    if (!statusResult.success) {
      logger.warn('Sync service is not available, skipping auto sync');
      return { success: false, error: 'Sync service not available' };
    }

    // Perform sync
    const results = await syncService.syncAllPending();
    
    const totalSuccess = 
      results.rental.success + 
      results.sales.success + 
      results.payments.success + 
      results.stockMovements.success;
    const totalFailed = 
      results.rental.failed + 
      results.sales.failed + 
      results.payments.failed + 
      results.stockMovements.failed;

    if (totalSuccess > 0 || totalFailed > 0) {
      logger.info(`Auto sync completed: ${totalSuccess} succeeded, ${totalFailed} failed`);
    } else {
      logger.info('Auto sync completed: No pending items to sync');
    }

    return { success: true, results };
  } catch (error) {
    logger.error('Error during auto sync:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get auto sync status
 */
function getAutoSyncStatus() {
  return {
    running: isRunning,
    hasInterval: autoSyncInterval !== null
  };
}

module.exports = {
  startAutoSync,
  stopAutoSync,
  restartAutoSync,
  performAutoSync,
  getAutoSyncStatus
};

