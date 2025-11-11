<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Pergerakan Stok</h1>
          <p class="subtitle">
            Kelola pergerakan stok masuk dan keluar untuk item.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" :loading="loading" @click="loadData">
            Refresh Data
          </AppButton>
          <AppButton variant="primary" @click="showForm = true">
            Pergerakan Baru
          </AppButton>
        </div>
      </div>
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

      <DataTable
        :columns="columns"
        :items="movements"
        :loading="loading"
        :actions="false"
      />
    </section>

    <!-- Stock Movement Form Dialog -->
    <StockMovementForm v-model="showForm" @saved="handleSaved" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import StockMovementForm from "@/components/modules/stock/StockMovementForm.vue";
import {
  fetchStockMovements,
  createStockMovement,
} from "@/services/transactions";

export default {
  name: "StockMovementsView",
  components: { AppButton, DataTable, StockMovementForm },
  setup() {
    const movements = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);

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

    // Handle save
    const handleSaved = async () => {
      showForm.value = false;
      await loadData();
    };

    // Stock movements are audit trail - deletion not allowed from frontend

    onMounted(loadData);

    return {
      movements,
      loading,
      error,
      columns,
      stats,
      loadData,
      showForm,
      handleSaved,
    };
  },
};
</script>
