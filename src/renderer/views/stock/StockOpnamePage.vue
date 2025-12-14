<template>
  <div class="data-page master-page stock-opname-page">
    <div class="page-header">
      <div>
        <h1>Stock Opname</h1>
        <p class="subtitle">
          Sinkronkan stok riil dengan mutasi otomatis melalui perhitungan semua
          movement.
        </p>
      </div>
      <div class="header-actions">
        <AppButton size="small" variant="secondary" :loading="loading" @click="loadComparison">
          Muat Ulang
        </AppButton>
        <AppButton
          size="small"
          variant="primary"
          :loading="repairingAll"
          :disabled="!mismatches.length"
          @click="handleRepairAll"
        >
          Perbaiki Semua
        </AppButton>
      </div>
    </div>

    <section class="summary-card-section">
      <div class="status-banner" :class="isSynced ? 'is-synced' : 'needs-adjustment'">
        <strong>Status Sinkronisasi:</strong>
        <span>{{ isSynced ? "Semua stok sudah sesuai dengan log mutasi" : "Terdapat perbedaan stok, lakukan penyesuaian" }}</span>
      </div>
    </section>

    <section class="filters-section">
      <button
        :class="['filter-btn', viewFilter === 'all' ? 'active' : '']"
        @click="viewFilter = 'all'"
      >
        Semua Item
      </button>
      <button
        :class="['filter-btn', viewFilter === 'mismatch' ? 'active' : '']"
        @click="viewFilter = 'mismatch'"
      >
        Hanya Selisih
      </button>
      <span class="filter-hint">
        {{ filteredRows.length }} produk ditampilkan ({{ mismatches.length }} butuh koreksi)
      </span>
    </section>

    <section class="card-section form-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>
      <div v-else-if="statusMessage" class="status-message">
        {{ statusMessage }}
      </div>
      <AppTable
        :columns="columns"
        :rows="filteredRows"
        :loading="loading"
        :searchable-keys="['code', 'name']"
        row-key="id"
        :default-page-size="10"
      >
        <template #actions="{ row }">
        <div class="action-wrapper">
            <button
              type="button"
              class="action-trigger"
              :data-action-row="getRowKey(row)"
              @click.stop="toggleActionMenu(getRowKey(row))"
              :aria-expanded="activeActionRow === getRowKey(row)"
            >
              <Icon name="more-vertical" :size="18" />
            </button>
            <Teleport to="body">
              <transition name="fade-scale">
                <div
                  v-if="activeActionRow === getRowKey(row)"
                  class="action-menu floating-action-menu"
                  :style="getMenuPosition(getRowKey(row))"
                  @click.stop
                >
                  <button class="action-menu-item" @click="repairRow(row)">
                    <Icon name="refresh-cw" :size="16" />
                    <span>Perbaiki</span>
                  </button>
                  <button class="action-menu-item" @click="openAdjustmentDialog(row)">
                    <Icon name="edit-3" :size="16" />
                    <span>Penyesuaian</span>
                  </button>
                  <button class="action-menu-item" @click="openDetailDialog(row)">
                    <Icon name="info" :size="16" />
                    <span>Detail</span>
                  </button>
                </div>
              </transition>
            </Teleport>
          </div>
        </template>
      </AppTable>
      <p v-if="!loading && !mismatches.length" class="empty-state">
        Semua stok sudah sesuai dengan catatan mutasi.
      </p>
    </section>
    <StockAdjustmentDialog
      v-model="showAdjustmentDialog"
      :entity-id="adjustmentTarget?.id"
      :entity-type="adjustmentTarget?.entity_type || 'item'"
      :entity-name="adjustmentTarget?.name || adjustmentTarget?.code"
      :current-quantity="adjustmentTarget?.current_stock_quantity || 0"
      :calculated-quantity="adjustmentTarget?.calculated_stock_quantity || 0"
      @saved="handleAdjustmentSaved"
    />

    <AppDialog
      v-model="showDetailDialog"
      title="Detail Stock Opname"
      :show-footer="false"
      :max-width="500"
    >
      <div v-if="detailItem" class="detail-snippet">
        <div class="detail-header">
          <Icon
            :name="detailItem.stock_qty_mismatch || detailItem.available_qty_mismatch ? 'alert-triangle' : 'check-circle'"
            :class="detailItem.stock_qty_mismatch || detailItem.available_qty_mismatch ? 'badge-danger' : 'badge-success'"
            :size="20"
          />
          <div>
            <strong>{{ detailItem.name || detailItem.code || "-" }}</strong>
            <p class="detail-subtitle">{{ detailItem.code || "-" }}</p>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-card">
            <span>Stok Sistem</span>
            <strong>{{ detailItem.current_stock_quantity || 0 }}</strong>
          </div>
          <div class="detail-card">
            <span>Stok Log</span>
            <strong>{{ detailItem.calculated_stock_quantity || 0 }}</strong>
          </div>
          <div class="detail-card">
            <span>Tersedia Sistem</span>
            <strong>{{ detailItem.current_available_quantity || 0 }}</strong>
          </div>
          <div class="detail-card">
            <span>Tersedia Log</span>
            <strong>{{ detailItem.calculated_available_quantity || 0 }}</strong>
          </div>
        </div>
        <div class="status-line" :class="detailItem.stock_qty_mismatch || detailItem.available_qty_mismatch ? 'status-line--needs-adjustment' : 'status-line--good'">
          <Icon
            :name="detailItem.stock_qty_mismatch || detailItem.available_qty_mismatch ? 'activity' : 'check-circle'"
            :size="18"
          />
          <span>
            {{
              detailItem.stock_qty_mismatch || detailItem.available_qty_mismatch
                ? "Perlu Penyesuaian"
                : "Sesuai"
            }}
          </span>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref, computed, nextTick } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import {
  fetchStockMismatches,
  fetchStockComparison,
  repairAccessoryStock,
  repairBundleStock,
  repairItemStock,
  repairAllMismatchedItems,
} from "@/services/stock";
import StockAdjustmentDialog from "@/components/modules/stock/StockAdjustmentDialog.vue";

export default {
  name: "StockOpnamePage",
  components: {
    AppButton,
    AppTable,
    StockAdjustmentDialog,
    AppDialog,
    Icon,
  },
  setup() {
    const comparisonItems = ref([]);
    const mismatches = ref([]);
    const loading = ref(false);
    const error = ref("");
    const statusMessage = ref("");
    const repairingKey = ref(null);
    const repairingAll = ref(false);
    const showAdjustmentDialog = ref(false);
    const adjustmentTarget = ref(null);
    const showDetailDialog = ref(false);
    const detailItem = ref(null);
    const viewFilter = ref("all");
    const productTypeLabels = {
      item: "Item",
      accessory: "Aksesoris",
      bundle: "Bundle",
    };
    const getProductLabel = (row) => productTypeLabels[row?.product_type] || productTypeLabels.item;
    const getRowKey = (row) => `${row?.product_type || "item"}-${row?.id}`;

    const columns = [
      { key: "code", label: "Kode", sortable: true },
      {
        key: "product_type",
        label: "Tipe Produk",
        sortable: true,
        format: (_, row) => getProductLabel(row),
      },
      { key: "name", label: "Nama Produk", sortable: true },
      {
        key: "diff_summary",
        label: "Selisih (Stok / Tersedia)",
        align: "right",
        format: (_, row) => {
          const stockDiff =
            (row.calculated_stock_quantity || 0) -
            (row.current_stock_quantity || 0);
          const availableDiff =
            (row.calculated_available_quantity || 0) -
            (row.current_available_quantity || 0);
          return `${stockDiff} / ${availableDiff}`;
        },
      },
      {
        key: "status",
        label: "Status",
        format: (_, row) =>
          row.stock_qty_mismatch || row.available_qty_mismatch
            ? "Perlu Penyesuaian"
            : "Sesuai",
      },
    ];

    const loadComparison = async () => {
      loading.value = true;
      error.value = "";
      statusMessage.value = "";
      try {
        const items = await fetchStockComparison();
        comparisonItems.value = items;
        mismatches.value = items.filter(
          (row) => row.stock_qty_mismatch || row.available_qty_mismatch,
        );
      } catch (err) {
        error.value = err.message || "Gagal memuat hasil Stock Opname.";
      } finally {
        loading.value = false;
      }
    };

    const repairRow = async (row) => {
      const rowKey = getRowKey(row);
      repairingKey.value = rowKey;
      error.value = "";
      statusMessage.value = "";
      try {
        const repairFunctions = {
          item: repairItemStock,
          accessory: repairAccessoryStock,
          bundle: repairBundleStock,
        };
        const repairFn = repairFunctions[row.product_type] || repairItemStock;
        await repairFn(row.id);
        const label = getProductLabel(row);
        statusMessage.value = `${label} ${row.name || row.code} diselaraskan.`;
        await loadComparison();
        closeActionMenu();
      } catch (err) {
        error.value = err.message || "Gagal memperbaiki stok.";
      } finally {
        repairingKey.value = null;
      }
    };

    const handleRepairAll = async () => {
      if (!mismatches.value.length) return;
      repairingAll.value = true;
      error.value = "";
      statusMessage.value = "";
      try {
        const result = await repairAllMismatchedItems();
        statusMessage.value = `Perbaikan selesai (${result.repaired} sukses, ${result.failed} gagal).`;
        await loadComparison();
      } catch (err) {
        error.value = err.message || "Gagal memperbaiki semua selisih stok.";
      } finally {
        repairingAll.value = false;
      }
    };

    const openAdjustmentDialog = (row) => {
      adjustmentTarget.value = {
        ...row,
        entity_type: row.product_type || "item",
      };
      showAdjustmentDialog.value = true;
      closeActionMenu();
    };

    const openDetailDialog = (row) => {
      detailItem.value = row;
      showDetailDialog.value = true;
      closeActionMenu();
    };

    const handleAdjustmentSaved = async () => {
      await loadComparison();
    };

    const activeActionRow = ref(null);
    const menuPositions = ref({});

    const getMenuPosition = (rowId) => {
      return menuPositions.value[rowId] || { top: "0px", left: "0px" };
    };

    const updateMenuPosition = (rowId) => {
      const trigger = document.querySelector(`[data-action-row="${rowId}"]`);
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      menuPositions.value[rowId] = {
        top: `${rect.bottom + 6}px`,
        left: `${rect.right - 160}px`,
      };
    };

    const toggleActionMenu = async (rowKey) => {
      if (activeActionRow.value === rowKey) {
        activeActionRow.value = null;
        return;
      }
      activeActionRow.value = rowKey;
      await nextTick();
      updateMenuPosition(rowKey);
    };

    const closeActionMenu = (event) => {
      if (event?.target) {
        const target = event.target;
        if (
          target.closest(".action-wrapper") ||
          target.closest(".floating-action-menu")
        ) {
          return;
        }
      }
      activeActionRow.value = null;
    };

    const filteredRows = computed(() => {
      if (viewFilter.value === "all") return comparisonItems.value;
      return mismatches.value;
    });

    const isSynced = computed(() => !mismatches.value.length);

    onMounted(() => {
      loadComparison();
      document.addEventListener("click", closeActionMenu);
    });
    onBeforeUnmount(() => {
      document.removeEventListener("click", closeActionMenu);
    });

    return {
      mismatches,
      comparisonItems,
      filteredRows,
      viewFilter,
      loading,
      error,
      statusMessage,
      repairingKey,
      repairingAll,
      columns,
      loadComparison,
      repairRow,
      handleRepairAll,
      showAdjustmentDialog,
      adjustmentTarget,
      openAdjustmentDialog,
      handleAdjustmentSaved,
      isSynced,
      showDetailDialog,
      detailItem,
      openDetailDialog,
      activeActionRow,
      toggleActionMenu,
      getMenuPosition,
      getRowKey,
      getProductLabel,
    };
  },
};
</script>

<style scoped>
.stock-opname-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.summary-card-section {
  padding: 0;
}

.status-banner {
  border-radius: 10px;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.95rem;
  color: #1f2937;
}

.status-banner.is-synced {
  border-color: #10b981;
  background: #ecfdf5;
}

.status-banner.needs-adjustment {
  border-color: #f97316;
  background: #fff7ed;
}

.filters-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-btn {
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
}

.filter-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.filter-hint {
  font-size: 0.85rem;
  color: #475569;
}

.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.25rem;
  background: #fff;
}

.error-banner {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.status-message {
  background: #dcfce7;
  color: #046c4e;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.table-wrapper {
  margin-top: 1rem;
}

.empty-state {
  margin-top: 1rem;
  color: #6b7280;
}

.subtitle {
  margin: 0;
  color: #475569;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-chip {
  font-size: 0.75rem;
}

.detail-snippet {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail-header strong {
  font-size: 1.1rem;
  color: #0f172a;
}

.detail-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: #475569;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.detail-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-card span {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

.detail-card strong {
  font-size: 1rem;
  color: #111827;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: #ecfdf5;
  color: #047857;
  font-weight: 600;
}

.status-line .badge-danger {
  color: #dc2626;
}

.status-line--needs-adjustment {
  background: #fffbeb;
  color: #b45309;
}

.status-line--good {
  background: #ecfdf5;
  color: #047857;
}

.action-wrapper {
  display: inline-flex;
  position: relative;
}

.action-trigger {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-trigger:hover {
  background: #f8fafc;
  border-color: #d1d5db;
  color: #111827;
}

.action-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
  z-index: 1000;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  padding: 0.35rem 0;
}

.floating-action-menu {
  overflow: hidden;
}

.action-menu-item {
  border: none;
  background: transparent;
  padding: 0.5rem 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #111827;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.action-menu-item:hover {
  background: #f8fafc;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-6px);
}

.ghost-action {
  background: transparent;
  border: 1px dashed #94a3b8;
  color: #475569;
  box-shadow: none;
}

.ghost-action:hover:not(:disabled) {
  background: #f8fafc;
}
</style>
