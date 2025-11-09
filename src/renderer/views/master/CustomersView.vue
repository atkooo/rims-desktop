<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Data Pelanggan</h1>
        <p class="subtitle">
          Informasi pelanggan dari database tanpa aksi CRUD.
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
          <strong>{{ stats.totalCustomers }}</strong>
        </div>
        <div class="summary-card">
          <span>Pelanggan Aktif</span>
          <strong>{{ stats.activeCustomers }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Transaksi</span>
          <strong>{{ stats.totalTransactions }}</strong>
        </div>
        <div class="summary-card">
          <span>Rata-rata Transaksi</span>
          <strong>{{ stats.avgTransactions }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <AppTable
        :columns="columns"
        :rows="customers"
        :loading="loading"
        :searchable-keys="['code', 'name', 'phone', 'email']"
        row-key="id"
      >
        <template #cell-is_active="{ row }">
          {{ row.is_active ? "Aktif" : "Nonaktif" }}
        </template>
        <template #cell-created_at="{ row }">
          {{
            row.created_at
              ? new Date(row.created_at).toLocaleDateString("id-ID")
              : "-"
          }}
        </template>
      </AppTable>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import { fetchCustomers } from "@/services/masterData";

export default {
  name: "CustomersView",
  components: { AppButton, AppTable },
  setup() {
    const customers = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "phone", label: "Telepon" },
      { key: "email", label: "Email" },
      { key: "total_transactions", label: "Total Transaksi" },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Nonaktif"),
      },
      {
        key: "created_at",
        label: "Dibuat",
        format: (value) =>
          value ? new Date(value).toLocaleDateString("id-ID") : "-",
      },
    ];

    const stats = computed(() => {
      const totalCustomers = customers.value.length;
      const activeCustomers = customers.value.filter(
        (customer) => customer.is_active,
      ).length;
      const totalTransactions = customers.value.reduce(
        (sum, customer) => sum + (customer.total_transactions || 0),
        0,
      );
      const avgTransactions = totalCustomers
        ? (totalTransactions / totalCustomers).toFixed(1)
        : 0;

      return {
        totalCustomers,
        activeCustomers,
        totalTransactions,
        avgTransactions,
      };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        customers.value = await fetchCustomers();
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
