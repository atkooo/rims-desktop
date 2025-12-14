<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container">
          <div class="modal-header">
            <h2>{{ transactionType === 'rental' ? 'Pembayaran Sewa' : 'Pembayaran Penjualan' }}</h2>
            <button type="button" class="modal-close" @click="handleClose">
              <Icon name="x" :size="20" />
            </button>
          </div>

          <div class="modal-content">
            <div v-if="loading" class="loading-state">
              Memuat data transaksi...
            </div>

            <div v-else-if="error" class="error-banner">
              {{ error }}
            </div>

            <div v-else-if="transaction">
              <!-- Transaction Info -->
              <div class="info-section">
                <div class="info-row">
                  <span class="info-label">Kode Transaksi:</span>
                  <strong>{{ transaction.transaction_code }}</strong>
                </div>
                <div class="info-row">
                  <span class="info-label">Customer:</span>
                  <strong>{{ transaction.customer_name || "-" }}</strong>
                </div>
                <div class="info-row">
                  <span class="info-label">Total:</span>
                  <strong class="total-amount">{{ formatCurrency(transaction.total_amount) }}</strong>
                </div>
                <div class="info-row">
                  <span class="info-label">Sudah Dibayar:</span>
                  <strong>{{ formatCurrency(transaction.paid_amount || 0) }}</strong>
                </div>
                <div class="info-row">
                  <span class="info-label">Sisa:</span>
                  <strong class="remaining-amount">{{ formatCurrency(remainingAmount) }}</strong>
                </div>
              </div>

              <!-- Payment Form -->
              <form v-if="remainingAmount > 0 && transaction.status !== 'cancelled' && !isTransactionPaid" @submit.prevent="handlePayment" class="payment-form">
                <div class="form-group">
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

                <div class="form-group" v-if="changeAmount > 0">
                  <label>Kembalian</label>
                  <div class="change-display">
                    <strong>{{ formatCurrency(changeAmount) }}</strong>
                  </div>
                </div>

                <div class="form-group">
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

              <!-- Payment Complete or Cancelled -->
              <div v-else-if="isTransactionPaid" class="success-message">
                <h3>Pembayaran Lunas</h3>
                <p>Transaksi ini telah dibayar lunas.</p>
              </div>
              <div v-else-if="transaction.status === 'cancelled'" class="error-banner">
                <h3>Transaksi Dibatalkan</h3>
                <p>Transaksi ini telah dibatalkan dan tidak dapat dibayar.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchSalesTransactions, createPayment } from "@/services/transactions";
import { getStoredUser } from "@/services/auth";
import { useNumberFormat } from "@/composables/useNumberFormat";

export default {
  name: "PaymentModal",
  components: {
    AppButton,
    Icon,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: Number,
      default: null,
    },
    transactionType: {
      type: String,
      default: 'sale', // 'sale' or 'rental'
    },
  },
  emits: ["update:modelValue", "payment-success", "close"],
  setup(props, { emit }) {
    const transaction = ref(null);
    const loading = ref(false);
    const error = ref("");
    const paymentLoading = ref(false);
    const errors = ref({});

    const paymentForm = ref({
      amount: 0,
      paymentMethod: "cash",
    });

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const { formatNumberInput, createInputHandler } = useNumberFormat();

    const handleAmountInput = createInputHandler(
      (value) => (paymentForm.value.amount = value)
    );

    let previousBodyOverflow = "";
    const lockBodyScroll = () => {
      if (typeof document === "undefined") return;
      previousBodyOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
    };

    const unlockBodyScroll = () => {
      if (typeof document === "undefined") return;
      document.body.style.overflow = previousBodyOverflow || "";
      previousBodyOverflow = "";
    };

    const remainingAmount = computed(() => {
      if (!transaction.value) return 0;
      return Math.max(
        0,
        transaction.value.total_amount - (transaction.value.paid_amount || transaction.value.actual_paid_amount || 0),
      );
    });

    const isTransactionPaid = computed(() => {
      if (!transaction.value) return false;
      const paymentStatus = (transaction.value.payment_status || transaction.value.paymentStatus || "").toString().toLowerCase();
      const paidAmount = Number(transaction.value.paid_amount || transaction.value.actual_paid_amount || 0) || 0;
      const totalAmount = Number(transaction.value.total_amount || 0) || 0;
      return paymentStatus === "paid" || paidAmount >= totalAmount;
    });

    const changeAmount = computed(() => {
      if (!paymentForm.value.amount || paymentForm.value.amount <= 0) return 0;
      if (paymentForm.value.amount < remainingAmount.value) return 0;
      return paymentForm.value.amount - remainingAmount.value;
    });

    const loadTransaction = async (skipPaidValidation = false) => {
      if (!props.transactionId) {
        error.value = "ID transaksi tidak tersedia";
        return;
      }

      loading.value = true;
      error.value = "";
      try {
        let transactions;
        if (props.transactionType === 'rental') {
          const { fetchRentalTransactions } = await import("@/services/transactions");
          transactions = await fetchRentalTransactions();
        } else {
          transactions = await fetchSalesTransactions();
        }
        
        const found = transactions.find(
          (t) => t.id === Number(props.transactionId),
        );

        if (!found) {
          throw new Error("Transaksi tidak ditemukan");
        }

        // Check if transaction is cancelled
        const status = (found.status || "").toString().toLowerCase();
        if (status === "cancelled") {
          throw new Error("Transaksi ini telah dibatalkan dan tidak dapat dibayar");
        }

        // Check if transaction is already paid (skip validation if this is reload after payment)
        if (!skipPaidValidation) {
          const paymentStatus = (found.payment_status || found.paymentStatus || "").toString().toLowerCase();
          const paidAmount = Number(found.paid_amount || found.actual_paid_amount || 0) || 0;
          const totalAmount = Number(found.total_amount || 0) || 0;
          
          if (paymentStatus === "paid" || paidAmount >= totalAmount) {
            throw new Error("Transaksi ini sudah dibayar lunas dan tidak dapat dibayar lagi");
          }
        }

        transaction.value = found;
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
          transactionType: props.transactionType,
          amount: paymentForm.value.amount,
          paymentMethod: paymentForm.value.paymentMethod,
          paymentDate: new Date().toISOString(),
          userId: user?.id || 1,
        };

        await createPayment(paymentData);

        // Reload transaction to get updated payment status (skip paid validation since we just made a payment)
        await loadTransaction(true);

        // Reset form
        paymentForm.value = {
          amount: 0,
          paymentMethod: "cash",
        };

        // Check if payment is complete
        const paidAmount = Number(transaction.value.paid_amount || transaction.value.actual_paid_amount || 0) || 0;
        const totalAmount = Number(transaction.value.total_amount || 0) || 0;
        const newRemaining = totalAmount - paidAmount;
        
        if (newRemaining <= 0) {
          emit("payment-success", { transaction: transaction.value });
          // Close modal after a short delay
          setTimeout(() => {
            handleClose();
          }, 1500);
        } else {
          // Show success message but keep modal open for additional payments
          emit("payment-success", { transaction: transaction.value, partial: true });
        }
      } catch (err) {
        errors.value.submit = err.message || "Gagal memproses pembayaran";
        console.error("Error processing payment:", err);
      } finally {
        paymentLoading.value = false;
      }
    };

    const handleClose = () => {
      // Check if there's remaining amount (unpaid)
      const hasRemaining = remainingAmount.value > 0;
      
      emit("update:modelValue", false);
      emit("close", { unpaid: hasRemaining });
      
      // Reset form when closing
      paymentForm.value = {
        amount: 0,
        paymentMethod: "cash",
      };
      errors.value = {};
    };

    // Watch for transactionId changes
    watch(
      () => props.transactionId,
      (newId) => {
        if (newId && props.modelValue) {
          loadTransaction();
        }
      },
      { immediate: true }
    );

    // Watch for modelValue changes
    watch(
      () => props.modelValue,
      (isOpen) => {
        if (isOpen) {
          lockBodyScroll();
          if (props.transactionId) {
            loadTransaction();
          }
        } else {
          unlockBodyScroll();
        }
      }
    );

    onBeforeUnmount(() => {
      unlockBodyScroll();
    });

    return {
      transaction,
      loading,
      error,
      paymentForm,
      paymentLoading,
      errors,
      remainingAmount,
      isTransactionPaid,
      changeAmount,
      formatCurrency,
      formatNumberInput,
      handleAmountInput,
      fillFullAmount,
      handlePayment,
      handleClose,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.modal-content {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.info-section {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.info-row strong {
  font-size: 0.9rem;
  color: #111827;
}

.total-amount {
  font-size: 1.1rem !important;
  color: #111827 !important;
  font-weight: 700 !important;
}

.remaining-amount {
  font-size: 1.1rem !important;
  color: #dc2626 !important;
  font-weight: 600 !important;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Using global utility classes for form-group, form-label, form-input, form-select, form-textarea, error-message */
.form-group label {
  font-size: 0.875rem;
}

.form-input,
.form-select,
.form-textarea {
  padding: 0.6rem;
  font-size: 1rem;
}

.form-input.error,
.form-select.error {
  border-color: #dc2626;
}

.error-message {
  font-size: 0.85rem;
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
  margin-top: 0.5rem;
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

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
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
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
