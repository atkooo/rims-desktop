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
