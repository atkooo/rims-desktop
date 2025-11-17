<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Detail Paket</h1>
        <p class="subtitle" v-if="bundle">
          Informasi lengkap untuk {{ bundle.name }}
        </p>
      </div>
      <div class="header-actions" v-if="bundle">
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
        <AppButton variant="primary" @click="handleEdit">
          Edit Paket
        </AppButton>
      </div>
    </div>

    <div v-if="loading && !bundle" class="loading-container">
      <p>Memuat data...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-else-if="bundle" class="detail-container">
      <!-- Baris 1: Informasi Utama & Harga & Stok (2 card) -->
      <div class="cards-row">
        <!-- Card 1: Informasi Utama -->
        <section class="card-section">
          <h3 class="column-title">Informasi Utama</h3>
          <div class="detail-list">
            <div class="detail-row">
              <label>Kode</label>
              <div class="detail-value">{{ bundle.code }}</div>
            </div>
            <div class="detail-row">
              <label>Nama Paket</label>
              <div class="detail-value">{{ bundle.name }}</div>
            </div>
            <div class="detail-row">
              <label>Tipe Paket</label>
              <div class="detail-value">
                <span
                  class="status-badge"
                  :class="bundle.bundle_type === 'rental' ? 'rental' : 'sale'"
                >
                  {{ bundle.bundle_type === "rental" ? "Rental" : "Penjualan" }}
                </span>
              </div>
            </div>
            <div class="detail-row">
              <label>Status</label>
              <div class="detail-value">
                <span
                  class="status-badge"
                  :class="bundle.is_active ? 'active' : 'inactive'"
                >
                  {{ bundle.is_active ? "Aktif" : "Nonaktif" }}
                </span>
              </div>
            </div>
            <div class="detail-row full-row">
              <label>Deskripsi</label>
              <div class="detail-value">{{ bundle.description || "-" }}</div>
            </div>
          </div>
        </section>

        <!-- Card 2: Harga & Stok -->
        <section class="card-section">
          <h3 class="column-title">Harga & Stok</h3>
          <div class="detail-list">
            <div class="detail-row">
              <label>Harga Paket</label>
              <div class="detail-value">{{ formatCurrency(bundle.price) }}</div>
            </div>
            <div v-if="bundle.bundle_type === 'rental'" class="detail-row">
              <label>Harga Sewa/Hari</label>
              <div class="detail-value">{{ formatCurrency(bundle.rental_price_per_day) }}</div>
            </div>
            <div class="detail-row">
              <label>Total Stok</label>
              <div class="detail-value">{{ bundle.stock_quantity || 0 }}</div>
            </div>
            <div class="detail-row">
              <label>Stok Tersedia</label>
              <div
                class="detail-value"
                :class="{
                  'text-warning': bundle.available_quantity <= 0,
                  'text-danger': bundle.available_quantity === 0,
                }"
              >
                {{ bundle.available_quantity || 0 }}
              </div>
            </div>
            <div class="detail-row">
              <label>Stok Terpakai</label>
              <div class="detail-value">
                {{ Math.max(0, (bundle.stock_quantity || 0) - (bundle.available_quantity || 0)) }}
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Baris 2: Komposisi Paket -->
      <section class="card-section">
        <div class="section-header">
          <h3 class="column-title">Komposisi Paket</h3>
          <AppButton variant="primary" size="small" @click="openDetailEditor">
            Kelola Komposisi
          </AppButton>
        </div>
        <div v-if="detailsLoading" class="detail-state">
          Memuat komposisi paket...
        </div>
        <div v-else-if="detailsError" class="error-banner">
          {{ detailsError }}
          <AppButton
            class="retry-button"
            variant="secondary"
            size="small"
            @click="loadBundleDetails"
          >
            Coba Lagi
          </AppButton>
        </div>
        <div v-else-if="!bundleDetails.length" class="detail-state">
          Tidak ada komposisi untuk paket ini.
        </div>
        <AppTable
          v-else
          :columns="detailColumns"
          :rows="bundleDetails"
          :loading="false"
        />
      </section>

      <!-- Baris 3: Informasi Sistem -->
      <section class="card-section compact">
        <h3 class="group-title">Informasi Sistem</h3>
        <div class="detail-list-inline">
          <div class="detail-inline">
            <label>Dibuat</label>
            <span class="detail-value-small">{{ formatDateTime(bundle.created_at) }}</span>
          </div>
          <div class="detail-inline">
            <label>Diperbarui</label>
            <span class="detail-value-small">{{ formatDateTime(bundle.updated_at) }}</span>
          </div>
        </div>
      </section>
    </div>

    <BundleForm
      v-model="showForm"
      :edit-data="editingBundle"
      @saved="handleFormSaved"
    />

    <BundleDetailEditor
      v-model="detailEditorOpen"
      :bundle="editorBundle"
      @updated="handleDetailsUpdated"
    />
  </div>
</template>

<script>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import BundleForm from "@/components/modules/bundles/BundleForm.vue";
import BundleDetailEditor from "@/components/modules/bundles/BundleDetailEditor.vue";
import {
  fetchBundleById,
  fetchBundleDetailsByBundle,
} from "@/services/masterData";

export default {
  name: "BundleDetailPageView",
  components: {
    AppButton,
    AppTable,
    BundleForm,
    BundleDetailEditor,
  },
  setup() {
    const route = useRoute();
    const bundle = ref(null);
    const bundleDetails = ref([]);
    const loading = ref(false);
    const detailsLoading = ref(false);
    const error = ref("");
    const detailsError = ref("");
    const showForm = ref(false);
    const editingBundle = ref(null);
    const detailEditorOpen = ref(false);
    const editorBundle = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const formatDateTime = (value) => {
      if (!value) return "-";
      return dateTimeFormatter.format(new Date(value));
    };

    const detailColumns = [
      { key: "item_name", label: "Item" },
      { key: "accessory_name", label: "Aksesoris" },
      { key: "quantity", label: "Jumlah" },
      { key: "notes", label: "Catatan" },
    ];

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        const id = route.params.id;
        if (!id) {
          throw new Error("ID paket tidak ditemukan");
        }
        bundle.value = await fetchBundleById(parseInt(id, 10));
        await loadBundleDetails();
      } catch (err) {
        error.value = err.message || "Gagal memuat detail paket.";
        bundle.value = null;
      } finally {
        loading.value = false;
      }
    };

    const loadBundleDetails = async () => {
      if (!bundle.value) return;
      detailsLoading.value = true;
      detailsError.value = "";
      try {
        bundleDetails.value = await fetchBundleDetailsByBundle(bundle.value.id);
      } catch (err) {
        detailsError.value = err.message || "Gagal memuat komposisi paket.";
      } finally {
        detailsLoading.value = false;
      }
    };

    onMounted(loadData);

    watch(
      () => route.params.id,
      () => {
        loadData();
      },
    );

    const handleEdit = () => {
      if (bundle.value) {
        editingBundle.value = bundle.value;
        showForm.value = true;
      }
    };

    const handleFormSaved = () => {
      editingBundle.value = null;
      showForm.value = false;
      loadData();
    };

    const openDetailEditor = () => {
      if (bundle.value) {
        editorBundle.value = { ...bundle.value };
        detailEditorOpen.value = true;
      }
    };

    const handleDetailsUpdated = () => {
      loadBundleDetails();
    };

    watch(showForm, (value) => {
      if (!value) editingBundle.value = null;
    });

    watch(detailEditorOpen, (value) => {
      if (!value) editorBundle.value = null;
    });

    return {
      bundle,
      bundleDetails,
      loading,
      detailsLoading,
      error,
      detailsError,
      showForm,
      editingBundle,
      detailEditorOpen,
      editorBundle,
      loadData,
      loadBundleDetails,
      handleEdit,
      handleFormSaved,
      openDetailEditor,
      handleDetailsUpdated,
      formatCurrency,
      formatDateTime,
      detailColumns,
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

.loading-container {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.card-section {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-section.compact {
  padding: 0.75rem 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.column-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-header .column-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.group-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.375rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.full-row {
  grid-template-columns: 1fr;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-row label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.4;
}

.detail-value {
  font-size: 0.9rem;
  color: #111827;
  font-weight: 500;
  line-height: 1.4;
}

.detail-list-inline {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.detail-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.detail-inline label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-value-small {
  font-size: 0.85rem;
  color: #111827;
  font-weight: 500;
}

.detail-value.text-warning {
  color: #d97706;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge.active {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge.rental {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-badge.sale {
  background-color: #fef3c7;
  color: #92400e;
}

.detail-state {
  text-align: center;
  padding: 2rem 0;
  color: #6b7280;
}

.retry-button {
  margin-left: 0.75rem;
}

.detail-value.text-warning {
  color: #d97706;
}

.detail-value.text-danger {
  color: #dc2626;
}

/* Responsive untuk layar kecil */
@media (max-width: 1024px) {
  .cards-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

@media (max-width: 768px) {
  .detail-row {
    grid-template-columns: 100px 1fr;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .detail-row label {
    font-size: 0.75rem;
  }

  .detail-value {
    font-size: 0.85rem;
  }

  .column-title,
  .group-title {
    font-size: 0.85rem;
  }
}
</style>
