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
        <div class="meta-chip">
          <span>Backup terakhir</span>
          <strong>{{ lastBackupDate || "Belum ada backup" }}</strong>
        </div>
        <div class="meta-chip secondary">
          <span>Printer aktif</span>
          <strong>{{ settings.printer || "Belum dipilih" }}</strong>
        </div>
      </div>
    </div>

    <div class="settings-grid">
      <section class="settings-card card-section">
        <header class="section-header">
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
          />
          <FormInput
            id="address"
            label="Alamat"
            type="textarea"
            v-model="settings.address"
          />
          <FormInput
            id="phone"
            label="Nomor Telepon"
            v-model="settings.phone"
            :error="errors.phone"
          />
        </div>
        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="loading"
            @click="saveCompanyProfile"
          >
            Simpan Profil
          </AppButton>
        </div>
      </section>

      <section class="settings-card card-section accent-card">
        <header class="section-header">
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
              <span>File tersimpan</span>
              <strong>{{ backupFiles.length }}</strong>
            </div>
            <div class="stat">
              <span>Backup terakhir</span>
              <strong>{{ lastBackupDate || "Belum ada" }}</strong>
            </div>
          </div>
          <div class="backup-actions">
            <AppButton
              variant="primary"
              :loading="backupLoading"
              @click="createBackup"
            >
              Backup Sekarang
            </AppButton>
            <AppButton
              variant="secondary"
              :loading="restoreLoading"
              @click="showRestoreDialog = true"
            >
              Restore Backup
            </AppButton>
          </div>
        </div>
      </section>

      <section class="settings-card card-section">
        <header class="section-header">
          <div>
            <h2>Pengaturan Printer</h2>
            <p class="section-subtitle">
              Sesuaikan printer agar struk tercetak rapi sesuai ukuran kertas di toko Anda.
            </p>
          </div>
        </header>
        <div class="form-grid">
          <div class="select-group">
            <label>Printer Receipt</label>
            <select v-model="settings.printer" class="form-select">
              <option
                v-for="printer in printers"
                :key="printer"
                :value="printer"
              >
                {{ printer }}
              </option>
            </select>
          </div>
          <FormInput
            id="paperWidth"
            label="Lebar Kertas (mm)"
            type="number"
            v-model.number="settings.paperWidth"
          />
        </div>
        <div class="checkbox-wrapper">
          <label>
            <input type="checkbox" v-model="settings.autoPrint" />
            Auto-print setelah transaksi
          </label>
        </div>
        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="loading"
            @click="savePrinterSettings"
          >
            Simpan Pengaturan
          </AppButton>
        </div>
      </section>
    </div>

    <!-- Restore Backup Dialog -->
    <AppDialog
      v-model="showRestoreDialog"
      title="Restore Backup"
      confirm-text="Restore"
      :loading="restoreLoading"
      @confirm="restoreBackup"
    >
      <div class="restore-dialog">
        <p class="warning-text">
          Restore akan mengganti data saat ini dengan data dari backup. Pastikan Anda telah menyimpan semua pekerjaan terbaru sebelum melanjutkan.
        </p>

        <div class="select-group">
          <label>Pilih Backup File</label>
          <select v-model="selectedBackup" class="form-select">
            <option v-for="backup in backupFiles" :key="backup" :value="backup">
              {{ backup }}
            </option>
          </select>
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
    const printers = ref([]);
    const backupFiles = ref([]);
    const selectedBackup = ref("");
    const lastBackupDate = ref(null);

    const settings = ref({
      companyName: "",
      address: "",
      phone: "",
      printer: "",
      paperWidth: 80,
      autoPrint: true,
    });

    // Load settings
    const loadSettings = async () => {
      try {
        const savedSettings = await ipcRenderer.invoke("settings:get");
        if (savedSettings) {
          settings.value = { ...settings.value, ...savedSettings };
        }

        // Load printers list
        const printersList = await ipcRenderer.invoke("printer:list");
        printers.value = printersList;

        // Load backup files
        const backups = await ipcRenderer.invoke("backup:list");
        backupFiles.value = backups;

        // Get last backup date
        const lastBackup = await ipcRenderer.invoke("backup:getLastDate");
        if (lastBackup) {
          lastBackupDate.value = new Date(lastBackup).toLocaleString();
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    // Save company profile
    const saveCompanyProfile = async () => {
      if (!validateCompanyProfile()) return;

      loading.value = true;
      try {
        await ipcRenderer.invoke("settings:save", {
          companyName: settings.value.companyName,
          address: settings.value.address,
          phone: settings.value.phone,
        });
      } catch (error) {
        console.error("Error saving company profile:", error);
      } finally {
        loading.value = false;
      }
    };

    // Save printer settings
    const savePrinterSettings = async () => {
      loading.value = true;
      try {
        await ipcRenderer.invoke("settings:save", {
          printer: settings.value.printer,
          paperWidth: settings.value.paperWidth,
          autoPrint: settings.value.autoPrint,
        });
      } catch (error) {
        console.error("Error saving printer settings:", error);
      } finally {
        loading.value = false;
      }
    };

    // Create backup
    const createBackup = async () => {
      backupLoading.value = true;
      try {
        await ipcRenderer.invoke("backup:create");
        await loadSettings(); // Reload backup list and last backup date
      } catch (error) {
        console.error("Error creating backup:", error);
      } finally {
        backupLoading.value = false;
      }
    };

    // Restore backup
    const restoreBackup = async () => {
      if (!selectedBackup.value) return;

      restoreLoading.value = true;
      try {
        await ipcRenderer.invoke("backup:restore", selectedBackup.value);
        showRestoreDialog.value = false;
      } catch (error) {
        console.error("Error restoring backup:", error);
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

    onMounted(loadSettings);

    return {
      settings,
      loading,
      backupLoading,
      restoreLoading,
      showRestoreDialog,
      errors,
      printers,
      backupFiles,
      selectedBackup,
      lastBackupDate,
      saveCompanyProfile,
      savePrinterSettings,
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
  border-radius: 999px;
  padding: 0.6rem 1rem;
  border: 1px solid #e0e7ff;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 150px;
}

.meta-chip span {
  font-size: 0.75rem;
  color: #64748b;
}

.meta-chip strong {
  font-size: 0.9rem;
  color: #111827;
}

.meta-chip.secondary {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.settings-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-card.accent-card {
  background-color: #f9fafc;
  border-color: #c7d2fe;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.section-subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.checkbox-wrapper label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #334155;
  font-size: 0.95rem;
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
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.stat {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.75rem;
  border: 1px solid #e0e7ff;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat span {
  font-size: 0.75rem;
  color: #64748b;
}

.stat strong {
  font-size: 1.2rem;
  color: #111827;
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
  gap: 1rem;
}

.warning-text {
  color: #991b1b;
  background-color: #fee2e2;
  padding: 1rem;
  border-radius: 6px;
  margin: 0;
}

@media (max-width: 640px) {
  .header-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .backup-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .card-actions {
    justify-content: flex-start;
  }
}
</style>
