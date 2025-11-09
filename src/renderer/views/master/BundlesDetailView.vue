<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Detail Paket</h1>
        <p class="subtitle">Komposisi item/aksesoris pada setiap paket.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Detail</span>
          <strong>{{ stats.totalDetails }}</strong>
        </div>
        <div class="summary-card">
          <span>Paket Unik</span>
          <strong>{{ stats.uniqueBundles }}</strong>
        </div>
        <div class="summary-card">
          <span>Item dalam Paket</span>
          <strong>{{ stats.itemCount }}</strong>
        </div>
        <div class="summary-card">
          <span>Aksesoris dalam Paket</span>
          <strong>{{ stats.accessoryCount }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable :columns="columns" :items="details" :loading="loading" />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchBundleDetails } from "@/services/masterData";

export default {
  name: "BundlesDetailView",
  components: { AppButton, DataTable },
  setup() {
    const details = ref([]);
    const loading = ref(false);
    const error = ref("");

    const columns = [
      { key: "bundle_name", label: "Nama Paket" },
      { key: "item_name", label: "Item" },
      { key: "accessory_name", label: "Aksesoris" },
      { key: "quantity", label: "Jumlah" },
      { key: "notes", label: "Catatan" },
    ];

    const stats = computed(() => {
      const totalDetails = details.value.length;
      const uniqueBundles = new Set(details.value.map((row) => row.bundle_name))
        .size;
      const itemCount = details.value.filter((row) => row.item_name).length;
      const accessoryCount = details.value.filter(
        (row) => row.accessory_name,
      ).length;

      return { totalDetails, uniqueBundles, itemCount, accessoryCount };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        details.value = await fetchBundleDetails();
      } catch (err) {
        error.value = err.message || "Gagal memuat detail paket.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      details,
      loading,
      error,
      columns,
      stats,
      loadData,
    };
  },
};
</script>
