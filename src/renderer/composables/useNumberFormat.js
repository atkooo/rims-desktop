import { ref } from "vue";

/**
 * Composable untuk format angka dengan separator titik (100000 -> "100.000")
 * Data yang disimpan tetap angka normal, hanya UI yang diformat
 * 
 * @param {Object} options - Konfigurasi
 * @param {Function} options.onChange - Callback saat nilai berubah (optional)
 * @returns {Object} Object berisi fungsi format, parse, dan handler
 */
export function useNumberFormat(options = {}) {
  const { onChange } = options;

  /**
   * Format number untuk display (100000 -> "100.000")
   * @param {number|string} value - Nilai yang akan diformat
   * @returns {string} String yang sudah diformat
   */
  const formatNumberInput = (value) => {
    if (!value && value !== 0) return "";
    const numValue =
      typeof value === "string"
        ? parseFloat(value.replace(/\./g, ""))
        : value;
    if (isNaN(numValue) || numValue < 0) return "";
    // Format dengan separator titik setiap 3 digit
    return Math.floor(numValue)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  /**
   * Parse formatted number ke actual number ("100.000" -> 100000)
   * @param {string} value - String yang akan diparse
   * @returns {number} Angka normal
   */
  const parseNumberInput = (value) => {
    if (!value) return 0;
    // Hapus semua karakter non-angka
    const cleaned = value.toString().replace(/[^\d]/g, "");
    if (!cleaned) return 0;
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Handler untuk input event
   * @param {Event} event - Input event
   * @param {Function} setValue - Function untuk set nilai (biasanya form.field = value)
   * @returns {number} Nilai yang sudah diparse
   */
  const handleNumberInput = (event, setValue) => {
    const inputValue = event.target.value;
    // Hanya izinkan angka dan titik
    const filtered = inputValue.replace(/[^\d.]/g, "");
    const parsed = parseNumberInput(filtered);
    
    if (setValue) {
      setValue(parsed);
    }
    
    if (onChange) {
      onChange(parsed);
    }
    
    return parsed;
  };

  /**
   * Membuat handler untuk field tertentu
   * @param {Function} setValue - Function untuk set nilai
   * @returns {Function} Handler function untuk input event
   */
  const createInputHandler = (setValue) => {
    return (event) => handleNumberInput(event, setValue);
  };

  return {
    formatNumberInput,
    parseNumberInput,
    handleNumberInput,
    createInputHandler,
  };
}

