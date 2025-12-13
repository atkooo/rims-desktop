<template>
  <div class="data-page transaction-page detail-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Detail Penjualan</h1>
          <p class="subtitle">
            {{
              code
                ? `Kode transaksi ${code}`
                : "Detail penjualan tidak tersedia."
            }}
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

    <!-- Cancelled Status Banner -->
    <section v-if="!loading && !error && sale && isCancelled(sale) && showCancelledBanner" class="card-section">
      <div class="cancelled-banner">
        <div class="cancelled-banner-content">
          <div class="cancelled-banner-icon">
            <Icon name="x-circle" :size="20" />
          </div>
          <div class="cancelled-banner-text">
            <strong>Transaksi Dibatalkan</strong>
            <span>Transaksi ini telah dibatalkan dan tidak dapat dilakukan pembayaran atau pengeditan.</span>
          </div>
          <button class="cancelled-banner-close" @click="showCancelledBanner = false" aria-label="Tutup">
            <Icon name="x" :size="18" />
          </button>
        </div>
      </div>
    </section>

    <section class="card-section" v-if="!loading && !error && sale">
      <div v-if="loading" class="detail-state">Memuat detail transaksi...</div>
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
            <strong>{{ displayStatus(sale) }}</strong>
          </div>
          <div class="detail-item">
            <span>Subtotal</span>
            <strong>{{ formatCurrency(sale.subtotal || 0) }}</strong>
          </div>
          <div class="detail-item" v-if="(sale.discount || 0) > 0">
            <span>Diskon</span>
            <strong class="discount">- {{ formatCurrency(sale.discount || 0) }}</strong>
          </div>
          <div class="detail-item" v-if="(sale.tax || 0) > 0">
            <span>Pajak</span>
            <strong>+ {{ formatCurrency(sale.tax || 0) }}</strong>
          </div>
          <div class="detail-item total-row">
            <span>Total</span>
            <strong>{{ formatCurrency(sale.total_amount) }}</strong>
          </div>
          <div class="detail-item">
            <span>Dibayar</span>
            <strong>{{ formatCurrency(sale.paid_amount) }}</strong>
          </div>
          <div class="detail-item remaining-row">
            <span>Sisa</span>
            <strong>{{
              formatCurrency((sale.total_amount || 0) - (sale.paid_amount || 0))
            }}</strong>
          </div>
          <div v-if="sale.cashier_session_code" class="detail-item">
            <span>Sesi Kasir</span>
            <strong>{{ sale.cashier_session_code }}</strong>
          </div>
          <div v-if="!isPaid(sale) && !isCancelled(sale)" class="detail-item payment-action">
            <AppButton variant="primary" @click="openPaymentModal">
              <Icon name="credit-card" :size="18" />
              Bayar Sekarang
            </AppButton>
          </div>
          <div v-if="isPaid(sale)" class="detail-item receipt-action">
            <AppButton variant="primary" @click="showReceiptPreview = true">
              <Icon name="printer" :size="18" />
              Cetak Struk
            </AppButton>
          </div>
          <div v-if="!isPaid(sale) && sale.status !== 'cancelled'" class="detail-item edit-action">
            <AppButton variant="secondary" @click="goToEdit">
              <Icon name="edit" :size="18" />
              Edit Transaksi
            </AppButton>
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
      <div v-else class="table-wrapper">
        <table class="detail-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Tipe</th>
            <th>Nama</th>
            <th>Jumlah</th>
            <th>Harga</th>
            <th>Subtotal</th>
            <th>Dibuat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="detail in filteredDetails" :key="detail.id">
            <td data-label="Kode"><strong>{{ detail.item_code || "-" }}</strong></td>
            <td data-label="Tipe">
              <span class="type-badge" :class="detail.item_type">
                {{ detail.item_type_label || "Item" }}
              </span>
            </td>
            <td data-label="Nama">{{ detail.item_name || "-" }}</td>
            <td data-label="Jumlah">{{ detail.quantity }}</td>
            <td data-label="Harga">{{ formatCurrency(detail.sale_price) }}</td>
            <td data-label="Subtotal"><strong>{{ formatCurrency(detail.subtotal) }}</strong></td>
            <td data-label="Dibuat">{{ formatDateTime(detail.created_at) }}</td>
          </tr>
        </tbody>
        </table>
      </div>
    </section>
  </div>

  <!-- Payment Modal -->
  <PaymentModal
    v-model="showPaymentModal"
    :transaction-id="sale?.id"
    @payment-success="handlePaymentSuccess"
    @close="handlePaymentModalClose"
  />

  <!-- Receipt Preview Dialog -->
  <ReceiptPreviewDialog
    v-model="showReceiptPreview"
    :transaction-id="sale?.id"
    transaction-type="sale"
    @printed="handleReceiptPrinted"
  />
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import ReceiptPreviewDialog from "@/components/ui/ReceiptPreviewDialog.vue";
import {
  fetchSalesTransactions,
  fetchSalesDetails,
} from "@/services/transactions";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "SaleTransactionDetailView",
  components: { AppButton, Icon, PaymentModal, ReceiptPreviewDialog },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const code = computed(() => route.params.code);
    const shouldAutoPrintReceipt = computed(() => route.query.printReceipt === "true");
    const sale = ref(null);
    const details = ref([]);
    const loading = ref(false);
    const error = ref("");
    const detailsLoading = ref(false);
    const detailError = ref("");
    const showPaymentModal = ref(false);
    const showReceiptPreview = ref(false);
    const showCancelledBanner = ref(true);
    const { showSuccess } = useNotification();

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
        
        // Auto-open receipt preview if query parameter is set and transaction is paid
        if (shouldAutoPrintReceipt.value && isPaid(found)) {
          // Remove query parameter from URL
          router.replace({ query: {} });
          // Open receipt preview after a short delay
          setTimeout(() => {
            showReceiptPreview.value = true;
          }, 300);
        }
      } catch (err) {
        error.value = err.message || "Gagal memuat detail penjualan.";
        sale.value = null;
        details.value = [];
      } finally {
        loading.value = false;
      }
    };

    const refresh = () => {
      loadSale();
      loadDetails(true);
    };
    const goBack = () => router.back();
    
    const goToEdit = () => {
      router.push({
        name: "transaction-sale-edit",
        params: { code: code.value },
      });
    };

    const isPaid = (sale) => {
      if (!sale) return false;
      const status = (sale.payment_status || sale.paymentStatus || "")
        .toString()
        .toLowerCase();
      return status === "paid";
    };

    const isCancelled = (sale) => {
      if (!sale) return false;
      const status = (sale.status || "").toString().toLowerCase();
      return status === "cancelled";
    };

    const displayStatus = (sale) => {
      if (!sale) return "-";
      // Check if transaction is cancelled
      const status = (sale.status || "").toString().toLowerCase();
      if (status === "cancelled" || status === "CANCELLED") {
        return "Dibatalkan";
      }
      // Otherwise show payment status
      const paymentStatus = (sale.payment_status || sale.paymentStatus || "").toString().toLowerCase();
      if (paymentStatus === "paid") return "Lunas";
      if (paymentStatus === "unpaid") return "Belum Lunas";
      return paymentStatus || "-";
    };

    const openPaymentModal = () => {
      if (!sale.value?.id) return;
      showPaymentModal.value = true;
    };

    const handlePaymentSuccess = async (data) => {
      if (!data.partial) {
        // Payment is complete
        showSuccess("Pembayaran berhasil! Transaksi telah dilunasi.");
        showPaymentModal.value = false;
        // Reload sale data to update payment status
        await loadSale();
        // Auto-open receipt preview after successful payment
        setTimeout(() => {
          showReceiptPreview.value = true;
        }, 500);
      } else {
        // Partial payment, keep modal open
        showSuccess("Pembayaran berhasil! Masih ada sisa pembayaran.");
        loadSale(); // Reload to update payment status
      }
    };

    const handleReceiptPrinted = (result) => {
      if (result && result.success) {
        showSuccess("Struk berhasil dicetak!");
      }
    };

    const handlePaymentModalClose = (data) => {
      showPaymentModal.value = false;
      
      // If modal closed without payment (unpaid), just reload data
      if (data?.unpaid) {
        loadSale(); // Reload to refresh data
      }
    };

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
      goToEdit,
      refresh,
      isPaid,
      isCancelled,
      displayStatus,
      showPaymentModal,
      showReceiptPreview,
      showCancelledBanner,
      openPaymentModal,
      handlePaymentSuccess,
      handlePaymentModalClose,
      handleReceiptPrinted,
    };
  },
};
</script>

<style scoped>
.data-page.transaction-page.detail-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
}

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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  max-width: 100%;
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

.detail-item.total-row {
  border-top: 2px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  font-weight: 600;
}

.detail-item.remaining-row {
  color: #dc2626;
  font-weight: 600;
}

.detail-item .discount {
  color: #16a34a;
}

.detail-item.payment-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.detail-item.payment-action button,
.detail-item.receipt-action button {
  width: 100%;
}

.detail-item.receipt-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.detail-state {
  text-align: center;
  padding: 1rem 0;
  color: #6b7280;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  table-layout: auto;
}

.detail-table th,
.detail-table td {
  padding: 0.65rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
  word-wrap: break-word;
}

.detail-table th:nth-child(1),
.detail-table td:nth-child(1) {
  min-width: 120px;
  max-width: 150px;
}

.detail-table th:nth-child(3),
.detail-table td:nth-child(3) {
  min-width: 150px;
  max-width: 250px;
}

.detail-table th:nth-child(7),
.detail-table td:nth-child(7) {
  min-width: 140px;
  max-width: 180px;
}

.detail-table thead {
  background-color: #eef2ff;
  font-weight: 600;
}

/* Using global badge utility classes */
.type-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.type-badge.item {
  background-color: #dbeafe;
  color: #1e40af;
}

.type-badge.accessory {
  background-color: #fef3c7;
  color: #92400e;
}

.retry-button {
  margin-left: 0.75rem;
}

.subtitle {
  color: #6b7280;
  margin: 0.35rem 0 0;
}

/* Cancelled Status Banner */
.cancelled-banner {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 1px solid #fca5a5;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.cancelled-banner-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.cancelled-banner-icon {
  flex-shrink: 0;
  color: #dc2626;
  margin-top: 0.125rem;
}

.cancelled-banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cancelled-banner-text strong {
  font-size: 1rem;
  font-weight: 600;
  color: #991b1b;
  display: block;
}

.cancelled-banner-text span {
  font-size: 0.875rem;
  color: #7f1d1d;
  line-height: 1.5;
}

.cancelled-banner-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-top: -0.25rem;
  margin-right: -0.25rem;
}

.cancelled-banner-close:hover {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.cancelled-banner-close:active {
  transform: scale(0.95);
}

.detail-item.edit-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.detail-item.edit-action button {
  width: 100%;
}

/* Responsive styles */
@media (max-width: 1200px) {
  .data-page.transaction-page.detail-page {
    padding: 1rem 1.5rem;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .data-page.transaction-page.detail-page {
    padding: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .detail-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .detail-table thead,
  .detail-table tbody,
  .detail-table tr,
  .detail-table th,
  .detail-table td {
    display: block;
  }
  
  .detail-table thead {
    display: none;
  }
  
  .detail-table tr {
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.75rem;
    background: white;
  }
  
  .detail-table td {
    border: none;
    padding: 0.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .detail-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #6b7280;
    margin-right: 1rem;
  }
}
</style>
