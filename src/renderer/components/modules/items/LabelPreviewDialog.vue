<template>
  <AppDialog
    v-model="visible"
    title="Cetak & Download Label"
    :show-footer="true"
    :show-confirm="false"
    :show-cancel="true"
    cancel-text="Batal"
    :max-width="720"
    @cancel="close"
  >
    <div class="label-preview-dialog">
      <div class="preview-header">
        <div>
          <p class="info-text">
            <strong>{{ totalLabelCount }}</strong> label barcode akan dicetak dari <strong>{{ items.length }}</strong> item. Pastikan
            preview sesuai sebelum mencetak.
          </p>
          <p class="subtext">
            Layout disesuaikan dengan kertas 58mm POS agar label dan struk bisa
            dicetak dari satu printer tanpa membuang kertas.
          </p>
        </div>
        <AppButton
          variant="secondary"
          size="small"
          :loading="previewLoading"
          @click="refreshPreview"
        >
          Refresh Preview
        </AppButton>
      </div>

      <div class="items-quantity-section">
        <h4 class="section-title">Atur Jumlah Label per Item</h4>
        <div class="items-quantity-table">
          <div class="table-header">
            <div class="col-item">Item</div>
            <div class="col-stock">Stok</div>
            <div class="col-quantity">Jumlah Label</div>
          </div>
          <div class="table-body">
            <div
              v-for="item in itemsWithQuantity"
              :key="item.id"
              class="table-row"
            >
              <div class="col-item">
                <div class="item-info">
                  <span class="item-code">{{ item.code }}</span>
                  <span class="item-name">{{ item.name }}</span>
                </div>
              </div>
              <div class="col-stock">
                <span class="stock-badge">{{ item.stock_quantity || 0 }}</span>
              </div>
              <div class="col-quantity">
                <input
                  type="number"
                  v-model.number="item.labelQuantity"
                  min="1"
                  class="quantity-input"
                  @input="updateItemQuantity(item.id, $event.target.value)"
                />
                <button
                  class="btn-set-stock"
                  @click="setQuantityToStock(item)"
                  title="Set sesuai stok"
                >
                  = Stok
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-area">
        <div v-if="previewLoading" class="preview-state">
          <p>Memuat preview...</p>
        </div>
        <div v-else-if="previewError" class="preview-state error">
          <p>{{ previewError }}</p>
        </div>
        <div v-else-if="previewUrl" class="preview-frame">
          <embed :src="previewUrl" type="application/pdf" class="pdf-preview" />
        </div>
        <div v-else class="preview-state empty">
          <p>Preview belum tersedia</p>
        </div>
      </div>

    <div class="action-buttons">
      <AppButton
        variant="primary"
        size="large"
        :loading="printing"
        :disabled="previewLoading || !previewUrl"
        @click="handlePrint"
      >
        <Icon name="printer" :size="18" /> Cetak Label
      </AppButton>
      <AppButton
        variant="secondary"
        size="large"
        :loading="generating"
        :disabled="previewLoading || !previewUrl"
        @click="handleDownload"
      >
        <Icon name="save" :size="18" /> Download PDF
      </AppButton>
    </div>
  </div>

  <PrinterSelectDialog
    v-model="showPrinterDialog"
    :initial-printer-name="defaultPrinterName"
    @print="handlePrintToPrinter"
  />

  <template #footer-extra>
    <div class="printer-note">
      <div>
        <p class="printer-info">
          <strong>Printer struk default:</strong>
          <span v-if="defaultPrinterName">{{ defaultPrinterName }}</span>
          <span v-else>Belum dipilih</span>
        </p>
        <p class="hint-text">
          Gunakan printer yang sama agar label mengikuti ukuran 58mm dan kertas tidak boros.
        </p>
      </div>
      <AppButton
        variant="secondary"
        size="small"
        class="manual-printer-btn"
        @click="openPrinterDialog"
      >
        Pilih printer lain
      </AppButton>
    </div>
  </template>
</AppDialog>
</template>

<script>
import { ref, computed, watch, onUnmounted } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import PrinterSelectDialog from "@/components/ui/PrinterSelectDialog.vue";
import { ipcRenderer } from "@/services/ipc";

export default {
  name: "LabelPreviewDialog",
  components: {
    AppDialog,
    AppButton,
    Icon,
    PrinterSelectDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    items: {
      type: Array,
      required: true,
      default: () => [],
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const generating = ref(false);
    const printing = ref(false);
    const previewLoading = ref(false);
    const previewError = ref("");
    const previewBlobUrl = ref("");
    const previewUrl = ref("");
    const showPrinterDialog = ref(false);
    const defaultPrinterName = ref("");
    const useReceiptPrinterForLabels = ref(true);
    const itemsWithQuantity = ref([]);

    const cleanupPreview = () => {
      if (previewBlobUrl.value) {
        URL.revokeObjectURL(previewBlobUrl.value);
        previewBlobUrl.value = "";
      }
      previewUrl.value = "";
    };

    const loadSettings = async () => {
      try {
        const settings = await ipcRenderer.invoke("settings:get");
        defaultPrinterName.value = settings?.printer || "";
        useReceiptPrinterForLabels.value =
          settings?.useReceiptPrinterForLabels !== false;
      } catch (error) {
        console.error("Error loading printer settings:", error);
      }
    };

    const initializeItemsWithQuantity = () => {
      itemsWithQuantity.value = props.items.map((item) => ({
        ...item,
        labelQuantity: Math.max(1, item.stock_quantity || 1),
      }));
    };

    const updateItemQuantity = (itemId, value) => {
      const item = itemsWithQuantity.value.find((i) => i.id === itemId);
      if (item) {
        const numValue = parseInt(value) || 1;
        item.labelQuantity = Math.max(1, numValue);
      }
    };

    const setQuantityToStock = (item) => {
      item.labelQuantity = Math.max(1, item.stock_quantity || 1);
    };

    const totalLabelCount = computed(() => {
      return itemsWithQuantity.value.reduce(
        (sum, item) => sum + (item.labelQuantity || 1),
        0
      );
    });

    const generatePreview = async () => {
      if (!props.items || props.items.length === 0) {
        previewError.value = "Tidak ada item yang dipilih";
        return;
      }

      previewLoading.value = true;
      previewError.value = "";
      cleanupPreview();

      try {
        const itemsData = itemsWithQuantity.value.map((item) => ({
          productType: item.productType || item.product_type || 'item',
          id: item.id,
          quantity: item.labelQuantity || 1,
        }));
        const result = await ipcRenderer.invoke("items:previewBulkLabels", {
          items: itemsData,
        });

        if (result.success && result.pdfBase64) {
          const base64Data = result.pdfBase64.split(",")[1] || result.pdfBase64;
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          previewBlobUrl.value = URL.createObjectURL(blob);
          previewUrl.value = previewBlobUrl.value;
        } else {
          previewError.value = "Gagal membuat preview label";
        }
      } catch (error) {
        console.error("Error generating label preview:", error);
        previewError.value = error.message || "Gagal memuat preview label";
      } finally {
        previewLoading.value = false;
      }
    };

    const refreshPreview = () => {
      generatePreview();
    };

    const handlePrint = () => {
      if (!previewUrl.value) {
        previewError.value = "Preview belum tersedia";
        return;
      }

      if (useReceiptPrinterForLabels.value && defaultPrinterName.value) {
        handlePrintToPrinter({ name: defaultPrinterName.value });
      } else {
        showPrinterDialog.value = true;
      }
    };

    const handlePrintToPrinter = async (printer) => {
      printing.value = true;
      try {
        const itemsData = itemsWithQuantity.value.map((item) => ({
          productType: item.productType || item.product_type || 'item',
          id: item.id,
          quantity: item.labelQuantity || 1,
        }));
        await ipcRenderer.invoke("items:printBulkLabels", {
          items: itemsData,
          printerName: printer?.name || null,
          silent: true,
        });
        visible.value = false;
      } catch (error) {
        console.error("Error printing labels:", error);
        alert(`Error: ${error.message || "Gagal print label"}`);
      } finally {
        printing.value = false;
        showPrinterDialog.value = false;
      }
    };

    const handleDownload = async () => {
      if (!props.items.length) return;

      generating.value = true;
      try {
        const itemsData = itemsWithQuantity.value.map((item) => ({
          productType: item.productType || item.product_type || 'item',
          id: item.id,
          quantity: item.labelQuantity || 1,
        }));
        const result = await ipcRenderer.invoke("items:downloadBulkLabels", {
          items: itemsData,
        });

        if (result.success) {
          alert(`Label berhasil di-download ke: ${result.filePath}`);
          visible.value = false;
        } else if (result.error !== "Download dibatalkan") {
          alert(`Error: ${result.error || "Gagal download label"}`);
        }
      } catch (error) {
        console.error("Error downloading labels:", error);
        alert(`Error: ${error.message || "Gagal download label"}`);
      } finally {
        generating.value = false;
      }
    };

    const openPrinterDialog = () => {
      showPrinterDialog.value = true;
    };

    const close = () => {
      visible.value = false;
    };

    watch(visible, (newVal) => {
      if (newVal) {
        initializeItemsWithQuantity();
        loadSettings();
        generatePreview();
      } else {
        cleanupPreview();
      }
    });

    watch(
      () => props.items,
      () => {
        if (visible.value) {
          initializeItemsWithQuantity();
          generatePreview();
        }
      },
      { deep: true },
    );

    watch(
      () => itemsWithQuantity.value,
      () => {
        if (visible.value) {
          generatePreview();
        }
      },
      { deep: true },
    );

    onUnmounted(() => {
      cleanupPreview();
    });

    return {
      visible,
      generating,
      printing,
      previewLoading,
      previewError,
      previewUrl,
      defaultPrinterName,
      showPrinterDialog,
      itemsWithQuantity,
      totalLabelCount,
      updateItemQuantity,
      setQuantityToStock,
      handlePrint,
      handlePrintToPrinter,
      handleDownload,
      openPrinterDialog,
      refreshPreview,
      close,
    };
  },
};
</script>

<style scoped>
.label-preview-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  padding: 1.5rem 0.5rem 0.5rem;
  box-sizing: border-box;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.info-text {
  margin: 0;
  font-size: 1rem;
  color: #111827;
  line-height: 1.4;
}

.subtext {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.preview-area {
  min-height: 320px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.preview-frame {
  height: 340px;
}

.pdf-preview {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.preview-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
  text-align: center;
  gap: 0.4rem;
}

.preview-state.error {
  color: #dc2626;
}

.preview-state.empty {
  color: #9ca3af;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.printer-note {
  border-top: 1px dashed #d1d5db;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.printer-info {
  margin: 0;
  font-size: 0.95rem;
  color: #111827;
}

.hint-text {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.manual-printer-btn {
  min-width: 150px;
}

.items-quantity-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.items-quantity-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 300px;
  overflow-y: auto;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 80px 180px;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f3f4f6;
  border-radius: 6px 6px 0 0;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  position: sticky;
  top: 0;
  z-index: 1;
}

.table-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: white;
  border-radius: 0 0 6px 6px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 80px 180px;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.col-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-code {
  font-family: monospace;
  font-weight: 600;
  font-size: 0.875rem;
  color: #3b82f6;
}

.item-name {
  font-size: 0.875rem;
  color: #111827;
  line-height: 1.3;
}

.col-stock {
  text-align: center;
}

.stock-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.col-quantity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quantity-input {
  width: 70px;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  text-align: center;
}

.quantity-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-set-stock {
  padding: 0.375rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-set-stock:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-buttons {
    flex-direction: column;
  }

  .printer-note {
    flex-direction: column;
    align-items: flex-start;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .col-stock,
  .col-quantity {
    justify-content: flex-start;
  }
}
</style>
