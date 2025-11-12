<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Data Pelanggan</h1>
        <p class="subtitle">
          Informasi pelanggan beserta dokumen identitas dan status keaktifan.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="openCreate">
          Tambah Pelanggan
        </AppButton>
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Pelanggan</span>
          <strong>{{ stats.totalCustomers }}</strong>
        </div>
        <div class="summary-card">
          <span>Pelanggan Aktif</span>
          <strong>{{ stats.activeCustomers }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Transaksi</span>
          <strong>{{ stats.totalTransactions }}</strong>
        </div>
        <div class="summary-card">
          <span>Rata-rata Transaksi</span>
          <strong>{{ stats.avgTransactions }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="customers"
          :loading="loading"
          :searchable-keys="[
            'code',
            'name',
            'phone',
            'email',
            'id_card_number',
            'address',
          ]"
          row-key="id"
        >
          <template #cell-documents="{ row }">
            <div class="doc-status">
              <span
                :class="['dot', row.photo_path ? 'dot-success' : 'dot-muted']"
              >
                Foto
              </span>
              <span
                :class="[
                  'dot',
                  row.id_card_image_path ? 'dot-success' : 'dot-muted',
                ]"
              >
                KTP
              </span>
            </div>
          </template>
          <template #cell-is_active="{ row }">
            {{ row.is_active ? "Aktif" : "Nonaktif" }}
          </template>
          <template #cell-created_at="{ row }">
            {{
              row.created_at
                ? new Date(row.created_at).toLocaleDateString("id-ID")
                : "-"
            }}
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
                      @click="openDetail(row)"
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

    <CustomerForm
      v-model="showForm"
      :edit-data="editingCustomer"
      @saved="handleFormSaved"
    />

    <AppDialog
      v-model="showDetail"
      title="Detail Pelanggan"
      :show-footer="false"
    >
      <div v-if="selectedCustomer" class="detail-content">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Kode</span>
            <span class="value">{{ selectedCustomer.code }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Nama</span>
            <span class="value">{{ selectedCustomer.name }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Telepon</span>
            <span class="value">{{ selectedCustomer.phone || "-" }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Email</span>
            <span class="value">{{ selectedCustomer.email || "-" }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Nomor KTP</span>
            <span class="value">{{
              selectedCustomer.id_card_number || "-"
            }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Status</span>
            <span class="value">
              {{ selectedCustomer.is_active ? "Aktif" : "Nonaktif" }}
            </span>
          </div>
          <div class="detail-item detail-address">
            <span class="label">Alamat</span>
            <span class="value">{{ selectedCustomer.address || "-" }}</span>
          </div>
          <div class="detail-item detail-notes">
            <span class="label">Catatan</span>
            <span class="value">{{ selectedCustomer.notes || "-" }}</span>
          </div>
        </div>

        <div class="detail-documents">
          <h4>Dokumen</h4>
          <p v-if="detailError" class="error-message">{{ detailError }}</p>
          <div v-else>
            <p v-if="detailLoading" class="loading-hint">Memuat dokumen...</p>
            <div v-else class="detail-doc-grid">
              <div class="doc-preview">
                <span class="label">Foto</span>
                <img
                  v-if="detailPhoto"
                  :src="detailPhoto"
                  alt="Foto pelanggan"
                />
                <span v-else class="empty-doc">Belum diunggah</span>
              </div>
              <div class="doc-preview">
                <span class="label">KTP</span>
                <img v-if="detailIdCard" :src="detailIdCard" alt="Foto KTP" />
                <span v-else class="empty-doc">Belum diunggah</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="loading-hint">Memuat detail pelanggan...</p>
    </AppDialog>

    <AppDialog
      v-model="showDeleteConfirm"
      title="Hapus Pelanggan"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    >
      <p>
        Yakin ingin menghapus
        <strong>{{ customerToDelete?.name }}</strong
        >?
      </p>
      <p class="delete-hint">
        Aksi ini hanya tersedia jika pelanggan belum memiliki transaksi.
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
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import CustomerForm from "@/components/modules/customers/CustomerForm.vue";
import {
  fetchCustomers,
  deleteCustomer,
  fetchCustomerDocument,
} from "@/services/masterData";

export default {
  name: "CustomersView",
  components: { AppButton, AppTable, AppDialog, Icon, CustomerForm },
  setup() {
    const customers = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingCustomer = ref(null);
    const showDetail = ref(false);
    const selectedCustomer = ref(null);
    const detailPhoto = ref("");
    const detailIdCard = ref("");
    const detailLoading = ref(false);
    const detailError = ref("");
    const showDeleteConfirm = ref(false);
    const deleteLoading = ref(false);
    const customerToDelete = ref(null);
    const openMenuId = ref(null);
    const menuPositions = ref({});

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "phone", label: "Telepon" },
      { key: "email", label: "Email" },
      { key: "id_card_number", label: "Nomor KTP" },
      { key: "documents", label: "Dokumen" },
      { key: "total_transactions", label: "Total Transaksi" },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Nonaktif"),
      },
      {
        key: "created_at",
        label: "Dibuat",
        format: (value) =>
          value ? new Date(value).toLocaleDateString("id-ID") : "-",
      },
    ];

    const stats = computed(() => {
      const totalCustomers = customers.value.length;
      const activeCustomers = customers.value.filter(
        (customer) => customer.is_active,
      ).length;
      const totalTransactions = customers.value.reduce(
        (sum, customer) => sum + (customer.total_transactions || 0),
        0,
      );
      const avgTransactions = totalCustomers
        ? (totalTransactions / totalCustomers).toFixed(1)
        : 0;

      return {
        totalCustomers,
        activeCustomers,
        totalTransactions,
        avgTransactions,
      };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        customers.value = await fetchCustomers();
      } catch (err) {
        error.value = err.message || "Gagal memuat data pelanggan.";
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
      editingCustomer.value = null;
      showForm.value = true;
    };

    const handleEdit = (item) => {
      openMenuId.value = null;
      editingCustomer.value = { ...item };
      showForm.value = true;
    };

    const handleFormSaved = () => {
      editingCustomer.value = null;
      loadData();
    };

    const resetDetailState = () => {
      detailPhoto.value = "";
      detailIdCard.value = "";
      detailError.value = "";
    };

    const loadDetailDocuments = async (customer) => {
      resetDetailState();
      if (!customer?.photo_path && !customer?.id_card_image_path) return;

      detailLoading.value = true;
      try {
        if (customer.photo_path) {
          const result = await fetchCustomerDocument(customer.photo_path);
          detailPhoto.value = result?.dataUrl || "";
        }

        if (customer.id_card_image_path) {
          const result = await fetchCustomerDocument(
            customer.id_card_image_path,
          );
          detailIdCard.value = result?.dataUrl || "";
        }
      } catch (err) {
        detailError.value = err.message || "Gagal memuat dokumen.";
      } finally {
        detailLoading.value = false;
      }
    };

    const openDetail = (customer) => {
      openMenuId.value = null;
      selectedCustomer.value = customer;
      showDetail.value = true;
      loadDetailDocuments(customer);
    };

    const promptDelete = (customer) => {
      openMenuId.value = null;
      customerToDelete.value = customer;
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
      if (!customerToDelete.value) return;
      deleteLoading.value = true;
      try {
        await deleteCustomer(customerToDelete.value.id);
        showDeleteConfirm.value = false;
        customerToDelete.value = null;
        loadData();
      } catch (err) {
        error.value =
          err.message ||
          "Tidak dapat menghapus pelanggan. Pastikan tidak ada transaksi terkait.";
      } finally {
        deleteLoading.value = false;
      }
    };

    watch(showForm, (value) => {
      if (!value) {
        editingCustomer.value = null;
      }
    });

    watch(showDetail, (value) => {
      if (!value) {
        resetDetailState();
        selectedCustomer.value = null;
      }
    });

    return {
      customers,
      loading,
      error,
      columns,
      stats,
      loadData,
      showForm,
      editingCustomer,
      showDetail,
      selectedCustomer,
      detailPhoto,
      detailIdCard,
      detailLoading,
      detailError,
      showDeleteConfirm,
      deleteLoading,
      customerToDelete,
      openMenuId,
      openCreate,
      handleEdit,
      handleFormSaved,
      openDetail,
      promptDelete,
      confirmDelete,
      toggleActionMenu,
      getMenuPosition,
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

.doc-status {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}

.dot {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.dot::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.dot-success {
  color: #059669;
}

.dot-muted {
  color: #9ca3af;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem 1.25rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item.detail-address,
.detail-item.detail-notes {
  grid-column: 1 / -1;
}

.detail-item .label {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.detail-item .value {
  font-size: 0.95rem;
  color: #111827;
  white-space: pre-line;
}

.detail-documents {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-documents h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.detail-doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.doc-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
}

.doc-preview img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #d1d5db;
}

.empty-doc {
  font-size: 0.85rem;
  color: #9ca3af;
}

.error-message {
  margin: 0;
  font-size: 0.85rem;
  color: #dc2626;
}

.loading-hint {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.delete-hint {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: #6b7280;
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
