<template>
  <AppDialog
    v-model="visible"
    title="Preview Struk"
    :show-footer="true"
    confirm-text="Cetak"
    cancel-text="Batal"
    :loading="loading || printing"
    @confirm="handlePrint"
    :max-width="900"
  >
    <div class="receipt-preview-dialog">
      <!-- Settings Panel -->
      <div class="settings-panel">
        <h4 class="settings-title">Pengaturan Tampilan</h4>
        <div class="settings-grid">
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showCompanyName" />
            <span>Nama Toko</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showAddress" />
            <span>Alamat</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showPhone" />
            <span>Telepon</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showCustomerInfo" />
            <span>Info Pelanggan</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showTransactionCode" />
            <span>Kode Transaksi</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showDate" />
            <span>Tanggal</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showCashier" />
            <span>Kasir</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showItems" />
            <span>Item</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showSubtotal" />
            <span>Subtotal</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showDiscount" />
            <span>Diskon</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showTax" />
            <span>Pajak</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showTotal" />
            <span>Total</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showPaymentInfo" />
            <span>Info Pembayaran</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showNotes" />
            <span>Catatan</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="receiptSettings.showFooter" />
            <span>Footer</span>
          </label>
        </div>
        <div class="settings-actions">
          <AppButton variant="secondary" size="small" @click="refreshPreview">
            <i class="fas fa-sync-alt"></i> Refresh Preview
          </AppButton>
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="preview-panel">
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Memuat preview...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>{{ error }}</p>
        </div>
        <div v-else-if="previewUrl" class="preview-content">
          <embed :src="previewUrl" type="application/pdf" class="pdf-preview" />
        </div>
        <div v-else class="empty-state">
          <p>Preview tidak tersedia</p>
        </div>
      </div>
    </div>

    <!-- Printer Selection (shown when print button is clicked) -->
    <PrinterSelectDialog
      v-model="showPrinterDialog"
      @print="handlePrintToPrinter"
    />
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onUnmounted } from "vue";
import AppDialog from "./AppDialog.vue";
import AppButton from "./AppButton.vue";
import PrinterSelectDialog from "./PrinterSelectDialog.vue";
import { ipcRenderer } from "@/services/ipc";

export default {
  name: "ReceiptPreviewDialog",
  components: {
    AppDialog,
    AppButton,
    PrinterSelectDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: [Number, String],
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      validator: (value) => ["sale", "rental"].includes(value),
    },
  },
  emits: ["update:modelValue", "printed"],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const loading = ref(false);
    const printing = ref(false);
    const error = ref("");
    const previewUrl = ref("");
    const previewBlobUrl = ref("");
    const showPrinterDialog = ref(false);

    const receiptSettings = ref({
      showCompanyName: true,
      showAddress: true,
      showPhone: true,
      showCustomerInfo: true,
      showTransactionCode: true,
      showDate: true,
      showCashier: true,
      showItems: true,
      showSubtotal: true,
      showDiscount: true,
      showTax: true,
      showTotal: true,
      showPaymentInfo: true,
      showNotes: true,
      showFooter: true,
    });

    // Load default settings from saved settings
    const loadDefaultSettings = async () => {
      try {
        const settings = await ipcRenderer.invoke("settings:get");
        if (settings && settings.receiptSettings) {
          receiptSettings.value = { ...receiptSettings.value, ...settings.receiptSettings };
        }
      } catch (err) {
        console.warn("Could not load receipt settings:", err);
      }
    };

    // Generate preview
    const generatePreview = async () => {
      if (!props.transactionId || !props.transactionType) {
        error.value = "Data transaksi tidak lengkap";
        return;
      }

      loading.value = true;
      error.value = "";
      
      // Clean up previous blob URL
      if (previewBlobUrl.value) {
        URL.revokeObjectURL(previewBlobUrl.value);
        previewBlobUrl.value = "";
      }
      previewUrl.value = "";

      try {
        // Convert reactive objects to plain objects for IPC
        const receiptSettingsPlain = JSON.parse(JSON.stringify(receiptSettings.value));
        
        const result = await ipcRenderer.invoke("receipt:generate", {
          transactionId: props.transactionId,
          transactionType: props.transactionType,
          receiptSettings: receiptSettingsPlain,
        });

        if (result.success) {
          // Always use blob URL for PDF preview (file:// URLs are blocked by browsers)
          if (result.pdfBase64) {
            try {
              // Extract base64 data from data URI
              const base64Data = result.pdfBase64.split(',')[1] || result.pdfBase64;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/pdf' });
              previewBlobUrl.value = URL.createObjectURL(blob);
              previewUrl.value = previewBlobUrl.value;
            } catch (blobError) {
              console.error("Error creating blob URL:", blobError);
              error.value = "Gagal memuat preview PDF";
            }
          } else {
            error.value = "Gagal menghasilkan preview";
          }
        } else {
          error.value = "Gagal menghasilkan preview";
        }
      } catch (err) {
        console.error("Error generating preview:", err);
        error.value = err.message || "Gagal memuat preview";
      } finally {
        loading.value = false;
      }
    };

    // Refresh preview with current settings
    const refreshPreview = () => {
      generatePreview();
    };

    // Handle print button click
    const handlePrint = () => {
      showPrinterDialog.value = true;
    };

    // Handle actual printing to printer
    const handlePrintToPrinter = async (printer) => {
      printing.value = true;
      try {
        const result = await ipcRenderer.invoke("receipt:print", {
          transactionId: props.transactionId,
          transactionType: props.transactionType,
          printerName: printer.name,
          silent: false,
          receiptSettings: receiptSettings.value,
        });

        if (result.success) {
          emit("printed", result);
          visible.value = false;
        }
      } catch (err) {
        console.error("Error printing receipt:", err);
        alert("Gagal mencetak struk: " + (err.message || "Unknown error"));
      } finally {
        printing.value = false;
        showPrinterDialog.value = false;
      }
    };

    // Watch for dialog open to generate preview
    watch(visible, (newValue) => {
      if (newValue) {
        loadDefaultSettings().then(() => {
          generatePreview();
        });
      }
    });

    // Cleanup blob URL on unmount
    onUnmounted(() => {
      if (previewBlobUrl.value) {
        URL.revokeObjectURL(previewBlobUrl.value);
        previewBlobUrl.value = "";
      }
    });

    return {
      visible,
      loading,
      printing,
      error,
      previewUrl,
      receiptSettings,
      showPrinterDialog,
      refreshPreview,
      handlePrint,
      handlePrintToPrinter,
    };
  },
};
</script>

<style scoped>
.receipt-preview-dialog {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  min-height: 500px;
  max-height: 80vh;
}

.settings-panel {
  border-right: 1px solid #e5e7eb;
  padding-right: 1.5rem;
  overflow-y: auto;
  max-height: 80vh;
}

.settings-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #374151;
  user-select: none;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-item span {
  flex: 1;
}

.settings-actions {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  min-height: 500px;
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6b7280;
  gap: 1rem;
}

.loading-state i,
.error-state i {
  font-size: 2rem;
  color: #9ca3af;
}

.error-state i {
  color: #dc2626;
}

.preview-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.pdf-preview {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

@media (max-width: 1024px) {
  .receipt-preview-dialog {
    grid-template-columns: 1fr;
  }

  .settings-panel {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    padding-right: 0;
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
    max-height: 300px;
  }
}
</style>

