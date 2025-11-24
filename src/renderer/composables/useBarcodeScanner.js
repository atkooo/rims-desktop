import { ref, onMounted, onUnmounted } from "vue";

/**
 * Composable untuk mendeteksi input dari barcode scanner
 * Barcode scanner biasanya mengirimkan input keyboard yang cepat diikuti dengan Enter
 */
export function useBarcodeScanner(options = {}) {
  const {
    onScan,
    minLength = 3, // Minimum panjang barcode
    maxLength = 50, // Maximum panjang barcode
    timeout = 100, // Timeout untuk mendeteksi scan (ms)
  } = options;

  const barcodeInput = ref("");
  const barcodeTimeout = ref(null);
  const isScanning = ref(false);
  const enabled = ref(options.enabled !== false); // Default true

  const handleKeyPress = (event) => {
    // Skip jika tidak enabled atau jika user sedang mengetik di input field
    if (!enabled.value) return;
    
    // Skip jika user sedang mengetik di input, textarea, atau select
    const target = event.target;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      // Hanya proses jika Enter ditekan (menandakan akhir scan)
      if (event.key === "Enter" && barcodeInput.value.length >= minLength) {
        event.preventDefault();
        processBarcode();
        return;
      }
      // Reset jika user mengetik manual
      if (event.key !== "Enter") {
        resetBarcode();
      }
      return;
    }

    // Deteksi input dari scanner (biasanya karakter alfanumerik)
    if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
      barcodeInput.value += event.key;
      isScanning.value = true;

      // Clear timeout sebelumnya
      if (barcodeTimeout.value) {
        clearTimeout(barcodeTimeout.value);
      }

      // Set timeout untuk mendeteksi akhir scan
      barcodeTimeout.value = setTimeout(() => {
        // Jika panjang barcode valid, proses
        if (
          barcodeInput.value.length >= minLength &&
          barcodeInput.value.length <= maxLength
        ) {
          processBarcode();
        } else {
          resetBarcode();
        }
      }, timeout);
    } else if (event.key === "Enter" && barcodeInput.value.length >= minLength) {
      // Enter ditekan, proses barcode
      event.preventDefault();
      processBarcode();
    } else if (event.key === "Escape") {
      // Escape untuk reset
      resetBarcode();
    }
  };

  const processBarcode = () => {
    const barcode = barcodeInput.value.trim();
    if (barcode && barcode.length >= minLength && barcode.length <= maxLength) {
      if (onScan) {
        onScan(barcode);
      }
    }
    resetBarcode();
  };

  const resetBarcode = () => {
    barcodeInput.value = "";
    isScanning.value = false;
    if (barcodeTimeout.value) {
      clearTimeout(barcodeTimeout.value);
      barcodeTimeout.value = null;
    }
  };

  const enable = () => {
    enabled.value = true;
  };

  const disable = () => {
    enabled.value = false;
    resetBarcode();
  };

  onMounted(() => {
    if (enabled.value) {
      window.addEventListener("keydown", handleKeyPress);
    }
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyPress);
    if (barcodeTimeout.value) {
      clearTimeout(barcodeTimeout.value);
    }
  });

  return {
    barcodeInput,
    isScanning,
    enable,
    disable,
    reset: resetBarcode,
  };
}

