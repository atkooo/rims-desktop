/**
 * Utility functions for formatting
 */

/**
 * Format currency value
 */
function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

/**
 * Format date string
 */
function formatDate(dateString, options = {}) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("id-ID", { ...defaultOptions, ...options });
}

/**
 * Format date time string
 */
function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
};






