<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Manajemen Item</h1>
          <p class="subtitle">
            Kelola katalog barang dan pantau status stok secara terpusat.
          </p>
        </div>
        <AppButton variant="primary" @click="handleAddNew">
          Tambah Item
        </AppButton>
      </div>
    </div>

    <!-- Items Summary, Filters, and Table -->
    <section class="card-section">
      <div class="summary-cards">
        <div class="summary-card">
          <h3>Total Items</h3>
          <p class="amount">{{ filteredItems.length }}</p>
        </div>
        <div class="summary-card">
          <h3>Items Available</h3>
          <p class="amount">{{ itemsAvailable }}</p>
        </div>
        <div class="summary-card">
          <h3>Items Rented</h3>
          <p class="amount">{{ itemsRented }}</p>
        </div>
        <div class="summary-card">
          <h3>Total Value</h3>
          <p class="amount">{{ formatCurrency(totalValue) }}</p>
        </div>
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
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="filteredItems"
          :loading="loading"
          :searchable-keys="[
            'code',
            'name',
            'description',
            'category_name',
            'size_name',
          ]"
          row-key="id"
          :default-page-size="10"
        >
          <template #cell-code="{ row }">
            <a href="#" class="row-link" @click.prevent="handleViewDetail(row)">
              {{ row.code }}
            </a>
          </template>
          <template #cell-name="{ row }">
            <a href="#" class="row-link" @click.prevent="handleViewDetail(row)">
              {{ row.name }}
            </a>
          </template>
          <template #cell-category_name="{ row }">
            {{ row.category_name || "-" }}
          </template>
          <template #cell-status="{ row }">
            <span
              class="status-badge"
              :class="(row.status || '').toLowerCase()"
            >
              {{ row.status || "AVAILABLE" }}
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
                      @click="handleEdit(row)"
                    >
                      <Icon name="pencil" :size="16" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      class="action-menu-item danger"
                      @click="promptDelete(row)"
                    >
                      <Icon name="trash" :size="16" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </transition>
              </Teleport>
            </div>
          </template>
        </AppTable>
      </div>
    </section>

    <AppDialog
      v-model="showDeleteConfirm"
      title="Hapus Item"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    >
      <p>
        Yakin ingin menghapus item
        <strong>{{ itemToDelete?.name }}</strong> ({{ itemToDelete?.code }})?
      </p>
      <p class="delete-hint">
        Aksi ini tidak dapat dibatalkan. Pastikan item tidak digunakan dalam
        transaksi aktif.
      </p>
    </AppDialog>

    <ItemForm v-model="showForm" :edit-data="itemToEdit" @saved="handleFormSaved" />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useItemStore } from "@/store/items";
import { ITEM_TYPE } from "@shared/constants";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemForm from "@/components/modules/items/ItemForm.vue";

export default {
  name: "ItemsPage",

  components: {
    AppButton,
    AppTable,
    AppDialog,
    Icon,
    ItemForm,
  },

  setup() {
    const router = useRouter();
    const itemStore = useItemStore();
    const loading = ref(false);
    const openMenuId = ref(null);
    const menuPositions = ref({});
    const showDeleteConfirm = ref(false);
    const deleteLoading = ref(false);
    const itemToDelete = ref(null);
    const showForm = ref(false);
    const itemToEdit = ref(null);

    // Filter state
    const filters = ref({
      category: "",
      size: "",
      type: "",
      status: "",
    });

    // Categories and sizes
    const categories = ref([]);
    const sizes = ref([]);

    // Format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    // Format helper
    const formatText = (value) => value || "-";

    // Table columns - simplified
    const columns = [
      { key: "code", label: "Kode", sortable: true },
      { key: "name", label: "Nama Item", sortable: true },
      {
        key: "category_name",
        label: "Kategori",
        sortable: true,
        format: formatText,
      },
      {
        key: "stock_quantity",
        label: "Stok",
        sortable: true,
        align: "center",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
      },
    ];

    // Computed
    const filteredItems = computed(() => {
      let result = [...itemStore.items];

      if (filters.value.category) {
        result = result.filter(
          (item) => item.category_id === Number(filters.value.category),
        );
      }

      if (filters.value.size) {
        result = result.filter(
          (item) => item.size_id === Number(filters.value.size),
        );
      }

      if (filters.value.type) {
        result = result.filter((item) => item.type === filters.value.type);
      }

      if (filters.value.status) {
        result = result.filter((item) => item.status === filters.value.status);
      }

      return result;
    });

    const itemsAvailable = computed(
      () =>
        filteredItems.value.filter((item) => item.status === "AVAILABLE")
          .length,
    );

    const itemsRented = computed(
      () =>
        filteredItems.value.filter((item) => item.status === "RENTED").length,
    );

    const totalValue = computed(() =>
      filteredItems.value.reduce((sum, item) => sum + item.price, 0),
    );

    // Methods
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

    const promptDelete = (item) => {
      openMenuId.value = null;
      itemToDelete.value = item;
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      if (!itemToDelete.value) return;
      deleteLoading.value = true;
      try {
        await itemStore.deleteItem(itemToDelete.value.id);
        showDeleteConfirm.value = false;
        itemToDelete.value = null;
      } catch (err) {
        alert(
          err.message ||
            "Gagal menghapus item. Pastikan item tidak digunakan dalam transaksi.",
        );
      } finally {
        deleteLoading.value = false;
      }
    };

    const handleAddNew = () => {
      itemToEdit.value = null;
      showForm.value = true;
    };

    const handleEdit = (item) => {
      openMenuId.value = null;
      itemToEdit.value = item;
      showForm.value = true;
    };

    const handleFormSaved = async () => {
      showForm.value = false;
      itemToEdit.value = null;
      await itemStore.fetchItems();
    };

    // Load data
    const loadCategories = async () => {
      try {
        categories.value = await window.api.invoke("categories:getAll");
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    const loadSizes = async () => {
      try {
        await itemStore.fetchSizes();
        sizes.value = itemStore.sizes;
      } catch (error) {
        console.error("Error loading sizes:", error);
      }
    };

    onMounted(async () => {
      document.addEventListener("click", closeActionMenu);
      loading.value = true;
      try {
        await Promise.all([
          itemStore.fetchItems(),
          loadCategories(),
          loadSizes(),
        ]);
      } finally {
        loading.value = false;
      }
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", closeActionMenu);
    });

    return {
      loading,
      filters,
      columns,
      filteredItems,
      itemsAvailable,
      itemsRented,
      totalValue,
      ITEM_TYPE,
      categories,
      sizes,
      openMenuId,
      showDeleteConfirm,
      deleteLoading,
      itemToDelete,
      showForm,
      itemToEdit,
      formatCurrency,
      handleAddNew,
      handleViewDetail,
      handleEdit,
      toggleActionMenu,
      getMenuPosition,
      promptDelete,
      confirmDelete,
      handleFormSaved,
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

.filter-select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
  min-width: 150px;
  height: 40px;
  font-size: 0.875rem;
}

.row-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s ease;
}

.row-link:hover {
  color: #6366f1;
  text-decoration: underline;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 0;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
}

.summary-card h3 {
  margin: 0 0 0.5rem 0;
  color: #4b5563;
  font-size: 1rem;
}

.amount {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.available {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.rented {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge.maintenance {
  background-color: #fef3c7;
  color: #92400e;
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
  min-width: 140px;
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

.action-menu-item.danger {
  color: #dc2626;
}

.action-menu-item.danger:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.action-menu-item .icon {
  flex-shrink: 0;
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

.delete-hint {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
