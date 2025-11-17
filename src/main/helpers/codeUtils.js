/**
 * Utility functions for code normalization and generation
 */

/**
 * Normalize a code value, generating one from a name if needed
 * @param {string} value - The code value to normalize
 * @param {string} fallbackName - Name to use for code generation if value is empty
 * @param {string} prefix - Prefix for generated codes (default: 'ITM')
 * @returns {string} Normalized code
 */
function normalizeCode(value, fallbackName = "", prefix = "ITM") {
  let code = (value ?? "").toString().trim();
  if (code) return code.toUpperCase();
  if (!fallbackName) return `${prefix}-${Date.now()}`;
  const sanitized = fallbackName
    .toUpperCase()
    .replace(/[^0-9A-Z]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 20);
  return `${prefix}-${sanitized || Date.now()}`;
}

/**
 * Generate a transaction code based on type
 * @param {string} type - Transaction type ('RENTAL' or 'SALE')
 * @returns {string} Generated transaction code
 */
function generateTransactionCode(type) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  const prefix = type === "RENTAL" ? "RNT" : "SLS";
  return `${prefix}${year}${month}${day}${random}`;
}

/**
 * Convert value to integer, returning 0 if invalid
 * @param {any} value - Value to convert
 * @returns {number} Integer value
 */
function toInteger(value) {
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Sanitize available quantity to ensure it doesn't exceed stock quantity
 * @param {number} stock - Stock quantity
 * @param {number} available - Available quantity
 * @returns {number} Sanitized available quantity
 */
function sanitizeAvailable(stock, available) {
  const stockQty = Math.max(0, toInteger(stock));
  const availableQty = Math.max(0, toInteger(available));
  return Math.min(stockQty, availableQty);
}

/**
 * Get prefix for item code based on item type
 * @param {string} type - Item type ('RENTAL', 'SALE', 'BOTH')
 * @returns {string} Prefix for code
 */
function getItemCodePrefix(type) {
  const typeMap = {
    RENTAL: "RENT",
    SALE: "ITM",
    BOTH: "BOTH",
  };
  return typeMap[type] || "ITM";
}

/**
 * Generate sequential code with prefix
 * @param {Object} db - Database instance
 * @param {string} tableName - Table name to query
 * @param {string} prefix - Prefix for code (e.g., 'RENT', 'ITM', 'PAKET')
 * @returns {Promise<string>} Generated code
 */
async function generateSequentialCode(db, tableName, prefix) {
  // Get all codes with this prefix
  const codes = await db.query(
    `SELECT code FROM ${tableName} 
     WHERE code LIKE ? 
     ORDER BY id DESC`,
    [`${prefix}-%`]
  );

  let nextNumber = 1;
  
  if (codes && codes.length > 0) {
    // Find the highest number
    let maxNumber = 0;
    for (const row of codes) {
      const match = row.code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    nextNumber = maxNumber + 1;
  }

  // Format with leading zeros (001, 002, etc.)
  return `${prefix}-${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Generate item code based on type with sequential number
 * Requires database connection to get next sequence number
 * @param {Object} db - Database instance
 * @param {string} type - Item type ('RENTAL', 'SALE', 'BOTH')
 * @returns {Promise<string>} Generated code
 */
async function generateItemCode(db, type) {
  const prefix = getItemCodePrefix(type);
  return generateSequentialCode(db, "items", prefix);
}

/**
 * Generate bundle code with sequential number
 * @param {Object} db - Database instance
 * @returns {Promise<string>} Generated code (PAKET-001, PAKET-002, etc.)
 */
async function generateBundleCode(db) {
  return generateSequentialCode(db, "bundles", "PAKET");
}

module.exports = {
  normalizeCode,
  generateTransactionCode,
  toInteger,
  sanitizeAvailable,
  getItemCodePrefix,
  generateItemCode,
  generateBundleCode,
  generateSequentialCode,
};
