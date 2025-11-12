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

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
      <AppTable
        :columns="columns"
        :rows="movements"
        :loading="loading"
        :searchable-keys="['item_name', 'movement_type', 'reference_type', 'user_name', 'notes']"
        row-key="id"
        default-page-size="10"
      />
      </div>
    </section>

    <!-- Stock Movement Form Dialog -->
    <StockMovementForm v-model="showForm" @saved="handleSaved" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import StockMovementForm from "@/components/modules/stock/StockMovementForm.vue";
import {
  fetchStockMovements,
  createStockMovement,
} from "@/services/transactions";

export default {
  name: "StockMovementsView",
  components: { AppButton, AppTable, StockMovementForm },
  setup() {
    const movements = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

    const columns = [
      { key: "item_name", label: "Item", sortable: true },
      { key: "movement_type", label: "Jenis", sortable: true },
      { key: "reference_type", label: "Referensi", sortable: true },
      { key: "reference_id", label: "Ref ID", sortable: true },
      { key: "quantity", label: "Qty", sortable: true, align: "center" },
      { key: "stock_before", label: "Sebelum", sortable: true, align: "center" },
      { key: "stock_after", label: "Sesudah", sortable: true, align: "center" },
      { key: "user_name", label: "Petugas", sortable: true },
      { key: "notes", label: "Catatan", sortable: true },
      { key: "created_at", label: "Tanggal", format: formatDate, sortable: true },
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
