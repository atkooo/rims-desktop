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
        actions
        @delete="handleDelete"
        :show-edit="false"
      />
    </section>

    <!-- Stock Movement Form Dialog -->
    <StockMovementForm v-model="showForm" @saved="handleSaved" />

    <!-- Confirmation Dialog -->
    <AppDialog
      v-model="showConfirm"
      :title="confirmTitle"
      :confirm-text="confirmAction"
      :confirm-variant="confirmVariant"
      :loading="confirmLoading"
      @confirm="handleConfirm"
    >
      {{ confirmMessage }}
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import DataTable from "@/components/ui/DataTable.vue";
import StockMovementForm from "@/components/modules/stock/StockMovementForm.vue";
import {
  fetchStockMovements,
  createStockMovement,
  deleteStockMovement,
} from "@/services/transactions";

export default {
  name: "StockMovementsView",
  components: { AppButton, AppDialog, DataTable, StockMovementForm },
  setup() {
    const movements = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);

    // Confirmation dialog state
    const showConfirm = ref(false);
    const confirmTitle = ref("");
    const confirmMessage = ref("");
    const confirmAction = ref("");
    const confirmVariant = ref("primary");
    const confirmLoading = ref(false);
    const confirmCallback = ref(null);

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

    // Show confirmation dialog
    const showConfirmation = (title, message, action, variant, callback) => {
      confirmTitle.value = title;
      confirmMessage.value = message;
      confirmAction.value = action;
      confirmVariant.value = variant;
      confirmCallback.value = callback;
      showConfirm.value = true;
    };

    // Handle delete
    const handleDelete = (movement) => {
      showConfirmation(
        "Hapus Pergerakan Stok",
        `Apakah Anda yakin ingin menghapus pergerakan stok ini? Stok akan dikembalikan ke kondisi sebelumnya.`,
        "Hapus",
        "danger",
        async () => {
          confirmLoading.value = true;
          try {
            await deleteStockMovement(movement.id);
            await loadData();
          } catch (error) {
            console.error("Error deleting stock movement:", error);
          } finally {
            confirmLoading.value = false;
            showConfirm.value = false;
          }
        },
      );
    };

    // Handle confirmation
    const handleConfirm = () => {
      if (confirmCallback.value) {
        confirmCallback.value();
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
      showForm,
      handleSaved,
      handleDelete,
      showConfirm,
      confirmTitle,
      confirmMessage,
      confirmAction,
      confirmVariant,
      confirmLoading,
      handleConfirm,
    };
  },
};
</script>

<style scoped>
.data-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.card-section {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
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
  margin-bottom: 1rem;
}
</style>
