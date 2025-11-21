<template>
  <AppDialog
    v-model="visible"
    title="Cetak & Download Label"
    :show-footer="true"
    :show-confirm="false"
    :show-cancel="true"
    cancel-text="Batal"
    :max-width="600"
    @cancel="close"
  >
    <div class="label-preview-dialog">
      <div class="dialog-content">
        <p class="info-text">
          <strong>{{ items.length }}</strong> label akan dicetak. Pilih aksi yang diinginkan:
        </p>
        
        <div class="action-buttons">
          <AppButton
            variant="primary"
            size="large"
            :loading="printing"
            @click="handlePrint"
            class="action-btn"
          >
            <Icon name="printer" :size="20" /> Print
          </AppButton>
          <AppButton
            variant="secondary"
            size="large"
            :loading="generating"
            @click="handleDownload"
            class="action-btn"
          >
            <Icon name="save" :size="20" /> Download PDF
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Printer Selection Dialog -->
    <PrinterSelectDialog
      v-model="showPrinterDialog"
      @print="handlePrintToPrinter"
    />
  </AppDialog>
</template>

<script>
import { ref, computed } from "vue";
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
    const showPrinterDialog = ref(false);

    // Handle print
    const handlePrint = () => {
      showPrinterDialog.value = true;
    };

    // Handle print to printer
    const handlePrintToPrinter = async (printer) => {
      printing.value = true;
      try {
        const itemIds = props.items.map((item) => item.id);
        await ipcRenderer.invoke("items:printBulkLabels", {
          itemIds,
          printerName: printer.name,
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

    // Handle download
    const handleDownload = async () => {
      if (props.items.length === 0) return;

      generating.value = true;
      try {
        const itemIds = props.items.map((item) => item.id);
        const result = await ipcRenderer.invoke("items:downloadBulkLabels", {
          itemIds,
        });

        if (result.success) {
          alert(`Label berhasil di-download ke: ${result.filePath}`);
          visible.value = false;
        } else {
          if (result.error !== "Download dibatalkan") {
            alert(`Error: ${result.error || "Gagal download label"}`);
          }
        }
      } catch (error) {
        console.error("Error downloading labels:", error);
        alert(`Error: ${error.message || "Gagal download label"}`);
      } finally {
        generating.value = false;
      }
    };

    const close = () => {
      visible.value = false;
    };

    return {
      visible,
      generating,
      printing,
      showPrinterDialog,
      handlePrint,
      handlePrintToPrinter,
      handleDownload,
      close,
    };
  },
};
</script>

<style scoped>
.label-preview-dialog {
  padding: 1.5rem;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.info-text {
  margin: 0;
  font-size: 1rem;
  color: #374151;
  text-align: center;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
}

.action-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
</style>
