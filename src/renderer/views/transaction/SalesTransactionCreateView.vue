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
        </div>
      </div>
    </section>

    <section class="card-section cashier-form-container">
      <!-- Header Info - Minimalist -->
      <div class="cashier-header-row">
        <div class="cashier-field-inline">
          <label for="customerId" class="cashier-label-inline">Customer:</label>
          <CustomerSelector
            id="customerId"
            v-model="form.customerId"
            placeholder="Tanpa Customer"
            :error="errors.customerId"
            :allow-clear="true"
            class="cashier-customer-selector"
          />
        </div>
        <div class="cashier-field-inline">
          <DatePicker
            id="saleDate"
            label="Tanggal:"
            v-model="form.saleDate"
            mode="sale"
            :error="errors.saleDate"
            class="cashier-date-inline"
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

        <!-- Bundles Table - Full Width -->
        <div ref="bundlesSectionRef" class="cashier-items-wrapper cashier-items-wrapper-spaced">
          <div class="cashier-section-header-minimal">
            <span class="cashier-section-title-minimal">Paket Penjualan</span>
          </div>
          <BundleSelector v-model="form.bundles" bundle-type="sale" />
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
            <details ref="accessoriesDetailsRef" class="cashier-details-minimal">
              <summary class="cashier-summary-minimal">Aksesoris & Catatan</summary>
              <div class="cashier-details-content-minimal">
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
            <AppButton variant="secondary" @click="resetForm" :disabled="loading" size="medium">
              Reset
            </AppButton>
            <AppButton variant="primary" :loading="loading" @click="handleSubmit" size="large">
              Simpan Penjualan
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
    @payment-success="handlePaymentSuccess"
    @close="handlePaymentModalClose"
  />
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import CustomerSelector from "@/components/modules/customers/CustomerSelector.vue";
import AccessorySelector from "@/components/modules/accessories/AccessorySelector.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import { fetchCustomers, fetchAccessoryByCode, fetchBundleByCode } from "@/services/masterData";
import { getStoredUser, getCurrentUser } from "@/services/auth";
import { useTransactionStore } from "@/store/transactions";
import { getCurrentSession } from "@/services/cashier";
import { TRANSACTION_TYPE } from "@shared/constants";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useBarcodeScanner } from "@/composables/useBarcodeScanner";
import { useItemStore } from "@/store/items";
import { toDateInput } from "@/utils/dateUtils";

const createDefaultForm = () => ({
  customerId: "",
  saleDate: toDateInput(new Date()),
  discount: 0,
  tax: 0,
  notes: "",
  items: [],
  bundles: [],
  accessories: [],
});

export default {
  name: "SalesTransactionCreateView",
  components: {
    AppButton,
    DatePicker,
    FormInput,
    ItemSelector,
    BundleSelector,
    CustomerSelector,
    AccessorySelector,
    PaymentModal,
  },
  setup() {
    const router = useRouter();
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const { showSuccess, showError } = useNotification();
    const form = ref(createDefaultForm());
    const customers = ref([]);
    const loading = ref(false);
    const errors = ref({});
    const cashierStatus = ref(null);
    const taxPercentage = ref(0);
    const showPaymentModal = ref(false);
    const savedTransactionId = ref(null);
    const accessoriesDetailsRef = ref(null);
    const bundlesSectionRef = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value || 0);

    // Barcode scanner handler
    const handleBarcodeScan = async (barcode) => {
      try {
        // Cari di items terlebih dahulu
        let item = itemStore.getItemByCode(barcode);
        if (!item) {
          item = await itemStore.searchItemByCode(barcode);
        }

        if (item) {
          // Item ditemukan
          if (item.status !== "AVAILABLE") {
            showError(`Item "${item.name}" tidak tersedia untuk dijual`);
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

        // Jika tidak ditemukan di items, cari di accessories
        let accessory = null;
        try {
          accessory = await fetchAccessoryByCode(barcode);
        } catch (accessoryError) {
          // Accessory not found, continue to bundles
          accessory = null;
        }
        
        if (accessory) {
            if (!accessory.is_active) {
              showError(`Aksesoris "${accessory.name}" tidak aktif`);
              return;
            }

            const existingAccessoryIndex = form.value.accessories.findIndex(
              (a) => a.id === accessory.id
            );

            if (existingAccessoryIndex >= 0) {
              const existingAccessory = form.value.accessories[existingAccessoryIndex];
              const currentQuantity = existingAccessory.quantity || 1;
              const availableStock = accessory.available_quantity || 0;
              if (currentQuantity >= availableStock) {
                showError(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
                return;
              }
              form.value.accessories[existingAccessoryIndex].quantity = currentQuantity + 1;
            } else {
              const availableStock = accessory.available_quantity || 0;
              if (availableStock < 1) {
                showError(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
                return;
              }
              form.value.accessories.push({
                ...accessory,
                quantity: 1,
              });
            }
            
            // Buka tab aksesoris setelah ditambahkan
            await nextTick();
            if (accessoriesDetailsRef.value) {
              accessoriesDetailsRef.value.open = true;
            }
            
            showSuccess(`Aksesoris "${accessory.name}" berhasil ditambahkan`);
            return;
          }

        // Jika tidak ditemukan di accessories, cari di bundles
        let bundle = null;
        try {
          bundle = await fetchBundleByCode(barcode);
        } catch (bundleError) {
          // Bundle not found
          bundle = null;
        }
        
        if (bundle) {
            if (!bundle.is_active) {
              showError(`Paket "${bundle.name}" tidak aktif`);
              return;
            }

            // Cek apakah bundle sesuai untuk transaksi penjualan
            if (bundle.bundle_type !== "sale" && bundle.bundle_type !== "both") {
              showError(`Paket "${bundle.name}" tidak tersedia untuk penjualan`);
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
            
            // Scroll ke section paket setelah ditambahkan
            await nextTick();
            if (bundlesSectionRef.value) {
              bundlesSectionRef.value.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
            
            showSuccess(`Paket "${bundle.name}" berhasil ditambahkan`);
            return;
          }

        // Jika tidak ditemukan di semua tempat
        showError(`Kode "${barcode}" tidak ditemukan (item, aksesoris, atau paket)`);
      } catch (error) {
        console.error("Error handling barcode scan:", error);
        showError("Gagal menambahkan dari barcode: " + (error.message || "Unknown error"));
      }
    };

    // Setup barcode scanner
    useBarcodeScanner({
      onScan: handleBarcodeScan,
      minLength: 3,
      maxLength: 50,
      timeout: 100,
      enabled: true,
    });

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
      const basePrice = item.sale_price ?? 0;

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

    // Calculate accessory price after discount
    const calculateAccessoryPrice = (accessory) => {
      const basePrice = accessory.sale_price ?? 0;

      // Apply accessory discount if accessory has discount_group
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
      lastAutoAppliedDiscount.value = null;
    };

    const validateForm = () => {
      const newErrors = {};
      // Customer is optional for sales transactions
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
      router.push({ name: "transactions-sales" });
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
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
          accessories: normalizedAccessories.value,
        });

        // Refresh cashier status after transaction
        await loadCashierStatus();

        // Show payment modal
        if (newTransaction && newTransaction.id) {
          savedTransactionId.value = newTransaction.id;
          showPaymentModal.value = true;
        } else {
          // Fallback: show success message
          showSuccess("Penjualan berhasil disimpan.");
          form.value = createDefaultForm();
          errors.value = {};
        }
      } catch (error) {
        console.error("Gagal menyimpan penjualan:", error);
        showError(error);
      } finally {
        loading.value = false;
      }
    };

    const loadCashierStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          const session = await getCurrentSession(user.id, user.role);
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
              name: "transaction-sale-detail",
              params: { code: transactionCode },
              query: { printReceipt: "true" },
            });
          }, 500);
        } else {
          setTimeout(() => {
            router.push({ name: "transactions-sales" });
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
          router.push({ name: "transactions-sales" });
        }, 2000);
      }
      
      // Reset form after payment modal is closed
      form.value = createDefaultForm();
      errors.value = {};
    };

    onMounted(async () => {
      loadCustomers();
      await loadCashierStatus();
      await loadSettings();
      // Initialize tax after settings are loaded
      form.value.tax = calculatedTax.value;
      
      // Load items untuk barcode scanner
      if (!itemStore.items.length) {
        await itemStore.fetchItems();
      }
    });

    return {
      form,
      customers,
      errors,
      loading,
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
      cashierStatus,
      getDiscountHint,
      isDiscountReadonly,
      calculatedTax,
      taxHint,
      handleSubmit,
      resetForm,
      goBack,
      showPaymentModal,
      savedTransactionId,
      handlePaymentSuccess,
      handlePaymentModalClose,
      accessoriesDetailsRef,
      bundlesSectionRef,
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

/* Using global utility classes for form-grid, form-select, error-message */
.form-grid {
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

.form-select.error {
  border-color: #dc2626;
}

.error-message {
  font-size: 0.85rem;
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
  min-width: 0;
  overflow: hidden;
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
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.cashier-total-info {
  font-size: 0.75rem;
  color: #6b7280;
  word-wrap: break-word;
  overflow-wrap: break-word;
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

/* Legacy styles for backward compatibility */
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
