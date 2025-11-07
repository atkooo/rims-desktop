<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Data Paket</h1>
        <p class="subtitle">
          Informasi paket barang/aksesoris tanpa aksi perubahan.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

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

    <DataTable :columns="columns" :items="bundles" :loading="loading" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/AppButton.vue";
import DataTable from "@/components/DataTable.vue";
import { fetchBundles } from "@/services/masterData";

export default {
  name: "BundlesView",
  components: { AppButton, DataTable },
  setup() {
    const bundles = ref([]);
    const loading = ref(false);
    const error = ref("");

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

    onMounted(loadData);

    return {
      bundles,
      loading,
      error,
      columns,
      stats,
      loadData,
    };
  },
};
</script>
