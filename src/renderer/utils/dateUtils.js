/**
 * Utility functions untuk format dan manipulasi tanggal
 */

/**
 * Convert date value ke format input date (YYYY-MM-DD)
 * @param {Date|string|number|null|undefined} value - Nilai tanggal yang akan dikonversi
 * @returns {string} String dalam format YYYY-MM-DD atau string kosong jika invalid
 */
export function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  
  // Gunakan local date untuk menghindari masalah timezone
  // Ambil tahun, bulan, hari dari local time bukan UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date string ke format Indonesia (DD/MM/YYYY)
 * @param {Date|string|number|null|undefined} value - Nilai tanggal yang akan diformat
 * @param {Object} options - Opsi tambahan untuk format
 * @returns {string} String tanggal yang sudah diformat atau "-" jika invalid
 */
export function formatDate(value, options = {}) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  
  const defaultOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };
  
  return date.toLocaleDateString("id-ID", defaultOptions);
}

/**
 * Format date string ke format singkat (DD/MM/YYYY)
 * @param {Date|string|number|null|undefined} value - Nilai tanggal yang akan diformat
 * @returns {string} String tanggal dalam format DD/MM/YYYY atau "-" jika invalid
 */
export function formatDateShort(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID");
}

/**
 * Format date dengan relative time (Hari ini, Kemarin, dll)
 * @param {Date|string|number|null|undefined} dateString - Nilai tanggal
 * @returns {string} String relative time atau tanggal yang sudah diformat
 */
export function formatDateRelative(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Hari ini";
  } else if (diffDays === 1) {
    return "Kemarin";
  } else if (diffDays < 7) {
    return `${diffDays} hari lalu`;
  } else {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

