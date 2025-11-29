<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Generate Label Barcode</h1>
          <p class="subtitle">
            Pilih item yang ingin dicetak label barcodenya. Pastikan preview
            sebelum mencetak.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" :loading="loading" @click="loadItems">
            Refresh
          </AppButton>
          <AppButton
            variant="primary"
            :disabled="selectedItems.length === 0"
            @click="showPreviewDialog = true"
          >
            <Icon name="eye" :size="16" /> Preview ({{ selectedItems.length }})
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <section class="card-section">
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

        <select v-model="filters.size" class="filter-select">
          <option value="">Semua Ukuran</option>
          <option v-for="size in sizes" :key="size.id" :value="size.id">
            {{ size.name }}
          </option>
        </select>

        <select v-model="filters.type" class="filter-select">
          <option value="">Semua Tipe</option>
          <option v-for="type in ITEM_TYPE" :key="type" :value="type">
            {{ type }}
          </option>
        </select>

        <select v-model="filters.status" class="filter-select">
          <option value="">Semua Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="RENTED">Rented</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>

        <div class="filter-actions">
          <AppButton variant="secondary" size="small" @click="selectAll">
            Pilih Semua
          </AppButton>
          <AppButton variant="secondary" size="small" @click="deselectAll">
            Batal Pilih
          </AppButton>
        </div>
      </div>
    </section>

    <!-- Items Table with Checkboxes -->
    <section class="card-section">
      <div v-if="loading && items.length === 0" class="loading-container">
        <p>Memuat data...</p>
      </div>

      <div v-else-if="error" class="error-banner">{{ error }}</div>

      <div v-else>
        <AppTable
          :columns="tableColumns"
          :rows="filteredItems"
          :loading="loading"
          :show-search="true"
          :searchable-keys="['code', 'name', 'category_name', 'size_name']"
          :default-page-size="10"
          :page-sizes="[5, 10, 20, 50, 100]"
          row-key="id"
        >
          <template #cell-checkbox="{ row }">
            <input
              type="checkbox"
              :checked="isSelected(row.id)"
              @change="toggleSelect(row.id)"
              class="table-checkbox"
            />
          </template>
          <template #cell-code="{ row }">
            <span class="code-text">{{ row.code }}</span>
          </template>
          <template #cell-name="{ row }">
            <span class="name-text">{{ row.name }}</span>
          </template>
          <template #cell-category_name="{ row }">
            {{ row.category_name || "-" }}
          </template>
          <template #cell-size_name="{ row }">
            {{ row.size_name || "-" }}
          </template>
          <template #cell-type="{ row }">
            <span class="type-badge" :class="getTypeClass(row.type)">
              {{ row.type }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <span class="status-badge" :class="getStatusClass(row.status)">
              {{ row.status }}
            </span>
          </template>
          <template #cell-price="{ row }">
            {{ formatCurrency(row.price || 0) }}
          </template>
        </AppTable>

        <!-- Select All Controls -->
        <div class="table-controls">
          <div class="select-all-controls">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected"
              @change="toggleSelectAll"
              class="select-all-checkbox"
            />
            <span class="select-all-label">Pilih Semua ({{ selectedItems.length }} dipilih)</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Preview Dialog -->
    <LabelPreviewDialog
      v-model="showPreviewDialog"
      :items="selectedItemsData"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import Icon from "@/components/ui/Icon.vue";
import LabelPreviewDialog from "@/components/modules/items/LabelPreviewDialog.vue";
import { ipcRenderer } from "@/services/ipc";
import { useItemStore } from "@/store/items";
import { fetchItemSizes } from "@/services/masterData";
import { ITEM_TYPE } from "@shared/constants";
import { useCurrency } from "@/composables/useCurrency";

export default {
  name: "BulkLabelGeneratorView",
  components: { AppButton, AppTable, Icon, LabelPreviewDialog },
  setup() {
    const itemStore = useItemStore();
    const { formatCurrency } = useCurrency();
    const loading = ref(false);
    const error = ref("");
    const items = ref([]);
    const categories = ref([]);
    const sizes = ref([]);
    const selectedItemIds = ref(new Set());
    const showPreviewDialog = ref(false);

    const filters = ref({
      category: "",
      size: "",
      type: "",
      status: "",
    });

    // Load items
    const loadItems = async () => {
      loading.value = true;
      error.value = "";
      try {
        await itemStore.fetchItems();
        items.value = itemStore.items || [];

        // Load categories and sizes
        const [categoriesData, sizesData] = await Promise.all([
          ipcRenderer.invoke("categories:getAll"),
          fetchItemSizes(),
        ]);
        categories.value = categoriesData || [];
        sizes.value = sizesData || [];
      } catch (err) {
        error.value = err.message || "Gagal memuat data item.";
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    // Filtered items
    const filteredItems = computed(() => {
      let filtered = items.value;

      if (filters.value.category) {
        filtered = filtered.filter(
          (item) => item.category_id === parseInt(filters.value.category),
        );
      }

      if (filters.value.size) {
        filtered = filtered.filter(
          (item) => item.size_id === parseInt(filters.value.size),
        );
      }

      if (filters.value.type) {
        filtered = filtered.filter((item) => item.type === filters.value.type);
      }

      if (filters.value.status) {
        filtered = filtered.filter(
          (item) => item.status === filters.value.status,
        );
      }

      return filtered;
    });

    // Selection helpers
    const isSelected = (itemId) => selectedItemIds.value.has(itemId);

    const toggleSelect = (itemId) => {
      if (selectedItemIds.value.has(itemId)) {
        selectedItemIds.value.delete(itemId);
      } else {
        selectedItemIds.value.add(itemId);
      }
    };

    const selectAll = () => {
      filteredItems.value.forEach((item) => {
        selectedItemIds.value.add(item.id);
      });
    };

    const deselectAll = () => {
      selectedItemIds.value.clear();
    };

    const toggleSelectAll = (event) => {
      if (event.target.checked) {
        selectAll();
      } else {
        deselectAll();
      }
    };

    const allSelected = computed(() => {
      if (filteredItems.value.length === 0) return false;
      return filteredItems.value.every((item) =>
        selectedItemIds.value.has(item.id),
      );
    });

    const someSelected = computed(() => {
      const selectedCount = filteredItems.value.filter((item) =>
        selectedItemIds.value.has(item.id),
      ).length;
      return selectedCount > 0 && selectedCount < filteredItems.value.length;
    });

    const selectedItems = computed(() => {
      return Array.from(selectedItemIds.value);
    });

    const selectedItemsData = computed(() => {
      return items.value.filter((item) =>
        selectedItemIds.value.has(item.id),
      );
    });

    // Style helpers
    const getTypeClass = (type) => {
      const typeMap = {
        RENTAL: "rental",
        SALE: "sale",
        BOTH: "both",
        HYBRID: "hybrid",
      };
      return typeMap[type] || "";
    };

    const getStatusClass = (status) => {
      const statusMap = {
        AVAILABLE: "active",
        RENTED: "rented",
        MAINTENANCE: "maintenance",
      };
      return statusMap[status] || "";
    };

    // Table columns configuration
    const tableColumns = computed(() => [
      {
        key: "checkbox",
        label: "",
        sortable: false,
        align: "center",
      },
      {
        key: "code",
        label: "Kode",
        sortable: true,
      },
      {
        key: "name",
        label: "Nama Item",
        sortable: true,
      },
      {
        key: "category_name",
        label: "Kategori",
        sortable: true,
      },
      {
        key: "size_name",
        label: "Ukuran",
        sortable: true,
      },
      {
        key: "type",
        label: "Tipe",
        sortable: true,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
      },
      {
        key: "price",
        label: "Harga",
        sortable: true,
        align: "right",
      },
    ]);

    // Watch for dialog close to deselect items
    watch(showPreviewDialog, (newVal) => {
      if (!newVal) {
        deselectAll();
      }
    });

    onMounted(() => {
      loadItems();
    });

    return {
      loading,
      error,
      items,
      categories,
      sizes,
      filters,
      filteredItems,
      selectedItemIds,
      selectedItems,
      selectedItemsData,
      showPreviewDialog,
      ITEM_TYPE,
      formatCurrency,
      isSelected,
      toggleSelect,
      selectAll,
      deselectAll,
      toggleSelectAll,
      allSelected,
      someSelected,
      getTypeClass,
      getStatusClass,
      tableColumns,
      loadItems,
    };
  },
};
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.card-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

/* Using global utility class for form-select */
.filter-select {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  min-width: 150px;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.loading-container,
.empty-state {
  padding: 3rem;
  text-align: center;
  color: #6b7280;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.code-text {
  font-family: monospace;
  font-weight: 600;
  color: #3b82f6;
}

.name-text {
  font-weight: 500;
  color: #111827;
}

/* Using global badge utility classes */
.type-badge,
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.type-badge.rental {
  background-color: #dbeafe;
  color: #1e40af;
}

.type-badge.sale {
  background-color: #fef3c7;
  color: #92400e;
}

.type-badge.both,
.type-badge.hybrid {
  background-color: #e9d5ff;
  color: #6b21a8;
}

.status-badge.active {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.rented {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge.maintenance {
  background-color: #fef3c7;
  color: #92400e;
}

.table-controls {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.select-all-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-all-checkbox {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.select-all-label {
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
}

.table-checkbox {
  cursor: pointer;
  width: 18px;
  height: 18px;
}
</style>

