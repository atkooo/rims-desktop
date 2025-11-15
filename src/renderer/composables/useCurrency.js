/**
 * Composable untuk format mata uang (currency)
 * Menggunakan Intl.NumberFormat dengan locale id-ID dan currency IDR
 */

/**
 * Format value sebagai currency IDR
 * @param {number|string|null|undefined} value - Nilai yang akan diformat
 * @returns {string} String currency yang sudah diformat (contoh: "Rp 100.000")
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(value || 0);
}

/**
 * Composable untuk format currency dengan opsi tambahan
 * @returns {Object} Object berisi formatCurrency function
 */
export function useCurrency() {
  return {
    formatCurrency,
  };
}

