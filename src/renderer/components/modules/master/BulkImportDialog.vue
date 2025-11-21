<template>
  <AppDialog
    v-model="visible"
    :title="title"
    :max-width="600"
    :show-footer="false"
  >
    <div class="bulk-import-dialog">
      <div class="import-steps">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>Download Template</h4>
            <p>Download template Excel untuk diisi dengan data (opsional)</p>
          </div>
        </div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>Isi Data</h4>
            <p>Isi template dengan data yang akan diimport</p>
          </div>
        </div>
        <div class="step" :class="{ active: currentStep === 3 }">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>Upload & Import</h4>
            <p>Upload file Excel yang sudah diisi</p>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 1" class="step-content-area">
        <div class="info-box">
          <Icon name="info" :size="20" />
          <p>Template Excel akan berisi kolom-kolom yang diperlukan beserta contoh data dan validasi. Download template jika Anda belum punya format yang benar.</p>
        </div>
        <div class="button-group">
          <AppButton
            variant="secondary"
            :loading="downloading"
            @click="handleDownloadTemplate"
          >
            <Icon name="download" :size="18" />
            Download Template
          </AppButton>
          <AppButton
            variant="primary"
            @click="currentStep = 2"
          >
            Lanjut
          </AppButton>
        </div>
      </div>

      <div v-if="currentStep === 2" class="step-content-area">
        <div class="info-box">
          <Icon name="info" :size="20" />
          <p>Silakan isi template Excel yang sudah didownload dengan data yang akan diimport. Pastikan mengikuti format yang ada. Jika sudah punya file Excel yang sesuai format, Anda bisa langsung ke langkah berikutnya.</p>
        </div>
        <div class="button-group">
          <AppButton variant="secondary" @click="currentStep = 1">
            Kembali
          </AppButton>
          <AppButton variant="primary" @click="currentStep = 3">
            Lanjut ke Upload
          </AppButton>
        </div>
      </div>

      <div v-if="currentStep === 3" class="step-content-area">
        <div class="file-upload-area" @click="handleSelectFile">
          <div v-if="!selectedFilePath" class="upload-placeholder">
            <Icon name="upload" :size="48" />
            <p>Klik untuk memilih file Excel</p>
            <span class="file-hint">Format: .xlsx atau .xls</span>
          </div>
          <div v-else class="file-selected">
            <Icon name="file" :size="24" />
            <span>{{ selectedFilePath.split(/[/\\]/).pop() }}</span>
            <button type="button" class="remove-file" @click.stop="selectedFilePath = null">
              <Icon name="x" :size="18" />
            </button>
          </div>
        </div>

        <div v-if="importResult" class="import-result">
          <div class="result-summary">
            <div class="result-item success">
              <Icon name="check-circle" :size="20" />
              <span>Berhasil: {{ importResult.success }}</span>
            </div>
            <div class="result-item error">
              <Icon name="x-circle" :size="20" />
              <span>Gagal: {{ importResult.failed }}</span>
            </div>
          </div>
          <div v-if="importResult.errors && importResult.errors.length > 0" class="error-list">
            <h5>Detail Error:</h5>
            <div class="error-items">
              <div v-for="(error, idx) in importResult.errors" :key="idx" class="error-item">
                <strong>Baris {{ error.row }}:</strong> {{ error.error }}
              </div>
            </div>
          </div>
        </div>

        <div class="button-group">
          <AppButton variant="secondary" @click="currentStep = 2">
            Kembali
          </AppButton>
          <AppButton
            variant="primary"
            :loading="importing"
            :disabled="!selectedFilePath"
            @click="handleImport"
          >
            <Icon name="upload" :size="18" />
            Import Data
          </AppButton>
        </div>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { ref, computed } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "BulkImportDialog",
  components: {
    AppDialog,
    AppButton,
    Icon,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
      validator: (value) => ["items", "accessories"].includes(value),
    },
  },
  emits: ["update:modelValue", "imported"],
  setup(props, { emit }) {
    const { showSuccess, showError } = useNotification();
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const currentStep = ref(1);
    const downloading = ref(false);
    const importing = ref(false);
    const selectedFilePath = ref(null);
    const importResult = ref(null);

    const title = computed(() => {
      return props.type === "items" ? "Import Items (Bulk)" : "Import Aksesoris (Bulk)";
    });

    const handleDownloadTemplate = async () => {
      downloading.value = true;
      try {
        const channel = props.type === "items" ? "items:downloadTemplate" : "accessories:downloadTemplate";
        const result = await ipcRenderer.invoke(channel);
        
        if (result.success) {
          showSuccess("Template berhasil didownload!");
        } else {
          showError(result.error || "Gagal download template");
        }
      } catch (error) {
        showError(error.message || "Gagal download template");
      } finally {
        downloading.value = false;
      }
    };

    const handleSelectFile = async () => {
      try {
        const { canceled, filePaths } = await ipcRenderer.invoke("dialog:showOpenDialog", {
          title: "Pilih File Excel",
          filters: [
            { name: "Excel Files", extensions: ["xlsx", "xls"] },
            { name: "All Files", extensions: ["*"] },
          ],
          properties: ["openFile"],
        });

        if (!canceled && filePaths && filePaths.length > 0) {
          selectedFilePath.value = filePaths[0];
          importResult.value = null;
        }
      } catch (error) {
        showError(error.message || "Gagal memilih file");
      }
    };

    const handleImport = async () => {
      if (!selectedFilePath.value) return;

      importing.value = true;
      importResult.value = null;

      try {
        const channel = props.type === "items" ? "items:importExcel" : "accessories:importExcel";
        const result = await ipcRenderer.invoke(channel, selectedFilePath.value);

        importResult.value = result;

        if (result.failed === 0) {
          showSuccess(`Berhasil mengimport ${result.success} data!`);
          emit("imported", result);
          // Reset after 2 seconds
          setTimeout(() => {
            visible.value = false;
            resetDialog();
          }, 2000);
        } else if (result.success > 0) {
          showError(`Import selesai dengan ${result.failed} error. ${result.success} data berhasil diimport.`);
        } else {
          showError("Import gagal. Periksa detail error di bawah.");
        }
      } catch (error) {
        showError(error.message || "Gagal mengimport data");
        importResult.value = {
          success: 0,
          failed: 0,
          errors: [{ row: 0, error: error.message || "Error tidak diketahui" }],
        };
      } finally {
        importing.value = false;
      }
    };

    const resetDialog = () => {
      currentStep.value = 1;
      downloading.value = false;
      importing.value = false;
      selectedFilePath.value = null;
      importResult.value = null;
    };

    // Reset when dialog closes
    const watchVisible = (newValue) => {
      if (!newValue) {
        resetDialog();
      }
    };

    return {
      visible,
      currentStep,
      downloading,
      importing,
      selectedFilePath,
      importResult,
      title,
      handleDownloadTemplate,
      handleSelectFile,
      handleImport,
      watchVisible,
    };
  },
  watch: {
    modelValue(newValue) {
      if (!newValue) {
        this.currentStep = 1;
        this.downloading = false;
        this.importing = false;
        this.selectedFilePath = null;
        this.importResult = null;
      }
    },
  },
};
</script>

<style scoped>
.bulk-import-dialog {
  padding: 0.5rem 0;
}

.import-steps {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.step {
  flex: 1;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.step.active {
  opacity: 1;
}

.step.completed {
  opacity: 0.8;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.2s;
}

.step.active .step-number {
  background-color: #4f46e5;
  color: white;
}

.step.completed .step-number {
  background-color: #10b981;
  color: white;
}

.step-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.step-content p {
  margin: 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.step-content-area {
  min-height: 200px;
}

.info-box {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-box .icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.info-box p {
  margin: 0;
  color: #1e40af;
  font-size: 0.875rem;
  line-height: 1.5;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f9fafb;
}

.file-upload-area:hover {
  border-color: #4f46e5;
  background-color: #f3f4f6;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.upload-placeholder .icon {
  color: #9ca3af;
}

.upload-placeholder p {
  margin: 0;
  color: #374151;
  font-weight: 500;
}

.file-hint {
  font-size: 0.75rem;
  color: #6b7280;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.file-selected .icon {
  color: #4f46e5;
}

.file-selected span {
  flex: 1;
  color: #111827;
  font-weight: 500;
}

.remove-file {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.remove-file:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.import-result {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 8px;
}

.result-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
}

.result-item.success {
  background-color: #d1fae5;
  color: #065f46;
}

.result-item.error {
  background-color: #fee2e2;
  color: #991b1b;
}

.error-list {
  margin-top: 1rem;
}

.error-list h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.error-items {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-item {
  padding: 0.5rem;
  background-color: white;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #991b1b;
}

.error-item strong {
  color: #dc2626;
}
</style>

