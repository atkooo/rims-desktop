<template>
  <div class="data-page settings-page admin-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Pengaturan</p>
        <h1>Pengaturan Aplikasi</h1>
        <p class="subtitle">
          Kelola profil toko, backup database, dan pengaturan printer agar operasional tetap lancar.
        </p>
      </div>
      <div class="header-meta">
        <div class="meta-chip" v-if="lastBackupDate">
          <i class="fas fa-clock"></i>
          <div>
            <span>Backup terakhir</span>
            <strong>{{ lastBackupDate }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-message">
      <i class="fas fa-check-circle"></i>
      <span>{{ successMessage }}</span>
      <button @click="successMessage = ''" class="close-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="close-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="settings-grid">
      <!-- Profil Toko Card -->
      <section class="settings-card card-section">
        <header class="section-header">
          <div class="section-icon">
            <i class="fas fa-store"></i>
          </div>
          <div>
            <h2>Profil Toko</h2>
            <p class="section-subtitle">
              Informasi ini akan muncul di struk dan laporan agar pelanggan mengenali toko Anda dengan mudah.
            </p>
          </div>
        </header>
        <div class="form-grid">
          <FormInput
            id="companyName"
            label="Nama Toko"
            v-model="settings.companyName"
            :error="errors.companyName"
            placeholder="Masukkan nama toko"
          />
          <FormInput
            id="address"
            label="Alamat"
            type="textarea"
            v-model="settings.address"
            placeholder="Masukkan alamat toko"
          />
          <FormInput
            id="phone"
            label="Nomor Telepon"
            v-model="settings.phone"
            :error="errors.phone"
            placeholder="Masukkan nomor telepon"
          />
        </div>
        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="loading"
            @click="saveCompanyProfile"
          >
            <i class="fas fa-save"></i> Simpan Profil
          </AppButton>
        </div>
      </section>

      <!-- Database Backup Card -->
      <section class="settings-card card-section accent-card">
        <header class="section-header">
          <div class="section-icon">
            <i class="fas fa-database"></i>
          </div>
          <div>
            <h2>Database Backup</h2>
            <p class="section-subtitle">
              Cadangkan data secara rutin agar Anda bisa kembali pulih jika terjadi situasi tak terduga.
            </p>
          </div>
        </header>
        <div class="backup-panel">
          <div class="backup-stats">
            <div class="stat">
              <i class="fas fa-file-archive"></i>
              <div>
                <span>File tersimpan</span>
                <strong>{{ backupFiles.length }}</strong>
              </div>
            </div>
            <div class="stat">
              <i class="fas fa-clock"></i>
              <div>
                <span>Backup terakhir</span>
                <strong>{{ lastBackupDate || "Belum ada" }}</strong>
              </div>
            </div>
          </div>
          <div class="backup-actions">
            <AppButton
              variant="primary"
              :loading="backupLoading"
              @click="createBackup"
            >
              <i class="fas fa-save"></i> Backup Sekarang
            </AppButton>
            <AppButton
              variant="secondary"
              :disabled="backupFiles.length === 0"
              @click="showRestoreDialog = true"
            >
              <i class="fas fa-upload"></i> Restore Backup
            </AppButton>
          </div>
        </div>
      </section>

      <!-- Printer & Struk Card -->
      <section class="settings-card card-section">
        <header class="section-header">
          <div class="section-icon">
            <i class="fas fa-print"></i>
          </div>
          <div>
            <h2>Pengaturan Printer & Struk</h2>
            <p class="section-subtitle">
              Kelola pengaturan printer dan tampilan struk transaksi untuk mencetak struk dengan benar.
            </p>
          </div>
        </header>
        <div class="card-actions">
          <AppButton
            variant="primary"
            @click="$router.push('/settings/receipt')"
          >
            <i class="fas fa-cog"></i> Buka Pengaturan Printer & Struk
          </AppButton>
        </div>
      </section>
    </div>

    <!-- Restore Backup Dialog -->
    <AppDialog
      v-model="showRestoreDialog"
      title="Restore Backup"
      confirm-text="Restore"
      cancel-text="Batal"
      :loading="restoreLoading"
      @confirm="restoreBackup"
    >
      <div class="restore-dialog">
        <div class="warning-banner">
          <i class="fas fa-exclamation-triangle"></i>
          <p>
            Restore akan mengganti data saat ini dengan data dari backup. Pastikan Anda telah menyimpan semua pekerjaan terbaru sebelum melanjutkan.
          </p>
        </div>

        <div class="select-group">
          <label>Pilih Backup File</label>
          <select v-model="selectedBackup" class="form-select">
            <option value="" disabled>-- Pilih backup file --</option>
            <option v-for="backup in backupFiles" :key="backup" :value="backup">
              {{ backup }}
            </option>
          </select>
          <p v-if="backupFiles.length === 0" class="help-text">
            Tidak ada file backup yang tersedia.
          </p>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { ipcRenderer } from "@/services/ipc";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";

export default {
  name: "SettingsPage",

  components: {
    AppButton,
    AppDialog,
    FormInput,
  },

  setup() {
    const loading = ref(false);
    const backupLoading = ref(false);
    const restoreLoading = ref(false);
    const showRestoreDialog = ref(false);
    const errors = ref({});
    const backupFiles = ref([]);
    const selectedBackup = ref("");
    const lastBackupDate = ref(null);
    const successMessage = ref("");
    const errorMessage = ref("");

    const settings = ref({
      companyName: "",
      address: "",
      phone: "",
    });

    // Clear messages after 5 seconds
    const clearMessages = () => {
      setTimeout(() => {
        successMessage.value = "";
        errorMessage.value = "";
      }, 5000);
    };

    // Load settings
    const loadSettings = async () => {
      try {
        const savedSettings = await ipcRenderer.invoke("settings:get");
        if (savedSettings) {
          settings.value = { ...settings.value, ...savedSettings };
        }

        // Load backup files
        const backups = await ipcRenderer.invoke("backup:list");
        backupFiles.value = backups;

        // Get last backup date
        const lastBackup = await ipcRenderer.invoke("backup:getLastDate");
        if (lastBackup) {
          lastBackupDate.value = new Date(lastBackup).toLocaleString("id-ID");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        errorMessage.value = "Gagal memuat pengaturan";
        clearMessages();
      }
    };

    // Save company profile
    const saveCompanyProfile = async () => {
      if (!validateCompanyProfile()) return;

      loading.value = true;
      errorMessage.value = "";
      try {
        await ipcRenderer.invoke("settings:save", {
          companyName: settings.value.companyName,
          address: settings.value.address,
          phone: settings.value.phone,
        });
        successMessage.value = "Profil toko berhasil disimpan";
        clearMessages();
      } catch (error) {
        console.error("Error saving company profile:", error);
        errorMessage.value = "Gagal menyimpan profil toko";
        clearMessages();
      } finally {
        loading.value = false;
      }
    };

    // Create backup
    const createBackup = async () => {
      backupLoading.value = true;
      errorMessage.value = "";
      try {
        await ipcRenderer.invoke("backup:create");
        await loadSettings(); // Reload backup list and last backup date
        successMessage.value = "Backup berhasil dibuat";
        clearMessages();
      } catch (error) {
        console.error("Error creating backup:", error);
        errorMessage.value = "Gagal membuat backup";
        clearMessages();
      } finally {
        backupLoading.value = false;
      }
    };

    // Restore backup
    const restoreBackup = async () => {
      if (!selectedBackup.value) {
        errorMessage.value = "Pilih file backup terlebih dahulu";
        clearMessages();
        return;
      }

      restoreLoading.value = true;
      errorMessage.value = "";
      try {
        await ipcRenderer.invoke("backup:restore", selectedBackup.value);
        showRestoreDialog.value = false;
        selectedBackup.value = "";
        await loadSettings();
        successMessage.value = "Backup berhasil direstore";
        clearMessages();
      } catch (error) {
        console.error("Error restoring backup:", error);
        errorMessage.value = error.message || "Gagal restore backup";
        clearMessages();
      } finally {
        restoreLoading.value = false;
      }
    };

    // Validation
    const validateCompanyProfile = () => {
      const newErrors = {};

      if (!settings.value.companyName.trim()) {
        newErrors.companyName = "Nama toko harus diisi";
      }

      if (!settings.value.phone.trim()) {
        newErrors.phone = "Nomor telepon harus diisi";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    onMounted(async () => {
      await loadSettings();
    });

    return {
      settings,
      loading,
      backupLoading,
      restoreLoading,
      showRestoreDialog,
      errors,
      backupFiles,
      selectedBackup,
      lastBackupDate,
      successMessage,
      errorMessage,
      saveCompanyProfile,
      createBackup,
      restoreBackup,
    };
  },
};
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.settings-page .page-header {
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.settings-page .eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
  color: #7c3aed;
}

.header-meta {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: center;
}

.meta-chip {
  background: #f8fafc;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  border: 1px solid #e0e7ff;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
}

.meta-chip i {
  color: #7c3aed;
  font-size: 1.1rem;
}

.meta-chip > div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.meta-chip span {
  font-size: 0.75rem;
  color: #64748b;
}

.meta-chip strong {
  font-size: 0.9rem;
  color: #111827;
  font-weight: 600;
}

.meta-chip.secondary {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.settings-card {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-card.accent-card {
  background: linear-gradient(135deg, #f9fafc 0%, #f3f4f6 100%);
  border-color: #c7d2fe;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  margin: 0.5rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.checkbox-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-wrapper label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #334155;
  font-size: 0.95rem;
  cursor: pointer;
}


.checkbox-wrapper input {
  width: 16px;
  height: 16px;
}

.backup-panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px dashed #cbd5f5;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.backup-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.stat {
  background: #ffffff;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #e0e7ff;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat i {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.stat > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.stat span {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.stat strong {
  font-size: 1.1rem;
  color: #111827;
  font-weight: 600;
}

.backup-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.card-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.restore-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.warning-banner {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.warning-banner i {
  color: #d97706;
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.warning-banner p {
  margin: 0;
  color: #92400e;
  font-size: 0.9rem;
  line-height: 1.5;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.select-group .form-select {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-group .form-select:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.help-text {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
}

.success-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  animation: slideDown 0.3s ease-out;
}

.success-message {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 1px solid #10b981;
  color: #065f46;
}

.error-message {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 1px solid #ef4444;
  color: #991b1b;
}

.success-message i,
.error-message i {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.success-message span,
.error-message span {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
}

.close-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .header-meta {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .meta-chip {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .backup-stats {
    grid-template-columns: 1fr;
  }

  .backup-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .backup-actions .app-button {
    width: 100%;
  }

  .card-actions {
    justify-content: flex-start;
  }

  .card-actions .app-button {
    width: 100%;
  }

  .section-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-icon {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
}
</style>
