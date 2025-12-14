<template>
  <div class="data-page sync-service-page admin-page">
    <div class="page-header">
      <div>
        <h1>RIMS Sync Service</h1>
        <p class="subtitle">
          Monitor status layanan sinkronisasi data ke Supabase. Service harus diaktifkan manual melalui aplikasi RIMS Sync Service.
        </p>
      </div>
    </div>

    <section class="card-section">
      <!-- Service Connection Status -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="link" :size="24" />
          </div>
          <div>
            <h2>Status Koneksi</h2>
            <p class="section-subtitle">
              Status koneksi ke sync service dan Supabase
            </p>
          </div>
        </header>

        <div class="connection-status">
          <div class="connection-item">
            <div class="connection-label">
              <Icon 
                :name="connectionStatus.serviceConnected ? 'check-circle' : 'x-circle'" 
                :size="20"
                :class="{ connected: connectionStatus.serviceConnected }"
              />
              <span>Sync Service</span>
            </div>
            <span class="connection-value" :class="{ connected: connectionStatus.serviceConnected }">
              {{ connectionStatus.serviceConnected ? 'Terhubung' : 'Tidak Terhubung' }}
            </span>
          </div>
          <div class="connection-item">
            <div class="connection-label">
              <Icon 
                :name="connectionStatus.supabaseConnected ? 'check-circle' : 'x-circle'" 
                :size="20"
                :class="{ connected: connectionStatus.supabaseConnected }"
              />
              <span>Supabase</span>
            </div>
            <span class="connection-value" :class="{ connected: connectionStatus.supabaseConnected }">
              {{ connectionStatus.supabaseConnected ? 'Terhubung' : 'Tidak Terhubung' }}
            </span>
          </div>
        </div>

        <div v-if="connectionStatus.error" class="error-banner">
          <Icon name="bell" :size="18" />
          <span>{{ connectionStatus.error }}</span>
        </div>

        <div class="card-actions">
          <AppButton
            variant="secondary"
            :loading="checkingConnection"
            @click="checkConnection"
          >
            <Icon name="refresh-cw" :size="16" /> Cek Koneksi
          </AppButton>
        </div>
      </div>

      <!-- Sync Statistics -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="bar-chart" :size="24" />
          </div>
          <div>
            <h2>Statistik Sinkronisasi</h2>
            <p class="section-subtitle">
              Ringkasan data yang perlu disinkronkan
            </p>
          </div>
        </header>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="shopping-bag" :size="24" />
            </div>
            <div class="stat-content">
              <span>Rental Pending</span>
              <strong>{{ stats.pendingRentals }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="tag" :size="24" />
            </div>
            <div class="stat-content">
              <span>Sales Pending</span>
              <strong>{{ stats.pendingSales }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="credit-card" :size="24" />
            </div>
            <div class="stat-content">
              <span>Payments Pending</span>
              <strong>{{ stats.pendingPayments }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="package" :size="24" />
            </div>
            <div class="stat-content">
              <span>Stock Movements Pending</span>
              <strong>{{ stats.pendingStockMovements }}</strong>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <AppButton
            variant="primary"
            :loading="syncing"
            @click="syncAllPending"
            :disabled="!connectionStatus.serviceConnected || syncing"
          >
            <Icon name="refresh-cw" :size="16" /> Sinkronkan Semua Pending
          </AppButton>
        </div>
        
        <div v-if="!connectionStatus.serviceConnected" class="info-banner" style="margin-top: 1rem;">
          <Icon name="info" :size="18" />
          <div>
            <strong>Sync Service Tidak Terhubung</strong>
            <p>Pastikan aplikasi RIMS Sync Service berjalan dan service sudah diaktifkan. Klik "Cek Koneksi" untuk memverifikasi koneksi.</p>
          </div>
        </div>
      </div>

      <!-- Auto Sync Settings -->
      <div class="settings-section">
        <header class="section-header">
          <div class="section-icon">
            <Icon name="refresh-cw" :size="24" />
          </div>
          <div>
            <h2>Sinkronisasi Otomatis</h2>
            <p class="section-subtitle">
              Aktifkan sinkronisasi otomatis untuk data pending secara berkala
            </p>
          </div>
        </header>

        <div class="auto-sync-section">
          <div class="toggle-group">
            <div class="toggle-label">
              <span class="toggle-title">Aktifkan Sinkronisasi Otomatis</span>
              <span class="toggle-description">
                Data pending akan disinkronkan secara otomatis berdasarkan interval yang ditentukan
              </span>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="autoSyncEnabled"
                @change="updateAutoSyncSettings"
                :disabled="updatingAutoSync"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div v-if="autoSyncEnabled" class="interval-settings">
            <label class="interval-label">
              <span>Interval Sinkronisasi (detik)</span>
              <input 
                type="number" 
                v-model.number="autoSyncIntervalSeconds"
                @change="updateAutoSyncSettings"
                :disabled="updatingAutoSync"
                min="60"
                step="60"
                class="interval-input"
              />
            </label>
            <p class="interval-help">
              Sinkronisasi akan berjalan setiap {{ formatInterval(autoSyncIntervalSeconds) }}
              ({{ autoSyncIntervalSeconds }} detik)
            </p>
          </div>

          <div v-if="autoSyncStatus.running" class="auto-sync-status">
            <Icon name="check-circle" :size="18" class="status-icon running" />
            <span>Sinkronisasi otomatis sedang berjalan</span>
          </div>
          <div v-else-if="autoSyncEnabled" class="auto-sync-status">
            <Icon name="alert-circle" :size="18" class="status-icon stopped" />
            <span>Sinkronisasi otomatis tidak berjalan</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Icon from '@/components/ui/Icon.vue';
import { invoke } from '@/services/ipc';
import { syncAllPending as syncAllPendingService, checkSyncServiceStatus } from '@/services/sync';
import { useNotification } from '@/composables/useNotification';
import { formatDateTime } from "@/utils/dateUtils";

export default {
  name: 'SyncServiceView',
  components: { AppButton, Icon },
  setup() {
    const { showNotification, showSuccess, showError } = useNotification();
    const serviceStatus = ref({
      running: false,
      port: 3001,
      pid: null,
      startTime: null,
      lastError: null
    });
    const connectionStatus = ref({
      serviceConnected: false,
      supabaseConnected: false,
      error: null
    });
    const stats = ref({
      pendingRentals: 0,
      pendingSales: 0,
      pendingPayments: 0,
      pendingStockMovements: 0
    });
    const actionLoading = ref(false);
    const refreshing = ref(false);
    const checkingConnection = ref(false);
    const syncing = ref(false);
    const updatingAutoSync = ref(false);
    const autoSyncEnabled = ref(false);
    const autoSyncIntervalSeconds = ref(300); // Default: 5 minutes = 300 seconds
    const autoSyncStatus = ref({
      running: false,
      enabled: false,
      interval: 300000
    });
    let statusInterval = null;

    const refreshStatus = async () => {
      refreshing.value = true;
      try {
        const result = await invoke('sync-service:get-status');
        if (result.success) {
          serviceStatus.value = { ...result.status };
        }
      } catch (error) {
        console.error('Error refreshing status:', error);
      } finally {
        refreshing.value = false;
      }
    };

    const checkConnection = async () => {
      checkingConnection.value = true;
      connectionStatus.value.error = null;
      try {
        const result = await checkSyncServiceStatus();
        if (result.success && result.status) {
          connectionStatus.value.serviceConnected = true;
          connectionStatus.value.supabaseConnected = result.status.supabase?.connected || false;
          
          // Show Supabase error if connection failed
          if (!connectionStatus.value.supabaseConnected && result.status.supabase?.error) {
            connectionStatus.value.error = `Supabase: ${result.status.supabase.error}`;
          }
        } else {
          connectionStatus.value.serviceConnected = false;
          connectionStatus.value.supabaseConnected = false;
          connectionStatus.value.error = result.error || 'Tidak dapat terhubung ke service';
        }
      } catch (error) {
        connectionStatus.value.serviceConnected = false;
        connectionStatus.value.supabaseConnected = false;
        connectionStatus.value.error = error.message || 'Error checking connection';
      } finally {
        checkingConnection.value = false;
      }
    };

    // Start/Stop/Restart functions removed - service must be controlled manually through rims-sync-service app

    const syncAllPending = async () => {
      syncing.value = true;
      try {
        const result = await syncAllPendingService();
        if (result.success && result.results) {
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
            showSuccess(`Sinkronisasi berhasil: ${totalSuccess} item disinkronkan`);
          } else {
            const message = `Sinkronisasi selesai: ${totalSuccess} berhasil, ${totalFailed} gagal. ` +
              `Sales: ${result.results.sales.success}/${result.results.sales.success + result.results.sales.failed}, ` +
              `Payments: ${result.results.payments.success}/${result.results.payments.success + result.results.payments.failed}`;
            
            if (totalFailed > 0) {
              showError(message, 'Sinkronisasi Gagal Sebagian');
            } else {
              showSuccess(message);
            }
          }
          await loadStats();
        } else {
          showError(result.error || 'Gagal sinkronisasi');
        }
      } catch (error) {
        console.error('Error syncing all pending:', error);
        showError(error.message || 'Error sinkronisasi. Pastikan sync service berjalan.');
      } finally {
        syncing.value = false;
      }
    };

    const loadStats = async () => {
      try {
        const result = await invoke('sync:get-pending-stats');
        if (result.success) {
          stats.value = result.stats;
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    const loadAutoSyncStatus = async () => {
      try {
        const result = await invoke('auto-sync:get-status');
        if (result.success && result.status) {
          autoSyncStatus.value = result.status;
          autoSyncEnabled.value = result.status.enabled || false;
          autoSyncIntervalSeconds.value = Math.round((result.status.interval || 300000) / 1000);
        }
      } catch (error) {
        console.error('Error loading auto sync status:', error);
      }
    };

    const updateAutoSyncSettings = async () => {
      updatingAutoSync.value = true;
      try {
        const intervalMs = autoSyncIntervalSeconds.value * 1000;
        const result = await invoke('auto-sync:update-settings', {
          enabled: autoSyncEnabled.value,
          interval: intervalMs
        });

        if (result.success) {
          if (autoSyncEnabled.value) {
            showSuccess('Pengaturan sinkronisasi otomatis berhasil diupdate');
          } else {
            showSuccess('Sinkronisasi otomatis dinonaktifkan');
          }
          await loadAutoSyncStatus();
        } else {
          showError(result.error || 'Gagal mengupdate pengaturan');
        }
      } catch (error) {
        console.error('Error updating auto sync settings:', error);
        showError(error.message || 'Error mengupdate pengaturan');
      } finally {
        updatingAutoSync.value = false;
      }
    };

    const formatInterval = (seconds) => {
      if (seconds < 60) {
        return `${seconds} detik`;
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} menit`;
      } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (minutes > 0) {
          return `${hours} jam ${minutes} menit`;
        }
        return `${hours} jam`;
      }
    };

    // Auto-start functionality removed - service must be started manually

    onMounted(async () => {
      await refreshStatus();
      await checkConnection();
      await loadStats();
      await loadAutoSyncStatus();
      
      // Auto-refresh status every 5 seconds
      statusInterval = setInterval(() => {
        refreshStatus();
        loadAutoSyncStatus();
        if (serviceStatus.value.running) {
          checkConnection();
        }
      }, 5000);
    });

    onUnmounted(() => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    });

    return {
      serviceStatus,
      connectionStatus,
      stats,
      actionLoading,
      refreshing,
      checkingConnection,
      syncing,
      updatingAutoSync,
      autoSyncEnabled,
      autoSyncIntervalSeconds,
      autoSyncStatus,
      formatDateTime,
      formatInterval,
      refreshStatus,
      checkConnection,
      syncAllPending,
      updateAutoSyncSettings
    };
  }
};
</script>

<style scoped>
.sync-service-page {
  padding: 2rem;
}

.settings-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.section-icon.running {
  background: #d1fae5;
  color: #10b981;
}

.section-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.status-value {
  font-size: 1rem;
  color: #111827;
  font-weight: 600;
}

.status-value.running {
  color: #10b981;
}

.connection-status {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.connection-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.connection-label .connected {
  color: #10b981;
}

.connection-value {
  font-weight: 600;
  color: #ef4444;
}

.connection-value.connected {
  color: #10b981;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-content span {
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-content strong {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  margin-bottom: 1rem;
  color: #1e40af;
}

.info-banner strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #1e40af;
}

.info-banner p {
  margin: 0;
  font-size: 0.875rem;
  color: #3b82f6;
  line-height: 1.5;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.auto-start-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.toggle-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.toggle-title {
  display: block;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.toggle-description {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #10b981;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.auto-sync-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.interval-settings {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.interval-label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.interval-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 200px;
}

.interval-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.interval-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.interval-help {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.auto-sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.875rem;
}

.status-icon.running {
  color: #10b981;
}

.status-icon.stopped {
  color: #f59e0b;
}
</style>
