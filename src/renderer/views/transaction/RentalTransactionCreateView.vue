<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Transaksi Sewa Baru</h1>
          <p class="subtitle">
            Formulir yang disederhanakan agar kasir atau admin dapat mencatat
            sewa baru dengan cepat dan langsung ke sistem.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" @click="goBack">Kembali</AppButton>
         
        </div>
      </div>
    </div>

    <!-- Cashier Status Banner -->
    <section v-if="cashierStatus" class="cashier-status-section">
      <div
        :class="[
          'cashier-status-banner',
          cashierStatus.status === 'open' ? 'open' : 'closed',
        ]"
      >
        <div class="cashier-status-content">
          <div class="cashier-status-info">
            <div class="cashier-status-label">
              <span
                class="status-indicator"
                :class="cashierStatus.status === 'open' ? 'active' : 'inactive'"
              ></span>
              <strong
                >Sesi Kasir:
                {{
                  cashierStatus.status === "open" ? "Aktif" : "Tidak Aktif"
                }}</strong
              >
            </div>
            <div v-if="cashierStatus.status === 'open'" class="cashier-details">
              <span class="detail-item">
                <span class="detail-label">Saldo Awal:</span>
                <span class="detail-value">{{
                  formatCurrency(cashierStatus.opening_balance)
                }}</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">Saldo Diharapkan:</span>
                <span class="detail-value">{{
                  formatCurrency(cashierStatus.expected_balance || 0)
                }}</span>
              </span>
            </div>
          </div>
          <div class="cashier-status-action">
            <AppButton
              v-if="cashierStatus.status !== 'open'"
              variant="primary"
              size="small"
              @click="$router.push('/transactions/cashier')"
            >
              Buka Kasir
            </AppButton>
          </div>
        </div>
      </div>
    </section>

    <section class="card-section cashier-form-container">
      <!-- Header Info - Minimalist -->
      <div class="cashier-header-row">
        <div class="cashier-field-inline">
          <label for="customerId" class="cashier-label-inline">Customer:</label>
          <select
            id="customerId"
            v-model="form.customerId"
            class="cashier-select-inline"
            :class="{ error: errors.customerId }"
          >
            <option value="">Pilih Customer</option>
            <option
              v-for="customer in customers"
              :key="customer.id"
              :value="customer.id"
            >
              {{ customer.name }}
              {{ customer.code ? `(${customer.code})` : "" }}
            </option>
          </select>
        </div>
        <div class="cashier-field-inline">
          <DatePicker
            id="rentalDate"
            label="Tanggal Sewa:"
            v-model="form.rentalDate"
            mode="rental"
            :error="errors.rentalDate"
            class="cashier-date-inline"
          />
        </div>
        <div class="cashier-field-inline">
          <DatePicker
            id="plannedReturnDate"
            label="Rencana Kembali:"
            v-model="form.plannedReturnDate"
            mode="plannedReturn"
            :min-date="form.rentalDate"
            :error="errors.plannedReturnDate"
            class="cashier-date-inline"
          />
        </div>
      </div>

      <!-- Main Content - Full Width Table -->
      <div class="cashier-main-content">
        <!-- Items Table - Full Width -->
        <div class="cashier-items-wrapper">
          <div class="cashier-section-header-minimal">
            <span class="cashier-section-title-minimal">Item Sewa</span>
            <span v-if="errors.items" class="error-text-minimal">{{ errors.items }}</span>
          </div>
          <ItemSelector v-model="form.items" transaction-type="RENTAL" />
        </div>

        <!-- Bundles Table - Full Width -->
        <div class="cashier-items-wrapper cashier-items-wrapper-spaced">
          <div class="cashier-section-header-minimal">
            <span class="cashier-section-title-minimal">Paket Sewa</span>
          </div>
          <BundleSelector v-model="form.bundles" bundle-type="rental" />
        </div>

        <!-- Bottom Section: Summary + Payment + Actions -->
        <div class="cashier-bottom-section">
          <!-- Summary - Compact -->
          <div class="cashier-summary-compact">
            <div class="cashier-total-box">
              <div class="cashier-total-label-minimal">Total Pembayaran</div>
              <div class="cashier-total-value">{{ formatCurrency(totalAmount) }}</div>
              <div class="cashier-total-info">
                {{ totalItems }} item{{ totalBundles > 0 ? ` • ${totalBundles} paket` : '' }} • {{ totalDays }} hari
              </div>
            </div>
            <div class="cashier-breakdown-minimal">
              <div class="cashier-breakdown-item">
                <span>Subtotal ({{ totalDays }} hari):</span>
                <span>{{ formatCurrency(subtotal) }}</span>
              </div>
              <div v-if="bundleSubtotal > 0" class="cashier-breakdown-item">
                <span>Paket ({{ totalDays }} hari):</span>
                <span>{{ formatCurrency(bundleSubtotal * totalDays) }}</span>
              </div>
              <div v-if="Number(form.deposit) > 0" class="cashier-breakdown-item">
                <span>Deposit:</span>
                <span>{{ formatCurrency(Number(form.deposit) || 0) }}</span>
              </div>
              <div v-if="calculatedTax > 0" class="cashier-breakdown-item tax">
                <span>Pajak:</span>
                <span>+ {{ formatCurrency(calculatedTax) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment & Optional - Compact -->
          <div class="cashier-payment-compact">
            <div class="cashier-payment-fields">
              <div class="cashier-field-small">
                <label for="deposit" class="cashier-label-small">Deposit</label>
                <input
                  id="deposit"
                  :value="formatNumberInput(form.deposit)"
                  @input="handleDepositInput"
                  type="text"
                  class="cashier-input-small"
                />
              </div>
              <div class="cashier-field-small">
                <label for="tax" class="cashier-label-small">Pajak</label>
                <input
                  id="tax"
                  :value="formatNumberInput(form.tax)"
                  @input="handleTaxInput"
                  type="text"
                  class="cashier-input-small"
                  readonly
                />
              </div>
            </div>
            
            <!-- Optional Sections - Collapsible -->
            <details class="cashier-details-minimal">
              <summary class="cashier-summary-minimal">Catatan</summary>
              <div class="cashier-details-content-minimal">
                <div class="cashier-optional-item">
                  <label for="notes" class="cashier-label-minimal">Catatan</label>
                  <textarea
                    id="notes"
                    v-model="form.notes"
                    class="cashier-textarea-minimal"
                    rows="2"
                    placeholder="Catatan khusus..."
                  ></textarea>
                </div>
              </div>
            </details>
          </div>

          <!-- Actions -->
          <div class="cashier-actions-minimal">
            <AppButton variant="secondary" @click="resetForm" :disabled="loading" size="medium">
              Reset
            </AppButton>
            <AppButton variant="primary" :loading="loading" @click="handleSubmit" size="large">
              Simpan Transaksi
            </AppButton>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- Payment Modal -->
  <PaymentModal
    v-model="showPaymentModal"
    :transaction-id="savedTransactionId"
    transaction-type="rental"
    @payment-success="handlePaymentSuccess"
    @close="handlePaymentModalClose"
  />
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import { fetchCustomers } from "@/services/masterData";
import { getStoredUser, getCurrentUser } from "@/services/auth";
import { useTransactionStore } from "@/store/transactions";
import { getCurrentSession } from "@/services/cashier";
import { TRANSACTION_TYPE } from "@shared/constants";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";
import { useNumberFormat } from "@/composables/useNumberFormat";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const createDefaultForm = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    customerId: "",
    rentalDate: toDateInput(today),
    plannedReturnDate: toDateInput(tomorrow),
    deposit: 0,
    tax: 0,
    notes: "",
    items: [],
    bundles: [],
  };
};

export default {
  name: "RentalTransactionCreateView",
  components: {
    AppButton,
    DatePicker,
    ItemSelector,
    BundleSelector,
    PaymentModal,
  },
  setup() {
    const router = useRouter();
    const transactionStore = useTransactionStore();
    const { showSuccess, showError } = useNotification();
    const form = ref(createDefaultForm());
    const customers = ref([]);
    const loading = ref(false);
    const errors = ref({});
    const cashierStatus = ref(null);
    const taxPercentage = ref(0);
    const showPaymentModal = ref(false);
    const savedTransactionId = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value || 0);

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Create input handlers for number fields
    const handleDepositInput = createInputHandler(
      (value) => (form.value.deposit = value)
    );
    const handleTaxInput = createInputHandler(
      (value) => (form.value.tax = value)
    );

    const totalDays = computed(() => {
      const from = new Date(form.value.rentalDate);
      const to = new Date(form.value.plannedReturnDate);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
      const diffMs = to - from;
      if (diffMs < 0) return 1;
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    });

    // Calculate bundle price for rental
    const calculateBundlePrice = (bundle) => {
      const basePrice = bundle.rental_price_per_day || 0;
      if (bundle.discount_percentage > 0) {
        return Math.round(basePrice * (1 - bundle.discount_percentage / 100));
      } else if (bundle.discount_amount > 0) {
        return Math.max(0, basePrice - bundle.discount_amount);
      }
      return basePrice;
    };

    const baseSubtotal = computed(() =>
      form.value.items.reduce((sum, item) => {
        const price = item.rental_price_per_day ?? item.price ?? 0;
        return sum + price * (item.quantity || 1);
      }, 0),
    );

    const bundleSubtotal = computed(() =>
      form.value.bundles.reduce((sum, bundle) => {
        const price = calculateBundlePrice(bundle);
        return sum + price * (bundle.quantity || 0);
      }, 0),
    );

    const subtotal = computed(() => (baseSubtotal.value + bundleSubtotal.value) * totalDays.value);

    // Calculate tax automatically based on tax percentage from settings
    const calculatedTax = computed(() => {
      if (taxPercentage.value > 0 && subtotal.value > 0) {
        return Math.round((subtotal.value * taxPercentage.value) / 100);
      }
      return 0;
    });

    const taxHint = computed(() => {
      if (taxPercentage.value > 0) {
        return `Dihitung otomatis: ${taxPercentage.value}% dari subtotal`;
      }
      return "Atur persentase pajak di Pengaturan Sistem";
    });

    const totalAmount = computed(
      () => subtotal.value + (Number(form.value.deposit) || 0) + calculatedTax.value,
    );

    const totalItems = computed(() =>
      form.value.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    );

    const totalBundles = computed(() =>
      form.value.bundles.reduce(
        (sum, bundle) => sum + (bundle.quantity || 0),
        0,
      ),
    );

    const normalizedItems = computed(() =>
      form.value.items.map((item) => {
        const quantity = item.quantity || 1;
        const basePrice = item.rental_price_per_day ?? item.price ?? 0;
        return {
          itemId: item.id,
          quantity,
          rentalPrice: basePrice,
          salePrice: 0,
          subtotal: basePrice * quantity * totalDays.value,
        };
      }),
    );

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customers:", error);
      }
    };

    const resetForm = () => {
      form.value = createDefaultForm();
      errors.value = {};
    };

    const validateForm = () => {
      const newErrors = {};
      if (!form.value.customerId) {
        newErrors.customerId = "Customer harus dipilih";
      }
      if (!form.value.rentalDate) {
        newErrors.rentalDate = "Tanggal sewa harus diisi";
      }
      if (!form.value.plannedReturnDate) {
        newErrors.plannedReturnDate = "Tanggal kembali harus diisi";
      }
      if (
        form.value.rentalDate &&
        form.value.plannedReturnDate &&
        new Date(form.value.rentalDate) > new Date(form.value.plannedReturnDate)
      ) {
        newErrors.plannedReturnDate =
          "Tanggal kembali harus sama atau setelah tanggal sewa";
      }
      if (form.value.items.length === 0 && form.value.bundles.length === 0) {
        newErrors.items = "Pilih minimal 1 item atau paket";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const goBack = () => {
      router.push({ name: "transactions-rentals" });
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
      try {
        const user = getStoredUser();
        const newTransaction = await transactionStore.createTransaction({
          type: TRANSACTION_TYPE.RENTAL,
          customerId: form.value.customerId,
          userId: user?.id || 1,
          notes: form.value.notes,
          totalAmount: Number(totalAmount.value),
          transactionDate: form.value.rentalDate,
          rentalDate: form.value.rentalDate,
          plannedReturnDate: form.value.plannedReturnDate,
          totalDays: totalDays.value,
          subtotal: subtotal.value,
          deposit: Number(form.value.deposit) || 0,
          tax: calculatedTax.value,
          items: normalizedItems.value,
          bundles: form.value.bundles.map((bundle) => ({
            bundleId: bundle.id,
            quantity: Math.max(1, Number(bundle.quantity) || 1),
          })),
        });

        // Refresh cashier status after transaction
        await loadCashierStatus();

        // Show payment modal
        if (newTransaction && newTransaction.id) {
          savedTransactionId.value = newTransaction.id;
          showPaymentModal.value = true;
        } else {
          // Fallback: show success message
          showSuccess("Transaksi berhasil disimpan.");
          form.value = createDefaultForm();
          errors.value = {};
        }
      } catch (error) {
        console.error("Gagal menyimpan transaksi:", error);
        showError(error);
      } finally {
        loading.value = false;
      }
    };

    const loadCashierStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          const session = await getCurrentSession(user.id);
          cashierStatus.value = session
            ? { status: "open", ...session }
            : { status: "closed" };
        } else {
          cashierStatus.value = { status: "closed" };
        }
      } catch (error) {
        console.error("Error loading cashier status:", error);
        cashierStatus.value = { status: "closed" };
      }
    };

    const loadSettings = async () => {
      try {
        const settings = await ipcRenderer.invoke("settings:get");
        taxPercentage.value = settings?.taxPercentage || 0;
        // Initialize tax value
        form.value.tax = calculatedTax.value;
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    const handlePaymentSuccess = (data) => {
      if (!data.partial) {
        // Payment is complete
        showSuccess("Pembayaran berhasil! Transaksi telah dilunasi.");
        // Reset form and close modal
        form.value = createDefaultForm();
        errors.value = {};
        showPaymentModal.value = false;
        const transactionCode = data.transaction?.transaction_code;
        savedTransactionId.value = null;
        // Redirect to detail transaction after successful payment
        if (transactionCode) {
          setTimeout(() => {
            router.push({
              name: "transaction-rental-detail",
              params: { code: transactionCode },
              query: { printReceipt: "true" },
            });
          }, 500);
        } else {
          setTimeout(() => {
            router.push({ name: "transactions-rentals" });
          }, 1500);
        }
      } else {
        // Partial payment, keep modal open
        showSuccess("Pembayaran berhasil! Masih ada sisa pembayaran.");
      }
    };

    const handlePaymentModalClose = (data) => {
      showPaymentModal.value = false;
      savedTransactionId.value = null;
      
      // If modal closed without payment (unpaid)
      if (data?.unpaid) {
        showError("Transaksi belum dibayar. Silakan lakukan pembayaran dari daftar transaksi.");
        // Redirect to transactions list after a short delay
        setTimeout(() => {
          router.push({ name: "transactions-rentals" });
        }, 2000);
      }
      
      // Reset form after payment modal is closed
      form.value = createDefaultForm();
      errors.value = {};
    };

    // Watch subtotal to recalculate tax
    watch(
      () => [subtotal.value, form.value.deposit],
      () => {
        form.value.tax = calculatedTax.value;
      },
    );

    // Auto-calculate deposit from selected items for rental transactions
    watch(
      () => form.value.items,
      (items) => {
        // Calculate total deposit from all selected items
        // Deposit = sum of (item.deposit * item.quantity) for each item
        const totalDeposit = items.reduce((sum, item) => {
          const itemDeposit = Number(item.deposit ?? 0);
          const quantity = Number(item.quantity ?? 1);
          return sum + (itemDeposit * quantity);
        }, 0);
        form.value.deposit = totalDeposit;
      },
      { deep: true },
    );

    onMounted(async () => {
      loadCustomers();
      await loadCashierStatus();
      await loadSettings();
      // Initialize tax after settings are loaded
      form.value.tax = calculatedTax.value;
    });

    return {
      form,
      customers,
      errors,
      loading,
      formatCurrency,
      formatNumberInput,
      handleDepositInput,
      handleTaxInput,
      totalAmount,
      totalDays,
      totalItems,
      totalBundles,
      bundleSubtotal,
      cashierStatus,
      calculatedTax,
      taxHint,
      handleSubmit,
      resetForm,
      goBack,
      showPaymentModal,
      savedTransactionId,
      handlePaymentSuccess,
      handlePaymentModalClose,
    };
  },
};
</script>

<style scoped>
/* Cashier Status Banner */
.cashier-status-section {
  margin-bottom: 1.5rem;
}

.cashier-status-banner {
  background-color: white;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #d1d5db;
  overflow: hidden;
  transition: all 0.2s ease;
}

.cashier-status-banner.open {
  border-left: 5px solid #16a34a;
  background: linear-gradient(to right, rgba(22, 163, 74, 0.02) 0%, white 5%);
}

.cashier-status-banner.closed {
  border-left: 5px solid #ef4444;
  background: linear-gradient(to right, rgba(239, 68, 68, 0.02) 0%, white 5%);
}

.cashier-status-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  gap: 1.5rem;
}

.cashier-status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cashier-status-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid white;
}

.status-indicator.active {
  background-color: #16a34a;
  box-shadow:
    0 0 0 4px rgba(22, 163, 74, 0.15),
    0 0 0 8px rgba(22, 163, 74, 0.08);
}

.status-indicator.inactive {
  background-color: #ef4444;
  box-shadow:
    0 0 0 4px rgba(239, 68, 68, 0.15),
    0 0 0 8px rgba(239, 68, 68, 0.08);
}

.cashier-status-label strong {
  font-size: 1.1rem;
  color: #111827;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.cashier-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-left: 1.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-label {
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  color: #111827;
  font-weight: 600;
}

.cashier-status-action {
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* Cashier Minimalist Layout - Full Width Table */
.cashier-form-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Header Row - Minimalist */
.cashier-header-row {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
  align-items: center;
  flex-wrap: wrap;
}

.cashier-field-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cashier-label-inline {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.cashier-date-inline {
  margin-bottom: 0;
}

.cashier-date-inline :deep(.form-label) {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.cashier-date-inline :deep(.form-input) {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.cashier-input-inline,
.cashier-select-inline {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  min-width: 150px;
}

.cashier-input-inline:focus,
.cashier-select-inline:focus {
  outline: none;
  border-color: #3b82f6;
}

.cashier-input-inline.error,
.cashier-select-inline.error {
  border-color: #dc2626;
}

/* Main Content - Full Width */
.cashier-main-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Items Section - Full Width */
.cashier-items-wrapper {
  width: 100%;
  min-width: 0;
}

.cashier-items-wrapper-spaced {
  margin-top: 1.5rem;
}

.cashier-section-header-minimal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.cashier-section-title-minimal {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.error-text-minimal {
  color: #dc2626;
  font-size: 0.85rem;
}

/* Bottom Section - Summary + Payment + Actions */
.cashier-bottom-section {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 200px;
  gap: 1rem;
  align-items: start;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Summary - Compact */
.cashier-summary-compact {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cashier-total-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0.75rem;
}

.cashier-total-label-minimal {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.cashier-total-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
}

.cashier-total-info {
  font-size: 0.75rem;
  color: #6b7280;
}

.cashier-breakdown-minimal {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.cashier-breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  color: #6b7280;
}

.cashier-breakdown-item span:last-child {
  font-weight: 600;
  color: #111827;
}

.cashier-breakdown-item.tax span:last-child {
  color: #3b82f6;
}

/* Payment Section - Compact */
.cashier-payment-compact {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  overflow: hidden;
}

.cashier-payment-fields {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.cashier-field-small {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.cashier-label-small {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.cashier-input-small {
  padding: 0.4rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.85rem;
  background-color: white;
  width: 90px;
  min-width: 90px;
  max-width: 90px;
}

.cashier-input-small:focus {
  outline: none;
  border-color: #3b82f6;
}

.cashier-field-minimal {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.cashier-label-minimal {
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
}

.cashier-textarea-minimal {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  width: 100%;
  resize: vertical;
  font-family: inherit;
}

.cashier-textarea-minimal:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Optional Details - Minimalist */
.cashier-details-minimal {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.cashier-summary-minimal {
  padding: 0.5rem 0.75rem;
  background-color: #f9fafb;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  color: #374151;
  list-style: none;
  user-select: none;
}

.cashier-summary-minimal::-webkit-details-marker {
  display: none;
}

.cashier-summary-minimal::before {
  content: "▶";
  display: inline-block;
  margin-right: 0.5rem;
  transition: transform 0.2s;
  font-size: 0.65rem;
}

.cashier-details-minimal[open] .cashier-summary-minimal::before {
  transform: rotate(90deg);
}

.cashier-details-content-minimal {
  padding: 0.75rem;
  background-color: white;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cashier-optional-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Actions - Minimalist */
.cashier-actions-minimal {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: flex-start;
  min-width: 180px;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 1200px) {
  .cashier-bottom-section {
    grid-template-columns: 1fr;
  }
  
  .cashier-actions-minimal {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
