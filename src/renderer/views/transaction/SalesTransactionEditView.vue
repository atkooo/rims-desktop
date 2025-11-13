<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Edit Transaksi Penjualan</h1>
          <p class="subtitle">
            Edit transaksi penjualan {{ transactionCode || "" }}
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
          <select
            id="customerId"
            v-model="form.customerId"
            class="cashier-select-inline"
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
        </div>
        <div class="cashier-field-inline">
          <label for="saleDate" class="cashier-label-inline">Tanggal:</label>
          <input
            id="saleDate"
            type="date"
            v-model="form.saleDate"
            class="cashier-input-inline"
            :class="{ error: errors.saleDate }"
          />
        </div>
      </div>

      <!-- Main Content - Full Width Table -->
      <div class="cashier-main-content">
        <!-- Items Table - Full Width -->
        <div class="cashier-items-wrapper">
          <div class="cashier-section-header-minimal">
            <span class="cashier-section-title-minimal">Item Penjualan</span>
            <span v-if="errors.items" class="error-text-minimal">{{ errors.items }}</span>
          </div>
          <ItemSelector v-model="form.items" transaction-type="SALE" />
        </div>

        <!-- Bottom Section: Summary + Payment + Actions -->
        <div class="cashier-bottom-section">
          <!-- Summary - Compact -->
          <div class="cashier-summary-compact">
            <div class="cashier-total-box">
              <div class="cashier-total-label-minimal">Total Penjualan</div>
              <div class="cashier-total-value">{{ formatCurrency(totalAmount) }}</div>
              <div class="cashier-total-info">
                {{ totalItems }} item{{ totalBundles > 0 ? ` • ${totalBundles} paket` : '' }}{{ totalAccessories > 0 ? ` • ${totalAccessories} aksesoris` : '' }}
              </div>
            </div>
            <div class="cashier-breakdown-minimal">
              <div class="cashier-breakdown-item">
                <span>Subtotal:</span>
                <span>{{ formatCurrency(baseSubtotal) }}</span>
              </div>
              <div v-if="bundleSubtotal > 0" class="cashier-breakdown-item">
                <span>Paket:</span>
                <span>{{ formatCurrency(bundleSubtotal) }}</span>
              </div>
              <div v-if="accessorySubtotal > 0" class="cashier-breakdown-item">
                <span>Aksesoris:</span>
                <span>{{ formatCurrency(accessorySubtotal) }}</span>
              </div>
              <div v-if="Number(form.discount) > 0" class="cashier-breakdown-item discount">
                <span>Diskon:</span>
                <span>- {{ formatCurrency(Number(form.discount) || 0) }}</span>
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
                <label for="discount" class="cashier-label-small">Diskon</label>
                <input
                  id="discount"
                  :value="formatNumberInput(form.discount)"
                  @input="handleDiscountInput"
                  type="text"
                  class="cashier-input-small"
                  :readonly="isDiscountReadonly"
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
              <summary class="cashier-summary-minimal">Paket, Aksesoris & Catatan</summary>
              <div class="cashier-details-content-minimal">
                <div class="cashier-optional-item">
                  <label class="cashier-label-minimal">Paket</label>
                  <BundleSelector v-model="form.bundles" />
                </div>
                <div class="cashier-optional-item">
                  <label class="cashier-label-minimal">Aksesoris</label>
                  <AccessorySelector v-model="form.accessories" />
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
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import AccessorySelector from "@/components/modules/accessories/AccessorySelector.vue";
import { fetchCustomers } from "@/services/masterData";
import { fetchSalesTransactions, fetchSalesDetails } from "@/services/transactions";
import { useTransactionStore } from "@/store/transactions";
import { useItemStore } from "@/store/items";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";
import { useNumberFormat } from "@/composables/useNumberFormat";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export default {
  name: "SalesTransactionEditView",
  components: {
    AppButton,
    ItemSelector,
    BundleSelector,
    AccessorySelector,
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
      saleDate: toDateInput(new Date()),
      discount: 0,
      tax: 0,
      notes: "",
      items: [],
      bundles: [],
      accessories: [],
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
    const handleDiscountInput = createInputHandler(
      (value) => (form.value.discount = value)
    );
    const handleTaxInput = createInputHandler(
      (value) => (form.value.tax = value)
    );

    // Calculate item price after discount
    const calculateItemPrice = (item) => {
      const basePrice = item.sale_price ?? item.price ?? 0;
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
      if (bundle.discount_percentage > 0) {
        return Math.round(basePrice * (1 - bundle.discount_percentage / 100));
      } else if (bundle.discount_amount > 0) {
        return Math.max(0, basePrice - bundle.discount_amount);
      }
      return basePrice;
    };

    // Calculate accessory price after discount
    const calculateAccessoryPrice = (accessory) => {
      const basePrice = accessory.sale_price ?? 0;
      if (accessory.discount_percentage > 0) {
        return Math.round(basePrice * (1 - accessory.discount_percentage / 100));
      } else if (accessory.discount_amount > 0) {
        return Math.max(0, basePrice - accessory.discount_amount);
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

    const accessorySubtotal = computed(() =>
      form.value.accessories.reduce((sum, accessory) => {
        const price = calculateAccessoryPrice(accessory);
        return sum + price * (accessory.quantity || 1);
      }, 0),
    );

    const subtotal = computed(() => baseSubtotal.value + bundleSubtotal.value + accessorySubtotal.value);

    // Calculate tax automatically based on tax percentage from settings
    const calculatedTax = computed(() => {
      if (taxPercentage.value > 0 && subtotal.value > 0) {
        const amountAfterDiscount = subtotal.value - (Number(form.value.discount) || 0);
        return Math.round((amountAfterDiscount * taxPercentage.value) / 100);
      }
      return 0;
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

    const totalAccessories = computed(() =>
      form.value.accessories.reduce(
        (sum, accessory) => sum + (accessory.quantity || 1),
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

    const normalizedAccessories = computed(() => {
      return form.value.accessories.map((accessory) => {
        const price = calculateAccessoryPrice(accessory);
        return {
          accessoryId: accessory.id,
          quantity: accessory.quantity || 1,
          salePrice: price,
          subtotal: price * (accessory.quantity || 1),
        };
      });
    });

    const isDiscountReadonly = computed(() => {
      if (form.value.customerId) {
        const customer = customers.value.find(
          (c) => c.id === form.value.customerId,
        );
        if (customer && customer.discount_group_id) {
          return true;
        }
      }
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
      (customerId) => {
        if (customerId) {
          const customer = customers.value.find((c) => c.id === customerId);
          if (customer && customer.discount_group_id) {
            if (customer.discount_percentage > 0) {
              const calculatedDiscount =
                (subtotal.value * customer.discount_percentage) / 100;
              form.value.discount = Math.round(calculatedDiscount);
              lastAutoAppliedDiscount.value = {
                type: "percentage",
                customerId,
              };
            } else if (customer.discount_amount > 0) {
              form.value.discount = customer.discount_amount;
              lastAutoAppliedDiscount.value = { type: "amount", customerId };
            } else {
              form.value.discount = 0;
              lastAutoAppliedDiscount.value = { type: "none", customerId };
            }
          } else {
            form.value.discount = 0;
            lastAutoAppliedDiscount.value = null;
          }
        } else {
          form.value.discount = 0;
          lastAutoAppliedDiscount.value = null;
        }
      },
    );

    // Watch subtotal to recalculate percentage-based discounts
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
            const calculatedDiscount =
              (subtotal.value * customer.discount_percentage) / 100;
            form.value.discount = Math.round(calculatedDiscount);
          }
        } else if (!form.value.customerId || !lastAutoAppliedDiscount.value) {
          form.value.discount = 0;
        }
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

    const loadTransaction = async () => {
      if (!transactionCode.value) {
        error.value = "Kode transaksi tidak tersedia.";
        return;
      }

      loading.value = true;
      error.value = "";
      try {
        // Load transaction
        const sales = await fetchSalesTransactions();
        const found = sales.find(
          (s) => s.transaction_code === transactionCode.value,
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
        const details = await fetchSalesDetails();
        const transactionDetailsList = details.filter(
          (d) => d.transaction_code === transactionCode.value,
        );
        transactionDetails.value = transactionDetailsList;

        // Load items, bundles, and accessories from details
        // Note: This is a simplified version - you may need to adjust based on your data structure
        // For now, we'll load items from transaction details
        // Bundles and accessories would need separate handling
        
        // Pre-fill form
        form.value = {
          customerId: found.customer_id || "",
          saleDate: toDateInput(found.sale_date),
          discount: found.discount || 0,
          tax: found.tax || 0,
          notes: found.notes || "",
          items: [], // Will be populated from details
          bundles: [], // Will need separate handling
          accessories: [], // Will need separate handling
        };

        // Load items from transaction details
        // First, ensure items are loaded in the store
        if (!itemStore.items.length) {
          await itemStore.fetchItems();
        }
        
        // Load items from transaction details
        const itemsFromDetails = transactionDetailsList
          .filter((d) => d.item_type === "item" && d.item_id)
          .map((d) => {
            const item = itemStore.getItemById(d.item_id);
            if (item) {
              return {
                ...item,
                quantity: d.quantity || 1,
                sale_price: d.sale_price || item.sale_price || item.price || 0,
              };
            }
            return null;
          })
          .filter(Boolean);
        
        form.value.items = itemsFromDetails;
        
        // Load accessories from transaction details
        const accessoriesFromDetails = transactionDetailsList
          .filter((d) => d.item_type === "accessory" && d.accessory_id)
          .map((d) => {
            // For now, we'll create a simple accessory object
            // You may need to fetch from accessory store if available
            return {
              id: d.accessory_id,
              name: d.item_name || "Accessory",
              quantity: d.quantity || 1,
              sale_price: d.sale_price || 0,
            };
          });
        
        form.value.accessories = accessoriesFromDetails;

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

    const validateForm = () => {
      const newErrors = {};
      if (!form.value.saleDate) {
        newErrors.saleDate = "Tanggal penjualan harus diisi";
      }
      if (form.value.items.length === 0 && form.value.bundles.length === 0 && form.value.accessories.length === 0) {
        newErrors.items = "Pilih minimal 1 item, paket, atau aksesoris";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const goBack = () => {
      router.push({
        name: "transaction-sale-detail",
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
          saleDate: form.value.saleDate,
          totalAmount: Number(totalAmount.value),
          notes: form.value.notes,
        });

        showSuccess("Transaksi berhasil diperbarui.");
        setTimeout(() => {
          router.push({
            name: "transaction-sale-detail",
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
      handleDiscountInput,
      handleTaxInput,
      totalAmount,
      baseSubtotal,
      bundleSubtotal,
      totalItems,
      totalBundles,
      totalAccessories,
      accessorySubtotal,
      isDiscountReadonly,
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

.cashier-breakdown-item.discount span:last-child {
  color: #16a34a;
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

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
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

