<template>
  <AppDialog
    v-model="visible"
    title="Pilih Printer"
    :show-footer="true"
    confirm-text="Print"
    cancel-text="Batal"
    :loading="printing"
    @confirm="handlePrint"
  >
    <div class="printer-select-dialog">
      <p class="dialog-description">
        Pilih printer yang akan digunakan untuk mencetak invoice.
      </p>
      
      <div class="printer-list" v-if="!loading && printers.length > 0">
        <div
          v-for="printer in printers"
          :key="printer.name"
          class="printer-item"
          :class="{ selected: selectedPrinter?.name === printer.name }"
          @click="selectedPrinter = printer"
        >
          <div class="printer-info">
            <div class="printer-name">
              {{ printer.displayName || printer.name }}
              <span v-if="printer.isDefault" class="default-badge">Default</span>
            </div>
            <div v-if="printer.description" class="printer-description">
              {{ printer.description }}
            </div>
          </div>
          <div class="printer-status" v-if="printer.status === 0">
            <span class="status-indicator available"></span>
            Tersedia
          </div>
          <div class="printer-status" v-else>
            <span class="status-indicator unavailable"></span>
            Tidak Tersedia
          </div>
        </div>
      </div>
      
      <div v-else-if="loading" class="loading-state">
        Memuat daftar printer...
      </div>
      
      <div v-else class="empty-state">
        Tidak ada printer yang tersedia.
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import AppDialog from "./AppDialog.vue";
import { ipcRenderer } from "@/services/ipc";

export default {
  name: "PrinterSelectDialog",
  components: {
    AppDialog,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "print"],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const printers = ref([]);
    const selectedPrinter = ref(null);
    const loading = ref(false);
    const printing = ref(false);

    const loadPrinters = async () => {
      loading.value = true;
      try {
        const printerList = await ipcRenderer.invoke("printer:list");
        printers.value = printerList;
        
        // Select default printer if available
        const defaultPrinter = printerList.find((p) => p.isDefault);
        if (defaultPrinter) {
          selectedPrinter.value = defaultPrinter;
        } else if (printerList.length > 0) {
          selectedPrinter.value = printerList[0];
        }
      } catch (error) {
        console.error("Error loading printers:", error);
      } finally {
        loading.value = false;
      }
    };

    const handlePrint = async () => {
      if (!selectedPrinter.value) {
        alert("Pilih printer terlebih dahulu");
        return;
      }

      printing.value = true;
      try {
        // Emit print event - parent will handle the actual printing
        emit("print", selectedPrinter.value);
        // Close dialog after emit (parent handles async printing)
        visible.value = false;
      } catch (error) {
        console.error("Error in print handler:", error);
        alert("Gagal mencetak: " + (error.message || "Unknown error"));
      } finally {
        printing.value = false;
      }
    };

    watch(visible, (newValue) => {
      if (newValue) {
        loadPrinters();
      }
    });

    onMounted(() => {
      if (visible.value) {
        loadPrinters();
      }
    });

    return {
      visible,
      printers,
      selectedPrinter,
      loading,
      printing,
      handlePrint,
    };
  },
};
</script>

<style scoped>
.printer-select-dialog {
  min-width: 400px;
  max-width: 600px;
}

.dialog-description {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.printer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.printer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.printer-item:hover {
  border-color: #4338ca;
  background-color: #f3f4f6;
}

.printer-item.selected {
  border-color: #4338ca;
  background-color: #eef2ff;
}

.printer-info {
  flex: 1;
}

.printer-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.default-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background-color: #4338ca;
  color: white;
  border-radius: 999px;
  font-weight: 500;
}

.printer-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.printer-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.available {
  background-color: #16a34a;
}

.status-indicator.unavailable {
  background-color: #dc2626;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}
</style>

