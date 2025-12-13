<template>
  <div class="cashier-customers">
    <div class="page-header">
      <div>
        <h1>Data Pelanggan</h1>
        <p class="subtitle">
          Cari dan kelola data pelanggan untuk transaksi.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="openCreate">
          <Icon name="plus" :size="16" />
          Tambah Pelanggan
        </AppButton>
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          <Icon name="refresh-cw" :size="16" />
          Refresh
        </AppButton>
      </div>
    </div>

    <div class="content-section">
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
          ]"
          row-key="id"
        >
          <template #cell-is_active="{ row }">
            <span :class="['status-badge', row.is_active ? 'active' : 'inactive']">
              {{ row.is_active ? "Aktif" : "Nonaktif" }}
            </span>
          </template>
          <template #actions="{ row }">
            <AppButton
              variant="secondary"
              size="small"
              @click="openDetail(row)"
              title="Lihat Detail"
            >
              <Icon name="eye" :size="14" />
              Detail
            </AppButton>
            <AppButton
              variant="secondary"
              size="small"
              @click="handleEdit(row)"
              title="Edit"
            >
              <Icon name="edit" :size="14" />
              Edit
            </AppButton>
          </template>
        </AppTable>
      </div>
    </div>

    <!-- Customer Form Dialog -->
    <CustomerForm
      v-model="showForm"
      :edit-data="editingCustomer"
      @saved="handleFormSaved"
    />

    <!-- Detail Dialog -->
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
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import CustomerForm from "@/components/modules/customers/CustomerForm.vue";
import {
  fetchCustomers,
  fetchCustomerDocument,
} from "@/services/masterData";

export default {
  name: "CashierCustomersPage",
  components: {
    AppButton,
    AppTable,
    AppDialog,
    Icon,
    CustomerForm,
  },
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

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "phone", label: "Telepon" },
      { key: "email", label: "Email" },
      { key: "id_card_number", label: "Nomor KTP" },
      {
        key: "is_active",
        label: "Status",
      },
    ];

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

    const openCreate = () => {
      editingCustomer.value = null;
      showForm.value = true;
    };

    const handleEdit = (item) => {
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
      selectedCustomer.value = customer;
      showDetail.value = true;
      loadDetailDocuments(customer);
    };

    onMounted(() => {
      loadData();
    });

    return {
      customers,
      loading,
      error,
      showForm,
      editingCustomer,
      showDetail,
      selectedCustomer,
      detailPhoto,
      detailIdCard,
      detailLoading,
      detailError,
      columns,
      loadData,
      openCreate,
      handleEdit,
      handleFormSaved,
      openDetail,
    };
  },
};
</script>

<style scoped>
.cashier-customers {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.content-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.table-container {
  overflow-x: auto;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.detail-content {
  padding: 0.5rem 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
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
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.detail-item .value {
  font-size: 0.9375rem;
  color: #111827;
}

.detail-documents {
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.detail-documents h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #111827;
}

.detail-doc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.doc-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.doc-preview .label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.doc-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
}

.empty-doc {
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 2rem;
  text-align: center;
  border: 1px dashed #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
}

.loading-hint {
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}
</style>

