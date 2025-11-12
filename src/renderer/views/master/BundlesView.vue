<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Data Paket</h1>
        <p class="subtitle">
          Kelola paket barang atau aksesoris untuk kebutuhan rental maupun
          penjualan.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="openCreate">
          Tambah Paket
        </AppButton>
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Paket</span>
          <strong>{{ stats.totalBundles }}</strong>
        </div>
        <div class="summary-card">
          <span>Paket Aktif</span>
          <strong>{{ stats.activeBundles }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Stok</span>
          <strong>{{ stats.totalStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Tipe Rental</span>
          <strong>{{ stats.rentalBundles }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
      <AppTable
        :columns="columns"
        :rows="bundles"
        :loading="loading"
        :searchable-keys="['code', 'name', 'bundle_type']"
        row-key="id"
      >
        <template #cell-price="{ row }">
          {{ formatCurrency(row.price) }}
        </template>
        <template #cell-rental_price_per_day="{ row }">
          {{ formatCurrency(row.rental_price_per_day) }}
        </template>
        <template #cell-is_active="{ row }">
          {{ row.is_active ? "Aktif" : "Nonaktif" }}
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
  </div>

  <BundleForm
    v-model="showForm"
    :edit-data="editingBundle"
    @saved="handleFormSaved"
  />

  <AppDialog
    v-model="showDeleteConfirm"
    title="Hapus Paket"
    confirm-text="Hapus"
    confirm-variant="danger"
    :loading="deleteLoading"
    @confirm="confirmDelete"
  >
    <p>
      Yakin ingin menghapus
      <strong>{{ bundleToDelete?.name }}</strong
      >?
    </p>
  </AppDialog>

  <AppDialog
    v-model="detailDialogOpen"
    :title="
      selectedBundle ? `Detail Paket - ${selectedBundle.name}` : 'Detail Paket'
    "
    :show-footer="false"
  >
    <div class="detail-dialog">
      <div v-if="selectedBundle" class="bundle-meta">
        <div class="meta-item">
          <span>Kode</span>
          <strong>{{ selectedBundle.code || "-" }}</strong>
        </div>
        <div class="meta-item">
          <span>Tipe</span>
          <strong>{{ selectedBundle.bundle_type || "-" }}</strong>
        </div>
        <div class="meta-item">
          <span>Status</span>
          <strong>{{ selectedBundle.is_active ? "Aktif" : "Nonaktif" }}</strong>
        </div>
        <div class="meta-item">
          <span>Harga Jual</span>
          <strong>{{ formatCurrency(selectedBundle.price) }}</strong>
        </div>
        <div class="meta-item">
          <span>Harga Rental/Hari</span>
          <strong>{{
            formatCurrency(selectedBundle.rental_price_per_day)
          }}</strong>
        </div>
      </div>

      <div v-if="selectedBundle" class="detail-actions">
        <AppButton variant="primary" @click="openDetailEditor">
          Kelola Komposisi
        </AppButton>
      </div>

      <div v-if="detailsLoading" class="detail-state">
        Memuat rincian paket...
      </div>
      <div v-else-if="detailError" class="error-banner">
        {{ detailError }}
        <AppButton
          class="retry-button"
          variant="secondary"
          @click="loadBundleDetails"
        >
          Coba Lagi
        </AppButton>
      </div>
      <div v-else-if="!filteredDetails.length" class="detail-state">
        Tidak ada rincian untuk paket ini.
      </div>
      <table v-else class="detail-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Aksesoris</th>
            <th>Jumlah</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="detail in filteredDetails" :key="detail.id">
            <td>{{ detail.item_name || "-" }}</td>
            <td>{{ detail.accessory_name || "-" }}</td>
            <td>{{ detail.quantity }}</td>
            <td>{{ detail.notes || "-" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppDialog>

  <BundleDetailEditor
    v-model="detailEditorOpen"
    :bundle="editorBundle"
    @updated="handleDetailsUpdated"
  />
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import BundleForm from "@/components/modules/bundles/BundleForm.vue";
import BundleDetailEditor from "@/components/modules/bundles/BundleDetailEditor.vue";
import {
  fetchBundles,
  fetchBundleDetails,
  deleteBundle,
} from "@/services/masterData";

export default {
  name: "BundlesView",
  components: {
    AppButton,
    AppTable,
    AppDialog,
    Icon,
    BundleForm,
    BundleDetailEditor,
  },
  setup() {
    const router = useRouter();
    const bundles = ref([]);
    const bundleDetails = ref([]);
    const loading = ref(false);
    const detailsLoading = ref(false);
    const error = ref("");
    const detailError = ref("");
    const detailDialogOpen = ref(false);
    const selectedBundle = ref(null);
    const detailEditorOpen = ref(false);
    const editorBundle = ref(null);

    const showForm = ref(false);
    const editingBundle = ref(null);
    const showDeleteConfirm = ref(false);
    const deleteLoading = ref(false);
    const bundleToDelete = ref(null);
    const openMenuId = ref(null);
    const menuPositions = ref({});

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama Paket" },
      { key: "bundle_type", label: "Tipe" },
      {
        key: "price",
        label: "Harga Paket",
        format: formatCurrency,
      },
      {
        key: "rental_price_per_day",
        label: "Harga Sewa/Hari",
        format: formatCurrency,
      },
      { key: "stock_quantity", label: "Stok" },
      { key: "available_quantity", label: "Tersedia" },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Nonaktif"),
      },
    ];

    const stats = computed(() => {
      const totalBundles = bundles.value.length;
      const activeBundles = bundles.value.filter(
        (bundle) => bundle.is_active,
      ).length;
      const totalStock = bundles.value.reduce(
        (sum, bundle) => sum + (bundle.stock_quantity || 0),
        0,
      );
      const rentalBundles = bundles.value.filter(
        (bundle) => bundle.bundle_type === "rental",
      ).length;

      return { totalBundles, activeBundles, totalStock, rentalBundles };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        bundles.value = await fetchBundles();
      } catch (err) {
        error.value = err.message || "Gagal memuat data paket.";
      } finally {
        loading.value = false;
      }
    };

    const loadBundleDetails = async () => {
      detailsLoading.value = true;
      detailError.value = "";
      try {
        bundleDetails.value = await fetchBundleDetails();
      } catch (err) {
        detailError.value = err.message || "Gagal memuat detail paket.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const filteredDetails = computed(() => {
      if (!selectedBundle.value) return [];
      return bundleDetails.value.filter(
        (detail) => detail.bundle_name === selectedBundle.value.name,
      );
    });

    const handleViewDetail = (bundle) => {
      openMenuId.value = null;
      router.push(`/master/bundles/${bundle.id}`);
    };

    const openBundleDetail = async (bundle) => {
      selectedBundle.value = bundle;
      detailDialogOpen.value = true;
      if (!bundleDetails.value.length) {
        await loadBundleDetails();
      }
    };

    const openDetailEditor = async (payload) => {
      const target =
        payload && typeof payload === "object" && "id" in payload
          ? payload
          : selectedBundle.value;
      if (!target) {
        detailEditorOpen.value = false;
        editorBundle.value = null;
        return;
      }
      editorBundle.value = { ...target };
      await nextTick();
      detailEditorOpen.value = true;
    };

    const handleDetailsUpdated = () => {
      loadBundleDetails();
    };

    const openCreate = () => {
      editingBundle.value = null;
      showForm.value = true;
    };

    const handleEdit = (bundle) => {
      openMenuId.value = null;
      editingBundle.value = bundle;
      showForm.value = true;
    };

    const handleFormSaved = () => {
      editingBundle.value = null;
      loadData();
      loadBundleDetails();
    };

    const promptDelete = (bundle) => {
      openMenuId.value = null;
      bundleToDelete.value = bundle;
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

    const confirmDelete = async () => {
      if (!bundleToDelete.value) return;
      deleteLoading.value = true;
      error.value = "";
      try {
        await deleteBundle(bundleToDelete.value.id);
        if (
          selectedBundle.value &&
          selectedBundle.value.id === bundleToDelete.value.id
        ) {
          detailDialogOpen.value = false;
          selectedBundle.value = null;
        }
        showDeleteConfirm.value = false;
        bundleToDelete.value = null;
        loadData();
        loadBundleDetails();
      } catch (err) {
        error.value = err.message || "Gagal menghapus paket.";
      } finally {
        deleteLoading.value = false;
      }
    };

    watch(detailDialogOpen, (isOpen) => {
      if (!isOpen) selectedBundle.value = null;
    });

    watch(showForm, (value) => {
      if (!value) editingBundle.value = null;
    });

    watch(detailEditorOpen, (value) => {
      if (!value) editorBundle.value = null;
    });

    onMounted(() => {
      document.addEventListener("click", closeActionMenu);
      loadData();
      loadBundleDetails();
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", closeActionMenu);
    });

    return {
      bundles,
      loading,
      error,
      columns,
      stats,
      loadData,
      detailDialogOpen,
      selectedBundle,
      filteredDetails,
      detailsLoading,
      detailError,
      openMenuId,
      handleViewDetail,
      openBundleDetail,
      loadBundleDetails,
      formatCurrency,
      showForm,
      editingBundle,
      openCreate,
      handleEdit,
      handleFormSaved,
      promptDelete,
      confirmDelete,
      showDeleteConfirm,
      deleteLoading,
      bundleToDelete,
      detailEditorOpen,
      editorBundle,
      openDetailEditor,
      handleDetailsUpdated,
      toggleActionMenu,
      getMenuPosition,
    };
  },
};
</script>

<style scoped>
.detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bundle-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #f9fafb;
}

.meta-item span {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.meta-item strong {
  font-size: 0.95rem;
  color: #111827;
}

.detail-state {
  text-align: center;
  padding: 1rem 0;
  color: #6b7280;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
}

.detail-table th,
.detail-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table thead {
  background-color: #f3f4f6;
  font-weight: 600;
}

.retry-button {
  margin-left: 0.75rem;
}

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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
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
