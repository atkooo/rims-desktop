<template>
  <div class="data-page stock-page">
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

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
      <AppTable
        :columns="columns"
        :rows="alerts"
        :loading="loading"
        :searchable-keys="['code', 'name']"
        row-key="id"
        default-page-size="10"
      />
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import { fetchStockAlerts } from "@/services/reports";

export default {
  name: "StockAlertsView",
  components: { AppButton, AppTable },
  setup() {
    const alerts = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      { key: "code", label: "Kode Item", sortable: true },
      { key: "name", label: "Nama Item", sortable: true },
      { key: "stock_quantity", label: "Stok Saat Ini", sortable: true, align: "center" },
      { key: "min_stock_alert", label: "Batas Minimum", sortable: true, align: "center" },
      {
        key: "deficit",
        label: "Kekurangan",
        format: (value) => (value > 0 ? value : "-"),
        sortable: true,
        align: "center",
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
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
}

.summary-card span {
  display: block;
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.summary-card strong {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.table-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}
</style>
