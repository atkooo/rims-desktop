<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Detail Aksesoris</h1>
        <p class="subtitle" v-if="accessory">
          Informasi lengkap untuk {{ accessory.name }}
        </p>
      </div>
      <div class="header-actions" v-if="accessory">
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
        <AppButton variant="primary" @click="handleEdit">
          Edit Aksesoris
        </AppButton>
      </div>
    </div>

    <div v-if="loading && !accessory" class="loading-container">
      <p>Memuat data...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-else-if="accessory" class="detail-container">
      <!-- Baris 1: Informasi Utama & Harga & Stok (2 card) -->
      <div class="cards-row">
        <!-- Card 1: Informasi Utama -->
        <section class="card-section">
          <h3 class="column-title">Informasi Utama</h3>
          <div class="detail-list">
            <div class="detail-row">
              <label>Kode</label>
              <div class="detail-value">{{ accessory.code }}</div>
            </div>
            <div class="detail-row">
              <label>Nama Aksesoris</label>
              <div class="detail-value">{{ accessory.name }}</div>
            </div>
            <div class="detail-row full-row">
              <label>Deskripsi</label>
              <div class="detail-value">{{ accessory.description || "-" }}</div>
            </div>
          </div>
        </section>

        <!-- Card 2: Harga & Stok -->
        <section class="card-section">
          <h3 class="column-title">Harga & Stok</h3>
          <div class="detail-list">
            <div class="detail-row">
              <label>Harga Beli</label>
              <div class="detail-value">{{ formatCurrency(accessory.purchase_price) }}</div>
            </div>
            <div class="detail-row">
              <label>Harga Jual</label>
              <div class="detail-value">{{ formatCurrency(accessory.sale_price) }}</div>
            </div>
            <div class="detail-row">
              <label>Total Stok</label>
              <div class="detail-value">{{ accessory.stock_quantity || 0 }}</div>
            </div>
            <div class="detail-row">
              <label>Stok Tersedia</label>
              <div
                class="detail-value"
                :class="{
                  'text-warning': accessory.available_quantity <= (accessory.min_stock_alert || 0),
                  'text-danger': accessory.available_quantity === 0,
                }"
              >
                {{ accessory.available_quantity || 0 }}
              </div>
            </div>
            <div class="detail-row">
              <label>Stok Terpakai</label>
              <div class="detail-value">
                {{ Math.max(0, (accessory.stock_quantity || 0) - (accessory.available_quantity || 0)) }}
              </div>
            </div>
            <div class="detail-row">
              <label>Min. Stok Alert</label>
              <div class="detail-value">{{ accessory.min_stock_alert || 0 }}</div>
            </div>
          </div>
        </section>
      </div>

      <!-- Baris 2: Ketersediaan & Informasi Sistem (2 card) -->
      <div class="cards-row">
        <!-- Card 3: Ketersediaan -->
        <section class="card-section compact">
          <h3 class="group-title">Ketersediaan</h3>
          <div class="detail-list-inline">
            <div class="detail-inline">
              <label>Bisa Disewa</label>
              <span class="status-badge" :class="accessory.is_available_for_rent ? 'active' : 'inactive'">
                {{ accessory.is_available_for_rent ? "Ya" : "Tidak" }}
              </span>
            </div>
            <div class="detail-inline">
              <label>Bisa Dijual</label>
              <span class="status-badge" :class="accessory.is_available_for_sale ? 'active' : 'inactive'">
                {{ accessory.is_available_for_sale ? "Ya" : "Tidak" }}
              </span>
            </div>
            <div class="detail-inline">
              <label>Aktif</label>
              <span class="status-badge" :class="accessory.is_active ? 'active' : 'inactive'">
                {{ accessory.is_active ? "Ya" : "Tidak" }}
              </span>
            </div>
          </div>
        </section>

        <!-- Card 4: Informasi Sistem -->
        <section class="card-section compact">
          <h3 class="group-title">Informasi Sistem</h3>
          <div class="detail-list-inline">
            <div class="detail-inline">
              <label>Dibuat</label>
              <span class="detail-value-small">{{ formatDateTime(accessory.created_at) }}</span>
            </div>
            <div class="detail-inline">
              <label>Diperbarui</label>
              <span class="detail-value-small">{{ formatDateTime(accessory.updated_at) }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <AccessoryForm
      v-model="showForm"
      :edit-data="editingAccessory"
      @saved="handleFormSaved"
    />
  </div>
</template>

<script>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AccessoryForm from "@/components/modules/accessories/AccessoryForm.vue";
import {
  fetchAccessoryById,
  fetchAccessoryByCode,
} from "@/services/masterData";

export default {
  name: "AccessoryDetailView",
  components: { AppButton, AccessoryForm },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const accessory = ref(null);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingAccessory = ref(null);

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

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        const id = route.params.id;
        const code = route.params.code;

        if (id) {
          accessory.value = await fetchAccessoryById(parseInt(id, 10));
        } else if (code) {
          accessory.value = await fetchAccessoryByCode(code);
        } else {
          throw new Error("ID atau kode aksesoris tidak ditemukan");
        }
      } catch (err) {
        error.value = err.message || "Gagal memuat detail aksesoris.";
        accessory.value = null;
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    watch(
      () => route.params.id || route.params.code,
      () => {
        loadData();
      },
    );

    const handleEdit = () => {
      if (accessory.value) {
        editingAccessory.value = accessory.value;
        showForm.value = true;
      }
    };

    const handleFormSaved = () => {
      editingAccessory.value = null;
      showForm.value = false;
      loadData();
    };

    watch(showForm, (value) => {
      if (!value) editingAccessory.value = null;
    });

    return {
      accessory,
      loading,
      error,
      showForm,
      editingAccessory,
      loadData,
      handleEdit,
      handleFormSaved,
      formatCurrency,
      formatDateTime,
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

.column-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid #e5e7eb;
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

.detail-value.text-danger {
  color: #dc2626;
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
