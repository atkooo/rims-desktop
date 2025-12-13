<template>
  <AppDialog
    v-model="showDialog"
    title="Preview Label Barcode"
    :show-footer="true"
    :show-confirm="true"
    :show-cancel="true"
    :confirm-text="printOption === 'download' ? 'Download PDF' : printOption === 'print' ? 'Cetak Semua' : 'Generate PDF'"
    cancel-text="Batal"
    :loading="generating"
    @confirm="handlePrint"
    @cancel="close"
  >
    <div class="bulk-label-preview-dialog">
      <div class="preview-header">
        <p class="info-text">
          <strong>{{ items.length }}</strong> label akan dicetak. Pastikan
          preview sudah sesuai sebelum mencetak.
        </p>
      </div>

      <div class="preview-options">
        <h4>Opsi Cetak</h4>
        <div class="options-grid">
          <label class="option-item">
            <input
              type="radio"
              v-model="printOption"
              value="preview"
            />
            <span>Generate PDF (Preview)</span>
          </label>
          <label class="option-item">
            <input
              type="radio"
              v-model="printOption"
              value="download"
            />
            <span>Download PDF</span>
          </label>
          <label class="option-item">
            <input
              type="radio"
              v-model="printOption"
              value="print"
            />
            <span>Print Langsung</span>
          </label>
        </div>
        <div v-if="printOption === 'print'" class="printer-select">
          <label>Pilih Printer:</label>
          <select v-model="selectedPrinter" class="form-select">
            <option value="">Printer Default</option>
            <option
              v-for="printer in printers"
              :key="printer.name"
              :value="printer.name"
            >
              {{ printer.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="preview-section">
        <h4>Preview Label ({{ items.length }} item)</h4>
        <div class="labels-grid">
          <div
            v-for="item in items"
            :key="item.id"
            class="label-preview-item"
          >
            <div class="label-content">
              <div class="label-header">
                <div class="item-name">{{ item.name || "N/A" }}</div>
                <div class="item-code">Kode: {{ item.code || "N/A" }}</div>
              </div>
              <div class="barcode-preview">
                <svg
                  :ref="(el) => setBarcodeRef(el, item.id)"
                  class="barcode-svg"
                ></svg>
              </div>
              <div class="label-footer">
                <div v-if="item.category_name" class="footer-info">
                  Kategori: {{ item.category_name }}
                </div>
                <div v-if="item.size_name" class="footer-info">
                  Ukuran: {{ item.size_name }}
                </div>
                <div v-if="item.sale_price" class="footer-info">
                  Harga: {{ formatCurrency(item.sale_price) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { ref, watch, onMounted, nextTick } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import { ipcRenderer } from "@/services/ipc";
import { useCurrency } from "@/composables/useCurrency";

export default {
  name: "BulkLabelPreviewDialog",
  components: { AppDialog },
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
  emits: ["update:modelValue", "print", "generate", "download"],
  setup(props, { emit }) {
    const showDialog = ref(props.modelValue);
    const generating = ref(false);
    const printOption = ref("preview");
    const selectedPrinter = ref("");
    const printers = ref([]);
    const barcodeRefs = ref({});
    const { formatCurrency } = useCurrency();

    // Watch modelValue changes
    watch(
      () => props.modelValue,
      (newVal) => {
        showDialog.value = newVal;
        if (newVal && props.items.length > 0) {
          generateBarcodePreviews();
          loadPrinters();
        }
      },
    );

    watch(showDialog, (newVal) => {
      emit("update:modelValue", newVal);
    });

    // Set barcode ref
    const setBarcodeRef = (el, itemId) => {
      if (el) {
        barcodeRefs.value[itemId] = el;
      }
    };

    // Generate barcode previews
    const generateBarcodePreviews = async () => {
      if (!props.items || props.items.length === 0) return;

      try {
        // Dynamically import JsBarcode
        const JsBarcode = (await import("jsbarcode")).default;

        await nextTick();

        // Generate barcode for each item
        for (const item of props.items) {
          if (!item.code || !barcodeRefs.value[item.id]) continue;

          try {
            // Clear previous barcode
            barcodeRefs.value[item.id].innerHTML = "";

            // Generate barcode
            JsBarcode(barcodeRefs.value[item.id], item.code, {
              format: "CODE128",
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 8,
            });
          } catch (error) {
            console.error(`Error generating barcode for item ${item.id}:`, error);
          }
        }
      } catch (error) {
        console.error("Error generating barcode previews:", error);
      }
    };

    // Load available printers
    const loadPrinters = async () => {
      try {
        const printerList = await ipcRenderer.invoke("printer:list");
        printers.value = printerList || [];
      } catch (error) {
        console.error("Error loading printers:", error);
        printers.value = [];
      }
    };

    // Handle print
    const handlePrint = async () => {
      if (props.items.length === 0) {
        return;
      }

      generating.value = true;
      try {
        const itemIds = props.items.map((item) => item.id);

        if (printOption.value === "print") {
          // Print directly
          emit("print", {
            itemIds,
            printerName: selectedPrinter.value || null,
            silent: false,
          });
        } else if (printOption.value === "download") {
          // Download PDF
          emit("download", { itemIds });
        } else {
          // Generate and preview
          emit("generate", { itemIds });
        }
      } catch (error) {
        console.error("Error in print handler:", error);
        alert(`Error: ${error.message || "Gagal generate label"}`);
      } finally {
        generating.value = false;
      }
    };

    const close = () => {
      showDialog.value = false;
    };

    // Watch items changes to regenerate barcodes
    watch(
      () => props.items,
      () => {
        if (showDialog.value && props.items.length > 0) {
          generateBarcodePreviews();
        }
      },
      { deep: true },
    );

    onMounted(() => {
      if (props.items.length > 0) {
        generateBarcodePreviews();
        loadPrinters();
      }
    });

    return {
      showDialog,
      generating,
      printOption,
      selectedPrinter,
      printers,
      barcodeRefs,
      formatCurrency,
      setBarcodeRef,
      handlePrint,
      close,
    };
  },
};
</script>

<style scoped>
.bulk-label-preview-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.preview-header {
  background: #eff6ff;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.info-text {
  margin: 0;
  color: #1e40af;
  font-size: 0.9rem;
}

.preview-options h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.options-grid {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.option-item input[type="radio"] {
  cursor: pointer;
}

.printer-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.printer-select label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

/* Using global utility class for form-select */
.form-select {
  padding: 0.5rem;
  font-size: 0.9rem;
  border-radius: 4px;
}

.preview-section h4 {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.label-preview-item {
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  padding: 0.75rem;
  background: white;
}

.label-content {
  width: 100%;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0.5rem;
}

.label-header {
  text-align: center;
  margin-bottom: 0.5rem;
}

.item-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.2rem;
  word-wrap: break-word;
  line-height: 1.2;
}

.item-code {
  font-size: 0.7rem;
  color: #6b7280;
}

.barcode-preview {
  display: flex;
  justify-content: center;
  margin: 0.5rem 0;
}

.barcode-svg {
  max-width: 100%;
  height: auto;
}

.label-footer {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.footer-info {
  font-size: 0.65rem;
  color: #6b7280;
  margin: 0.15rem 0;
  line-height: 1.3;
}
</style>



