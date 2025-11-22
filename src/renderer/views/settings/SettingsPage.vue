<template>
  <div class="data-page settings-page admin-page">
    <div class="page-header">
      <div>
        <h1>Pengaturan Aplikasi</h1>
        <p class="subtitle">
          Kelola profil toko, backup database, dan pengaturan printer agar
          operasional tetap lancar.
        </p>
      </div>
      <div class="header-meta">
        <div class="meta-chip" v-if="lastBackupDate">
          <Icon name="calendar" :size="18" />
          <div>
            <span>Backup terakhir</span>
            <strong>{{ lastBackupDate }}</strong>
          </div>
        </div>
      </div>
    </div>


    <section class="card-section">
      <!-- Profil Toko Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="box" :size="24" />
          </div>
          <div>
            <h2>Profil Toko</h2>
            <p class="section-subtitle">
              Informasi ini akan muncul di struk dan laporan agar pelanggan
              mengenali toko Anda dengan mudah.
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
            <Icon name="save" :size="16" /> Simpan Profil
          </AppButton>
        </div>
      </div>

      <!-- Database Backup Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="file" :size="24" />
          </div>
          <div>
            <h2>Database Backup</h2>
            <p class="section-subtitle">
              Cadangkan data secara rutin agar Anda bisa kembali pulih jika
              terjadi situasi tak terduga.
            </p>
          </div>
        </header>
        <div class="backup-panel">
          <div class="backup-stats">
            <div class="stat">
              <Icon name="file" :size="20" />
              <div>
                <span>File tersimpan</span>
                <strong>{{ backupFiles.length }}</strong>
              </div>
            </div>
            <div class="stat">
              <Icon name="calendar" :size="20" />
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
              <Icon name="save" :size="16" /> Backup Sekarang
            </AppButton>
            <AppButton
              variant="secondary"
              :disabled="backupFiles.length === 0"
              @click="showRestoreDialog = true"
            >
              <Icon name="file" :size="16" /> Restore Backup
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Tax Settings Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="tag" :size="24" />
          </div>
          <div>
            <h2>Pengaturan Pajak</h2>
            <p class="section-subtitle">
              Atur persentase pajak yang akan dihitung otomatis pada setiap
              transaksi penjualan atau sewa.
            </p>
          </div>
        </header>
        <div class="form-grid">
          <FormInput
            id="taxPercentage"
            label="Persentase Pajak (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            v-model.number="settings.taxPercentage"
            :error="errors.taxPercentage"
            placeholder="Contoh: 11 untuk 11%"
            hint="Pajak akan dihitung otomatis berdasarkan persentase ini pada setiap transaksi"
          />
        </div>
        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="loading"
            @click="saveTaxSettings"
          >
            <Icon name="save" :size="16" /> Simpan Pengaturan Pajak
          </AppButton>
        </div>
      </div>

      <!-- Printer & Struk Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="file" :size="24" />
          </div>
          <div>
            <h2>Pengaturan Printer & Struk</h2>
            <p class="section-subtitle">
              Kelola pengaturan printer dan tampilan struk transaksi untuk
              mencetak struk dengan benar.
            </p>
          </div>
        </header>
        <div class="card-actions">
          <AppButton
            variant="primary"
            @click="$router.push('/settings/receipt')"
          >
            <Icon name="settings" :size="16" /> Buka Pengaturan Printer & Struk
          </AppButton>
        </div>
      </div>

      <!-- Sync Service Section -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="refresh-cw" :size="24" />
          </div>
          <div>
            <h2>Sinkronisasi Data</h2>
            <p class="section-subtitle">
              Sinkronkan data transaksi ke Supabase melalui sync service. Data yang sudah disinkronkan akan ditandai dengan is_sync = 1.
            </p>
          </div>
        </header>
        <div class="sync-status" v-if="syncStatus">
          <div class="status-item" :class="{ 'status-success': syncStatus.success, 'status-error': !syncStatus.success }">
            <Icon :name="syncStatus.success ? 'check-circle' : 'x-circle'" :size="18" />
            <span>{{ syncStatus.success ? 'Sync service tersedia' : 'Sync service tidak tersedia' }}</span>
          </div>
        </div>
        <div class="card-actions">
          <AppButton
            variant="secondary"
            :loading="checkingStatus"
            @click="checkSyncStatus"
          >
            <Icon name="activity" :size="16" /> Cek Status Sync Service
          </AppButton>
          <AppButton
            variant="primary"
            :loading="syncing"
            @click="syncAllPending"
          >
            <Icon name="refresh-cw" :size="16" /> Sinkronkan Semua Data Pending
          </AppButton>
        </div>
        <div v-if="syncResults" class="sync-results">
          <h4>Hasil Sinkronisasi:</h4>
          <div class="results-grid">
            <div class="result-item">
              <span>Rental Transactions:</span>
              <strong :class="syncResults.rental.failed > 0 ? 'text-warning' : 'text-success'">
                {{ syncResults.rental.success }} berhasil, {{ syncResults.rental.failed }} gagal
              </strong>
            </div>
            <div class="result-item">
              <span>Sales Transactions:</span>
              <strong :class="syncResults.sales.failed > 0 ? 'text-warning' : 'text-success'">
                {{ syncResults.sales.success }} berhasil, {{ syncResults.sales.failed }} gagal
              </strong>
            </div>
            <div class="result-item">
              <span>Payments:</span>
              <strong :class="syncResults.payments.failed > 0 ? 'text-warning' : 'text-success'">
                {{ syncResults.payments.success }} berhasil, {{ syncResults.payments.failed }} gagal
              </strong>
            </div>
            <div class="result-item">
              <span>Stock Movements:</span>
              <strong :class="syncResults.stockMovements.failed > 0 ? 'text-warning' : 'text-success'">
                {{ syncResults.stockMovements.success }} berhasil, {{ syncResults.stockMovements.failed }} gagal
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Restore Backup Dialog -->
    <AppDialog
      v-model="showRestoreDialog"
      title="Restore Backup"
      confirm-text="Lanjut"
      cancel-text="Batal"
      :loading="false"
      @confirm="showConfirmRestoreDialog = true"
    >
      <div class="restore-dialog">
        <div class="warning-banner">
          <Icon name="bell" :size="20" />
          <p>
            Restore akan mengganti data saat ini dengan data dari backup.
            Pastikan Anda telah menyimpan semua pekerjaan terbaru sebelum
            melanjutkan.
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

    <!-- Confirm Restore Dialog with Countdown -->
    <AppDialog
      v-model="showConfirmRestoreDialog"
      title="Konfirmasi Restore Backup"
      :show-footer="true"
      :confirm-text="confirmRestoreButtonText"
      :cancel-text="'Batal'"
      :loading="restoreLoading"
      :confirm-disabled="!canConfirmRestore"
      confirm-variant="danger"
      @confirm="handleConfirmRestore"
      @cancel="showConfirmRestoreDialog = false"
      :max-width="500"
    >
      <div class="confirm-restore-dialog">
        <div class="warning-banner-danger">
          <Icon name="alert-triangle" :size="24" />
          <div>
            <h3>Peringatan!</h3>
            <p>
              Restore backup akan <strong>mengganti semua data saat ini</strong> dengan data dari backup.
              Proses ini <strong>tidak dapat dibatalkan</strong> dan akan menyebabkan aplikasi restart.
            </p>
            <p>
              Pastikan Anda telah:
            </p>
            <ul>
              <li>Menyimpan semua pekerjaan terbaru</li>
              <li>Memilih file backup yang benar</li>
              <li>Memahami bahwa data saat ini akan hilang</li>
            </ul>
          </div>
        </div>
        <div class="countdown-info" v-if="restoreCountdown > 0">
          <p>
            Tombol "Ya, Restore" akan aktif dalam <strong>{{ restoreCountdown }}</strong> detik...
          </p>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { ipcRenderer } from "@/services/ipc";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import { useNotification } from "@/composables/useNotification";
import { checkSyncServiceStatus, syncAllPending } from "@/services/sync";

export default {
  name: "SettingsPage",

  components: {
    AppButton,
    AppDialog,
    FormInput,
    Icon,
  },

  setup() {
    const { showSuccess, showError } = useNotification();
    const loading = ref(false);
    const backupLoading = ref(false);
    const restoreLoading = ref(false);
    const showRestoreDialog = ref(false);
    const showConfirmRestoreDialog = ref(false);
    const restoreCountdown = ref(3);
    let restoreCountdownTimer = null;
    const errors = ref({});
    const backupFiles = ref([]);
    const selectedBackup = ref("");
    const syncing = ref(false);
    const checkingStatus = ref(false);
    const syncStatus = ref(null);
    const syncResults = ref(null);
    const lastBackupDate = ref(null);

    const settings = ref({
      companyName: "",
      address: "",
      phone: "",
      taxPercentage: 0,
    });

    // Clear messages after 5 seconds
    const clearMessages = () => {
      setTimeout(() => {
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
        showError("Gagal memuat pengaturan");
        clearMessages();
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
        showSuccess("Profil toko berhasil disimpan");
        clearMessages();
      } catch (error) {
        console.error("Error saving company profile:", error);
        showError("Gagal menyimpan profil toko");
        clearMessages();
      } finally {
        loading.value = false;
      }
    };

    // Save tax settings
    const saveTaxSettings = async () => {
      if (!validateTaxSettings()) return;

      loading.value = true;
      try {
        await ipcRenderer.invoke("settings:save", {
          taxPercentage: settings.value.taxPercentage,
        });
        showSuccess("Pengaturan pajak berhasil disimpan");
        clearMessages();
      } catch (error) {
        console.error("Error saving tax settings:", error);
        showError("Gagal menyimpan pengaturan pajak");
        clearMessages();
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
        showSuccess("Backup berhasil dibuat");
        clearMessages();
      } catch (error) {
        console.error("Error creating backup:", error);
        showError("Gagal membuat backup");
        clearMessages();
      } finally {
        backupLoading.value = false;
      }
    };

    // Restore backup
    const confirmRestoreButtonText = computed(() => {
      if (restoreCountdown.value > 0) {
        return `Ya, Restore (${restoreCountdown.value})`;
      }
      return "Ya, Restore";
    });

    const canConfirmRestore = computed(() => {
      return restoreCountdown.value === 0 && !restoreLoading.value;
    });

    // Watch for confirm dialog open to start countdown
    watch(showConfirmRestoreDialog, (newValue) => {
      if (newValue) {
        restoreCountdown.value = 3;
        if (restoreCountdownTimer) {
          clearInterval(restoreCountdownTimer);
        }
        restoreCountdownTimer = setInterval(() => {
          restoreCountdown.value--;
          if (restoreCountdown.value <= 0) {
            clearInterval(restoreCountdownTimer);
            restoreCountdownTimer = null;
          }
        }, 1000);
      } else {
        if (restoreCountdownTimer) {
          clearInterval(restoreCountdownTimer);
          restoreCountdownTimer = null;
        }
        restoreCountdown.value = 3;
      }
    });

    const handleConfirmRestore = async () => {
      if (!canConfirmRestore.value) {
        return;
      }
      await restoreBackup();
    };

    const restoreBackup = async () => {
      if (!selectedBackup.value) {
        showError("Pilih file backup terlebih dahulu");
        clearMessages();
        showConfirmRestoreDialog.value = false;
        return;
      }

      restoreLoading.value = true;
      try {
        await ipcRenderer.invoke("backup:restore", selectedBackup.value);
        showRestoreDialog.value = false;
        showConfirmRestoreDialog.value = false;
        selectedBackup.value = "";
        showSuccess("Backup berhasil direstore. Aplikasi akan restart...");
        
        // Reload aplikasi setelah 1 detik
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Error restoring backup:", error);
        showError(error);
        clearMessages();
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

    const validateTaxSettings = () => {
      const newErrors = {};

      if (
        settings.value.taxPercentage === null ||
        settings.value.taxPercentage === undefined ||
        settings.value.taxPercentage < 0
      ) {
        newErrors.taxPercentage = "Persentase pajak harus lebih besar atau sama dengan 0";
      }

      if (settings.value.taxPercentage > 100) {
        newErrors.taxPercentage = "Persentase pajak tidak boleh lebih dari 100%";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    onMounted(async () => {
      await loadSettings();
    });

    onBeforeUnmount(() => {
      if (restoreCountdownTimer) {
        clearInterval(restoreCountdownTimer);
        restoreCountdownTimer = null;
      }
    });

    // Sync functions
    const checkSyncStatus = async () => {
      checkingStatus.value = true;
      try {
        const result = await checkSyncServiceStatus();
        syncStatus.value = result;
        if (result.success) {
          showSuccess("Sync service tersedia dan berjalan");
        } else {
          showError(`Sync service tidak tersedia: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error("Error checking sync status:", error);
        showError("Gagal mengecek status sync service");
        syncStatus.value = { success: false, error: error.message };
      } finally {
        checkingStatus.value = false;
      }
    };

    const syncAllPendingData = async () => {
      syncing.value = true;
      syncResults.value = null;
      try {
        const result = await syncAllPending();
        if (result.success) {
          syncResults.value = result.results;
          const totalSuccess = 
            result.results.rental.success + 
            result.results.sales.success + 
            result.results.payments.success + 
            result.results.stockMovements.success;
          const totalFailed = 
            result.results.rental.failed + 
            result.results.sales.failed + 
            result.results.payments.failed + 
            result.results.stockMovements.failed;
          
          if (totalFailed === 0) {
            showSuccess(`Semua data berhasil disinkronkan (${totalSuccess} item)`);
          } else {
            showError(`Sinkronisasi selesai: ${totalSuccess} berhasil, ${totalFailed} gagal`);
          }
        } else {
          showError(`Gagal sinkronisasi: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error("Error syncing all pending:", error);
        showError("Gagal melakukan sinkronisasi");
      } finally {
        syncing.value = false;
      }
    };

    return {
      settings,
      loading,
      backupLoading,
      restoreLoading,
      showRestoreDialog,
      showConfirmRestoreDialog,
      restoreCountdown,
      confirmRestoreButtonText,
      canConfirmRestore,
      errors,
      backupFiles,
      selectedBackup,
      lastBackupDate,
      saveCompanyProfile,
      saveTaxSettings,
      createBackup,
      restoreBackup,
      handleConfirmRestore,
      syncing,
      checkingStatus,
      syncStatus,
      syncResults,
      checkSyncStatus,
      syncAllPending: syncAllPendingData,
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

.meta-chip .icon {
  color: #7c3aed;
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

.settings-section {
  padding: 1.75rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section:first-child {
  padding-top: 0;
}

.settings-section:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
  padding-bottom: 1.75rem;
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
  flex-shrink: 0;
}

.section-icon .icon {
  color: white;
}

.section-icon .icon svg {
  color: white;
  stroke: white;
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

.stat .icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat .icon svg {
  color: white;
  stroke: white;
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

.confirm-restore-dialog {
  padding: 0.5rem 0;
}

.warning-banner-danger {
  background-color: #fef2f2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.warning-banner-danger .icon {
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.warning-banner-danger h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #991b1b;
}

.warning-banner-danger p {
  margin: 0.5rem 0;
  color: #7f1d1d;
  font-size: 0.9rem;
  line-height: 1.6;
}

.warning-banner-danger ul {
  margin: 0.75rem 0 0 1.5rem;
  padding: 0;
  color: #7f1d1d;
  font-size: 0.9rem;
}

.warning-banner-danger li {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.warning-banner-danger strong {
  color: #991b1b;
  font-weight: 600;
}

.countdown-info {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  text-align: center;
}

.countdown-info p {
  margin: 0;
  color: #92400e;
  font-size: 0.9rem;
}

.countdown-info strong {
  color: #d97706;
  font-weight: 600;
  font-size: 1.1rem;
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

.warning-banner .icon {
  color: #d97706;
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
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
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

.success-message .icon,
.error-message .icon {
  flex-shrink: 0;
  color: inherit;
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

.sync-status {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-item.status-success {
  color: #059669;
}

.status-item.status-error {
  color: #dc2626;
}

.sync-results {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.sync-results h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.result-item span {
  color: #6b7280;
}

.result-item strong {
  font-weight: 600;
}

.text-success {
  color: #059669;
}

.text-warning {
  color: #d97706;
}

@media (max-width: 768px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>
