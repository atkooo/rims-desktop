<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>Pengaturan Aplikasi</h1>
    </div>

    <div class="settings-container">
      <!-- Company Profile -->
      <div class="settings-section">
        <h2>Profil Toko</h2>
        <div class="form-group">
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
        <AppButton
          variant="primary"
          :loading="loading"
          @click="saveCompanyProfile"
        >
          Simpan Profil
        </AppButton>
      </div>

      <!-- Backup Settings -->
      <div class="settings-section">
        <h2>Database Backup</h2>
        <div class="backup-info">
          <p>Last backup: {{ lastBackupDate || "Belum ada backup" }}</p>
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
      </div>

      <!-- Printer Settings -->
      <div class="settings-section">
        <h2>Pengaturan Printer</h2>
        <div class="form-group">
          <div class="form-row">
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
          <div class="checkbox-group">
            <label>
              <input type="checkbox" v-model="settings.autoPrint" />
              Auto-print setelah transaksi
            </label>
          </div>
        </div>
        <AppButton
          variant="primary"
          :loading="loading"
          @click="savePrinterSettings"
        >
          Simpan Pengaturan
        </AppButton>
      </div>
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
          ⚠️ Restore akan mengganti data saat ini dengan data dari backup.
          Pastikan Anda telah membuat backup terlebih dahulu.
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
import AppButton from "../components/AppButton.vue";
import AppDialog from "../components/AppDialog.vue";
import FormInput from "../components/FormInput.vue";

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
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.settings-container {
  display: grid;
  gap: 2rem;
  max-width: 800px;
}

.settings-section {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #374151;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-group label {
  font-weight: 500;
}

.form-select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 1rem;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.backup-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.backup-actions {
  display: flex;
  gap: 1rem;
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
  border-radius: 4px;
  margin: 0;
}
</style>
