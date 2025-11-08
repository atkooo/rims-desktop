<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Pembayaran</h1>
        <p class="subtitle">
          Riwayat pembayaran dari transaksi sewa maupun jual.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span>Total Pembayaran</span>
        <strong>{{ payments.length }}</strong>
      </div>
      <div class="summary-card">
        <span>Total Nilai</span>
        <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <DataTable :columns="columns" :items="payments" :loading="loading" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { fetchPayments } from "@/services/transactions";

export default {
  name: "PaymentsView",
  components: { AppButton, DataTable },
  setup() {
    const payments = ref([]);
    const loading = ref(false);
    const error = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });
    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

    const columns = [
      { key: "transaction_type", label: "Tipe Transaksi" },
      { key: "transaction_id", label: "Referensi ID" },
      { key: "amount", label: "Jumlah", format: formatCurrency },
      { key: "payment_method", label: "Metode" },
      { key: "payment_date", label: "Tanggal", format: formatDate },
      { key: "reference_number", label: "No Referensi" },
      { key: "user_name", label: "Petugas" },
      { key: "notes", label: "Catatan" },
    ];

    const stats = computed(() => {
      const totalAmount = payments.value.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );
      return { totalAmount };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        payments.value = await fetchPayments();
      } catch (err) {
        error.value = err.message || "Gagal memuat data pembayaran.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      payments,
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

