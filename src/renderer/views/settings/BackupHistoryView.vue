<template>
  <div class="data-page backup-history-page admin-page">
    <div class="page-header">
      <div>
        <h1>Riwayat Backup</h1>
        <p class="subtitle">
          Daftar backup database yang pernah dibuat. Lakukan backup secara rutin
          untuk menjaga keamanan data.
        </p>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon">
            <Icon name="file" :size="24" />
          </div>
          <div class="summary-content">
            <span>Total Backup</span>
            <strong>{{ history.length }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon automatic">
            <Icon name="settings" :size="24" />
          </div>
          <div class="summary-content">
            <span>Backup Otomatis</span>
            <strong>{{ stats.autoCount }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon manual">
            <Icon name="user" :size="24" />
          </div>
          <div class="summary-content">
            <span>Backup Manual</span>
            <strong>{{ stats.manualCount }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon size">
            <Icon name="box" :size="24" />
          </div>
          <div class="summary-content">
            <span>Total Ukuran</span>
            <strong>{{ stats.totalSize }}</strong>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        <Icon name="bell" :size="18" />
        <span>{{ error }}</span>
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="history"
          :loading="loading"
          :searchable-keys="[
            'backup_file',
            'backup_type',
            'status',
            'user_name',
          ]"
          row-key="id"
          :default-page-size="10"
        />
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchBackupHistory } from "@/services/settings";
import { formatDateTime } from "@/utils/dateUtils";

export default {
  name: "BackupHistoryView",
  components: { AppButton, AppTable, Icon },
  setup() {
    const history = ref([]);
    const loading = ref(false);
    const error = ref("");

    const formatSize = (bytes) => {
      if (!bytes && bytes !== 0) return "-";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const columns = [
      { key: "backup_file", label: "Nama File", sortable: true },
      { key: "backup_type", label: "Tipe", sortable: true },
      {
        key: "file_size",
        label: "Ukuran",
        format: (value) => formatSize(value),
        sortable: true,
        align: "right",
      },
      { key: "status", label: "Status", sortable: true },
      { key: "user_name", label: "Dibuat Oleh", sortable: true },
      {
        key: "created_at",
        label: "Tanggal",
        format: formatDateTime,
        sortable: true,
      },
    ];

    const stats = computed(() => {
      const autoCount = history.value.filter(
        (row) => row.backup_type === "automatic",
      ).length;
      const manualCount = history.value.filter(
        (row) => row.backup_type === "manual",
      ).length;
      const totalSizeBytes = history.value.reduce(
        (sum, row) => sum + (row.file_size || 0),
        0,
      );
      return {
        autoCount,
        manualCount,
        totalSize: formatSize(totalSizeBytes),
      };
    });

    const loadHistory = async () => {
      loading.value = true;
      error.value = "";
      try {
        history.value = await fetchBackupHistory();
      } catch (err) {
        error.value = err.message || "Gagal memuat riwayat backup.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadHistory);

    return {
      history,
      loading,
      error,
      columns,
      stats,
      loadHistory,
    };
  },
};
</script>

<style scoped>
.backup-history-page {
  width: 100%;
}

.backup-history-page .page-header {
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.backup-history-page .eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
  color: #7c3aed;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-icon {
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

.summary-icon .icon {
  color: white;
}

.summary-icon .icon svg {
  color: white;
  stroke: white;
}

.summary-icon.automatic {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
}

.summary-icon.manual {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

.summary-icon.size {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.summary-content span {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-content strong {
  font-size: 1.5rem;
  color: #111827;
  font-weight: 700;
}

.error-banner {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 1px solid #ef4444;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #991b1b;
}

.error-banner .icon {
  flex-shrink: 0;
  color: #991b1b;
}

.error-banner span {
  flex: 1;
  font-weight: 500;
}

.table-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .header-actions .app-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
