<template>
  <div class="data-page transaction-page detail-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Detail Penjualan</h1>
          <p class="subtitle">
            {{ code ? `Kode transaksi ${code}` : "Detail penjualan tidak tersedia." }}
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" @click="goBack">Kembali</AppButton>
          <AppButton variant="secondary" :loading="loading" @click="refresh">
            Muat Ulang
          </AppButton>
        </div>
      </div>
    </div>

    <section class="card-section" v-if="!loading && !error && sale">
      <div v-if="loading" class="detail-state">
        Memuat detail transaksi...
      </div>
      <div v-else-if="error" class="error-banner">
        {{ error }}
      </div>
      <div v-else class="detail-grid">
        <div class="detail-card">
          <h4>Info Transaksi</h4>
          <div class="detail-item">
            <span>Customer</span>
            <strong>{{ sale.customer_name || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>Tanggal Penjualan</span>
            <strong>{{ formatDate(sale.sale_date) }}</strong>
          </div>
          <div class="detail-item">
            <span>Kode</span>
            <strong>{{ sale.transaction_code || "-" }}</strong>
          </div>
        </div>
        <div class="detail-card">
          <h4>Pembayaran</h4>
          <div class="detail-item">
            <span>Status</span>
            <strong>{{ sale.payment_status || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>Total</span>
            <strong>{{ formatCurrency(sale.total_amount) }}</strong>
          </div>
          <div class="detail-item">
            <span>Dibayar</span>
            <strong>{{ formatCurrency(sale.paid_amount) }}</strong>
          </div>
          <div class="detail-item">
            <span>Sisa</span>
            <strong>{{ formatCurrency((sale.total_amount || 0) - (sale.paid_amount || 0)) }}</strong>
          </div>
          <div v-if="sale.cashier_session_code" class="detail-item">
            <span>Sesi Kasir</span>
            <strong>{{ sale.cashier_session_code }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div class="section-header">
        <h3 class="section-title">Item Penjualan</h3>
        <p v-if="code" class="section-subtitle">{{ code }}</p>
      </div>

      <div v-if="detailsLoading" class="detail-state">
        Memuat item penjualan...
      </div>
      <div v-else-if="detailError" class="error-banner">
        {{ detailError }}
        <AppButton
          class="retry-button"
          variant="secondary"
          @click="loadDetails(true)"
        >
          Coba Lagi
        </AppButton>
      </div>
      <div v-else-if="!filteredDetails.length" class="detail-state">
        Tidak ada item untuk transaksi ini.
      </div>
      <table v-else class="detail-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Jumlah</th>
            <th>Harga</th>
            <th>Subtotal</th>
            <th>Dibuat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="detail in filteredDetails" :key="detail.id">
            <td>{{ detail.item_name || "-" }}</td>
            <td>{{ detail.quantity }}</td>
            <td>{{ formatCurrency(detail.sale_price) }}</td>
            <td>{{ formatCurrency(detail.subtotal) }}</td>
            <td>{{ formatDateTime(detail.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import {
  fetchSalesTransactions,
  fetchSalesDetails,
} from "@/services/transactions";

export default {
  name: "SaleTransactionDetailView",
  components: { AppButton },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const code = computed(() => route.params.code);
    const sale = ref(null);
    const details = ref([]);
    const loading = ref(false);
    const error = ref("");
    const detailsLoading = ref(false);
    const detailError = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";
    const formatDateTime = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

    const loadDetails = async (force = false) => {
      if (details.value.length && !force) return;
      detailsLoading.value = true;
      detailError.value = "";
      if (force) {
        details.value = [];
      }
      try {
        details.value = await fetchSalesDetails();
      } catch (err) {
        detailError.value = err.message || "Gagal memuat detail penjualan.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const filteredDetails = computed(() => {
      if (!sale.value) return [];
      return details.value.filter(
        (detail) => detail.transaction_code === sale.value.transaction_code,
      );
    });

    const loadSale = async () => {
      if (!code.value) {
        error.value = "Kode transaksi tidak tersedia.";
        sale.value = null;
        details.value = [];
        return;
      }

      loading.value = true;
      error.value = "";
      try {
        const sales = await fetchSalesTransactions();
        const found = sales.find(
          (item) => item.transaction_code === code.value,
        );
        if (!found) {
          throw new Error("Transaksi tidak ditemukan.");
        }
        sale.value = found;
        await loadDetails(true);
      } catch (err) {
        error.value = err.message || "Gagal memuat detail penjualan.";
        sale.value = null;
        details.value = [];
      } finally {
        loading.value = false;
      }
    };

    const refresh = () => loadSale();
    const goBack = () => router.back();

    watch(code, (newCode, oldCode) => {
      if (newCode !== oldCode) {
        loadSale();
      }
    });

    onMounted(loadSale);

    return {
      code,
      sale,
      detailsLoading,
      detailError,
      filteredDetails,
      formatCurrency,
      formatDate,
      formatDateTime,
      loadDetails,
      loading,
      error,
      goBack,
      refresh,
    };
  },
};
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.section-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.detail-card {
  padding: 1rem 1.1rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background-color: #f8fafc;
}

.detail-card h4 {
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
  color: #4338ca;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 0.25rem;
  font-size: 0.95rem;
  color: #374151;
}

.detail-item span {
  color: #6b7280;
}

.detail-state {
  text-align: center;
  padding: 1rem 0;
  color: #6b7280;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.detail-table th,
.detail-table td {
  padding: 0.65rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}

.detail-table thead {
  background-color: #eef2ff;
  font-weight: 600;
}

.retry-button {
  margin-left: 0.75rem;
}

.subtitle {
  color: #6b7280;
  margin: 0.35rem 0 0;
}
</style>
