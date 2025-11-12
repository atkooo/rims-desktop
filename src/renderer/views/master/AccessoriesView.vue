<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Data Aksesoris</h1>
        <p class="subtitle">
          Daftar aksesoris beserta stok dan status ketersediaan.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="openCreate">
          Tambah Aksesoris
        </AppButton>
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Aksesoris</span>
          <strong>{{ stats.totalAccessories }}</strong>
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
          <span>Aksesoris Aktif</span>
          <strong>{{ stats.activeAccessories }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="accessories"
          :loading="loading"
          :searchable-keys="['code', 'name', 'description']"
          row-key="id"
          class="compact-table"
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
          <template #cell-available_quantity="{ row }">
            <span
              class="stock-badge"
              :class="{
                'stock-low': row.available_quantity <= row.min_stock_alert,
                'stock-empty': row.available_quantity === 0,
              }"
            >
              {{ row.available_quantity }}
            </span>
          </template>
          <template #cell-is_active="{ row }">
            <span
              class="status-badge"
              :class="row.is_active ? 'active' : 'inactive'"
            >
              {{ row.is_active ? "Aktif" : "Nonaktif" }}
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
                      <Icon name="edit" :size="16" />
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

    <AccessoryForm
      v-model="showForm"
      :edit-data="editingAccessory"
      @saved="handleFormSaved"
    />

    <AppDialog
      v-model="showDeleteConfirm"
      title="Hapus Aksesoris"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    >
      <p>
        Yakin ingin menghapus
        <strong>{{ accessoryToDelete?.name }}</strong
        >?
      </p>
    </AppDialog>
  </div>
</template>

<script>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AccessoryForm from "@/components/modules/accessories/AccessoryForm.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchAccessories, deleteAccessory } from "@/services/masterData";

export default {
  name: "AccessoriesView",
  components: { AppButton, AppDialog, AppTable, AccessoryForm, Icon },
  setup() {
    const router = useRouter();
    const accessories = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingAccessory = ref(null);
    const showDeleteConfirm = ref(false);
    const deleteLoading = ref(false);
    const accessoryToDelete = ref(null);
    const openMenuId = ref(null);
    const menuPositions = ref({});

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "available_quantity", label: "Stok" },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Nonaktif"),
      },
    ];

    const stats = computed(() => {
      const totalAccessories = accessories.value.length;
      const totalStock = accessories.value.reduce(
        (sum, item) => sum + (item.stock_quantity || 0),
        0,
      );
      const availableStock = accessories.value.reduce(
        (sum, item) => sum + (item.available_quantity || 0),
        0,
      );
      const activeAccessories = accessories.value.filter(
        (item) => item.is_active,
      ).length;

      return {
        totalAccessories,
        totalStock,
        availableStock,
        activeAccessories,
      };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        accessories.value = await fetchAccessories();
      } catch (err) {
        error.value = err.message || "Gagal memuat data aksesoris.";
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

    const openCreate = () => {
      editingAccessory.value = null;
      showForm.value = true;
    };

    const handleViewDetail = (item) => {
      openMenuId.value = null;
      router.push({ name: "accessory-detail", params: { id: item.id } });
    };

    const handleEdit = (item) => {
      openMenuId.value = null;
      editingAccessory.value = item;
      showForm.value = true;
    };

    const handleFormSaved = () => {
      editingAccessory.value = null;
      loadData();
    };

    const promptDelete = (item) => {
      openMenuId.value = null;
      accessoryToDelete.value = item;
      showDeleteConfirm.value = true;
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

    const confirmDelete = async () => {
      if (!accessoryToDelete.value) return;
      deleteLoading.value = true;
      error.value = "";
      try {
        await deleteAccessory(accessoryToDelete.value.id);
        showDeleteConfirm.value = false;
        accessoryToDelete.value = null;
        loadData();
      } catch (err) {
        error.value = err.message || "Gagal menghapus aksesoris.";
      } finally {
        deleteLoading.value = false;
      }
    };

    watch(showForm, (value) => {
      if (!value) editingAccessory.value = null;
    });

    return {
      accessories,
      loading,
      error,
      columns,
      stats,
      loadData,
      showForm,
      editingAccessory,
      showDeleteConfirm,
      deleteLoading,
      accessoryToDelete,
      openMenuId,
      openCreate,
      handleViewDetail,
      handleEdit,
      handleFormSaved,
      promptDelete,
      confirmDelete,
      toggleActionMenu,
      getMenuPosition,
      formatCurrency,
    };
  },
};
</script>

<style scoped>
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
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

.compact-table :deep(table) {
  font-size: 0.875rem;
}

.compact-table :deep(th),
.compact-table :deep(td) {
  padding: 0.5rem 0.75rem;
}

.compact-table :deep(tbody tr) {
  transition: background-color 0.15s ease;
}

.compact-table :deep(tbody tr:hover) {
  background-color: #f9fafb;
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
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style>
