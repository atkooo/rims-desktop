<template>
  <div class="data-page stock-page">
    <div class="page-header">
      <div>
        <h1>Laporan & Peringatan Stok</h1>
        <p class="subtitle">
          Rekap lengkap semua item dengan informasi stok, ketersediaan, dan peringatan stok rendah.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Item</span>
          <strong>{{ stats.totalItems }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Stok</span>
          <strong>{{ stats.totalStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Stok Tersedia</span>
          <strong>{{ stats.availableStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Item Perlu Perhatian</span>
          <strong class="text-warning">{{ stats.alertItems }}</strong>
        </div>
        <div class="summary-card">
          <span>Stok Habis</span>
          <strong class="text-danger">{{ stats.outOfStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Item Aktif</span>
          <strong>{{ stats.activeItems }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="filters">
        <select v-model="filters.category" class="filter-select">
          <option value="">Semua Kategori</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>

        <select v-model="filters.stockStatus" class="filter-select">
          <option value="">Semua Status Stok</option>
          <option value="in_stock">Ada Stok</option>
          <option value="low_stock">Stok Rendah / Peringatan</option>
          <option value="out_of_stock">Habis (Stok = 0)</option>
          <option value="needs_attention">Perlu Perhatian</option>
        </select>

        <select v-model="filters.isActive" class="filter-select">
          <option value="">Semua Status</option>
          <option :value="true">Aktif</option>
          <option :value="false">Tidak Aktif</option>
        </select>
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="filteredItems"
          :loading="loading"
          :searchable-keys="['code', 'name', 'category_name']"
          row-key="id"
          :default-page-size="10"
        >
          <template #cell-available_quantity="{ row }">
            <span
              class="stock-badge"
              :class="{
                'stock-low':
                  (row.min_stock_alert || 0) > 0 &&
                  row.available_quantity <= (row.min_stock_alert || 0),
                'stock-empty': row.available_quantity === 0,
              }"
            >
              {{ row.available_quantity }}
            </span>
          </template>
          <template #cell-rented_quantity="{ row }">
            <span>{{ row.rented_quantity || 0 }}</span>
          </template>
          <template #cell-min_stock_alert="{ row }">
            <span :class="{ 'text-muted': (row.min_stock_alert || 0) === 0 }">
              {{ row.min_stock_alert || 0 }}
              <span v-if="(row.min_stock_alert || 0) === 0" class="text-muted" style="font-size: 0.7rem; margin-left: 0.25rem;">
                (tidak diatur)
              </span>
            </span>
          </template>
          <template #cell-alert_status="{ row }">
            <span
              class="alert-badge"
              :class="getAlertStatusClass(row)"
            >
              {{ getAlertStatusText(row) }}
            </span>
          </template>
          <template #actions="{ row }">
            <div class="action-menu-wrapper">
              <button
                type="button"
                class="action-menu-trigger"
                :data-item-id="row.id"
                @click.stop="toggleActionMenu(row.id)"
                :aria-expanded="openMenuId === row.id"
              >
                <Icon name="more-vertical" :size="18" />
              </button>
              <Teleport to="body">
                <transition name="fade-scale">
                  <div
                    v-if="openMenuId === row.id"
                    class="action-menu"
                    :style="getMenuPosition(row.id)"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="action-menu-item"
                      @click="handleViewDetail(row)"
                    >
                      <Icon name="eye" :size="16" />
                      <span>Detail</span>
                    </button>
                    <button
                      type="button"
                      class="action-menu-item"
                      @click="handleEditMinStock(row)"
                    >
                      <Icon name="edit" :size="16" />
                      <span>Edit Batas Minimum</span>
                    </button>
                  </div>
                </transition>
              </Teleport>
            </div>
          </template>
        </AppTable>
      </div>
    </section>

    <!-- Modal Edit Batas Minimum Stok -->
    <AppDialog
      v-model="showMinStockModal"
      :title="`Edit Batas Minimum Stok - ${selectedItemForEdit?.name || ''}`"
      confirm-text="Simpan"
      :loading="savingMinStock"
      @confirm="saveMinStock"
    >
      <div class="min-stock-modal-content">
        <div class="form-group">
          <label for="minStockValue" class="form-label">
            Batas Minimum Stok (Peringatan)
          </label>
          <input
            id="minStockValue"
            type="number"
            v-model.number="editingMinStockValue"
            class="form-input"
            min="0"
            placeholder="0"
          />
          <small class="form-hint">
            <strong>Cara kerja:</strong> Jika stok tersedia ≤ nilai ini, sistem akan menampilkan peringatan "Stok Rendah".
            <br>
            <strong>Contoh:</strong> Jika diisi <strong>5</strong>, peringatan muncul saat stok tersedia ≤ 5.
            <br>
            <strong>Kosongkan atau isi 0</strong> jika tidak ingin ada peringatan stok rendah.
          </small>
        </div>
        <div v-if="selectedItemForEdit" class="current-stock-info">
          <div class="info-item">
            <span class="info-label">Stok Tersedia Saat Ini:</span>
            <span class="info-value">{{ selectedItemForEdit.available_quantity || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Stok:</span>
            <span class="info-value">{{ selectedItemForEdit.stock_quantity || 0 }}</span>
          </div>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchItemsWithStock } from "@/services/reports";
import { useItemStore } from "@/store/items";

export default {
  name: "ItemsWithStockView",
  components: { AppButton, AppTable, AppDialog, Icon },
  setup() {
    const router = useRouter();
    const itemStore = useItemStore();
    const items = ref([]);
    const loading = ref(false);
    const error = ref("");
    const categories = ref([]);
    const openMenuId = ref(null);
    const menuPositions = ref({});
    const showMinStockModal = ref(false);
    const editingMinStockValue = ref(0);
    const selectedItemForEdit = ref(null);
    const savingMinStock = ref(false);

    // Filter state
    const filters = ref({
      category: "",
      stockStatus: "",
      isActive: "",
    });

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const columns = [
      { key: "code", label: "Kode", sortable: true },
      { key: "name", label: "Nama Item", sortable: true },
      { key: "category_name", label: "Kategori", sortable: true },
      {
        key: "stock_quantity",
        label: "Total Stok",
        sortable: true,
        align: "center",
      },
      {
        key: "available_quantity",
        label: "Tersedia",
        sortable: true,
        align: "center",
      },
      {
        key: "rented_quantity",
        label: "Terpakai",
        sortable: true,
        align: "center",
      },
      {
        key: "min_stock_alert",
        label: "Batas Minimum",
        sortable: true,
        align: "center",
      },
      {
        key: "alert_status",
        label: "Status",
        sortable: false,
        align: "center",
      },
    ];

    const filteredItems = computed(() => {
      let result = [...items.value];

      if (filters.value.category) {
        const selectedCategory = categories.value.find(
          (cat) => cat.id === Number(filters.value.category),
        );
        if (selectedCategory) {
          result = result.filter(
            (item) => item.category_name === selectedCategory.name,
          );
        }
      }

      if (filters.value.stockStatus) {
        if (filters.value.stockStatus === "in_stock") {
          result = result.filter((item) => item.available_quantity > 0);
        } else if (filters.value.stockStatus === "low_stock") {
          result = result.filter(
            (item) =>
              (item.min_stock_alert || 0) > 0 &&
              item.available_quantity > 0 &&
              item.available_quantity <= (item.min_stock_alert || 0),
          );
        } else if (filters.value.stockStatus === "out_of_stock") {
          result = result.filter((item) => item.available_quantity === 0);
        } else if (filters.value.stockStatus === "needs_attention") {
          result = result.filter(
            (item) =>
              item.available_quantity === 0 ||
              ((item.min_stock_alert || 0) > 0 &&
                item.available_quantity <= (item.min_stock_alert || 0)),
          );
        }
      }

      if (filters.value.isActive !== "") {
        const isActive = filters.value.isActive === true;
        result = result.filter((item) => item.is_active === isActive);
      }

      return result;
    });

    const stats = computed(() => {
      const totalItems = filteredItems.value.length;
      const totalStock = filteredItems.value.reduce(
        (sum, item) => sum + (item.stock_quantity || 0),
        0,
      );
      const availableStock = filteredItems.value.reduce(
        (sum, item) => sum + (item.available_quantity || 0),
        0,
      );
      const activeItems = filteredItems.value.filter(
        (item) => item.is_active,
      ).length;
      const outOfStock = filteredItems.value.filter(
        (item) => item.available_quantity === 0,
      ).length;
      const alertItems = filteredItems.value.filter(
        (item) =>
          item.available_quantity === 0 ||
          ((item.min_stock_alert || 0) > 0 &&
            item.available_quantity <= (item.min_stock_alert || 0)),
      ).length;

      return {
        totalItems,
        totalStock,
        availableStock,
        activeItems,
        outOfStock,
        alertItems,
      };
    });

    const getAlertStatusClass = (row) => {
      if (row.available_quantity === 0) {
        return "alert-critical";
      }
      if ((row.min_stock_alert || 0) > 0) {
        if (row.available_quantity <= row.min_stock_alert) {
          return "alert-warning";
        }
        return "alert-ok";
      }
      // Jika min_stock_alert = 0, tidak ada status peringatan
      return "alert-neutral";
    };

    const getAlertStatusText = (row) => {
      if (row.available_quantity === 0) {
        return "Habis";
      }
      if ((row.min_stock_alert || 0) > 0) {
        if (row.available_quantity <= row.min_stock_alert) {
          return "Rendah";
        }
        return "Aman";
      }
      // Jika min_stock_alert = 0, tidak ada peringatan
      return "-";
    };

    const handleEditMinStock = (row) => {
      openMenuId.value = null;
      selectedItemForEdit.value = row;
      editingMinStockValue.value = row.min_stock_alert || 0;
      showMinStockModal.value = true;
    };

    const saveMinStock = async () => {
      if (!selectedItemForEdit.value) return;
      
      const newValue = Math.max(0, Number(editingMinStockValue.value) || 0);
      savingMinStock.value = true;
      
      try {
        await itemStore.updateItem(selectedItemForEdit.value.id, {
          min_stock_alert: newValue,
        });
        
        // Update local data
        const itemIndex = items.value.findIndex(
          (item) => item.id === selectedItemForEdit.value.id
        );
        if (itemIndex !== -1) {
          items.value[itemIndex].min_stock_alert = newValue;
        }
        
        showMinStockModal.value = false;
        selectedItemForEdit.value = null;
        editingMinStockValue.value = 0;
      } catch (err) {
        console.error("Error updating min_stock_alert:", err);
        alert(err.message || "Gagal mengupdate batas minimum stok");
      } finally {
        savingMinStock.value = false;
      }
    };

    const loadCategories = async () => {
      try {
        categories.value = await window.api.invoke("categories:getAll");
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    const handleViewDetail = (item) => {
      openMenuId.value = null;
      router.push(`/master/items/${item.id}`);
    };

    const toggleActionMenu = async (itemId) => {
      if (openMenuId.value === itemId) {
        openMenuId.value = null;
      } else {
        openMenuId.value = itemId;
        await nextTick();
        updateMenuPosition(itemId);
      }
    };

    const updateMenuPosition = (itemId) => {
      const trigger = document.querySelector(`[data-item-id="${itemId}"]`);
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      menuPositions.value[itemId] = {
        top: rect.bottom + 4 + "px",
        left: rect.right - 120 + "px",
      };
    };

    const getMenuPosition = (itemId) => {
      return menuPositions.value[itemId] || { top: "0px", left: "0px" };
    };

    const closeActionMenu = (event) => {
      if (!event.target.closest(".action-menu-wrapper")) {
        openMenuId.value = null;
      }
    };

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        await Promise.all([
          fetchItemsWithStock().then((data) => {
            items.value = data;
          }),
          loadCategories(),
        ]);
      } catch (err) {
        error.value = err.message || "Gagal memuat data stok item.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener("click", closeActionMenu);
      loadData();
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", closeActionMenu);
    });

    return {
      columns,
      items,
      filteredItems,
      loading,
      error,
      stats,
      filters,
      categories,
      loadData,
      openMenuId,
      handleViewDetail,
      toggleActionMenu,
      getMenuPosition,
      getAlertStatusClass,
      getAlertStatusText,
      showMinStockModal,
      editingMinStockValue,
      selectedItemForEdit,
      savingMinStock,
      handleEditMinStock,
      saveMinStock,
    };
  },
};
</script>

<style scoped>
.filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.table-container {
  margin-top: 1.5rem;
}

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

.filter-select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
  min-width: 150px;
  height: 40px;
  font-size: 0.875rem;
}

.stock-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  background-color: #dcfce7;
  color: #166534;
}

.stock-badge.stock-low {
  background-color: #fef3c7;
  color: #92400e;
}

.stock-badge.stock-empty {
  background-color: #fee2e2;
  color: #991b1b;
}

.alert-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.alert-badge.alert-ok {
  background-color: #dcfce7;
  color: #166534;
}

.alert-badge.alert-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.alert-badge.alert-critical {
  background-color: #fee2e2;
  color: #991b1b;
}

.alert-badge.alert-neutral {
  background-color: #f3f4f6;
  color: #6b7280;
}

.text-warning {
  color: #d97706;
}

.text-danger {
  color: #dc2626;
}

.text-muted {
  color: #9ca3af;
}

.min-stock-modal-content {
  padding: 0.5rem 0;
}

.min-stock-modal-content .form-group {
  margin-bottom: 1.5rem;
}

.min-stock-modal-content .form-label {
  display: block;
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.min-stock-modal-content .form-input {
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.min-stock-modal-content .form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.min-stock-modal-content .form-hint {
  display: block;
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.5rem;
  line-height: 1.6;
}

.current-stock-info {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.info-item:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.info-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.info-value {
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.active {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background-color: #fee2e2;
  color: #991b1b;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.action-menu-wrapper {
  position: relative;
  display: inline-block;
}

.action-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-menu-trigger:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.action-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.action-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.action-menu-item:hover {
  background: #f9fafb;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
