<template>
  <div class="data-page stock-page">
    <div class="page-header">
      <div>
        <h1>Pelanggan Teratas</h1>
        <p class="subtitle">
          Daftar pelanggan dengan jumlah transaksi terbanyak.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Pelanggan</span>
          <strong>{{ customers.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Transaksi Terbanyak</span>
          <strong>{{ stats.topTransactions }}</strong>
        </div>
        <div class="summary-card">
          <span>Rata-rata Transaksi</span>
          <strong>{{ stats.averageTransactions }}</strong>
        </div>
        <div class="summary-card">
          <span>Nama Teratas</span>
          <strong>{{ stats.topCustomer }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable :columns="columns" :items="customers" :loading="loading" />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchTopCustomers } from "@/services/reports";

export default {
  name: "TopCustomersView",
  components: { AppButton, DataTable },
  setup() {
    const customers = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      {
        key: "name",
        label: "Nama Pelanggan",
      },
      {
        key: "phone",
        label: "Nomor Telepon",
      },
      {
        key: "total_transactions",
        label: "Total Transaksi",
      },
    ];

    const stats = computed(() => {
      if (!customers.value.length) {
        return {
          topTransactions: 0,
          averageTransactions: 0,
          topCustomer: "-",
        };
      }

      const totalTransactions = customers.value.reduce(
        (sum, customer) => sum + (customer.total_transactions || 0),
        0,
      );
      const averageTransactions = (
        totalTransactions / customers.value.length
      ).toFixed(1);
      const topCustomer = customers.value[0]?.name ?? "-";
      const topTransactions = customers.value[0]?.total_transactions ?? 0;

      return {
        topTransactions,
        averageTransactions,
        topCustomer,
      };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        customers.value = await fetchTopCustomers();
      } catch (err) {
        error.value = err.message || "Gagal memuat data pelanggan.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      customers,
      loading,
      error,
      columns,
      stats,
      loadData,
    };
  },
};
</script>
