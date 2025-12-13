const { ipcMain } = require('electron');
const syncService = require('../services/syncService');
const syncServiceManager = require('../services/syncServiceManager');
const autoSyncService = require('../services/autoSyncService');
const logger = require('../helpers/logger');
const settingsUtils = require('../helpers/settingsUtils');

function setupSyncHandlers() {
  /**
   * Sync rental transaction
   */
  ipcMain.handle('sync:rental-transaction', async (event, transactionId) => {
    try {
      const result = await syncService.syncRentalTransaction(transactionId);
      return result;
    } catch (error) {
      logger.error('Error in sync:rental-transaction handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Sync sales transaction
   */
  ipcMain.handle('sync:sales-transaction', async (event, transactionId) => {
    try {
      const result = await syncService.syncSalesTransaction(transactionId);
      return result;
    } catch (error) {
      logger.error('Error in sync:sales-transaction handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Sync payment
   */
  ipcMain.handle('sync:payment', async (event, paymentId) => {
    try {
      const result = await syncService.syncPayment(paymentId);
      return result;
    } catch (error) {
      logger.error('Error in sync:payment handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Sync stock movement
   */
  ipcMain.handle('sync:stock-movement', async (event, movementId) => {
    try {
      const result = await syncService.syncStockMovement(movementId);
      return result;
    } catch (error) {
      logger.error('Error in sync:stock-movement handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Sync all pending transactions
   */
  ipcMain.handle('sync:all-pending', async (event) => {
    try {
      const result = await syncService.syncAllPending();
      return { success: true, results: result };
    } catch (error) {
      logger.error('Error in sync:all-pending handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Check sync service status
   */
  ipcMain.handle('sync:check-status', async (event) => {
    try {
      const result = await syncService.checkSyncServiceStatus();
      return result;
    } catch (error) {
      logger.error('Error in sync:check-status handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Start sync service process
   */
  ipcMain.handle('sync-service:start', async (event) => {
    try {
      const result = await syncServiceManager.startSyncService();
      return result;
    } catch (error) {
      logger.error('Error in sync-service:start handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Stop sync service process
   */
  ipcMain.handle('sync-service:stop', async (event) => {
    try {
      const result = await syncServiceManager.stopSyncService();
      return result;
    } catch (error) {
      logger.error('Error in sync-service:stop handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Restart sync service process
   */
  ipcMain.handle('sync-service:restart', async (event) => {
    try {
      const result = await syncServiceManager.restartSyncService();
      return result;
    } catch (error) {
      logger.error('Error in sync-service:restart handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get sync service process status
   */
  ipcMain.handle('sync-service:get-status', async (event) => {
    try {
      const status = syncServiceManager.getSyncServiceStatus();
      return { success: true, status };
    } catch (error) {
      logger.error('Error in sync-service:get-status handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get pending sync statistics
   */
  ipcMain.handle('sync:get-pending-stats', async (event) => {
    try {
      const database = require('../helpers/database');
      
      const pendingRentalsResult = await database.query(
        'SELECT COUNT(*) as count FROM rental_transactions WHERE is_sync = 0'
      );
      const pendingSalesResult = await database.query(
        'SELECT COUNT(*) as count FROM sales_transactions WHERE is_sync = 0'
      );
      const pendingRentalPaymentsResult = await database.query(
        'SELECT COUNT(*) as count FROM rental_payments WHERE is_sync = 0'
      );
      const pendingSalesPaymentsResult = await database.query(
        'SELECT COUNT(*) as count FROM sales_payments WHERE is_sync = 0'
      );
      const pendingPaymentsResult = {
        count: (pendingRentalPaymentsResult?.[0]?.count || 0) + (pendingSalesPaymentsResult?.[0]?.count || 0)
      };
      const pendingStockMovementsResult = await database.query(
        'SELECT COUNT(*) as count FROM stock_movements WHERE is_sync = 0'
      );

      const pendingRentals = pendingRentalsResult && pendingRentalsResult.length > 0 ? pendingRentalsResult[0] : { count: 0 };
      const pendingSales = pendingSalesResult && pendingSalesResult.length > 0 ? pendingSalesResult[0] : { count: 0 };
      const pendingPayments = pendingPaymentsResult && pendingPaymentsResult.length > 0 ? pendingPaymentsResult[0] : { count: 0 };
      const pendingStockMovements = pendingStockMovementsResult && pendingStockMovementsResult.length > 0 ? pendingStockMovementsResult[0] : { count: 0 };

      return {
        success: true,
        stats: {
          pendingRentals: pendingRentals.count || 0,
          pendingSales: pendingSales.count || 0,
          pendingPayments: pendingPayments.count || 0,
          pendingStockMovements: pendingStockMovements.count || 0
        }
      };
    } catch (error) {
      logger.error('Error in sync:get-pending-stats handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get auto sync status
   */
  ipcMain.handle('auto-sync:get-status', async (event) => {
    try {
      const status = autoSyncService.getAutoSyncStatus();
      const settings = await settingsUtils.loadSettings();
      return {
        success: true,
        status: {
          ...status,
          enabled: settings.sync?.autoSyncEnabled ?? false,
          interval: settings.sync?.autoSyncInterval ?? 300000
        }
      };
    } catch (error) {
      logger.error('Error in auto-sync:get-status handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Start auto sync
   */
  ipcMain.handle('auto-sync:start', async (event) => {
    try {
      await autoSyncService.startAutoSync();
      return { success: true };
    } catch (error) {
      logger.error('Error in auto-sync:start handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Stop auto sync
   */
  ipcMain.handle('auto-sync:stop', async (event) => {
    try {
      autoSyncService.stopAutoSync();
      return { success: true };
    } catch (error) {
      logger.error('Error in auto-sync:stop handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Restart auto sync
   */
  ipcMain.handle('auto-sync:restart', async (event) => {
    try {
      await autoSyncService.restartAutoSync();
      return { success: true };
    } catch (error) {
      logger.error('Error in auto-sync:restart handler:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update auto sync settings
   */
  ipcMain.handle('auto-sync:update-settings', async (event, { enabled, interval }) => {
    try {
      const fs = require('fs').promises;
      const { getSettingsFile } = require('../helpers/pathUtils');
      
      // Load current settings
      let settings = {};
      const settingsFile = getSettingsFile();
      try {
        const data = await fs.readFile(settingsFile, 'utf8');
        settings = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn('Could not read existing settings:', error);
        }
      }

      // Update sync settings
      if (!settings.sync) {
        settings.sync = {
          autoSyncEnabled: false,
          autoSyncInterval: 300000, // Default: 5 minutes
        };
      }
      
      if (enabled !== undefined) {
        settings.sync.autoSyncEnabled = enabled;
      }
      
      if (interval !== undefined) {
        settings.sync.autoSyncInterval = interval;
      }

      // Save settings
      await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
      logger.info('Auto sync settings updated');

      // Restart auto sync if settings changed
      await autoSyncService.restartAutoSync();

      return { success: true };
    } catch (error) {
      logger.error('Error in auto-sync:update-settings handler:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupSyncHandlers };

