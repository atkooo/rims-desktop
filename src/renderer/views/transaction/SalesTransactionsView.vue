<template>
  <div class="data-page">
    <div class="page-header">
      <div class="page-title">
        <p class="eyebrow">Penjualan</p>
        <h1>Transaksi Penjualan</h1>
        <p class="subtitle">
          Daftar transaksi penjualan tanpa fitur edit. Gunakan pencarian di
          navbar untuk mem-filter daftar ini.
        </p>
      </div>
      <div class="header-actions">
        <div class="search-state" v-if="searchTerm">
          <Icon name="search" size="14" />
          <span>Pencarian navbar: "{{ searchTerm }}"</span>
        </div>
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-icon summary-icon--primary">
          <Icon name="money" size="20" />
        </div>
        <div>
          <span>Total Penjualan</span>
          <strong>{{ stats.totalSales }}</strong>
          <small>dari {{ totalRecords }} transaksi</small>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon summary-icon--success">
          <Icon name="chart-line" size="20" />
        </div>
        <div>
          <span>Total Nilai</span>
          <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
          <small>Rata-rata {{ formatCurrency(stats.averageAmount) }}</small>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon summary-icon--info">
          <Icon name="clipboard" size="20" />
        </div>
        <div>
          <span>Lunas</span>
          <strong>{{ stats.paidSales }}</strong>
          <small>Sisa {{ stats.openSales }} transaksi</small>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div class="table-meta">
      <span>{{ filteredSales.length }} transaksi ditampilkan</span>
      <span v-if="searchTerm">Filter aktif dari navbar</span>
    </div>

    <DataTable :columns="columns" :items="filteredSales" :loading="loading" />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import Icon from "@/components/Icon.vue";
import AppButton from "@/components/AppButton.vue";
import DataTable from "@/components/DataTable.vue";
import { fetchSalesTransactions } from "@/services/transactions";
import { eventBus } from "@/utils/eventBus";

export default {
  name: "SalesTransactionsView",
  components: { AppButton, DataTable, Icon },
  setup() {
    const sales = ref([]);
    const loading = ref(false);
    const error = ref("");
    const searchTerm = ref("");
    let detachSearchListener;

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const columns = [
      { key: "transaction_code", label: "Kode" },
      { key: "customer_name", label: "Customer" },
      { key: "sale_date", label: "Tanggal", format: formatDate },
      { key: "total_amount", label: "Total", format: formatCurrency },
      { key: "payment_status", label: "Status Pembayaran" },
    ];

    const filteredSales = computed(() => {
      if (!searchTerm.value.trim()) return sales.value;
      const term = searchTerm.value.toLowerCase();
      return sales.value.filter((item) => {
        const code = item.transaction_code || item.transactionCode;
        const customer =
          item.customer_name || item.customerName || item.customer;
        const status = item.payment_status || item.paymentStatus;
        return [code, customer, status]
          .filter(Boolean)
          .some((field) => field.toString().toLowerCase().includes(term));
      });
    });

    const totalRecords = computed(() => sales.value.length);

    const stats = computed(() => {
      const source = filteredSales.value;
      const totalSales = source.length;
      const totalAmount = source.reduce(
        (sum, item) => sum + (item.total_amount || item.totalAmount || 0),
        0,
      );
      const paidSales = source.filter((item) => {
        const status = (
          item.payment_status ||
          item.paymentStatus ||
          ""
        ).toString();
        return status.toLowerCase() === "paid";
      }).length;
      const openSales = totalSales - paidSales;
      const averageAmount = totalSales ? totalAmount / totalSales : 0;
      return { totalSales, totalAmount, paidSales, openSales, averageAmount };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        sales.value = await fetchSalesTransactions();
      } catch (err) {
        error.value = err.message || "Gagal memuat data penjualan.";
      } finally {
        loading.value = false;
      }
    };

    const handleSearch = (query = "") => {
      searchTerm.value = query;
    };

    onMounted(() => {
      loadData();
      detachSearchListener = eventBus.on("global-search", handleSearch);
    });

    onBeforeUnmount(() => {
      if (detachSearchListener) {
        detachSearchListener();
      }
    });

    return {
      sales,
      filteredSales,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
      searchTerm,
      totalRecords,
    };
  },
};
</script>

<style scoped>
.data-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.page-title {
  max-width: 520px;
}

.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #818cf8;
  margin: 0 0 4px;
}

.page-title h1 {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
}

.subtitle {
  margin: 8px 0 0;
  color: #475569;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.search-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.summary-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.summary-card span {
  display: block;
  font-size: 13px;
  color: #64748b;
}

.summary-card strong {
  font-size: 24px;
  color: #0f172a;
}

.summary-card small {
  display: block;
  color: #94a3b8;
  margin-top: 4px;
  font-size: 12px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.summary-icon--primary {
  background: linear-gradient(135deg, #4f46e5, #818cf8);
}

.summary-icon--success {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.summary-icon--info {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
}

.error-banner {
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 10px;
}

.table-meta {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: 13px;
  color: #475569;
}
</style>
