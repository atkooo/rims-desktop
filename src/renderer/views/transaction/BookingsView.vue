<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Booking Barang</h1>
        <p class="subtitle">Data booking beserta jadwal pelaksanaannya.</p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span>Total Booking</span>
        <strong>{{ stats.totalBookings }}</strong>
      </div>
      <div class="summary-card">
        <span>Pending</span>
        <strong>{{ stats.pending }}</strong>
      </div>
      <div class="summary-card">
        <span>Confirmed</span>
        <strong>{{ stats.confirmed }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <DataTable :columns="columns" :items="bookings" :loading="loading" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/AppButton.vue";
import DataTable from "@/components/DataTable.vue";
import { fetchBookings } from "@/services/transactions";

export default {
  name: "BookingsView",
  components: { AppButton, DataTable },
  setup() {
    const bookings = ref([]);
    const loading = ref(false);
    const error = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });
    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const columns = [
      { key: "booking_code", label: "Kode" },
      { key: "customer_name", label: "Customer" },
      { key: "item_name", label: "Item" },
      { key: "quantity", label: "Jumlah" },
      { key: "booking_date", label: "Tanggal Booking", format: formatDate },
      { key: "planned_start_date", label: "Mulai", format: formatDate },
      { key: "planned_end_date", label: "Selesai", format: formatDate },
      { key: "estimated_price", label: "Estimasi", format: formatCurrency },
      { key: "deposit", label: "DP", format: formatCurrency },
      { key: "status", label: "Status" },
    ];

    const stats = computed(() => {
      const totalBookings = bookings.value.length;
      const pending = bookings.value.filter(
        (item) => item.status === "pending",
      ).length;
      const confirmed = bookings.value.filter(
        (item) => item.status === "confirmed",
      ).length;
      return { totalBookings, pending, confirmed };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        bookings.value = await fetchBookings();
      } catch (err) {
        error.value = err.message || "Gagal memuat data booking.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      bookings,
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
