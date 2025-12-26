const logger = require('../helpers/logger');
const database = require('../helpers/database');
const syncCore = require('../sync-service/services/syncService');
const supabase = require('../sync-service/config/supabase');

/**
 * Sync rental transaction to sync service
 */
async function syncRentalTransaction(transactionId) {
  try {
    // Get transaction with details
    const transaction = await database.queryOne(
      `SELECT * FROM rental_transactions WHERE id = ?`,
      [transactionId]
    );

    if (!transaction) {
      throw new Error(`Rental transaction ${transactionId} not found`);
    }

    // Get transaction details
    const details = await database.query(
      `SELECT * FROM rental_transaction_details WHERE rental_transaction_id = ?`,
      [transactionId]
    );
    const result = await syncCore.syncRentalTransaction({ transaction, details });

    if (result.success) {
      // Update is_sync to 1
      await database.execute(
        `UPDATE rental_transactions SET is_sync = 1 WHERE id = ?`,
        [transactionId]
      );

      // Update details is_sync
      for (const detail of details) {
        await database.execute(
          `UPDATE rental_transaction_details SET is_sync = 1 WHERE id = ?`,
          [detail.id]
        );
      }

      logger.info(`Rental transaction ${transactionId} synced successfully`);
      return { success: true };
    } else {
      throw new Error(result.error || 'Sync failed');
    }
  } catch (error) {
    logger.error(`Error syncing rental transaction ${transactionId}:`, error);
    throw error;
  }
}

/**
 * Sync sales transaction to sync service
 */
async function syncSalesTransaction(transactionId) {
  try {
    // Get transaction with details
    const transaction = await database.queryOne(
      `SELECT * FROM sales_transactions WHERE id = ?`,
      [transactionId]
    );

    if (!transaction) {
      throw new Error(`Sales transaction ${transactionId} not found`);
    }

    // Get transaction details
    const details = await database.query(
      `SELECT * FROM sales_transaction_details WHERE sales_transaction_id = ?`,
      [transactionId]
    );

    logger.info(`Attempting to sync sales transaction ${transactionId} (direct mode)`);
    logger.info(`Transaction data:`, { 
      transaction_code: transaction.transaction_code,
      total_amount: transaction.total_amount,
      details_count: details.length 
    });

    const result = await syncCore.syncSalesTransaction({ transaction, details });
    logger.info(`Sync service response:`, result);

    if (result && result.success) {
      // Update is_sync to 1
      await database.execute(
        `UPDATE sales_transactions SET is_sync = 1 WHERE id = ?`,
        [transactionId]
      );

      // Update details is_sync
      for (const detail of details) {
        await database.execute(
          `UPDATE sales_transaction_details SET is_sync = 1 WHERE id = ?`,
          [detail.id]
        );
      }

      logger.info(`Sales transaction ${transactionId} synced successfully`);
      return { success: true };
    } else {
      const errorMsg = result.error || result.message || 'Sync failed';
      logger.error(`Sync failed for sales transaction ${transactionId}: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  } catch (error) {
    logger.error(`Error syncing sales transaction ${transactionId}:`, error);
    throw error;
  }
}

/**
 * Sync payment to sync service
 */
async function syncPayment(paymentId) {
  try {
    // Get payment from rental_payments first
    let payment = await database.queryOne(
      `SELECT *, 'rental' as transaction_type FROM rental_payments WHERE id = ?`,
      [paymentId]
    );
    
    let paymentTable = 'rental_payments';
    
    // If not found, try sales_payments
    if (!payment) {
      payment = await database.queryOne(
        `SELECT *, 'sales' as transaction_type FROM sales_payments WHERE id = ?`,
        [paymentId]
      );
      paymentTable = 'sales_payments';
    }

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const result = await syncCore.syncPayment(payment);

    if (result.success) {
      // Update is_sync to 1
      await database.execute(
        `UPDATE ${paymentTable} SET is_sync = 1 WHERE id = ?`,
        [paymentId]
      );

      logger.info(`Payment ${paymentId} synced successfully`);
      return { success: true };
    } else {
      throw new Error(result.error || 'Sync failed');
    }
  } catch (error) {
    logger.error(`Error syncing payment ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Sync stock movement to sync service
 */
async function syncStockMovement(movementId) {
  try {
    // Get stock movement
    const movement = await database.queryOne(
      `SELECT * FROM stock_movements WHERE id = ?`,
      [movementId]
    );

    if (!movement) {
      throw new Error(`Stock movement ${movementId} not found`);
    }

    const result = await syncCore.syncStockMovement(movement);

    if (result.success) {
      // Update is_sync to 1
      await database.execute(
        `UPDATE stock_movements SET is_sync = 1 WHERE id = ?`,
        [movementId]
      );

      logger.info(`Stock movement ${movementId} synced successfully`);
      return { success: true };
    } else {
      throw new Error(result.error || 'Sync failed');
    }
  } catch (error) {
    logger.error(`Error syncing stock movement ${movementId}:`, error);
    throw error;
  }
}

/**
 * Sync all pending transactions
 */
async function syncAllPending() {
  try {
    const results = {
      rental: { success: 0, failed: 0 },
      sales: { success: 0, failed: 0 },
      payments: { success: 0, failed: 0 },
      stockMovements: { success: 0, failed: 0 }
    };

    // Sync pending rental transactions
    const pendingRentals = await database.query(
      `SELECT id FROM rental_transactions WHERE is_sync = 0`
    );

    for (const rental of pendingRentals) {
      try {
        await syncRentalTransaction(rental.id);
        results.rental.success++;
      } catch (error) {
        results.rental.failed++;
        logger.error(`Failed to sync rental ${rental.id}:`, error);
      }
    }

    // Sync pending sales transactions
    const pendingSales = await database.query(
      `SELECT id FROM sales_transactions WHERE is_sync = 0`
    );

    for (const sale of pendingSales) {
      try {
        await syncSalesTransaction(sale.id);
        results.sales.success++;
        logger.info(`Successfully synced sales transaction ${sale.id}`);
      } catch (error) {
        results.sales.failed++;
        logger.error(`Failed to sync sales ${sale.id}:`, error);
        logger.error(`Error details: ${error.message}`);
        if (error.stack) {
          logger.error(`Stack trace: ${error.stack}`);
        }
      }
    }

    // Sync pending payments (both rental and sales)
    const pendingRentalPayments = await database.query(
      `SELECT id FROM rental_payments WHERE is_sync = 0`
    );
    const pendingSalesPayments = await database.query(
      `SELECT id FROM sales_payments WHERE is_sync = 0`
    );
    
    const pendingPayments = [...pendingRentalPayments, ...pendingSalesPayments];

    for (const payment of pendingPayments) {
      try {
        await syncPayment(payment.id);
        results.payments.success++;
      } catch (error) {
        results.payments.failed++;
        logger.error(`Failed to sync payment ${payment.id}:`, error);
      }
    }

    // Sync pending stock movements
    const pendingMovements = await database.query(
      `SELECT id FROM stock_movements WHERE is_sync = 0`
    );

    for (const movement of pendingMovements) {
      try {
        await syncStockMovement(movement.id);
        results.stockMovements.success++;
      } catch (error) {
        results.stockMovements.failed++;
        logger.error(`Failed to sync stock movement ${movement.id}:`, error);
      }
    }

    return results;
  } catch (error) {
    logger.error('Error syncing all pending:', error);
    throw error;
  }
}

/**
 * Check sync service status
 */
async function checkSyncServiceStatus() {
  try {
    let supabaseConnected = false;
    let supabaseError = null;

    try {
      const { error } = await supabase.from("rental_transactions").select("id").limit(1);

      if (error) {
        supabaseError = error.message || "Unknown Supabase error";
        logger.warn("Supabase connection test failed:", error);
      } else {
        supabaseConnected = true;
        logger.info("Supabase connection test successful");
      }
    } catch (configError) {
      supabaseError = configError.message || "Supabase configuration error";
      logger.error("Supabase configuration error:", configError);
    }

    return {
      success: true,
      status: {
        success: true,
        message: "Sync service is running",
        supabase: {
          connected: supabaseConnected,
          error: supabaseError,
        },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('Error checking sync service status:', error);
    // Return more detailed error information
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
}

module.exports = {
  syncRentalTransaction,
  syncSalesTransaction,
  syncPayment,
  syncStockMovement,
  syncAllPending,
  checkSyncServiceStatus,
};
