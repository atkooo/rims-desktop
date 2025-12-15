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
            <strong>{{ items.length }}</strong> label barcode akan dicetak. Pastikan
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
    </div>

    <PrinterSelectDialog
      v-model="showPrinterDialog"
      :initial-printer-name="defaultPrinterName"
      @print="handlePrintToPrinter"
    />
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

    const generatePreview = async () => {
      if (!props.items || props.items.length === 0) {
        previewError.value = "Tidak ada item yang dipilih";
        return;
      }

      previewLoading.value = true;
      previewError.value = "";
      cleanupPreview();

      try {
        const itemIds = props.items.map((item) => item.id);
        const result = await ipcRenderer.invoke("items:previewBulkLabels", {
          itemIds,
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
        const itemIds = props.items.map((item) => item.id);
        await ipcRenderer.invoke("items:printBulkLabels", {
          itemIds,
          printerName: printer?.name || null,
          silent: false,
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
        const itemIds = props.items.map((item) => item.id);
        const result = await ipcRenderer.invoke("items:downloadBulkLabels", {
          itemIds,
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
  min-width: 600px;
  width: 100%;
  padding: 1.5rem 0.5rem 0.5rem;
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
}
</style>
