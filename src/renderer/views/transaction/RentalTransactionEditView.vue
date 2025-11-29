<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Edit Transaksi Sewa</h1>
          <p class="subtitle">
            Edit transaksi sewa {{ transactionCode || "" }}
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" @click="goBack">Kembali</AppButton>
        </div>
      </div>
    </div>

    <section v-if="error" class="card-section">
      <div class="error-banner">
        {{ error }}
      </div>
    </section>

    <section v-else-if="loading" class="card-section">
      <div class="loading-state">Memuat data transaksi...</div>
    </section>

    <section v-else-if="transaction" class="card-section cashier-form-container">
      <!-- Header Info - Minimalist -->
      <div class="cashier-header-row">
        <div class="cashier-field-inline">
          <label for="customerId" class="cashier-label-inline">Customer:</label>
          <CustomerSelector
            id="customerId"
            v-model="form.customerId"
            placeholder="Pilih Customer"
            :error="errors.customerId"
            class="cashier-customer-selector"
          />
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
              <summary class="cashier-summary-minimal">Paket & Catatan</summary>
              <div class="cashier-details-content-minimal">
                <div class="cashier-optional-item">
                  <label class="cashier-label-minimal">Paket</label>
                  <BundleSelector v-model="form.bundles" bundle-type="rental" />
                </div>
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
            <AppButton variant="secondary" @click="goBack" :disabled="loading" size="medium">
              Batal
            </AppButton>
            <AppButton variant="primary" :loading="loading" @click="handleSubmit" size="large">
              Simpan Perubahan
            </AppButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import CustomerSelector from "@/components/modules/customers/CustomerSelector.vue";
import { fetchCustomers } from "@/services/masterData";
import { fetchRentalTransactions, fetchRentalDetails } from "@/services/transactions";
import { useTransactionStore } from "@/store/transactions";
import { useItemStore } from "@/store/items";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { toDateInput } from "@/utils/dateUtils";

export default {
  name: "RentalTransactionEditView",
  components: {
    AppButton,
    ItemSelector,
    BundleSelector,
    CustomerSelector,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const { showSuccess, showError } = useNotification();
    const transactionCode = computed(() => route.params.code);
    const transaction = ref(null);
    const transactionDetails = ref([]);
    const error = ref("");
    const form = ref({
      customerId: "",
      rentalDate: toDateInput(new Date()),
      plannedReturnDate: toDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      deposit: 0,
      tax: 0,
      notes: "",
      items: [],
      bundles: [],
    });
    const customers = ref([]);
    const loading = ref(false);
    const errors = ref({});
    const taxPercentage = ref(0);

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


    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customers:", error);
      }
    };

    const loadTransaction = async () => {
      if (!transactionCode.value) {
        error.value = "Kode transaksi tidak tersedia.";
        return;
      }

      loading.value = true;
      error.value = "";
      try {
        // Load transaction
        const rentals = await fetchRentalTransactions();
        const found = rentals.find(
          (r) => r.transaction_code === transactionCode.value,
        );

        if (!found) {
          throw new Error("Transaksi tidak ditemukan.");
        }

        // Check if transaction is paid or cancelled
        const paymentStatus = (found.payment_status || "").toString().toLowerCase();
        const status = (found.status || "").toString().toLowerCase();
        
        if (status === "cancelled") {
          throw new Error("Transaksi yang sudah dibatalkan tidak dapat di-edit.");
        }
        
        if (paymentStatus === "paid") {
          throw new Error("Transaksi yang sudah dibayar tidak dapat di-edit.");
        }

        transaction.value = found;

        // Load transaction details
        const details = await fetchRentalDetails();
        const transactionDetailsList = details.filter(
          (d) => d.transaction_code === transactionCode.value,
        );
        transactionDetails.value = transactionDetailsList;

        // Pre-fill form
        form.value = {
          customerId: found.customer_id || "",
          rentalDate: toDateInput(found.rental_date),
          plannedReturnDate: toDateInput(found.planned_return_date),
          deposit: found.deposit || 0,
          tax: found.tax || 0,
          notes: found.notes || "",
          items: [],
          bundles: [],
        };

        // Load items from transaction details
        // First, ensure items are loaded in the store
        if (!itemStore.items.length) {
          await itemStore.fetchItems();
        }
        
        // Load items from transaction details
        const itemsFromDetails = transactionDetailsList
          .filter((d) => d.item_name)
          .map((d) => {
            // Need to get item_id from rental_transaction_details
            // For now, we'll try to find item by name
            const item = itemStore.items.find((i) => i.name === d.item_name);
            if (item) {
              return {
                ...item,
                quantity: d.quantity || 1,
                rental_price_per_day: d.rental_price || item.rental_price_per_day || item.price || 0,
              };
            }
            // If item not found, create a simple object
            return {
              id: null,
              name: d.item_name || "Item",
              quantity: d.quantity || 1,
              rental_price_per_day: d.rental_price || 0,
            };
          });
        
        form.value.items = itemsFromDetails;

        // Load tax percentage
        const settings = await ipcRenderer.invoke("settings:get");
        taxPercentage.value = settings?.taxPercentage || 0;
        form.value.tax = calculatedTax.value;
      } catch (err) {
        error.value = err.message || "Gagal memuat data transaksi.";
        console.error("Error loading transaction:", err);
      } finally {
        loading.value = false;
      }
    };

    // Watch rental dates to recalculate tax
    watch(
      () => [form.value.rentalDate, form.value.plannedReturnDate],
      () => {
        form.value.tax = calculatedTax.value;
      },
    );

    // Watch subtotal to recalculate tax
    watch(
      () => subtotal.value,
      () => {
        form.value.tax = calculatedTax.value;
      },
    );

    // Watch deposit to recalculate tax
    watch(
      () => form.value.deposit,
      () => {
        form.value.tax = calculatedTax.value;
      },
    );

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
      router.push({
        name: "transaction-rental-detail",
        params: { code: transactionCode.value },
      });
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
      try {
        // Update transaction using transaction store
        await transactionStore.updateTransaction(transaction.value.id, {
          customerId: form.value.customerId || null,
          rentalDate: form.value.rentalDate,
          plannedReturnDate: form.value.plannedReturnDate,
          totalAmount: Number(totalAmount.value),
          notes: form.value.notes,
        });

        showSuccess("Transaksi berhasil diperbarui.");
        setTimeout(() => {
          router.push({
            name: "transaction-rental-detail",
            params: { code: transactionCode.value },
          });
        }, 1000);
      } catch (error) {
        console.error("Gagal memperbarui transaksi:", error);
        showError(
          error?.message || "Gagal memperbarui transaksi. Silakan coba lagi.",
        );
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadCustomers();
      await loadTransaction();
    });

    return {
      transactionCode,
      transaction,
      form,
      customers,
      errors,
      loading,
      error,
      formatCurrency,
      formatNumberInput,
      handleDepositInput,
      handleTaxInput,
      totalAmount,
      baseSubtotal,
      bundleSubtotal,
      totalItems,
      totalBundles,
      totalDays,
      subtotal,
      calculatedTax,
      handleSubmit,
      goBack,
    };
  },
};
</script>

<style scoped>
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

/* Using global utility classes for form-input, form-select */
.cashier-input-inline,
.cashier-select-inline {
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
  min-width: 150px;
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

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
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

