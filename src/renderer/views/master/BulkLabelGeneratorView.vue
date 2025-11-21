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

      <div v-else class="table-container">
        <table class="items-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th>Kode</th>
              <th>Nama Item</th>
              <th>Kategori</th>
              <th>Ukuran</th>
              <th>Tipe</th>
              <th>Status</th>
              <th>Harga</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              :class="{ selected: isSelected(item.id) }"
            >
              <td class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="isSelected(item.id)"
                  @change="toggleSelect(item.id)"
                />
              </td>
              <td>
                <span class="code-text">{{ item.code }}</span>
              </td>
              <td>
                <span class="name-text">{{ item.name }}</span>
              </td>
              <td>{{ item.category_name || "-" }}</td>
              <td>{{ item.size_name || "-" }}</td>
              <td>
                <span class="type-badge" :class="getTypeClass(item.type)">
                  {{ item.type }}
                </span>
              </td>
              <td>
                <span class="status-badge" :class="getStatusClass(item.status)">
                  {{ item.status }}
                </span>
              </td>
              <td>{{ formatCurrency(item.price || 0) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredItems.length === 0" class="empty-state">
          <p>Tidak ada item yang ditemukan.</p>
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
import Icon from "@/components/ui/Icon.vue";
import LabelPreviewDialog from "@/components/modules/items/LabelPreviewDialog.vue";
import { ipcRenderer } from "@/services/ipc";
import { useItemStore } from "@/store/items";
import { fetchItemSizes } from "@/services/masterData";
import { ITEM_TYPE } from "@shared/constants";
import { useCurrency } from "@/composables/useCurrency";

export default {
  name: "BulkLabelGeneratorView",
  components: { AppButton, Icon, LabelPreviewDialog },
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

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

.table-container {
  overflow-x: auto;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table thead {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.items-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.items-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}

.items-table tbody tr:hover {
  background: #f9fafb;
}

.items-table tbody tr.selected {
  background: #eff6ff;
}

.checkbox-col {
  width: 50px;
  text-align: center;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
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

.type-badge,
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
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
</style>

