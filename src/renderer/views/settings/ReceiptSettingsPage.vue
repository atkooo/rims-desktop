<template>
  <div class="data-page receipt-settings-page admin-page">
    <div class="page-header">
      <div>

        <h1>Pengaturan Printer & Struk</h1>
        <p class="subtitle">
          Kelola pengaturan printer dan tampilan struk transaksi. Preview akan diperbarui secara otomatis.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="secondary" @click="$router.push('/settings/system')">
          <i class="fas fa-arrow-left"></i> Kembali
        </AppButton>
      </div>
    </div>

    <div class="receipt-settings-container">
      <div class="receipt-settings-layout">
        <!-- Settings Panel -->
        <div class="settings-panel">
          <!-- Printer Settings Section -->
          <div class="settings-section">
            <h3 class="section-title">
              <i class="fas fa-print"></i>
              Pengaturan Printer
            </h3>
            <div class="form-group">
              <label>Printer Receipt</label>
              <select v-model="settings.printer" class="form-select" @change="updatePreview">
                <option value="">Pilih Printer</option>
                <option
                  v-for="printer in printers"
                  :key="typeof printer === 'string' ? printer : printer.name"
                  :value="typeof printer === 'string' ? printer : printer.name"
                >
                  {{ typeof printer === 'string' ? printer : (printer.displayName || printer.name) }}
                  <span v-if="typeof printer === 'object' && printer.isDefault"> (Default)</span>
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Lebar Kertas (mm)</label>
              <input
                type="number"
                v-model.number="settings.paperWidth"
                class="form-input"
                @change="updatePreview"
              />
            </div>
            <div class="checkbox-wrapper">
              <label class="checkbox-item">
                <input type="checkbox" v-model="settings.autoPrint" />
                <span>Auto-print setelah transaksi</span>
              </label>
            </div>
          </div>

          <!-- Receipt Display Settings Section -->
          <div class="settings-section">
            <h3 class="section-title">
              <i class="fas fa-receipt"></i>
              Tampilan Struk
            </h3>
            <div class="settings-groups">
              <div class="settings-group">
                <h4 class="group-title">
                  <i class="fas fa-store"></i>
                  Informasi Toko
                </h4>
              <div class="checkbox-list">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showCompanyName" @change="updatePreview" />
                  <span>Nama Toko</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showAddress" @change="updatePreview" />
                  <span>Alamat</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showPhone" @change="updatePreview" />
                  <span>Telepon</span>
                </label>
              </div>
            </div>

            <div class="settings-group">
              <h4 class="group-title">
                <i class="fas fa-receipt"></i>
                Informasi Transaksi
              </h4>
              <div class="checkbox-list">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showTransactionCode" @change="updatePreview" />
                  <span>Kode Transaksi</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showDate" @change="updatePreview" />
                  <span>Tanggal</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showCashier" @change="updatePreview" />
                  <span>Kasir</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showCustomerInfo" @change="updatePreview" />
                  <span>Info Pelanggan</span>
                </label>
              </div>
            </div>

            <div class="settings-group">
              <h4 class="group-title">
                <i class="fas fa-list"></i>
                Detail Item
              </h4>
              <div class="checkbox-list">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showItems" @change="updatePreview" />
                  <span>Daftar Item</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showSubtotal" @change="updatePreview" />
                  <span>Subtotal</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showDiscount" @change="updatePreview" />
                  <span>Diskon</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showTax" @change="updatePreview" />
                  <span>Pajak</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showTotal" @change="updatePreview" />
                  <span>Total</span>
                </label>
              </div>
            </div>

            <div class="settings-group">
              <h4 class="group-title">
                <i class="fas fa-info-circle"></i>
                Informasi Lainnya
              </h4>
              <div class="checkbox-list">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showPaymentInfo" @change="updatePreview" />
                  <span>Info Pembayaran</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showNotes" @change="updatePreview" />
                  <span>Catatan</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="settings.receiptSettings.showFooter" @change="updatePreview" />
                  <span>Footer</span>
                </label>
              </div>
            </div>
            </div>
          </div>

          <div class="settings-actions">
            <AppButton
              variant="secondary"
              @click="updatePreview"
              :loading="previewLoading"
            >
              <i class="fas fa-sync-alt"></i> Refresh Preview
            </AppButton>
            <AppButton
              variant="primary"
              :loading="loading"
              @click="saveAllSettings"
            >
              <i class="fas fa-save"></i> Simpan Semua Pengaturan
            </AppButton>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="preview-panel">
          <div class="preview-header">
            <h4>
              <i class="fas fa-eye"></i>
              Preview Struk
            </h4>
            <span class="preview-badge">Contoh</span>
          </div>
          <div class="preview-content">
            <div v-if="previewLoading" class="preview-loading">
              <i class="fas fa-spinner fa-spin"></i>
              <p>Memuat preview...</p>
            </div>
            <div v-else-if="previewError" class="preview-error">
              <i class="fas fa-exclamation-circle"></i>
              <p>{{ previewError }}</p>
              <AppButton variant="secondary" @click="updatePreview">
                Coba Lagi
              </AppButton>
            </div>
            <div v-else-if="previewUrl" class="preview-iframe-wrapper">
              <embed :src="previewUrl" type="application/pdf" class="preview-iframe" />
            </div>
            <div v-else class="preview-empty">
              <i class="fas fa-file-pdf"></i>
              <p>Preview akan muncul di sini</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { ipcRenderer } from "@/services/ipc";
import AppButton from "@/components/ui/AppButton.vue";

export default {
  name: "ReceiptSettingsPage",

  components: {
    AppButton,
  },

  setup() {
    const loading = ref(false);
    const previewLoading = ref(false);
    const previewError = ref("");
    const previewUrl = ref("");
    const previewBlobUrl = ref("");
    const printers = ref([]);

    const settings = ref({
      companyName: "",
      address: "",
      phone: "",
      printer: "",
      paperWidth: 80,
      autoPrint: true,
      receiptSettings: {
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
      },
    });

    // Load settings
    const loadSettings = async () => {
      try {
        const savedSettings = await ipcRenderer.invoke("settings:get");
        if (savedSettings) {
          settings.value = { ...settings.value, ...savedSettings };
          if (savedSettings.receiptSettings) {
            settings.value.receiptSettings = { ...settings.value.receiptSettings, ...savedSettings.receiptSettings };
          }
        }

        // Load printers list
        const printersList = await ipcRenderer.invoke("printer:list");
        printers.value = printersList;
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    // Generate preview
    const updatePreview = async () => {
      previewLoading.value = true;
      previewError.value = "";
      
      // Clean up previous blob URL
      if (previewBlobUrl.value) {
        URL.revokeObjectURL(previewBlobUrl.value);
        previewBlobUrl.value = "";
      }
      previewUrl.value = "";

      try {
        // Convert reactive objects to plain objects for IPC
        const companySettings = {
          companyName: String(settings.value.companyName || ""),
          address: String(settings.value.address || ""),
          phone: String(settings.value.phone || ""),
          paperWidth: Number(settings.value.paperWidth || 80),
        };

        // Deep clone receiptSettings to plain object
        const receiptSettings = JSON.parse(JSON.stringify(settings.value.receiptSettings));

        const result = await ipcRenderer.invoke("receipt:generateSample", {
          receiptSettings: receiptSettings,
          companySettings: companySettings,
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
              previewError.value = "Gagal memuat preview PDF";
            }
          } else {
            previewError.value = "Gagal menghasilkan preview";
          }
        } else {
          previewError.value = "Gagal menghasilkan preview";
        }
      } catch (error) {
        console.error("Error generating preview:", error);
        previewError.value = error.message || "Gagal memuat preview";
      } finally {
        previewLoading.value = false;
      }
    };

    // Save all settings (printer + receipt)
    const saveAllSettings = async () => {
      loading.value = true;
      try {
        await ipcRenderer.invoke("settings:save", {
          printer: settings.value.printer,
          paperWidth: settings.value.paperWidth,
          autoPrint: settings.value.autoPrint,
          receiptSettings: settings.value.receiptSettings,
        });
        // Update preview after saving
        await updatePreview();
      } catch (error) {
        console.error("Error saving settings:", error);
      } finally {
        loading.value = false;
      }
    };

    // Watch for settings changes to auto-update preview (debounced)
    let previewTimeout = null;
    const debouncedUpdatePreview = () => {
      if (previewTimeout) clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => {
        if (previewUrl.value) {
          // Only auto-update if preview already exists
          updatePreview();
        }
      }, 500);
    };

    watch(
      () => settings.value.receiptSettings,
      debouncedUpdatePreview,
      { deep: true }
    );

    // Watch company settings and printer settings too
    watch(
      () => [settings.value.companyName, settings.value.address, settings.value.phone, settings.value.paperWidth, settings.value.printer],
      debouncedUpdatePreview
    );

    // Cleanup blob URL on unmount
    onUnmounted(() => {
      if (previewBlobUrl.value) {
        URL.revokeObjectURL(previewBlobUrl.value);
        previewBlobUrl.value = "";
      }
    });

    onMounted(async () => {
      await loadSettings();
      // Generate initial preview after settings are loaded
      setTimeout(() => {
        updatePreview();
      }, 500);
    });

    return {
      settings,
      printers,
      loading,
      previewLoading,
      previewError,
      previewUrl,
      saveAllSettings,
      updatePreview,
    };
  },
};
</script>

<style scoped>
.receipt-settings-page {
  width: 100%;
}

.receipt-settings-page .page-header {
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.receipt-settings-page .eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
  color: #7c3aed;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.receipt-settings-container {
  width: 100%;
}

.receipt-settings-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 2rem;
  min-height: 600px;
}

.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  border-right: 1px solid #e5e7eb;
  padding-right: 2rem;
  max-height: 80vh;
  overflow-y: auto;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.settings-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.section-title i {
  color: #7c3aed;
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #111827;
  background-color: #ffffff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.form-select {
  cursor: pointer;
}

.checkbox-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-group {
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  border-radius: 10px;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.settings-group:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-color: #c7d2fe;
}

.group-title {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.group-title i {
  color: #7c3aed;
  font-size: 1rem;
  width: 18px;
  text-align: center;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.checkbox-item:hover {
  background-color: #f3f4f6;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #7c3aed;
}

.checkbox-item span {
  flex: 1;
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
}

.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.preview-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-header h4 i {
  color: #7c3aed;
}

.preview-badge {
  background: #eef2ff;
  color: #7c3aed;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  background: #f9fafb;
  position: relative;
}

.preview-loading,
.preview-error,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: #6b7280;
  text-align: center;
}

.preview-loading i,
.preview-error i,
.preview-empty i {
  font-size: 3rem;
  color: #9ca3af;
}

.preview-error i {
  color: #dc2626;
}

.preview-empty i {
  color: #cbd5e1;
}

.preview-iframe-wrapper {
  width: 100%;
  height: 100%;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #ffffff;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1200px) {
  .receipt-settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-panel {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    padding-right: 0;
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
    max-height: 400px;
  }
}
</style>

