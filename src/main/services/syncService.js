const https = require('https');
const http = require('http');
const { URL } = require('url');
const logger = require('../helpers/logger');
const database = require('../helpers/database');
const settingsUtils = require('../helpers/settingsUtils');

/**
 * Get sync service URL from settings or environment
 */
async function getSyncServiceUrl() {
  const settings = await settingsUtils.loadSettings();
  
  // Check environment variable first, then settings
  const syncServiceUrl = 
    process.env.SYNC_SERVICE_URL || 
    settings.sync?.service_url || 
    'http://localhost:3001';
  
  return syncServiceUrl;
}

/**
 * Check if error is retryable (transient error)
 */
function isRetryableError(error) {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  const errorCode = error.code;
  
  // Network errors that are typically transient
  const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN'];
  const retryableMessages = ['timeout', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'];
  
  // Check error code
  if (errorCode && retryableCodes.includes(errorCode)) {
    return true;
  }
  
  // Check error message
  if (errorMessage && retryableMessages.some(msg => errorMessage.includes(msg))) {
    return true;
  }
  
  // HTTP 5xx errors are retryable
  if (errorMessage && /HTTP 5\d{2}/.test(errorMessage)) {
    return true;
  }
  
  return false;
}

/**
 * Make HTTP request to sync service with retry support
 * @param {string} url - Request URL
 * @param {string} method - HTTP method (default: 'GET')
 * @param {object|null} data - Request body data (default: null)
 * @param {number} timeout - Request timeout in milliseconds (default: 10000)
 * @param {number} maxRetries - Maximum number of retries (default: 0, no retry)
 * @param {number} retryDelay - Delay between retries in milliseconds (default: 1000)
 */
async function makeRequest(url, method = 'GET', data = null, timeout = 10000, maxRetries = 0, retryDelay = 1000) {
  let lastError;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      return await new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: timeout,
        };

        if (data) {
          const jsonData = JSON.stringify(data);
          options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = client.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(parsed);
              } else {
                // Extract error message from response
                const errorMsg = parsed.error || parsed.message || `HTTP ${res.statusCode}: ${responseData}`;
                logger.error(`HTTP Error ${res.statusCode}: ${errorMsg}`);
                const error = new Error(errorMsg);
                error.statusCode = res.statusCode;
                reject(error);
              }
            } catch (error) {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(responseData);
              } else {
                const errorMsg = `HTTP ${res.statusCode}: ${responseData}`;
                logger.error(`HTTP Error ${res.statusCode}: ${errorMsg}`);
                const httpError = new Error(errorMsg);
                httpError.statusCode = res.statusCode;
                reject(httpError);
              }
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Request timeout after ${timeout}ms`));
        });

        if (data) {
          req.write(JSON.stringify(data));
        }

        req.end();
      });
    } catch (error) {
      lastError = error;
      
      // If not retryable or no more retries, throw error
      if (!isRetryableError(error) || attempt >= maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      logger.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  
  throw lastError;
}

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

    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/rental-transaction`;
    
    // Use longer timeout for sync operations (30 seconds) with retry (2 retries)
    const result = await makeRequest(url, 'POST', {
      transaction,
      details
    }, 30000, 2, 1000);

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

    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/sales-transaction`;
    
    logger.info(`Attempting to sync sales transaction ${transactionId} to ${url}`);
    logger.info(`Transaction data:`, { 
      transaction_code: transaction.transaction_code,
      total_amount: transaction.total_amount,
      details_count: details.length 
    });

    let result;
    try {
      // Use longer timeout for sync operations (30 seconds) with retry (2 retries)
      result = await makeRequest(url, 'POST', {
        transaction,
        details
      }, 30000, 2, 1000);
      logger.info(`Sync service response:`, result);
    } catch (requestError) {
      logger.error(`Request error for sales transaction ${transactionId}:`, requestError);
      throw new Error(`Failed to connect to sync service: ${requestError.message}. Pastikan sync service berjalan di port 3001.`);
    }

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
    // Get payment
    const payment = await database.queryOne(
      `SELECT * FROM payments WHERE id = ?`,
      [paymentId]
    );

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/payment`;
    
    // Use longer timeout for sync operations (30 seconds) with retry (2 retries)
    const result = await makeRequest(url, 'POST', payment, 30000, 2, 1000);

    if (result.success) {
      // Update is_sync to 1
      await database.execute(
        `UPDATE payments SET is_sync = 1 WHERE id = ?`,
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

    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/stock-movement`;
    
    // Use longer timeout for sync operations (30 seconds) with retry (2 retries)
    const result = await makeRequest(url, 'POST', movement, 30000, 2, 1000);

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

    // Sync pending payments
    const pendingPayments = await database.query(
      `SELECT id FROM payments WHERE is_sync = 0`
    );

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
    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/status`;
    
    // Use shorter timeout for status check (5 seconds)
    const result = await makeRequest(url, 'GET', null, 5000);
    return { success: true, status: result };
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

