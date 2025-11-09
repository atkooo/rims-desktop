<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div>
        <h1>Pergerakan Stok</h1>
        <p class="subtitle">Jejak perubahan stok item dari database.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Record</span>
          <strong>{{ movements.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Masuk</span>
          <strong>{{ stats.inbound }}</strong>
        </div>
        <div class="summary-card">
          <span>Keluar</span>
          <strong>{{ stats.outbound }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable :columns="columns" :items="movements" :loading="loading" />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchStockMovements } from "@/services/transactions";

export default {
  name: "StockMovementsView",
  components: { AppButton, DataTable },
  setup() {
    const movements = ref([]);
    const loading = ref(false);
    const error = ref("");

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

    const columns = [
      { key: "item_name", label: "Item" },
      { key: "movement_type", label: "Jenis" },
      { key: "reference_type", label: "Referensi" },
      { key: "reference_id", label: "Ref ID" },
      { key: "quantity", label: "Qty" },
      { key: "stock_before", label: "Sebelum" },
      { key: "stock_after", label: "Sesudah" },
      { key: "user_name", label: "Petugas" },
      { key: "notes", label: "Catatan" },
      { key: "created_at", label: "Tanggal", format: formatDate },
    ];

    const stats = computed(() => {
      const inbound = movements.value.filter(
        (row) => row.movement_type === "IN",
      ).length;
      const outbound = movements.value.filter(
        (row) => row.movement_type === "OUT",
      ).length;
      return { inbound, outbound };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        movements.value = await fetchStockMovements();
      } catch (err) {
        error.value = err.message || "Gagal memuat pergerakan stok.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      movements,
      loading,
      error,
      columns,
      stats,
      loadData,
    };
  },
};
</script>
