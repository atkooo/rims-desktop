<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Transaksi Penjualan</h1>
        <p class="subtitle">Daftar transaksi penjualan tanpa fitur edit.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span>Total Penjualan</span>
        <strong>{{ stats.totalSales }}</strong>
      </div>
      <div class="summary-card">
        <span>Total Nilai</span>
        <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
      </div>
      <div class="summary-card">
        <span>Lunas</span>
        <strong>{{ stats.paidSales }}</strong>
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
import AppButton from "@/components/AppButton.vue";
import DataTable from "@/components/DataTable.vue";
import { fetchSalesTransactions } from "@/services/transactions";

export default {
  name: "SalesTransactionsView",
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
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const columns = [
      { key: "transaction_code", label: "Kode" },
      { key: "customer_name", label: "Customer" },
      { key: "sale_date", label: "Tanggal", format: formatDate },
      { key: "total_amount", label: "Total", format: formatCurrency },
      { key: "payment_status", label: "Status Pembayaran" },
    ];

    const stats = computed(() => {
      const totalSales = sales.value.length;
      const totalAmount = sales.value.reduce(
        (sum, item) => sum + (item.total_amount || 0),
        0,
      );
      const paidSales = sales.value.filter(
        (item) => item.payment_status === "paid",
      ).length;
      return { totalSales, totalAmount, paidSales };
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
