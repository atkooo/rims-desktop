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

    <!-- Cancelled Status Banner -->
    <section v-if="!loading && !error && rental && isCancelled(rental) && showCancelledBanner" class="card-section">
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
            <strong>{{ formatDateShort(rental.rental_date) }}</strong>
          </div>
          <div class="detail-item">
            <span>Rencana Kembali</span>
            <strong>{{ formatDateShort(rental.planned_return_date) }}</strong>
          </div>
          <div class="detail-item" v-if="rental.actual_return_date">
            <span>Tanggal Kembali</span>
            <strong>{{ formatDateShort(rental.actual_return_date) }}</strong>
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
            <strong>{{ displayStatus(rental) }}</strong>
          </div>

          <!-- Detail Breakdown -->
          <div class="breakdown-section">
            <div class="breakdown-row">
              <span>Subtotal</span>
              <strong>{{ formatCurrency(rental.subtotal || 0) }}</strong>
            </div>
            <div class="breakdown-row" v-if="(rental.deposit || 0) > 0">
              <span class="deposit-label">Deposit</span>
              <strong class="deposit">+ {{ formatCurrency(rental.deposit || 0) }}</strong>
            </div>
            <div class="breakdown-row" v-if="(rental.tax || 0) > 0">
              <span class="tax-label">Pajak</span>
              <strong class="tax">+ {{ formatCurrency(rental.tax || 0) }}</strong>
            </div>
            <div class="breakdown-divider"></div>
            <div class="breakdown-row total-row">
              <span>Total Nilai</span>
              <strong>{{ formatCurrency(rental.total_amount) }}</strong>
            </div>
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
          <div v-if="!isPaid(rental) && !isCancelled(rental)" class="detail-item payment-action">
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
        <div class="section-header-right">
          <p v-if="code" class="section-subtitle">{{ code }}</p>
          <AppButton v-if="!isAllReturned && isPaid(rental) && !isCancelled(rental)" variant="primary" size="small"
            @click="openReturnDialog(null)">
            <Icon name="package" :size="18" />
            Kembalikan Semua Item
          </AppButton>
        </div>
      </div>

      <div v-if="detailsLoading" class="detail-state">
        Memuat item transaksi...
      </div>
      <div v-else-if="detailError" class="error-banner">
        {{ detailError }}
        <AppButton class="retry-button" variant="secondary" @click="loadDetails(true)">
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
              <th>Nama</th>
              <th>Jumlah</th>
              <th>Harga Sewa</th>
              <th>Subtotal</th>
              <th>Dikembalikan</th>
              <th>Kondisi</th>
              <th>Catatan</th>
              <th v-if="!isAllReturned && isPaid(rental) && !isCancelled(rental)">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="detail in filteredDetails" :key="detail.id">
              <td data-label="Kode"><strong>{{ detail.item_code || "-" }}</strong></td>
              <td data-label="Nama">{{ detail.item_name || "-" }}</td>
              <td data-label="Jumlah">{{ detail.quantity }}</td>
              <td data-label="Harga Sewa">{{ formatCurrency(detail.rental_price) }}</td>
              <td data-label="Subtotal"><strong>{{ formatCurrency(detail.subtotal) }}</strong></td>
              <td data-label="Dikembalikan">
                <span
                  :class="{ 'status-badge': true, 'returned': detail.is_returned, 'not-returned': !detail.is_returned }">
                  {{ detail.is_returned ? "Ya" : "Belum" }}
                </span>
              </td>
              <td data-label="Kondisi">
                <span v-if="detail.is_returned" class="condition-badge" :class="detail.return_condition || 'good'">
                  {{ getConditionLabel(detail.return_condition) }}
                </span>
                <span v-else>-</span>
              </td>
              <td data-label="Catatan">{{ detail.notes || "-" }}</td>
              <td v-if="!isAllReturned && isPaid(rental) && !isCancelled(rental)" data-label="Aksi">
                <AppButton v-if="!detail.is_returned" variant="secondary" size="small"
                  @click="openReturnDialog([detail.id])">
                  <Icon name="package" :size="16" />
                  Kembalikan
                </AppButton>
                <span v-else class="text-muted">Sudah dikembalikan</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <!-- Payment Modal -->
  <PaymentModal v-model="showPaymentModal" :transaction-id="rental?.id" transaction-type="rental"
    @payment-success="handlePaymentSuccess" @close="handlePaymentModalClose" />

  <!-- Receipt Preview Dialog -->
  <ReceiptPreviewDialog v-model="showReceiptPreview" :transaction-id="rental?.id" transaction-type="rental"
    @printed="handleReceiptPrinted" />

  <!-- Return Items Dialog -->
  <AppDialog v-model="showReturnDialog" title="Kembalikan Item Sewa" :show-footer="true" confirm-text="Kembalikan"
    cancel-text="Batal" :loading="returning" @confirm="handleReturnItems" :max-width="500">
    <div class="return-dialog">
      <div class="return-info">
        <p v-if="returnDetailIds && returnDetailIds.length > 0">
          Mengembalikan <strong>{{ returnDetailIds.length }}</strong> item
        </p>
        <p v-else>
          Mengembalikan <strong>semua item</strong> yang belum dikembalikan
        </p>
      </div>

      <DatePicker id="returnDate" label="Tanggal Kembali" v-model="returnForm.actualReturnDate" mode="actualReturn" />

      <div class="form-group">
        <label for="returnCondition" class="form-label">Kondisi Item</label>
        <select id="returnCondition" v-model="returnForm.returnCondition" class="form-select">
          <option value="good">Baik</option>
          <option value="damaged">Rusak</option>
          <option value="lost">Hilang</option>
        </select>
        <p class="form-help">
          <span v-if="returnForm.returnCondition === 'good'">Item dalam kondisi baik, stok akan dikembalikan.</span>
          <span v-else-if="returnForm.returnCondition === 'damaged'">Item rusak, stok akan dikembalikan.</span>
          <span v-else>Item hilang, stok tidak akan dikembalikan.</span>
        </p>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import ReceiptPreviewDialog from "@/components/ui/ReceiptPreviewDialog.vue";
import {
  fetchRentalTransactions,
  fetchRentalDetails,
  returnRentalItems,
} from "@/services/transactions";
import { useNotification } from "@/composables/useNotification";
import { getCurrentUser } from "@/services/auth";
import { formatDateShort, formatDateTime } from "@/utils/dateUtils";
import { eventBus } from "@/utils/eventBus";

export default {
  name: "RentalTransactionDetailView",
  components: { AppButton, Icon, AppDialog, DatePicker, PaymentModal, ReceiptPreviewDialog },
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
    const showCancelledBanner = ref(true);
    const showReturnDialog = ref(false);
    const returning = ref(false);
    const returnDetailIds = ref(null);
    const returnForm = ref({
      actualReturnDate: new Date().toISOString().split("T")[0],
      returnCondition: "good",
    });
    const { showSuccess, showError } = useNotification();

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

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

    const isAllReturned = computed(() => {
      if (!filteredDetails.value.length) return false;
      return filteredDetails.value.every((detail) => detail.is_returned);
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
    const goBack = () => router.back();

    const isPaid = (rental) => {
      if (!rental) return false;
      const status = (rental.payment_status || rental.paymentStatus || "")
        .toString()
        .toLowerCase();
      return status === "paid";
    };

    const isCancelled = (rental) => {
      if (!rental) return false;
      const status = (rental.status || "").toString().toLowerCase();
      return status === "cancelled";
    };

    const displayStatus = (rental) => {
      if (!rental) return "-";
      // Check if transaction is cancelled
      const status = (rental.status || "").toString().toLowerCase();
      if (status === "cancelled") {
        return "Dibatalkan";
      }
      // Otherwise show payment status
      const paymentStatus = (rental.payment_status || rental.paymentStatus || "").toString().toLowerCase();
      if (paymentStatus === "paid") return "Lunas";
      if (paymentStatus === "unpaid") return "Belum Lunas";
      return paymentStatus || "-";
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

    const openReturnDialog = (detailIds) => {
      if (!rental.value) return;
      returnDetailIds.value = detailIds;
      returnForm.value = {
        actualReturnDate: new Date().toISOString().split("T")[0],
        returnCondition: "good",
      };
      showReturnDialog.value = true;
    };

    const handleReturnItems = async () => {
      if (!rental.value?.id) return;

      returning.value = true;
      try {
        const user = await getCurrentUser();
        // Ensure all values are primitives and serializable
        const result = await returnRentalItems({
          rentalTransactionId: Number(rental.value.id),
          detailIds: Array.isArray(returnDetailIds.value) ? returnDetailIds.value.map(id => Number(id)) : null,
          returnCondition: String(returnForm.value.returnCondition || "good"),
          actualReturnDate: String(returnForm.value.actualReturnDate || ""),
          userId: user?.id ? Number(user.id) : null,
        });

        if (result.success) {
          showSuccess(
            result.allItemsReturned
              ? `Semua item berhasil dikembalikan!`
              : `${result.itemsReturned} item berhasil dikembalikan!`,
          );
          showReturnDialog.value = false;
          // Reload data to reflect changes
          await loadRental();
          await loadDetails(true);
          eventBus.emit("inventory:updated");
        }
      } catch (err) {
        showError(err.message || "Gagal mengembalikan item");
      } finally {
        returning.value = false;
      }
    };

    const getConditionLabel = (condition) => {
      const labels = {
        good: "Baik",
        damaged: "Rusak",
        lost: "Hilang",
      };
      return labels[condition] || "-";
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
      isCancelled,
      displayStatus,
      showPaymentModal,
      showReceiptPreview,
      showCancelledBanner,
      showReturnDialog,
      returning,
      returnDetailIds,
      returnForm,
      isAllReturned,
      openPaymentModal,
      handlePaymentSuccess,
      handlePaymentModalClose,
      handleReceiptPrinted,
      openReturnDialog,
      handleReturnItems,
      getConditionLabel,
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
  flex-wrap: wrap;
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
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

.breakdown-section {
  margin: 1rem 0;
  padding: 0.75rem 0;
  border-radius: 8px;
  background-color: white;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  padding: 0.5rem 0;
  color: #374151;
}

.breakdown-row span {
  color: #6b7280;
}

.breakdown-row strong {
  font-weight: 600;
}

.breakdown-row.total-row {
  padding-top: 0.75rem;
  font-size: 1.05rem;
  color: #1f2937;
  font-weight: 700;
}

.breakdown-row .deposit-label {
  color: #3b82f6;
}

.breakdown-row .deposit {
  color: #3b82f6;
  font-weight: 600;
}

.breakdown-row .tax-label {
  color: #f59e0b;
}

.breakdown-row .tax {
  color: #f59e0b;
  font-weight: 600;
}

.breakdown-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.5rem 0;
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

.detail-table th:nth-child(2),
.detail-table td:nth-child(2) {
  min-width: 150px;
  max-width: 250px;
}

.detail-table th:nth-child(8),
.detail-table td:nth-child(8) {
  min-width: 100px;
  max-width: 150px;
}

.detail-table th:nth-child(9),
.detail-table td:nth-child(9) {
  min-width: 120px;
  max-width: 150px;
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

/* Using global badge utility classes */
.status-badge {
  font-size: 0.85rem;
  border-radius: 4px;
}

.status-badge.returned {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.not-returned {
  background-color: #fee2e2;
  color: #991b1b;
}

.condition-badge {
  font-size: 0.85rem;
  border-radius: 4px;
}

.condition-badge.good {
  background-color: #d1fae5;
  color: #065f46;
}

.condition-badge.damaged {
  background-color: #fef3c7;
  color: #92400e;
}

.condition-badge.lost {
  background-color: #fee2e2;
  color: #991b1b;
}

.text-muted {
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Return dialog styles */
.return-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.return-info {
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.return-info p {
  margin: 0;
  color: #374151;
  font-size: 0.95rem;
}

.return-info strong {
  color: #1f2937;
  font-weight: 600;
}


.form-help {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
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

  .section-header-right {
    width: 100%;
    margin-top: 0.5rem;
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
