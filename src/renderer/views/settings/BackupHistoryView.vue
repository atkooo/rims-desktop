<template>
  <div class="data-page admin-page">
    <div class="page-header">
      <div>
        <h1>Riwayat Backup</h1>
        <p class="subtitle">Daftar backup database yang pernah dibuat.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadHistory">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Backup</span>
          <strong>{{ history.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Backup Otomatis</span>
          <strong>{{ stats.autoCount }}</strong>
        </div>
        <div class="summary-card">
          <span>Backup Manual</span>
          <strong>{{ stats.manualCount }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Ukuran</span>
          <strong>{{ stats.totalSize }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>
      <DataTable :columns="columns" :items="history" :loading="loading" />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchBackupHistory } from "@/services/settings";

export default {
  name: "BackupHistoryView",
  components: { AppButton, DataTable },
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

    const formatDateTime = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

    const columns = [
      { key: "backup_file", label: "Nama File" },
      { key: "backup_type", label: "Tipe" },
      {
        key: "file_size",
        label: "Ukuran",
        format: (value) => formatSize(value),
      },
      { key: "status", label: "Status" },
      { key: "user_name", label: "Dibuat Oleh" },
      {
        key: "created_at",
        label: "Tanggal",
        format: formatDateTime,
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
