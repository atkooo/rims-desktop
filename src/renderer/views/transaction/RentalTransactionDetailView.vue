<template>
  <div class="data-page transaction-page detail-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Detail Transaksi Sewa</h1>
          <p class="subtitle">
            {{
              code
                ? `Kode transaksi ${code}`
                : "Detail transaksi tidak tersedia."
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

    <section class="card-section">
      <div v-if="loading" class="detail-state">Memuat detail transaksi...</div>
      <div v-else-if="error" class="error-banner">
        {{ error }}
      </div>
      <div v-else-if="!rental" class="detail-state">
        Detail transaksi tidak tersedia.
      </div>
      <div v-else class="detail-grid">
        <div class="detail-card">
          <h4>Info Umum</h4>
          <div class="detail-item">
            <span>Customer</span>
            <strong>{{ rental.customer_name || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>Tanggal Sewa</span>
            <strong>{{ formatDate(rental.rental_date) }}</strong>
          </div>
          <div class="detail-item">
            <span>Rencana Kembali</span>
            <strong>{{ formatDate(rental.planned_return_date) }}</strong>
          </div>
          <div class="detail-item">
            <span>Kode</span>
            <strong>{{ rental.transaction_code || "-" }}</strong>
          </div>
        </div>
        <div class="detail-card">
          <h4>Keuangan</h4>
          <div class="detail-item">
            <span>Status</span>
            <strong>{{ rental.status || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>Subtotal</span>
            <strong>{{ formatCurrency(rental.subtotal || 0) }}</strong>
          </div>
          <div class="detail-item" v-if="(rental.deposit || 0) > 0">
            <span>Deposit</span>
            <strong>+ {{ formatCurrency(rental.deposit || 0) }}</strong>
          </div>
          <div class="detail-item" v-if="(rental.tax || 0) > 0">
            <span>Pajak</span>
            <strong>+ {{ formatCurrency(rental.tax || 0) }}</strong>
          </div>
          <div class="detail-item total-row">
            <span>Total Nilai</span>
            <strong>{{ formatCurrency(rental.total_amount) }}</strong>
          </div>
          <div class="detail-item">
            <span>Dibayar</span>
            <strong>{{ formatCurrency(rental.paid_amount) }}</strong>
          </div>
          <div class="detail-item remaining-row">
            <span>Sisa</span>
            <strong>{{
              formatCurrency(
                (rental.total_amount || 0) - (rental.paid_amount || 0),
              )
            }}</strong>
          </div>
          <div v-if="rental.cashier_session_code" class="detail-item">
            <span>Sesi Kasir</span>
            <strong>{{ rental.cashier_session_code }}</strong>
          </div>
          <div v-if="!isPaid(rental)" class="detail-item payment-action">
            <AppButton variant="primary" @click="openPaymentModal">
              <Icon name="credit-card" :size="18" />
              Bayar Sekarang
            </AppButton>
          </div>
          <div v-if="isPaid(rental)" class="detail-item receipt-action">
            <AppButton variant="primary" @click="showReceiptPreview = true">
              <Icon name="printer" :size="18" />
              Cetak Struk
            </AppButton>
          </div>
        </div>
      </div>
    </section>

    <section class="card-section" v-if="!loading && !error && rental">
      <div class="section-header">
        <h3 class="section-title">Item Sewa</h3>
        <p v-if="code" class="section-subtitle">{{ code }}</p>
      </div>

      <div v-if="detailsLoading" class="detail-state">
        Memuat item transaksi...
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
            <th>Harga Sewa</th>
            <th>Subtotal</th>
            <th>Dikembalikan</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="detail in filteredDetails" :key="detail.id">
            <td>{{ detail.item_name || "-" }}</td>
            <td>{{ detail.quantity }}</td>
            <td>{{ formatCurrency(detail.rental_price) }}</td>
            <td>{{ formatCurrency(detail.subtotal) }}</td>
            <td>{{ detail.is_returned ? "Ya" : "Belum" }}</td>
            <td>{{ detail.notes || "-" }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>

  <!-- Payment Modal -->
  <PaymentModal
    v-model="showPaymentModal"
    :transaction-id="rental?.id"
    transaction-type="rental"
    @payment-success="handlePaymentSuccess"
    @close="handlePaymentModalClose"
  />

  <!-- Receipt Preview Dialog -->
  <ReceiptPreviewDialog
    v-model="showReceiptPreview"
    :transaction-id="rental?.id"
    transaction-type="rental"
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
  fetchRentalTransactions,
  fetchRentalDetails,
} from "@/services/transactions";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "RentalTransactionDetailView",
  components: { AppButton, Icon, PaymentModal, ReceiptPreviewDialog },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const code = computed(() => route.params.code);
    const shouldAutoPrintReceipt = computed(() => route.query.printReceipt === "true");
    const rental = ref(null);
    const details = ref([]);
    const loading = ref(false);
    const error = ref("");
    const detailsLoading = ref(false);
    const detailError = ref("");
    const showPaymentModal = ref(false);
    const showReceiptPreview = ref(false);
    const { showSuccess } = useNotification();

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const loadDetails = async (force = false) => {
      if (details.value.length && !force) return;
      detailsLoading.value = true;
      detailError.value = "";
      if (force) {
        details.value = [];
      }
      try {
        details.value = await fetchRentalDetails();
      } catch (err) {
        detailError.value = err.message || "Gagal memuat detail transaksi.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const filteredDetails = computed(() => {
      if (!rental.value) return [];
      return details.value.filter(
        (detail) => detail.transaction_code === rental.value.transaction_code,
      );
    });

    const loadRental = async () => {
      if (!code.value) {
        error.value = "Kode transaksi tidak tersedia.";
        rental.value = null;
        details.value = [];
        return;
      }

      loading.value = true;
      error.value = "";
      try {
        const rentals = await fetchRentalTransactions();
        const found = rentals.find(
          (item) => item.transaction_code === code.value,
        );
        if (!found) {
          throw new Error("Transaksi tidak ditemukan.");
        }
        rental.value = found;
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
        error.value = err.message || "Gagal memuat detail transaksi.";
        rental.value = null;
        details.value = [];
      } finally {
        loading.value = false;
      }
    };

    const refresh = () => {
      loadRental();
      loadDetails(true);
    };
    const goBack = () => router.push({ name: "transactions-rentals" });

    const isPaid = (rental) => {
      if (!rental) return false;
      const status = (rental.payment_status || rental.paymentStatus || "")
        .toString()
        .toLowerCase();
      return status === "paid";
    };

    const openPaymentModal = () => {
      if (!rental.value?.id) return;
      showPaymentModal.value = true;
    };

    const handlePaymentSuccess = async (data) => {
      if (!data.partial) {
        // Payment is complete
        showSuccess("Pembayaran berhasil! Transaksi telah dilunasi.");
        showPaymentModal.value = false;
        // Reload rental data to update payment status
        await loadRental();
        // Auto-open receipt preview after successful payment
        setTimeout(() => {
          showReceiptPreview.value = true;
        }, 500);
      } else {
        // Partial payment, keep modal open
        showSuccess("Pembayaran berhasil! Masih ada sisa pembayaran.");
        loadRental(); // Reload to update payment status
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
        loadRental(); // Reload to refresh data
      }
    };

    watch(code, (newCode, oldCode) => {
      if (newCode !== oldCode) {
        loadRental();
      }
    });

    onMounted(loadRental);

    return {
      code,
      rental,
      detailsLoading,
      detailError,
      filteredDetails,
      formatCurrency,
      formatDate,
      loadDetails,
      loading,
      error,
      goBack,
      refresh,
      isPaid,
      showPaymentModal,
      showReceiptPreview,
      openPaymentModal,
      handlePaymentSuccess,
      handlePaymentModalClose,
      handleReceiptPrinted,
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
