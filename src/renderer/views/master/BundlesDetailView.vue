<template>
  <div class="data-page master-page">
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

      <AppTable
        :columns="columns"
        :rows="details"
        :loading="loading"
        :searchable-keys="[
          'bundle_name',
          'bundle_code',
          'item_name',
          'item_code',
          'accessory_name',
          'accessory_code',
          'category_name',
          'notes',
        ]"
        row-key="id"
      >
        <template #cell-bundle_code="{ row }">
          <strong>{{ row.bundle_code || "-" }}</strong>
        </template>
        <template #cell-code="{ row }">
          <strong>{{ row.item_code || row.accessory_code || "-" }}</strong>
        </template>
        <template #cell-type="{ row }">
          <span v-if="row.type_label && row.type_label !== '-'" class="type-badge" :class="row.type">
            {{ row.type_label }}
          </span>
          <span v-else>-</span>
        </template>
        <template #cell-name="{ row }">
          {{ row.item_name || row.accessory_name || "-" }}
        </template>
        <template #cell-category="{ row }">
          {{ row.category_name || "-" }}
        </template>
        <template #cell-price="{ row }">
          <span v-if="row.item_id">
            {{ formatCurrency(row.item_sale_price || 0) }}
          </span>
          <span v-else-if="row.accessory_id">
            {{ formatCurrency(row.accessory_sale_price || 0) }}
          </span>
          <span v-else>-</span>
        </template>
      </AppTable>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import { fetchBundleDetails } from "@/services/masterData";

export default {
  name: "BundlesDetailView",
  components: { AppButton, AppTable },
  setup() {
    const details = ref([]);
    const loading = ref(false);
    const error = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const columns = [
      { key: "bundle_code", label: "Kode Paket" },
      { key: "bundle_name", label: "Nama Paket" },
      { key: "code", label: "Kode" },
      { key: "type", label: "Tipe" },
      { key: "name", label: "Nama" },
      { key: "category", label: "Kategori" },
      { key: "price", label: "Harga" },
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
      formatCurrency,
    };
  },
};
</script>

<style scoped>
.type-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-badge.item {
  background-color: #dbeafe;
  color: #1e40af;
}

.type-badge.accessory {
  background-color: #fef3c7;
  color: #92400e;
}
</style>
