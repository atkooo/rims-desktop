<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Detail Transaksi Sewa</h1>
        <p class="subtitle">Item yang tercatat pada setiap transaksi sewa.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span>Total Detail</span>
        <strong>{{ details.length }}</strong>
      </div>
      <div class="summary-card">
        <span>Item Dikembalikan</span>
        <strong>{{ stats.returned }}</strong>
      </div>
      <div class="summary-card">
        <span>Item Belum Kembali</span>
        <strong>{{ stats.notReturned }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <DataTable :columns="columns" :items="details" :loading="loading" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchRentalDetails } from "@/services/transactions";

export default {
  name: "RentalDetailsView",
  components: { AppButton, DataTable },
  setup() {
    const details = ref([]);
    const loading = ref(false);
    const error = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const columns = [
      { key: "transaction_code", label: "Kode Transaksi" },
      { key: "item_name", label: "Item" },
      { key: "quantity", label: "Jumlah" },
      {
        key: "rental_price",
        label: "Harga Sewa",
        format: (value) => currencyFormatter.format(value ?? 0),
      },
      {
        key: "subtotal",
        label: "Subtotal",
        format: (value) => currencyFormatter.format(value ?? 0),
      },
      {
        key: "is_returned",
        label: "Dikembalikan",
        format: (value) => (value ? "Ya" : "Belum"),
      },
      { key: "return_condition", label: "Kondisi" },
      { key: "notes", label: "Catatan" },
    ];

    const stats = computed(() => {
      const returned = details.value.filter(
        (detail) => detail.is_returned,
      ).length;
      const notReturned = details.value.length - returned;
      return { returned, notReturned };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        details.value = await fetchRentalDetails();
      } catch (err) {
        error.value = err.message || "Gagal memuat detail sewa.";
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

