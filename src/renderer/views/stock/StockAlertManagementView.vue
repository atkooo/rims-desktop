<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Manajemen Alert Stok</h1>
        <p class="subtitle">
          Kelola batas minimal stok dan monitor status stok barang.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="secondary" :loading="loading" @click="refreshData">
          <Icon name="refresh-cw" :size="16" />
          Refresh
        </AppButton>
      </div>
    </div>

    <!-- Status Summary -->
    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Item</span>
          <strong>{{ statusSummary.total_items }}</strong>
        </div>
        <div class="summary-card summary-card--danger">
          <span>Stok Habis</span>
          <strong>{{ statusSummary.out_of_stock }}</strong>
        </div>
        <div class="summary-card summary-card--warning">
          <span>Kritis</span>
          <strong>{{ statusSummary.critical }}</strong>
        </div>
        <div class="summary-card summary-card--info">
          <span>Mendekati Batas</span>
          <strong>{{ statusSummary.warning }}</strong>
        </div>
        <div class="summary-card summary-card--success">
          <span>Stok Cukup</span>
          <strong>{{ statusSummary.sufficient }}</strong>
        </div>
        <div class="summary-card summary-card--secondary" v-if="statusSummary.not_set > 0">
          <span>Belum Diset Batas</span>
          <strong>{{ statusSummary.not_set }}</strong>
        </div>
      </div>
    </section>

    <!-- Low Stock Items Table -->
    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="lowStockItems"
          :loading="loading"
          :searchable-keys="['code', 'name', 'product_type', 'category_name', 'status_label']"
          row-key="id"
        >
          <template #cell-code="{ row }">
            <span class="code-text">{{ row.code }}</span>
          </template>
          <template #cell-name="{ row }">
            <span class="name-text">{{ row.name }}</span>
          </template>
          <template #cell-product_type="{ row }">
            <span class="product-type-text">{{ getProductTypeLabel(row.product_type) }}</span>
          </template>
          <template #cell-category_name="{ row }">
            <span>{{ row.category_name || '-' }}</span>
          </template>
          <template #cell-stock_quantity="{ row }">
            <span class="stock-value">{{ row.stock_quantity }}</span>
          </template>
          <template #cell-available_quantity="{ row }">
            <span class="stock-value">{{ row.available_quantity }}</span>
          </template>
          <template #cell-min_stock_alert="{ row }">
            <div class="min-stock-cell">
              <input
                v-model.number="editingMinStock[row.id]"
                type="number"
                min="0"
                class="min-stock-input"
                @blur="handleUpdateMinStock(row.id, row.product_type)"
                @keyup.enter="handleUpdateMinStock(row.id, row.product_type)"
              />
            </div>
          </template>
          <template #cell-status="{ row }">
            <span
              class="status-badge"
              :class="`status-badge--${row.status}`"
            >
              {{ row.status_label }}
            </span>
          </template>
        </AppTable>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import Icon from "@/components/ui/Icon.vue";
import { useStockAlerts } from "@/composables/useStockAlerts";

export default {
  name: "StockAlertManagementView",
  components: { AppButton, AppTable, Icon },
  setup() {
    const {
      lowStockItems,
      statusSummary,
      loading,
      error,
      fetchLowStockItems,
      fetchStatusSummary,
      updateMinStock,
      initialize,
    } = useStockAlerts();

    const editingMinStock = ref({});

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama Produk" },
      { key: "product_type", label: "Jenis Produk" },
      { key: "category_name", label: "Kategori" },
      { key: "stock_quantity", label: "Stok Total" },
      { key: "available_quantity", label: "Stok Tersedia" },
      { key: "min_stock_alert", label: "Batas Minimal" },
      { key: "status", label: "Status" },
    ];

    const getProductTypeLabel = (type) => {
      const labels = {
        item: "Item",
        paket: "Paket",
        accessory: "Aksesoris",
      };
      return labels[type] || type;
    };

    const refreshData = async () => {
      await Promise.all([
        fetchLowStockItems(),
        fetchStatusSummary(),
      ]);
    };

    const handleUpdateMinStock = async (id, type) => {
      const newValue = editingMinStock.value[id];
      if (newValue === undefined || newValue < 0) {
        // Reset to original value
        const item = lowStockItems.value.find((i) => i.id === id);
        if (item) {
          editingMinStock.value[id] = item.min_stock_alert;
        }
        return;
      }

      try {
        await updateMinStock(id, type, newValue);
        // Update local editing state
        const item = lowStockItems.value.find((i) => i.id === id);
        if (item) {
          item.min_stock_alert = newValue;
        }
      } catch (err) {
        // Reset on error
        const item = lowStockItems.value.find((i) => i.id === id);
        if (item) {
          editingMinStock.value[id] = item.min_stock_alert;
        }
      }
    };

    onMounted(async () => {
      await initialize();
      // Initialize editing values
      lowStockItems.value.forEach((item) => {
        editingMinStock.value[item.id] = item.min_stock_alert;
      });
    });

    return {
      lowStockItems,
      statusSummary,
      loading,
      error,
      columns,
      editingMinStock,
      refreshData,
      handleUpdateMinStock,
      getProductTypeLabel,
    };
  },
};
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card span {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.summary-card strong {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.summary-card--danger {
  border-left: 4px solid #ef4444;
}

.summary-card--danger strong {
  color: #ef4444;
}

.summary-card--warning {
  border-left: 4px solid #f59e0b;
}

.summary-card--warning strong {
  color: #f59e0b;
}

.summary-card--info {
  border-left: 4px solid #3b82f6;
}

.summary-card--info strong {
  color: #3b82f6;
}

.summary-card--success {
  border-left: 4px solid #10b981;
}

.summary-card--success strong {
  color: #10b981;
}

.code-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #6b7280;
}

.name-text {
  font-weight: 500;
  color: #111827;
}

.product-type-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.stock-value {
  font-weight: 600;
  color: #111827;
}

.min-stock-cell {
  display: flex;
  align-items: center;
}

.min-stock-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.min-stock-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--out_of_stock {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge--critical {
  background: #fef3c7;
  color: #92400e;
}

.status-badge--warning {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge--sufficient {
  background: #d1fae5;
  color: #065f46;
}

.status-badge--not_set {
  background: #f3f4f6;
  color: #6b7280;
}

.summary-card--secondary {
  border-left: 4px solid #6b7280;
}

.summary-card--secondary strong {
  color: #6b7280;
}

.error-banner {
  background: #fee2e2;
  color: #991b1b;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>

