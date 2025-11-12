<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">
          <router-link to="/master/accessories" class="breadcrumb-link">
            ← Kembali ke Daftar Aksesoris
          </router-link>
        </div>
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
      <!-- Informasi Utama -->
      <section class="card-section">
        <h2 class="section-title">Informasi Utama</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Kode</label>
            <div class="detail-value">{{ accessory.code }}</div>
          </div>
          <div class="detail-item">
            <label>Nama</label>
            <div class="detail-value">{{ accessory.name }}</div>
          </div>
          <div class="detail-item full-width">
            <label>Deskripsi</label>
            <div class="detail-value">
              {{ accessory.description || "-" }}
            </div>
          </div>
        </div>
      </section>

      <!-- Informasi Harga -->
      <section class="card-section">
        <h2 class="section-title">Informasi Harga</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Harga Beli</label>
            <div class="detail-value">
              {{ formatCurrency(accessory.purchase_price) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Harga Sewa / Hari</label>
            <div class="detail-value">
              {{ formatCurrency(accessory.rental_price_per_day) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Harga Jual</label>
            <div class="detail-value">
              {{ formatCurrency(accessory.sale_price) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Informasi Stok -->
      <section class="card-section">
        <h2 class="section-title">Informasi Stok</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Total Stok</label>
            <div class="detail-value">{{ accessory.stock_quantity }}</div>
          </div>
          <div class="detail-item">
            <label>Stok Tersedia</label>
            <div
              class="detail-value"
              :class="{
                'text-warning':
                  accessory.available_quantity <= accessory.min_stock_alert,
                'text-danger': accessory.available_quantity === 0,
              }"
            >
              {{ accessory.available_quantity }}
            </div>
          </div>
          <div class="detail-item">
            <label>Minimal Stok Alert</label>
            <div class="detail-value">{{ accessory.min_stock_alert }}</div>
          </div>
          <div class="detail-item">
            <label>Stok Terpakai</label>
            <div class="detail-value">
              {{ accessory.stock_quantity - accessory.available_quantity }}
            </div>
          </div>
        </div>
      </section>

      <!-- Status & Ketersediaan -->
      <section class="card-section">
        <h2 class="section-title">Status & Ketersediaan</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Bisa Disewa</label>
            <div class="detail-value">
              <span
                class="status-badge"
                :class="accessory.is_available_for_rent ? 'active' : 'inactive'"
              >
                {{ accessory.is_available_for_rent ? "Ya" : "Tidak" }}
              </span>
            </div>
          </div>
          <div class="detail-item">
            <label>Bisa Dijual</label>
            <div class="detail-value">
              <span
                class="status-badge"
                :class="accessory.is_available_for_sale ? 'active' : 'inactive'"
              >
                {{ accessory.is_available_for_sale ? "Ya" : "Tidak" }}
              </span>
            </div>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <div class="detail-value">
              <span
                class="status-badge"
                :class="accessory.is_active ? 'active' : 'inactive'"
              >
                {{ accessory.is_active ? "Aktif" : "Nonaktif" }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Informasi Sistem -->
      <section class="card-section">
        <h2 class="section-title">Informasi Sistem</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Dibuat Pada</label>
            <div class="detail-value">
              {{ formatDateTime(accessory.created_at) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Diperbarui Pada</label>
            <div class="detail-value">
              {{ formatDateTime(accessory.updated_at) }}
            </div>
          </div>
        </div>
      </section>
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
.breadcrumb-nav {
  margin-bottom: 0.5rem;
}

.breadcrumb-link {
  color: #4338ca;
  text-decoration: none;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #6366f1;
  text-decoration: underline;
}

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
  gap: 1.5rem;
}

.card-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 1rem;
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
</style>
