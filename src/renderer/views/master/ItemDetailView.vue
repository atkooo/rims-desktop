<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">
          <router-link to="/master/items" class="breadcrumb-link">
            ← Kembali ke Daftar Item
          </router-link>
        </div>
        <h1>Detail Item</h1>
        <p class="subtitle" v-if="item">
          Informasi lengkap untuk {{ item.name }}
        </p>
      </div>
      <div class="header-actions" v-if="item">
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
        <AppButton variant="primary" @click="handleEdit"> Edit Item </AppButton>
      </div>
    </div>

    <div v-if="loading && !item" class="loading-container">
      <p>Memuat data...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-else-if="item" class="detail-container">
      <!-- Informasi Utama -->
      <section class="card-section">
        <h2 class="section-title">Informasi Utama</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Kode</label>
            <div class="detail-value">{{ item.code }}</div>
          </div>
          <div class="detail-item">
            <label>Nama Item</label>
            <div class="detail-value">{{ item.name }}</div>
          </div>
          <div class="detail-item">
            <label>Kategori</label>
            <div class="detail-value">{{ item.category_name || "-" }}</div>
          </div>
          <div class="detail-item">
            <label>Ukuran</label>
            <div class="detail-value">{{ item.size_name || "-" }}</div>
          </div>
          <div class="detail-item">
            <label>Tipe</label>
            <div class="detail-value">
              <span class="status-badge" :class="getTypeClass(item.type)">
                {{ item.type }}
              </span>
            </div>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <div class="detail-value">
              <span class="status-badge" :class="getStatusClass(item.status)">
                {{ item.status }}
              </span>
            </div>
          </div>
          <div class="detail-item full-width">
            <label>Deskripsi</label>
            <div class="detail-value">
              {{ item.description || "-" }}
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
              {{ formatCurrency(item.purchase_price) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Harga Sewa / Hari</label>
            <div class="detail-value">
              {{ formatCurrency(item.rental_price_per_day) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Harga Jual</label>
            <div class="detail-value">
              {{ formatCurrency(item.sale_price) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Harga</label>
            <div class="detail-value">
              {{ formatCurrency(item.price) }}
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
            <div class="detail-value">{{ item.stock_quantity || 0 }}</div>
          </div>
          <div class="detail-item">
            <label>Stok Tersedia</label>
            <div
              class="detail-value"
              :class="{
                'text-warning':
                  item.available_quantity <= (item.min_stock_alert || 0),
                'text-danger': item.available_quantity === 0,
              }"
            >
              {{ item.available_quantity || 0 }}
            </div>
          </div>
          <div class="detail-item">
            <label>Minimal Stok Alert</label>
            <div class="detail-value">{{ item.min_stock_alert || 0 }}</div>
          </div>
          <div class="detail-item">
            <label>Stok Terpakai</label>
            <div class="detail-value">
              {{ (item.stock_quantity || 0) - (item.available_quantity || 0) }}
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
                :class="item.is_available_for_rent ? 'active' : 'inactive'"
              >
                {{ item.is_available_for_rent ? "Ya" : "Tidak" }}
              </span>
            </div>
          </div>
          <div class="detail-item">
            <label>Bisa Dijual</label>
            <div class="detail-value">
              <span
                class="status-badge"
                :class="item.is_available_for_sale ? 'active' : 'inactive'"
              >
                {{ item.is_available_for_sale ? "Ya" : "Tidak" }}
              </span>
            </div>
          </div>
          <div class="detail-item">
            <label>Aktif</label>
            <div class="detail-value">
              <span
                class="status-badge"
                :class="item.is_active ? 'active' : 'inactive'"
              >
                {{ item.is_active ? "Ya" : "Tidak" }}
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
              {{ formatDateTime(item.created_at) }}
            </div>
          </div>
          <div class="detail-item">
            <label>Diperbarui Pada</label>
            <div class="detail-value">
              {{ formatDateTime(item.updated_at) }}
            </div>
          </div>
        </div>
      </section>
    </div>

    <ItemForm
      v-model="showForm"
      :edit-data="editingItem"
      @saved="handleFormSaved"
    />
  </div>
</template>

<script>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import ItemForm from "@/components/modules/items/ItemForm.vue";
import { fetchItemById } from "@/services/masterData";

export default {
  name: "ItemDetailView",
  components: { AppButton, ItemForm },
  setup() {
    const route = useRoute();
    const item = ref(null);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingItem = ref(null);

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

    const getTypeClass = (type) => {
      const typeMap = {
        RENTAL: "rental",
        SALE: "sale",
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

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        const id = route.params.id;
        if (!id) {
          throw new Error("ID item tidak ditemukan");
        }
        item.value = await fetchItemById(parseInt(id, 10));
      } catch (err) {
        error.value = err.message || "Gagal memuat detail item.";
        item.value = null;
      } finally {
        loading.value = false;
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
      if (item.value) {
        editingItem.value = item.value;
        showForm.value = true;
      }
    };

    const handleFormSaved = () => {
      editingItem.value = null;
      showForm.value = false;
      loadData();
    };

    watch(showForm, (value) => {
      if (!value) editingItem.value = null;
    });

    return {
      item,
      loading,
      error,
      showForm,
      editingItem,
      loadData,
      handleEdit,
      handleFormSaved,
      formatCurrency,
      formatDateTime,
      getTypeClass,
      getStatusClass,
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

.status-badge.rental {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-badge.sale {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge.hybrid {
  background-color: #e9d5ff;
  color: #6b21a8;
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
