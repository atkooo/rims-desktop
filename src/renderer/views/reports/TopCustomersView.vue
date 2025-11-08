<template>
  <div class="report-page">
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

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <DataTable :columns="columns" :items="customers" :loading="loading" />
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
  font-size: 1.3rem;
  color: #111827;
}

.error-banner {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: #fee2e2;
  color: #991b1b;
}
</style>

