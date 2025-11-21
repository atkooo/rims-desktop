/**
 * Utility untuk membersihkan dan menyederhanakan pesan error
 * Menghapus detail teknis dan memberikan pesan yang lebih user-friendly
 */

/**
 * Error message mappings - map error messages ke pesan yang lebih general
 */
const ERROR_MESSAGES = {
  // Cashier session errors - harus spesifik, jangan terlalu general
  "Sesi kasir belum dibuka": "Sesi kasir belum dibuka",
  "tidak memiliki otoritas": "Anda tidak memiliki otoritas untuk melakukan transaksi. Hanya kasir yang membuka sesi kasir yang berhak melakukan transaksi.",
  "cashier session": "Sesi kasir belum dibuka",
  
  // Stock errors
  "Stok tidak cukup": "Stok tidak cukup",
  "stock": "Stok tidak cukup",
  "quantity": "Stok tidak cukup",
  
  // Validation errors
  "tidak valid": "Data tidak valid",
  "harus diisi": "Data belum lengkap",
  "required": "Data belum lengkap",
  
  // Database errors
  "database": "Terjadi kesalahan pada database",
  "sqlite": "Terjadi kesalahan pada database",
  
  // Permission errors
  "permission": "Anda tidak memiliki izin untuk melakukan aksi ini",
  "unauthorized": "Anda tidak memiliki izin untuk melakukan aksi ini",
  
  // Transaction errors
  "transaksi": "Terjadi kesalahan pada transaksi",
  "transaction": "Terjadi kesalahan pada transaksi",
  
  // Payment errors
  "pembayaran": "Terjadi kesalahan pada pembayaran",
  "payment": "Terjadi kesalahan pada pembayaran",
};

/**
 * Membersihkan pesan error dari format IPC Electron
 * Contoh: "Error invoking remote method 'transactions:create': Error: Sesi kasir belum dibuka"
 * Menjadi: "Sesi kasir belum dibuka"
 */
function cleanErrorMessage(error) {
  if (!error) {
    return "Terjadi kesalahan. Silakan coba lagi.";
  }

  let message = error;

  // Jika error adalah object, ambil message-nya
  if (typeof error === "object") {
    message = error.message || error.toString() || "Terjadi kesalahan";
  }

  // Konversi ke string jika belum
  if (typeof message !== "string") {
    message = String(message);
  }

  // Hapus prefix "Error invoking remote method"
  message = message.replace(
    /Error invoking remote method ['"]([^'"]+)['"]:\s*/gi,
    ""
  );

  // Hapus prefix "Error:"
  message = message.replace(/^Error:\s*/i, "");

  // Hapus whitespace berlebihan
  message = message.trim();

  // Jika pesan masih mengandung detail teknis, cari pesan yang lebih sederhana
  if (message.length > 100 || message.includes("at ") || message.includes("stack")) {
    // Cari kata kunci untuk mapping
    const lowerMessage = message.toLowerCase();
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Jika masih terlalu panjang, ambil bagian pertama saja
    const sentences = message.split(/[.!?]/);
    if (sentences.length > 0 && sentences[0].length < 100) {
      return sentences[0].trim();
    }
    
    // Default: pesan generic
    return "Terjadi kesalahan. Silakan coba lagi.";
  }

  // Map ke pesan yang lebih user-friendly jika ada
  // Prioritas: cek mapping yang lebih spesifik dulu
  const lowerMessage = message.toLowerCase();
  
  // Jika pesan sudah cukup spesifik dan jelas (lebih dari 30 karakter), 
  // cek apakah ada mapping yang sangat spesifik yang cocok
  if (message.length > 30) {
    // Cek mapping yang sangat spesifik terlebih dahulu (yang lebih panjang)
    // Sort by key length descending untuk prioritas mapping yang lebih spesifik
    const sortedMappings = Object.entries(ERROR_MESSAGES).sort((a, b) => b[0].length - a[0].length);
    
    for (const [key, value] of sortedMappings) {
      // Untuk pesan panjang, hanya gunakan mapping yang cukup spesifik (lebih dari 15 karakter)
      // atau mapping yang exact match dengan pesan
      if (key.length > 15 && lowerMessage.includes(key.toLowerCase())) {
        // Jika mapping cocok, return value mapping
        return value;
      }
    }
    
    // Jika tidak ada mapping spesifik yang cocok, return pesan asli (jangan ubah)
    return message;
  }
  
  // Untuk pesan pendek, gunakan mapping seperti biasa
  // Sort by key length descending untuk prioritas mapping yang lebih spesifik
  const sortedMappings = Object.entries(ERROR_MESSAGES).sort((a, b) => b[0].length - a[0].length);
  
  for (const [key, value] of sortedMappings) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  return message;
}

/**
 * Mendapatkan pesan error yang sudah dibersihkan dan disederhanakan
 * @param {Error|string} error - Error object atau error message
 * @param {string} defaultMessage - Pesan default jika error tidak ditemukan
 * @returns {string} Pesan error yang sudah dibersihkan
 */
export function getErrorMessage(error, defaultMessage = "Terjadi kesalahan. Silakan coba lagi.") {
  const cleaned = cleanErrorMessage(error);
  
  // Jika setelah dibersihkan masih kosong, gunakan default message
  if (!cleaned || cleaned.trim() === "") {
    return defaultMessage;
  }
  
  return cleaned;
}

/**
 * Membuat pesan error yang lebih general berdasarkan tipe error
 * @param {Error|string} error - Error object atau error message
 * @param {string} context - Context dari error (misalnya: "menyimpan transaksi", "menghapus item")
 * @returns {string} Pesan error yang sudah diformat
 */
export function formatErrorMessage(error, context = null) {
  const cleaned = getErrorMessage(error);
  
  // Jika context diberikan dan pesan terlalu umum, tambahkan context
  if (context && cleaned === "Terjadi kesalahan. Silakan coba lagi.") {
    return `Gagal ${context}. Silakan coba lagi.`;
  }
  
  return cleaned;
}

