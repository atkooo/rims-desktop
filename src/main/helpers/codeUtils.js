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

module.exports = {
  normalizeCode,
  generateTransactionCode,
  toInteger,
};

