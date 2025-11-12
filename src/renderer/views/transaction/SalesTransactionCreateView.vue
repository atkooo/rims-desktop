<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Transaksi Penjualan Baru</h1>
          <p class="subtitle">
            Form untuk kasir atau admin yang perlu mencatat penjualan toko
            dengan cepat.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" @click="goBack">Kembali</AppButton>
          <AppButton variant="primary" :loading="loading" @click="handleSubmit">
            Simpan Penjualan
          </AppButton>
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

    <section class="card-section form-page-grid">
      <div class="form-panel">
        <div v-if="submissionError" class="error-banner">
          {{ submissionError }}
        </div>
        <div v-else-if="successMessage" class="success-banner">
          {{ successMessage }}
        </div>

        <div class="form-section">
          <h3 class="section-title">Detail Customer & Jadwal</h3>
          <div class="form-grid">
            <div class="field-group">
              <label for="customerId"
                >Customer <span class="optional-label">(Opsional)</span></label
              >
              <select
                id="customerId"
                v-model="form.customerId"
                class="form-select"
                :class="{ error: errors.customerId }"
              >
                <option value="">Tanpa Customer</option>
                <option
                  v-for="customer in customers"
                  :key="customer.id"
                  :value="customer.id"
                >
                  {{ customer.name }}
                  {{ customer.code ? `(${customer.code})` : "" }}
                </option>
              </select>
              <div v-if="errors.customerId" class="error-message">
                {{ errors.customerId }}
              </div>
            </div>
            <div class="field-group">
              <FormInput
                id="saleDate"
                label="Tanggal Penjualan"
                type="date"
                v-model="form.saleDate"
                :error="errors.saleDate"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Pilih Item</h3>
          <ItemSelector v-model="form.items" />
          <div v-if="errors.items" class="error-message">
            {{ errors.items }}
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Pilih Paket</h3>
          <BundleSelector v-model="form.bundles" />
        </div>

        <div class="form-section payment-section">
          <h3 class="section-title">Detail Pembayaran</h3>
          <div class="form-grid">
            <div class="field-group">
              <FormInput
                id="discount"
                label="Diskon"
                type="number"
                min="0"
                v-model.number="form.discount"
                :hint="getDiscountHint()"
                :readonly="isDiscountReadonly"
              />
            </div>
            <div class="field-group">
              <FormInput
                id="tax"
                label="Pajak"
                type="number"
                min="0"
                v-model.number="form.tax"
                :readonly="true"
                :hint="taxHint"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Catatan</h3>
          <FormInput
            id="notes"
            label="Catatan"
            type="textarea"
            v-model="form.notes"
          />
        </div>

        <div class="form-actions">
          <AppButton variant="secondary" @click="resetForm" :disabled="loading">
            Kosongkan Formulir
          </AppButton>
          <AppButton variant="primary" :loading="loading" @click="handleSubmit">
            Simpan Penjualan
          </AppButton>
        </div>
      </div>

      <aside class="summary-panel">
        <div class="summary-card highlight">
          <span>Total Estimasi Penjualan</span>
          <strong>{{ formatCurrency(totalAmount) }}</strong>
          <p class="summary-description">
            {{ totalItems }} item • {{ totalBundles }} paket
          </p>
        </div>
        <div class="summary-grid summary-grid--stacked">
          <div class="summary-card">
            <span>Subtotal Item</span>
            <strong>{{ formatCurrency(baseSubtotal) }}</strong>
          </div>
          <div class="summary-card">
            <span>Subtotal Paket</span>
            <strong>{{ formatCurrency(bundleSubtotal) }}</strong>
          </div>
          <div class="summary-card">
            <span>Diskon</span>
            <strong>- {{ formatCurrency(Number(form.discount) || 0) }}</strong>
          </div>
          <div class="summary-card">
            <span>Pajak</span>
            <strong>+ {{ formatCurrency(calculatedTax) }}</strong>
          </div>
        </div>
        <div class="summary-note">
          <h3>Catatan Kasir</h3>
          <ul>
            <li>Sertakan catatan jika ada request pelanggan khusus.</li>
            <li>Periksa kembali jumlah bundle sebelum menyimpan.</li>
            <li>Pembayaran dapat dilakukan setelah transaksi dibuat.</li>
          </ul>
          <AppButton variant="success" @click="goBack"
            >Lihat Daftar Penjualan</AppButton
          >
        </div>
      </aside>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import { fetchCustomers } from "@/services/masterData";
import { getStoredUser, getCurrentUser } from "@/services/auth";
import { useTransactionStore } from "@/store/transactions";
import { getCurrentSession } from "@/services/cashier";
import { TRANSACTION_TYPE } from "@shared/constants";
import { ipcRenderer } from "@/services/ipc";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const createDefaultForm = () => ({
  customerId: "",
  saleDate: toDateInput(new Date()),
  discount: 0,
  tax: 0,
  notes: "",
  items: [],
  bundles: [],
});

export default {
  name: "SalesTransactionCreateView",
  components: {
    AppButton,
    FormInput,
    ItemSelector,
    BundleSelector,
  },
  setup() {
    const router = useRouter();
    const transactionStore = useTransactionStore();
    const form = ref(createDefaultForm());
    const customers = ref([]);
    const loading = ref(false);
    const errors = ref({});
    const submissionError = ref("");
    const successMessage = ref("");
    const cashierStatus = ref(null);
    const taxPercentage = ref(0);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value || 0);

    // Calculate item price after discount
    const calculateItemPrice = (item) => {
      const basePrice = item.sale_price ?? item.price ?? 0;

      // Apply item discount if item has discount_group
      if (item.discount_percentage > 0) {
        return Math.round(basePrice * (1 - item.discount_percentage / 100));
      } else if (item.discount_amount > 0) {
        return Math.max(0, basePrice - item.discount_amount);
      }

      return basePrice;
    };

    // Calculate bundle price after discount
    const calculateBundlePrice = (bundle) => {
      const basePrice = bundle.price || 0;

      // Apply bundle discount if bundle has discount_group
      if (bundle.discount_percentage > 0) {
        return Math.round(basePrice * (1 - bundle.discount_percentage / 100));
      } else if (bundle.discount_amount > 0) {
        return Math.max(0, basePrice - bundle.discount_amount);
      }

      return basePrice;
    };

    const baseSubtotal = computed(() =>
      form.value.items.reduce((sum, item) => {
        const price = calculateItemPrice(item);
        return sum + price * (item.quantity || 1);
      }, 0),
    );

    const bundleSubtotal = computed(() =>
      form.value.bundles.reduce((sum, bundle) => {
        const price = calculateBundlePrice(bundle);
        return sum + price * (bundle.quantity || 0);
      }, 0),
    );

    const subtotal = computed(() => baseSubtotal.value + bundleSubtotal.value);

    // Calculate tax automatically based on tax percentage from settings
    const calculatedTax = computed(() => {
      if (taxPercentage.value > 0 && subtotal.value > 0) {
        const amountAfterDiscount = subtotal.value - (Number(form.value.discount) || 0);
        return Math.round((amountAfterDiscount * taxPercentage.value) / 100);
      }
      return 0;
    });

    const taxHint = computed(() => {
      if (taxPercentage.value > 0) {
        return `Dihitung otomatis: ${taxPercentage.value}% dari subtotal setelah diskon`;
      }
      return "Atur persentase pajak di Pengaturan Sistem";
    });

    const totalAmount = computed(
      () =>
        subtotal.value -
        (Number(form.value.discount) || 0) +
        calculatedTax.value,
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
        const price = calculateItemPrice(item);
        return {
          itemId: item.id,
          quantity,
          rentalPrice: 0,
          salePrice: price,
          subtotal: price * quantity,
        };
      }),
    );

    const normalizedBundles = computed(() =>
      form.value.bundles.map((bundle) => ({
        bundleId: bundle.id,
        quantity: Math.max(1, Number(bundle.quantity) || 1),
      })),
    );

    const getDiscountHint = () => {
      if (form.value.customerId) {
        const customer = customers.value.find(
          (c) => c.id === form.value.customerId,
        );
        if (customer && customer.discount_group_name) {
          if (customer.discount_percentage > 0) {
            return `Dari grup: ${customer.discount_group_name} (${customer.discount_percentage}%)`;
          } else if (customer.discount_amount > 0) {
            return `Dari grup: ${customer.discount_group_name} (${formatCurrency(customer.discount_amount)})`;
          }
        }
      }
      return "Diskon diatur dari grup diskon customer (jika ada)";
    };

    const isDiscountReadonly = computed(() => {
      // Jika customer dipilih dan memiliki discount_group, maka diskon readonly
      if (form.value.customerId) {
        const customer = customers.value.find(
          (c) => c.id === form.value.customerId,
        );
        if (customer && customer.discount_group_id) {
          return true;
        }
      }
      // Jika tidak ada customer atau customer tidak punya discount_group, diskon tetap readonly
      // karena diskon hanya dari konfigurasi
      return true;
    });

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customers:", error);
      }
    };

    const lastAutoAppliedDiscount = ref(null);

    // Watch for customer changes and auto-apply discount from discount group
    watch(
      () => form.value.customerId,
      (customerId, oldCustomerId) => {
        if (customerId) {
          const customer = customers.value.find((c) => c.id === customerId);
          if (customer && customer.discount_group_id) {
            // Customer has a discount group, apply the discount automatically
            if (customer.discount_percentage > 0) {
              // Apply percentage discount to subtotal
              const calculatedDiscount =
                (subtotal.value * customer.discount_percentage) / 100;
              form.value.discount = Math.round(calculatedDiscount);
              lastAutoAppliedDiscount.value = {
                type: "percentage",
                customerId,
              };
            } else if (customer.discount_amount > 0) {
              // Apply fixed amount discount
              form.value.discount = customer.discount_amount;
              lastAutoAppliedDiscount.value = { type: "amount", customerId };
            } else {
              // Discount group exists but no discount configured
              form.value.discount = 0;
              lastAutoAppliedDiscount.value = { type: "none", customerId };
            }
          } else {
            // Customer doesn't have discount group, reset discount to 0
            form.value.discount = 0;
            lastAutoAppliedDiscount.value = null;
          }
        } else {
          // No customer selected, reset discount to 0
          form.value.discount = 0;
          lastAutoAppliedDiscount.value = null;
        }
      },
    );

    // Also watch subtotal to recalculate percentage-based discounts (only if discount was auto-applied)
    watch(
      () => subtotal.value,
      () => {
        if (form.value.customerId && lastAutoAppliedDiscount.value) {
          const customer = customers.value.find(
            (c) => c.id === form.value.customerId,
          );
          if (
            customer &&
            customer.discount_group_id &&
            customer.discount_percentage > 0 &&
            lastAutoAppliedDiscount.value.type === "percentage" &&
            lastAutoAppliedDiscount.value.customerId === form.value.customerId
          ) {
            // Recalculate percentage discount when subtotal changes (only if it was auto-applied)
            const calculatedDiscount =
              (subtotal.value * customer.discount_percentage) / 100;
            form.value.discount = Math.round(calculatedDiscount);
          }
        } else if (!form.value.customerId || !lastAutoAppliedDiscount.value) {
          // If no customer or no auto-applied discount, ensure discount is 0
          form.value.discount = 0;
        }
        // Update tax when subtotal changes
        form.value.tax = calculatedTax.value;
      },
    );

    // Watch discount to recalculate tax
    watch(
      () => form.value.discount,
      () => {
        form.value.tax = calculatedTax.value;
      },
    );

    const resetForm = () => {
      form.value = createDefaultForm();
      errors.value = {};
      successMessage.value = "";
      submissionError.value = "";
      lastAutoAppliedDiscount.value = null;
    };

    const validateForm = () => {
      const newErrors = {};
      // Customer is optional for sales transactions
      if (!form.value.saleDate) {
        newErrors.saleDate = "Tanggal penjualan harus diisi";
      }
      if (form.value.items.length === 0 && form.value.bundles.length === 0) {
        newErrors.items = "Pilih minimal 1 item atau paket";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const goBack = () => {
      router.push({ name: "transactions-sales" });
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
      submissionError.value = "";
      successMessage.value = "";
      try {
        const user = getStoredUser();
        const newTransaction = await transactionStore.createTransaction({
          type: TRANSACTION_TYPE.SALE,
          customerId: form.value.customerId || null,
          userId: user?.id || 1,
          notes: form.value.notes,
          totalAmount: Number(totalAmount.value),
          transactionDate: form.value.saleDate,
          saleDate: form.value.saleDate,
          subtotal: subtotal.value,
          discount: Number(form.value.discount) || 0,
          tax: calculatedTax.value,
          items: normalizedItems.value,
          bundles: normalizedBundles.value,
        });

        // Refresh cashier status after transaction
        await loadCashierStatus();

        // Redirect to payment page
        if (newTransaction && newTransaction.id) {
          router.push({
            name: "transaction-sale-payment",
            params: { id: newTransaction.id },
          });
        } else {
          // Fallback: show success message
          successMessage.value = "Penjualan berhasil disimpan.";
          form.value = createDefaultForm();
          errors.value = {};
        }
      } catch (error) {
        console.error("Gagal menyimpan penjualan:", error);
        submissionError.value =
          error?.message || "Gagal menyimpan penjualan. Silakan coba lagi.";
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
      submissionError,
      successMessage,
      formatCurrency,
      totalAmount,
      baseSubtotal,
      bundleSubtotal,
      totalItems,
      totalBundles,
      cashierStatus,
      getDiscountHint,
      isDiscountReadonly,
      taxHint,
      handleSubmit,
      resetForm,
      goBack,
    };
  },
};
</script>

<style scoped>
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-section {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
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

.form-page-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 1.5rem;
}

.form-panel {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
}

.summary-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #e5e7eb;
}

.summary-card span {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.summary-card strong {
  font-size: 1.5rem;
  color: #111827;
  font-weight: 700;
}

.summary-card.highlight {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  border: none;
}

.summary-card.highlight span {
  color: rgba(255, 255, 255, 0.9);
}

.summary-card.highlight strong {
  font-size: 1.875rem;
  color: #fff;
}

.summary-description {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.summary-note {
  background: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
}

.summary-note h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.summary-note ul {
  margin: 0 0 1rem;
  padding-left: 1.1rem;
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.5;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.payment-section .form-grid {
  margin-top: 0.7rem;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.success-banner {
  background-color: #dcfce7;
  color: #065f46;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.optional-label {
  color: #6b7280;
  font-weight: normal;
  font-size: 0.85em;
}

@media (max-width: 1080px) {
  .form-page-grid {
    grid-template-columns: 1fr;
  }

  .form-panel,
  .summary-panel {
    box-shadow: none;
  }
}
</style>
