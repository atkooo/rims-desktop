<template>
  <div class="data-page transaction-page payment-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Pembayaran Sewa</h1>
          <p class="subtitle">
            {{
              transaction
                ? `Transaksi ${transaction.transaction_code}`
                : "Memuat data transaksi..."
            }}
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" @click="goBack">Kembali</AppButton>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Memuat data transaksi...</div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-else-if="transaction" class="payment-content">
      <!-- Transaction Info -->
      <section class="card-section">
        <h3 class="section-title">Info Transaksi</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Kode Transaksi</span>
            <strong class="info-value">{{
              transaction.transaction_code
            }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Customer</span>
            <strong class="info-value">{{
              transaction.customer_name || "-"
            }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Tanggal Sewa</span>
            <strong class="info-value">{{
              formatDate(transaction.rental_date)
            }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Rencana Kembali</span>
            <strong class="info-value">{{
              formatDate(transaction.planned_return_date)
            }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Status Pembayaran</span>
            <strong
              class="info-value status-badge"
              :class="transaction.payment_status"
            >
              {{ getPaymentStatusLabel(transaction.payment_status) }}
            </strong>
          </div>
          <div class="info-item">
            <span class="info-label">Status Sewa</span>
            <strong class="info-value">{{
              getRentalStatusLabel(transaction.status)
            }}</strong>
          </div>
        </div>
      </section>

      <!-- Transaction Items -->
      <section class="card-section">
        <h3 class="section-title">Item Sewa</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Jumlah</th>
              <th>Harga Sewa</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="detail in transactionDetails" :key="detail.id">
              <td><strong>{{ detail.item_code || "-" }}</strong></td>
              <td>{{ detail.item_name || "-" }}</td>
              <td>{{ detail.quantity }}</td>
              <td>{{ formatCurrency(detail.rental_price) }}</td>
              <td><strong>{{ formatCurrency(detail.subtotal) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Payment History -->
      <section class="card-section" v-if="paymentHistory.length > 0">
        <h3 class="section-title">Riwayat Pembayaran</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jumlah</th>
              <th>Metode</th>
              <th>No. Referensi</th>
              <th>Petugas</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in paymentHistory" :key="payment.id" :class="{ 'refund-row': Number(payment.amount) < 0 }">
              <td>{{ formatDate(payment.payment_date) }}</td>
              <td>
                <span :class="{ 'refund-amount': Number(payment.amount) < 0 }">
                  {{ Number(payment.amount) < 0 ? '-' : '' }}{{ formatCurrency(Math.abs(payment.amount)) }}
                </span>
              </td>
              <td>{{ getPaymentMethodLabel(payment.payment_method) }}</td>
              <td>{{ payment.reference_number || "-" }}</td>
              <td>{{ payment.user_name || "-" }}</td>
              <td>{{ payment.notes || "-" }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Payment Summary -->
      <section class="card-section">
        <h3 class="section-title">Ringkasan Pembayaran</h3>
        <div class="payment-summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <strong>{{ formatCurrency(transaction.subtotal) }}</strong>
          </div>
          <div class="summary-row" v-if="transaction.deposit > 0">
            <span>Deposit</span>
            <strong>+ {{ formatCurrency(transaction.deposit) }}</strong>
          </div>
          <div class="summary-row" v-if="transaction.discount > 0">
            <span>Diskon</span>
            <strong class="discount"
              >- {{ formatCurrency(transaction.discount) }}</strong
            >
          </div>
          <div class="summary-row" v-if="transaction.late_fee > 0">
            <span>Denda Keterlambatan</span>
            <strong>+ {{ formatCurrency(transaction.late_fee) }}</strong>
          </div>
          <div class="summary-row total">
            <span>Total</span>
            <strong>{{ formatCurrency(transaction.total_amount) }}</strong>
          </div>
          <div class="summary-row">
            <span>Sudah Dibayar</span>
            <strong>{{ formatCurrency(transaction.paid_amount) }}</strong>
          </div>
          <div class="summary-row remaining">
            <span>Sisa</span>
            <strong>{{ formatCurrency(remainingAmount) }}</strong>
          </div>
        </div>
      </section>

      <!-- Payment Form -->
      <section class="card-section" v-if="remainingAmount > 0">
        <h3 class="section-title">Pembayaran</h3>
        <form @submit.prevent="handlePayment" class="payment-form">
          <div class="form-grid">
            <div class="field-group">
              <label for="paymentAmount">Jumlah Bayar</label>
              <input
                id="paymentAmount"
                :value="formatNumberInput(paymentForm.amount)"
                @input="handleAmountInput"
                type="text"
                class="form-input"
                :class="{ error: errors.amount }"
                placeholder="Masukkan jumlah bayar"
              />
              <div v-if="errors.amount" class="error-message">
                {{ errors.amount }}
              </div>
              <div v-if="!errors.amount && paymentForm.amount > 0" class="payment-hint">
                Minimum: {{ formatCurrency(remainingAmount) }}
              </div>
            </div>
            <div class="field-group" v-if="changeAmount > 0">
              <label>Kembalian</label>
              <div class="change-display">
                <strong>{{ formatCurrency(changeAmount) }}</strong>
              </div>
            </div>
            <div class="field-group">
              <label for="paymentMethod">Metode Pembayaran</label>
              <select
                id="paymentMethod"
                v-model="paymentForm.paymentMethod"
                class="form-select"
                :class="{ error: errors.paymentMethod }"
              >
                <option value="">Pilih Metode</option>
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="card">Kartu</option>
              </select>
              <div v-if="errors.paymentMethod" class="error-message">
                {{ errors.paymentMethod }}
              </div>
            </div>
            <div class="field-group">
              <label for="referenceNumber">No. Referensi (Opsional)</label>
              <FormInput
                id="referenceNumber"
                type="text"
                v-model="paymentForm.referenceNumber"
              />
            </div>
            <div class="field-group">
              <label for="paymentNotes">Catatan (Opsional)</label>
              <FormInput
                id="paymentNotes"
                type="textarea"
                v-model="paymentForm.notes"
              />
            </div>
          </div>
          <div class="payment-summary-form">
            <div class="summary-form-row">
              <span>Total:</span>
              <strong>{{ formatCurrency(remainingAmount) }}</strong>
            </div>
            <div class="summary-form-row" v-if="paymentForm.amount > 0">
              <span>Bayar:</span>
              <strong>{{ formatCurrency(paymentForm.amount) }}</strong>
            </div>
            <div class="summary-form-row change-row" v-if="changeAmount > 0">
              <span>Kembalian:</span>
              <strong>{{ formatCurrency(changeAmount) }}</strong>
            </div>
          </div>
          <div class="form-actions">
            <AppButton
              type="submit"
              variant="primary"
              :loading="paymentLoading"
              :disabled="paymentForm.amount < remainingAmount"
            >
              Proses Pembayaran
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              @click="fillFullAmount"
            >
              Bayar Pas
            </AppButton>
          </div>
        </form>
      </section>

      <!-- Payment Complete -->
      <section class="card-section" v-else>
        <div class="success-message">
          <h3>Pembayaran Lunas</h3>
          <p>Transaksi ini telah dibayar lunas.</p>
          <div class="action-buttons">
            <AppButton variant="primary" @click="showReceiptPreview = true">
              <i class="fas fa-eye"></i> Preview Struk
            </AppButton>
          </div>
        </div>
      </section>
    </div>

    <!-- Receipt Preview Dialog -->
    <ReceiptPreviewDialog
      v-model="showReceiptPreview"
      :transaction-id="transaction?.id"
      transaction-type="rental"
      @printed="handleReceiptPrinted"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ReceiptPreviewDialog from "@/components/ui/ReceiptPreviewDialog.vue";
import {
  fetchRentalTransactions,
  fetchRentalDetails,
  createPayment,
  fetchPayments,
} from "@/services/transactions";
import { getStoredUser } from "@/services/auth";
import { useNumberFormat } from "@/composables/useNumberFormat";

export default {
  name: "RentalTransactionPaymentView",
  components: {
    AppButton,
    FormInput,
    ReceiptPreviewDialog,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const transactionId = computed(() => route.params.id);
    const transaction = ref(null);
    const transactionDetails = ref([]);
    const paymentHistory = ref([]);
    const loading = ref(false);
    const error = ref("");
    const paymentLoading = ref(false);
    const errors = ref({});
    const showReceiptPreview = ref(false);

    const paymentForm = ref({
      amount: 0,
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
    });

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Create input handler for amount
    const handleAmountInput = createInputHandler(
      (value) => (paymentForm.value.amount = value)
    );

    const getPaymentStatusLabel = (status) => {
      const labels = {
        paid: "Lunas",
        unpaid: "Belum Dibayar",
      };
      return labels[status] || status;
    };

    const getRentalStatusLabel = (status) => {
      const labels = {
        pending: "Pending (Belum Bayar)",
        active: "Aktif",
        returned: "Dikembalikan",
        cancelled: "Dibatalkan",
        overdue: "Terlambat",
      };
      return labels[status] || status;
    };

    const getPaymentMethodLabel = (method) => {
      const labels = {
        cash: "Tunai",
        transfer: "Transfer",
        card: "Kartu",
      };
      return labels[method] || method;
    };

    const remainingAmount = computed(() => {
      if (!transaction.value) return 0;
      return Math.max(
        0,
        transaction.value.total_amount - transaction.value.paid_amount,
      );
    });

    const changeAmount = computed(() => {
      if (!paymentForm.value.amount || paymentForm.value.amount <= 0) return 0;
      if (paymentForm.value.amount < remainingAmount.value) return 0;
      return paymentForm.value.amount - remainingAmount.value;
    });

    const loadTransaction = async () => {
      if (!transactionId.value) {
        error.value = "ID transaksi tidak tersedia";
        return;
      }

      loading.value = true;
      error.value = "";
      try {
        // Load transactions
        const transactions = await fetchRentalTransactions();
        const found = transactions.find(
          (t) => t.id === Number(transactionId.value),
        );

        if (!found) {
          throw new Error("Transaksi tidak ditemukan");
        }

        transaction.value = found;

        // Load transaction details
        const details = await fetchRentalDetails();
        transactionDetails.value = details.filter(
          (d) => d.transaction_code === found.transaction_code,
        );

        // Load payment history
        const payments = await fetchPayments();
        paymentHistory.value = payments
          .filter(
            (p) =>
              p.transaction_type === "rental" && p.transaction_id === found.id,
          )
          .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      } catch (err) {
        error.value = err.message || "Gagal memuat data transaksi";
      } finally {
        loading.value = false;
      }
    };

    const fillFullAmount = () => {
      paymentForm.value.amount = remainingAmount.value;
    };

    const validatePayment = () => {
      const newErrors = {};
      if (!paymentForm.value.amount || paymentForm.value.amount <= 0) {
        newErrors.amount = "Jumlah pembayaran harus diisi";
      } else if (paymentForm.value.amount < remainingAmount.value) {
        newErrors.amount = `Jumlah pembayaran tidak boleh kurang dari total (${formatCurrency(remainingAmount.value)})`;
      }
      if (!paymentForm.value.paymentMethod) {
        newErrors.paymentMethod = "Metode pembayaran harus dipilih";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handlePayment = async () => {
      if (!validatePayment()) return;

      paymentLoading.value = true;
      errors.value = {};
      try {
        const user = getStoredUser();
        const paymentData = {
          transactionId: transaction.value.id,
          transactionType: "rental",
          amount: paymentForm.value.amount,
          paymentMethod: paymentForm.value.paymentMethod,
          paymentDate: new Date().toISOString(),
          referenceNumber: paymentForm.value.referenceNumber || null,
          notes: paymentForm.value.notes || null,
          userId: user?.id || 1,
        };

        await createPayment(paymentData);

        // Reload transaction to get updated payment status and payment history
        await loadTransaction();

        // Reset form
        paymentForm.value = {
          amount: 0,
          paymentMethod: "cash",
          referenceNumber: "",
          notes: "",
        };

        // If payment is complete, show success and offer to print receipt
        const newRemaining = transaction.value.total_amount - (transaction.value.paid_amount + paymentForm.value.amount);
        if (newRemaining <= 0) {
          // Wait a bit then offer to print
          setTimeout(() => {
            if (
              confirm("Pembayaran berhasil! Apakah Anda ingin mencetak struk?")
            ) {
              showReceiptPreview.value = true;
            }
          }, 500);
        }
      } catch (err) {
        errors.value.submit = err.message || "Gagal memproses pembayaran";
        console.error("Error processing payment:", err);
      } finally {
        paymentLoading.value = false;
      }
    };

    const handleReceiptPrinted = (result) => {
      if (result && result.success) {
        // Receipt printed successfully
        console.log("Receipt printed:", result);
      }
    };

    const goBack = () => {
      router.push({ name: "transactions-rentals" });
    };

    onMounted(() => {
      loadTransaction();
    });

    return {
      transaction,
      transactionDetails,
      loading,
      error,
      paymentForm,
      paymentLoading,
      errors,
      remainingAmount,
      changeAmount,
      formatCurrency,
      formatNumberInput,
      handleAmountInput,
      formatDate,
      getPaymentStatusLabel,
      getRentalStatusLabel,
      getPaymentMethodLabel,
      paymentHistory,
      fillFullAmount,
      handlePayment,
      handleReceiptPrinted,
      showReceiptPreview,
      goBack,
    };
  },
};
</script>

<style scoped>
.payment-page {
  padding: 1.5rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.payment-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.info-value {
  font-size: 1rem;
  color: #111827;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.paid {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.unpaid {
  background-color: #fee2e2;
  color: #991b1b;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.items-table th,
.items-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.items-table thead {
  background-color: #f3f4f6;
  font-weight: 600;
}

.items-table tbody tr:last-child td {
  border-bottom: none;
}

.payment-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row.total {
  font-size: 1.25rem;
  font-weight: 700;
  border-top: 2px solid #111827;
  border-bottom: 2px solid #111827;
  padding: 1rem 0;
  margin-top: 0.5rem;
}

.summary-row.remaining {
  font-size: 1.1rem;
  font-weight: 600;
  color: #dc2626;
}

.summary-row .discount {
  color: #16a34a;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-select {
  width: 100%;
  padding: 0.6rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background-color: white;
  font-size: 1rem;
}

.form-select.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.payment-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.change-display {
  padding: 0.75rem;
  background-color: #dcfce7;
  border: 1px solid #16a34a;
  border-radius: 6px;
  text-align: center;
}

.change-display strong {
  font-size: 1.25rem;
  color: #166534;
  font-weight: 700;
}

.payment-summary-form {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.summary-form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.9rem;
}

.summary-form-row.change-row {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.summary-form-row.change-row strong {
  color: #16a34a;
  font-size: 1.25rem;
}

.success-message {
  text-align: center;
  padding: 2rem;
}

.success-message h3 {
  color: #16a34a;
  margin-bottom: 0.5rem;
}

.success-message p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.refund-row {
  background-color: #fff3cd;
}

.refund-amount {
  color: #dc3545;
  font-weight: bold;
}
</style>
