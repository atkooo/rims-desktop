<template>
  <div class="report-page">
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
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchItemsWithStock } from "@/services/reports";

export default {
  name: "ItemsWithStockView",
  components: { AppButton, DataTable },
  setup() {
    const items = ref([]);
    const loading = ref(false);
    const error = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama Item" },
      { key: "category_name", label: "Kategori" },
      { key: "stock_quantity", label: "Total Stok" },
      { key: "available_quantity", label: "Tersedia" },
      { key: "rented_quantity", label: "Dipinjam" },
      {
        key: "rental_price_per_day",
        label: "Harga Sewa / Hari",
        format: formatCurrency,
      },
      {
        key: "sale_price",
        label: "Harga Jual",
        format: formatCurrency,
      },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Tidak Aktif"),
      },
    ];

    const stats = computed(() => {
      const totalItems = items.value.length;
      const totalStock = items.value.reduce(
        (sum, item) => sum + (item.stock_quantity || 0),
        0,
      );
      const availableStock = items.value.reduce(
        (sum, item) => sum + (item.available_quantity || 0),
        0,
      );
      const activeItems = items.value.filter((item) => item.is_active).length;

      return { totalItems, totalStock, availableStock, activeItems };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        items.value = await fetchItemsWithStock();
      } catch (err) {
        error.value = err.message || "Gagal memuat data stok item.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      columns,
      items,
      loading,
      error,
      stats,
      loadData,
    };
  },
};
</script>

<style scoped>
.report-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #4b5563;
}

.summary-card strong {
  font-size: 1.5rem;
  color: #111827;
}

.error-banner {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: #fee2e2;
  color: #991b1b;
}
</style>
