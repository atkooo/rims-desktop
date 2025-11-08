<template>
  <div class="report-page">
    <div class="page-header">
      <div>
        <h1>Penjualan Harian</h1>
        <p class="subtitle">
          Ringkasan transaksi penjualan harian tanpa perlu ekspor manual.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span>Total Hari</span>
        <strong>{{ sales.length }}</strong>
      </div>
      <div class="summary-card">
        <span>Total Transaksi</span>
        <strong>{{ stats.totalTransactions }}</strong>
      </div>
      <div class="summary-card">
        <span>Total Penjualan</span>
        <strong>{{ formatCurrency(stats.totalSales) }}</strong>
      </div>
      <div class="summary-card">
        <span>Rata-rata per Hari</span>
        <strong>{{ formatCurrency(stats.averageSales) }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <DataTable :columns="columns" :items="sales" :loading="loading" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchDailySales } from "@/services/reports";

export default {
  name: "DailySalesView",
  components: { AppButton, DataTable },
  setup() {
    const sales = ref([]);
    const loading = ref(false);
    const error = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value
        ? new Date(value).toLocaleDateString("id-ID", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-";

    const columns = [
      {
        key: "sale_date",
        label: "Tanggal",
        format: formatDate,
      },
      { key: "total_transactions", label: "Total Transaksi" },
      {
        key: "total_sales",
        label: "Total Penjualan",
        format: formatCurrency,
      },
      {
        key: "total_discount",
        label: "Total Diskon",
        format: formatCurrency,
      },
    ];

    const stats = computed(() => {
      const totalTransactions = sales.value.reduce(
        (sum, day) => sum + (day.total_transactions || 0),
        0,
      );
      const totalSales = sales.value.reduce(
        (sum, day) => sum + (day.total_sales || 0),
        0,
      );
      const averageSales = sales.value.length
        ? totalSales / sales.value.length
        : 0;

      return { totalTransactions, totalSales, averageSales };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        sales.value = await fetchDailySales();
      } catch (err) {
        error.value = err.message || "Gagal memuat data penjualan harian.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      sales,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
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
  background-color: white;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
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

