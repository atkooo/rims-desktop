<template>
  <div class="cashier-rental-page">
    <div class="cashier-main">
      <!-- Left: Items Table -->
      <div class="cashier-items-section">
        <!-- Customer & Dates -->
        <div class="cashier-form-row">
          <div class="cashier-form-field">
            <label>Customer: <span class="required">*</span></label>
            <CustomerSelector
              v-model="form.customerId"
              placeholder="Pilih Customer (Wajib)"
              :allow-clear="false"
              class="cashier-select"
            />
          </div>
          <div class="cashier-form-field">
            <label>Tanggal Sewa:</label>
            <DatePicker
              id="rentalDate"
              v-model="form.rentalDate"
              mode="rental"
              class="cashier-date"
            />
          </div>
          <div class="cashier-form-field">
            <label>Rencana Kembali:</label>
            <DatePicker
              id="plannedReturnDate"
              v-model="form.plannedReturnDate"
              mode="plannedReturn"
              :min-date="form.rentalDate"
              class="cashier-date"
            />
          </div>
        </div>

        <!-- Items Table -->
        <div class="cashier-table-section">
          <div class="table-header">
            <h3>Item Sewa</h3>
            <button class="btn-add-item" @click="openItemPicker">
              + Tambah Item
            </button>
          </div>
          <ItemSelector :key="formKey" v-model="form.items" transaction-type="RENTAL" />
        </div>

        <!-- Bundles Table -->
        <div class="cashier-table-section">
          <div class="table-header">
            <h3>Paket Sewa</h3>
            <button class="btn-add-item" @click="openBundlePicker">
              + Tambah Paket
            </button>
          </div>
          <BundleSelector :key="formKey" v-model="form.bundles" bundle-type="rental" />
        </div>

        <!-- Notes -->
        <details class="cashier-details">
          <summary>Catatan</summary>
          <div class="details-content">
            <div class="input-group">
              <label>Catatan</label>
              <textarea
                v-model="form.notes"
                class="cashier-textarea"
                rows="2"
                placeholder="Catatan khusus..."
              ></textarea>
            </div>
          </div>
        </details>
      </div>

      <!-- Right: Total & Actions -->
      <div class="cashier-summary-section">
        <!-- Large Total Display -->
        <div class="cashier-total-display">
          <div class="total-label">TOTAL</div>
          <div class="total-amount">{{ formatCurrency(totalAmount) }}</div>
          <div class="total-info">
            {{ totalItems }} item{{ totalBundles > 0 ? ` • ${totalBundles} paket` : '' }} • {{ totalDays }} hari
          </div>
        </div>

        <!-- Breakdown -->
        <div class="cashier-breakdown">
          <div class="breakdown-row">
            <span>Subtotal ({{ totalDays }} hari):</span>
            <span>{{ formatCurrency(baseSubtotal) }}</span>
          </div>
          <div v-if="bundleSubtotal > 0" class="breakdown-row">
            <span>Paket ({{ totalDays }} hari):</span>
            <span>{{ formatCurrency(bundleSubtotal * totalDays) }}</span>
          </div>
          <div v-if="Number(form.deposit) > 0" class="breakdown-row">
            <span>Deposit:</span>
            <span>+ {{ formatCurrency(Number(form.deposit) || 0) }}</span>
          </div>
          <div v-if="calculatedTax > 0" class="breakdown-row tax">
            <span>Pajak:</span>
            <span>+ {{ formatCurrency(calculatedTax) }}</span>
          </div>
        </div>

        <!-- Deposit & Tax Inputs -->
        <div class="cashier-inputs">
          <div class="input-group">
            <label>Deposit</label>
            <input
              type="text"
              :value="formatNumberInput(form.deposit)"
              @input="handleDepositInput"
              class="cashier-input"
            />
          </div>
          <div class="input-group">
            <label>Pajak</label>
            <input
              type="text"
              :value="formatNumberInput(form.tax)"
              @input="handleTaxInput"
              class="cashier-input"
              readonly
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="cashier-actions">
          <button class="cashier-btn-reset" @click="resetForm" :disabled="loading">
            Reset
          </button>
          <button class="cashier-btn-submit" @click="handleSubmit" :disabled="loading || totalAmount <= 0">
            {{ loading ? 'Menyimpan...' : 'Simpan Rental' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <ItemPickerDialog
      v-model="itemPickerOpen"
      :excluded-ids="form.items.map((it) => it.id)"
      transaction-type="RENTAL"
      :restrict-stock="true"
      @select="addItem"
    />

    <BundlePickerDialog
      v-model="bundlePickerOpen"
      :excluded-ids="form.bundles.map((b) => b.id)"
      bundle-type="rental"
      :restrict-stock="true"
      @select="addBundle"
    />

    <PaymentModal
      v-model="showPaymentModal"
      :transaction-id="savedTransactionId"
      transaction-type="rental"
      @payment-success="handlePaymentSuccess"
      @close="handlePaymentModalClose"
    />

    <!-- Receipt Preview Dialog -->
    <ReceiptPreviewDialog
      v-model="showReceiptPreview"
      :transaction-id="savedTransactionId"
      transaction-type="rental"
      @printed="handleReceiptPrinted"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import DatePicker from "@/components/ui/DatePicker.vue";
import CustomerSelector from "@/components/modules/customers/CustomerSelector.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import BundlePickerDialog from "@/components/modules/bundles/BundlePickerDialog.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import ReceiptPreviewDialog from "@/components/ui/ReceiptPreviewDialog.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import { fetchCustomers, fetchBundleByCode } from "@/services/masterData";
import { getStoredUser } from "@/services/auth";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useBarcodeScanner } from "@/composables/useBarcodeScanner";
import { useItemStore } from "@/store/items";
import { toDateInput } from "@/utils/dateUtils";

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
  name: "CashierRentalPage",
  components: {
    DatePicker,
    CustomerSelector,
    ItemSelector,
    BundleSelector,
    ItemPickerDialog,
    BundlePickerDialog,
    PaymentModal,
    ReceiptPreviewDialog,
  },
  setup() {
    const router = useRouter();
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const { showSuccess, showError } = useNotification();
    const form = ref(createDefaultForm());
    const customers = ref([]);
    const loading = ref(false);
    const taxPercentage = ref(0);
    const showPaymentModal = ref(false);
    const showReceiptPreview = ref(false);
    const savedTransactionId = ref(null);
    const itemPickerOpen = ref(false);
    const bundlePickerOpen = ref(false);
    const formKey = ref(0);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value || 0);

    const totalDays = computed(() => {
      const from = new Date(form.value.rentalDate);
      const to = new Date(form.value.plannedReturnDate);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
      const diffMs = to - from;
      if (diffMs < 0) return 1;
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    });

    // Calculate subtotals
    const baseSubtotal = computed(() => {
      return form.value.items.reduce((sum, item) => {
        const price = item.rental_price_per_day || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);
    });

    const bundleSubtotal = computed(() => {
      return form.value.bundles.reduce((sum, bundle) => {
        const price = bundle.rental_price_per_day || 0;
        const quantity = bundle.quantity || 1;
        return sum + price * quantity;
      }, 0);
    });

    const subtotal = computed(() => (baseSubtotal.value + bundleSubtotal.value) * totalDays.value);

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
      form.value.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
    );

    const totalBundles = computed(() =>
      form.value.bundles.reduce((sum, bundle) => sum + (bundle.quantity || 1), 0),
    );

    // Normalize items for submission
    const normalizedItems = computed(() =>
      form.value.items.map((item) => ({
        itemId: item.id,
        quantity: Math.max(1, Number(item.quantity) || 1),
        rentalPrice: item.rental_price_per_day || 0,
      })),
    );

    // Normalize bundles for submission
    const normalizedBundles = computed(() =>
      form.value.bundles.map((bundle) => ({
        bundleId: bundle.id,
        quantity: Math.max(1, Number(bundle.quantity) || 1),
      })),
    );

    const { formatNumberInput, createInputHandler } = useNumberFormat();
    const handleDepositInput = createInputHandler(
      (value) => (form.value.deposit = value)
    );
    const handleTaxInput = createInputHandler(
      (value) => (form.value.tax = value)
    );

    // Barcode scanner - supports item and bundle
    const handleBarcodeScan = async (barcode) => {
      try {
        // 1. Cari di items terlebih dahulu
        let item = itemStore.getItemByCode(barcode);
        if (!item) {
          item = await itemStore.searchItemByCode(barcode);
        }

        if (item) {
          // Item ditemukan
          if (item.status !== "AVAILABLE") {
            showError(`Item "${item.name}" tidak tersedia untuk disewa`);
            return;
          }

          const existingItemIndex = form.value.items.findIndex(
            (i) => i.id === item.id
          );

          if (existingItemIndex >= 0) {
            const existingItem = form.value.items[existingItemIndex];
            const currentQuantity = existingItem.quantity || 1;
            const availableStock = item.available_quantity || 0;
            if (currentQuantity >= availableStock) {
              showError(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
              return;
            }
            form.value.items[existingItemIndex].quantity = currentQuantity + 1;
          } else {
            const availableStock = item.available_quantity || 0;
            if (availableStock < 1) {
              showError(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
              return;
            }
            form.value.items.push({
              ...item,
              quantity: 1,
            });
          }
          showSuccess(`Item "${item.name}" berhasil ditambahkan`);
          return;
        }

        // 2. Jika tidak ditemukan di items, cari di bundles
        let bundle = null;
        try {
          bundle = await fetchBundleByCode(barcode);
        } catch (bundleError) {
          bundle = null;
        }
        
        if (bundle) {
          if (!bundle.is_active) {
            showError(`Paket "${bundle.name}" tidak aktif`);
            return;
          }

          // Cek apakah bundle sesuai untuk transaksi rental
          if (bundle.bundle_type !== "rental" && bundle.bundle_type !== "both") {
            showError(`Paket "${bundle.name}" tidak tersedia untuk sewa`);
            return;
          }

          const existingBundleIndex = form.value.bundles.findIndex(
            (b) => b.id === bundle.id
          );

          if (existingBundleIndex >= 0) {
            const existingBundle = form.value.bundles[existingBundleIndex];
            form.value.bundles[existingBundleIndex].quantity = (existingBundle.quantity || 1) + 1;
          } else {
            form.value.bundles.push({
              ...bundle,
              quantity: 1,
            });
          }
          showSuccess(`Paket "${bundle.name}" berhasil ditambahkan`);
          return;
        }

        // Jika tidak ditemukan di semua tempat
        showError(`Kode "${barcode}" tidak ditemukan (item atau paket)`);
      } catch (error) {
        console.error("Error handling barcode scan:", error);
        showError("Gagal menambahkan dari barcode: " + (error.message || "Unknown error"));
      }
    };

    useBarcodeScanner({
      onScan: handleBarcodeScan,
      minLength: 3,
      maxLength: 50,
      timeout: 100,
      enabled: true,
    });

    const openItemPicker = () => {
      itemPickerOpen.value = true;
    };

    const openBundlePicker = () => {
      bundlePickerOpen.value = true;
    };

    const addItem = (item) => {
      const existingIndex = form.value.items.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        form.value.items[existingIndex].quantity += 1;
      } else {
        form.value.items.push({ ...item, quantity: 1 });
      }
    };

    const addBundle = (bundle) => {
      const existingIndex = form.value.bundles.findIndex((b) => b.id === bundle.id);
      if (existingIndex >= 0) {
        form.value.bundles[existingIndex].quantity += 1;
      } else {
        form.value.bundles.push({ ...bundle, quantity: 1 });
      }
    };

    const resetForm = () => {
      // Create completely new form object with new array references
      form.value = createDefaultForm();
      // Force Vue reactivity by creating new arrays
      form.value.items = [];
      form.value.bundles = [];
      // Increment key to force re-render of child components
      formKey.value += 1;
    };

    const handleSubmit = async () => {
      // Validasi customer wajib untuk rental
      if (!form.value.customerId || form.value.customerId === "") {
        showError("Pilih customer terlebih dahulu");
        return;
      }
      
      if (form.value.items.length === 0 && form.value.bundles.length === 0) {
        showError("Pilih minimal 1 item atau paket");
        return;
      }
      loading.value = true;
      try {
        const user = getStoredUser();
        const newTransaction = await transactionStore.createTransaction({
          type: TRANSACTION_TYPE.RENTAL,
          customerId: form.value.customerId || null,
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
          bundles: normalizedBundles.value,
        });

        if (newTransaction && newTransaction.id) {
          savedTransactionId.value = newTransaction.id;
          showPaymentModal.value = true;
        } else {
          showSuccess("Rental berhasil disimpan.");
          resetForm();
        }
      } catch (error) {
        console.error("Gagal menyimpan transaksi:", error);
        // Extract user-friendly error message
        const errorMessage = error?.message || error?.toString() || "Gagal menyimpan transaksi rental";
        showError(errorMessage);
      } finally {
        loading.value = false;
      }
    };

    const handlePaymentSuccess = (data) => {
      if (!data.partial) {
        showSuccess("Pembayaran berhasil! Transaksi telah dilunasi.");
        showPaymentModal.value = false;
        // Keep transaction ID for receipt preview
        // Auto-open receipt preview after successful payment
        setTimeout(() => {
          showReceiptPreview.value = true;
        }, 500);
      } else {
        // Partial payment, keep modal open
        showSuccess("Pembayaran berhasil! Masih ada sisa pembayaran.");
      }
    };

    const handlePaymentModalClose = () => {
      showPaymentModal.value = false;
      // Don't reset form if payment was successful (receipt preview might be open)
      if (!showReceiptPreview.value) {
        savedTransactionId.value = null;
        resetForm();
      }
    };

    const handleReceiptPrinted = (result) => {
      if (result && result.success) {
        showSuccess("Struk berhasil dicetak!");
      }
      // Reset form and clear transaction ID after receipt is printed
      savedTransactionId.value = null;
      resetForm();
    };

    // Watch for receipt preview dialog close to reset form
    watch(showReceiptPreview, (newValue) => {
      if (!newValue && savedTransactionId.value) {
        // Dialog was closed, reset form if not already reset
        setTimeout(() => {
          savedTransactionId.value = null;
          resetForm();
        }, 100);
      }
    });

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customers:", error);
      }
    };

    const loadSettings = async () => {
      try {
        const settings = await ipcRenderer.invoke("settings:get");
        taxPercentage.value = settings?.taxPercentage || 0;
        form.value.tax = calculatedTax.value;
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    watch(
      [() => subtotal.value, () => form.value.deposit, () => taxPercentage.value],
      () => {
        form.value.tax = calculatedTax.value;
      }
    );

    onMounted(async () => {
      loadCustomers();
      await loadSettings();
      if (!itemStore.items.length) {
        await itemStore.fetchItems();
      }
    });

    return {
      form,
      loading,
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
      calculatedTax,
      openItemPicker,
      openBundlePicker,
      addItem,
      addBundle,
      resetForm,
      handleSubmit,
      itemPickerOpen,
      bundlePickerOpen,
      showPaymentModal,
      showReceiptPreview,
      savedTransactionId,
      handlePaymentSuccess,
      handlePaymentModalClose,
      handleReceiptPrinted,
      formKey,
    };
  },
};
</script>

<style scoped>
.cashier-rental-page {
  padding: 1.5rem 2rem;
}

.cashier-main {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
}

.cashier-items-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cashier-form-row {
  display: flex;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.cashier-form-field {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cashier-form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.cashier-table-section {
  margin-bottom: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.table-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.btn-add-item {
  padding: 0.5rem 1rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-item:hover {
  background: #4338ca;
}

.cashier-details {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 1rem;
}

.cashier-details summary {
  padding: 0.75rem 1rem;
  background: #f9fafb;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
  list-style: none;
  user-select: none;
}

.cashier-details summary::-webkit-details-marker {
  display: none;
}

.cashier-details summary::before {
  content: "▶";
  display: inline-block;
  margin-right: 0.5rem;
  transition: transform 0.2s;
  font-size: 0.65rem;
}

.cashier-details[open] summary::before {
  transform: rotate(90deg);
}

.details-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cashier-summary-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 1.5rem;
}

.cashier-total-display {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: white;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  min-width: 0;
  overflow: hidden;
}

.total-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.total-amount {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.total-info {
  font-size: 0.875rem;
  opacity: 0.9;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.cashier-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 0.875rem;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  color: #6b7280;
}

.breakdown-row span:last-child {
  font-weight: 600;
  color: #111827;
}

.breakdown-row.tax span:last-child {
  color: #3b82f6;
}

.cashier-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #ef4444;
  font-weight: 600;
}

.cashier-input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.cashier-input:focus {
  outline: none;
  border-color: #4f46e5;
}

.cashier-input[readonly] {
  background: #f9fafb;
  cursor: not-allowed;
}

.cashier-textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  font-family: inherit;
  resize: vertical;
}

.cashier-textarea:focus {
  outline: none;
  border-color: #4f46e5;
}

.cashier-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cashier-btn-reset {
  padding: 0.875rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.cashier-btn-reset:hover:not(:disabled) {
  background: #e5e7eb;
}

.cashier-btn-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cashier-btn-submit {
  padding: 1rem;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.cashier-btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.cashier-btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 1200px) {
  .cashier-main {
    grid-template-columns: 1fr;
  }
  
  .cashier-summary-section {
    position: static;
  }
}
</style>
