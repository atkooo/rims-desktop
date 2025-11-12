<template>
  <div class="data-page stock-page">
    <div class="page-header">
      <div>
        <h1>Item dengan Stok</h1>
        <p class="subtitle">
          Rekap jumlah stok, ketersediaan, dan status item langsung dari
          database.
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
          <option value="low_stock">Stok Rendah</option>
          <option value="out_of_stock">Habis</option>
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
        default-page-size="10"
      >
        <template #cell-available_quantity="{ row }">
          <span
            class="stock-badge"
            :class="{
              'stock-low': row.available_quantity <= (row.min_stock_alert || 0),
              'stock-empty': row.available_quantity === 0,
            }"
          >
            {{ row.available_quantity }}
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
                </div>
              </transition>
            </Teleport>
          </div>
        </template>
      </AppTable>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchItemsWithStock } from "@/services/reports";

export default {
  name: "ItemsWithStockView",
  components: { AppButton, AppTable, Icon },
  setup() {
    const router = useRouter();
    const items = ref([]);
    const loading = ref(false);
    const error = ref("");
    const categories = ref([]);
    const openMenuId = ref(null);
    const menuPositions = ref({});

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
              item.available_quantity > 0 &&
              item.available_quantity <= (item.min_stock_alert || 0),
          );
        } else if (filters.value.stockStatus === "out_of_stock") {
          result = result.filter((item) => item.available_quantity === 0);
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

      return { totalItems, totalStock, availableStock, activeItems };
    });

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
      const trigger = document.querySelector(
        `[data-item-id="${itemId}"]`,
      );
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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
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
