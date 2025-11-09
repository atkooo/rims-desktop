<template>
  <div class="report-page">
    <div class="page-header">
      <div>
        <h1>Peringatan Stok</h1>
        <p class="subtitle">
          Daftar item yang sudah menyentuh atau melewati batas minimum stok.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Item Perlu Perhatian</span>
          <strong>{{ alerts.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Stok Terendah</span>
          <strong>{{ stats.lowestStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Rata-rata Kekurangan</span>
          <strong>{{ stats.avgDeficit }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Kekurangan</span>
          <strong>{{ stats.totalDeficit }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable :columns="columns" :items="alerts" :loading="loading" />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchStockAlerts } from "@/services/reports";

export default {
  name: "StockAlertsView",
  components: { AppButton, DataTable },
  setup() {
    const alerts = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      { key: "code", label: "Kode Item" },
      { key: "name", label: "Nama Item" },
      { key: "stock_quantity", label: "Stok Saat Ini" },
      { key: "min_stock_alert", label: "Batas Minimum" },
      {
        key: "deficit",
        label: "Kekurangan",
        format: (value) => (value > 0 ? value : "-"),
      },
    ];

    const stats = computed(() => {
      if (!alerts.value.length) {
        return {
          lowestStock: 0,
          avgDeficit: 0,
          totalDeficit: 0,
        };
      }

      const totalDeficit = alerts.value.reduce(
        (sum, item) => sum + item.deficit,
        0,
      );
      const avgDeficit = totalDeficit
        ? (totalDeficit / alerts.value.length).toFixed(1)
        : 0;
      const lowestStock = Math.min(
        ...alerts.value.map((item) => item.stock_quantity || 0),
      );

      return {
        lowestStock,
        avgDeficit,
        totalDeficit,
      };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        const rows = await fetchStockAlerts();
        alerts.value = rows.map((item) => ({
          ...item,
          deficit: Math.max(
            (item.min_stock_alert || 0) - (item.stock_quantity || 0),
            0,
          ),
        }));
      } catch (err) {
        error.value = err.message || "Gagal memuat data peringatan stok.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      alerts,
      columns,
      loading,
      error,
      stats,
      loadData,
    };
  },
};
</script>

<style scoped>
.report-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #4b5563;
}

.summary-card strong {
  font-size: 1.4rem;
  color: #111827;
}

.error-banner {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: #fee2e2;
  color: #991b1b;
}
</style>
