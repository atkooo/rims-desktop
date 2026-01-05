/**
 * Helper functions for payment queries
 * Uses split tables (sales_payments, rental_payments)
 */

const database = require("./database");

/**
 * Get payment table name based on transaction type
 * @param {string} transactionType - 'rental' or 'sale'
 * @returns {string} Table name
 */
function getPaymentTable(transactionType) {
  return transactionType === "rental" ? "rental_payments" : "sales_payments";
}

/**
 * Query payments for a transaction
 * @param {string} transactionType - 'rental' or 'sale'
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<Array>} Array of payments
 */
async function getPaymentsByTransaction(transactionType, transactionId) {
  try {
    // Try new table first
    const paymentTable = getPaymentTable(transactionType);
    const payments = await database.query(
      `SELECT *, ? as transaction_type FROM ${paymentTable} WHERE transaction_id = ? ORDER BY payment_date DESC`,
      [transactionType, transactionId],
    );
    
    return payments;
  } catch (error) {
    throw error;
  }
}

/**
 * Get total paid amount for a transaction
 * @param {string} transactionType - 'rental' or 'sale'
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<number>} Total paid amount
 */
async function getTotalPaid(transactionType, transactionId) {
  try {
    const paymentTable = getPaymentTable(transactionType);
    const result = await database.queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM ${paymentTable} WHERE transaction_id = ?`,
      [transactionId],
    );
    return result?.total || 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all payments (for reports, etc) - combines both tables
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of payments
 */
async function getAllPayments(filters = {}) {
  try {
    // Try new tables
    const rentalPayments = await database.query(
      `SELECT *, 'rental' as transaction_type FROM rental_payments WHERE 1=1
       ${filters.startDate ? "AND payment_date >= ?" : ""}
       ${filters.endDate ? "AND payment_date <= ?" : ""}
       ORDER BY payment_date DESC`,
      filters.startDate && filters.endDate 
        ? [filters.startDate, filters.endDate]
        : filters.startDate 
        ? [filters.startDate]
        : filters.endDate
        ? [filters.endDate]
        : [],
    );
    
    const salesPayments = await database.query(
      `SELECT *, 'sale' as transaction_type FROM sales_payments WHERE 1=1
       ${filters.startDate ? "AND payment_date >= ?" : ""}
       ${filters.endDate ? "AND payment_date <= ?" : ""}
       ORDER BY payment_date DESC`,
      filters.startDate && filters.endDate 
        ? [filters.startDate, filters.endDate]
        : filters.startDate 
        ? [filters.startDate]
        : filters.endDate
        ? [filters.endDate]
        : [],
    );
    
    return [...rentalPayments, ...salesPayments].sort((a, b) => 
      new Date(b.payment_date) - new Date(a.payment_date)
    );
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getPaymentTable,
  getPaymentsByTransaction,
  getTotalPaid,
  getAllPayments,
};

