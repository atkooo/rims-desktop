<template>
  <div class="cashier-sale-page">
    <div class="cashier-main">
      <!-- Left: Items Table -->
      <div class="cashier-items-section">
        <!-- Customer & Date -->
        <div class="cashier-form-row">
          <div class="cashier-form-field">
            <label>Customer:</label>
            <CustomerSelector v-model="form.customerId" placeholder="Tanpa Customer" :allow-clear="true"
              class="cashier-select" />
          </div>
          <div class="cashier-form-field">
            <label>Tanggal:</label>
            <DatePicker id="saleDate" v-model="form.saleDate" mode="sale" class="cashier-date" />
          </div>
        </div>

        <!-- Unified Product Table -->
        <div class="cashier-table-section unified-section">
          <div class="unified-header">
            <div>
              <h3>Daftar Produk</h3>
              <p class="unified-description">
                Item, paket, dan aksesoris tampil dalam satu tabel yang bisa difilter berdasarkan tipe.
              </p>
            </div>
            <div class="picker-actions">
              <button class="picker-btn" @click="openItemPicker">+ Item</button>
              <button class="picker-btn" @click="openBundlePicker">+ Paket</button>
              <button class="picker-btn" @click="openAccessoryPicker">+ Aksesoris</button>
            </div>
          </div>

          <div class="line-filter">
            <button v-for="option in lineFilterOptions" :key="option.value" class="line-filter-btn"
              :class="{ active: lineFilter === option.value }" @click="setLineFilter(option.value)">
              {{ option.label }}
            </button>
          </div>

          <div v-if="filteredLines.length" class="line-table-wrapper">
            <table class="line-table">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Kode</th>
                  <th>Nama Produk</th>
                  <th>Harga Satuan</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in filteredLines" :key="`${line.type}-${line.id}`">
                  <td class="type-cell">{{ line.typeLabel }}</td>
                  <td class="code-cell">{{ line.code || "-" }}</td>
                  <td class="name-cell">
                    <strong>{{ line.name }}</strong>
                    <div v-if="line.discountLabel" class="discount-badge">
                      {{ line.discountLabel }}
                    </div>
                  </td>
                  <td class="price-cell">{{ formatCurrency(line.price) }}</td>
                  <td class="quantity-cell">
                    <input type="number" :value="line.quantity" min="1" :max="line.maxQty || undefined"
                      class="quantity-input" @input="updateLineQuantity(line, $event.target.value)" />
                  </td>
                  <td class="subtotal-cell">{{ formatCurrency(line.subtotal) }}</td>
                  <td class="action-cell">
    <button class="remove-btn" @click="removeLine(line)" title="Hapus">
      <Icon name="trash-2" :size="16" />
    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-lines">
            <p>Tidak ada produk yang dipilih. Tambahkan item, paket, atau aksesoris untuk memulai.</p>
          </div>

          <details class="cashier-details">
            <summary>Catatan</summary>
            <div class="details-content">
              <div class="input-group">
                <!-- <label>Catatan</label> -->
                <textarea v-model="form.notes" class="cashier-textarea" rows="2"
                  placeholder="Catatan khusus..."></textarea>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- Right: Total & Actions -->
      <div class="cashier-summary-section">
        <!-- Large Total Display -->
        <div class="cashier-total-display">
          <div class="total-label">TOTAL</div>
          <div class="total-amount">{{ formatCurrency(totalAmount) }}</div>
          <div class="total-info">
            {{ totalItems }} item{{ totalBundles > 0 ? ` • ${totalBundles} paket` : '' }}{{ totalAccessories > 0 ? ` •
            ${totalAccessories} aksesoris` : '' }}
          </div>
        </div>

        <!-- Breakdown -->
        <div class="cashier-breakdown">
          <div class="breakdown-row">
            <span>Subtotal:</span>
            <span>{{ formatCurrency(baseSubtotal) }}</span>
          </div>
          <div v-if="bundleSubtotal > 0" class="breakdown-row">
            <span>Paket:</span>
            <span>{{ formatCurrency(bundleSubtotal) }}</span>
          </div>
          <div v-if="accessorySubtotal > 0" class="breakdown-row">
            <span>Aksesoris:</span>
            <span>{{ formatCurrency(accessorySubtotal) }}</span>
          </div>
          <div v-if="Number(form.discount) > 0" class="breakdown-row discount">
            <span>Diskon:</span>
            <span>- {{ formatCurrency(Number(form.discount) || 0) }}</span>
          </div>
          <div v-if="calculatedTax > 0" class="breakdown-row tax">
            <span>Pajak:</span>
            <span>+ {{ formatCurrency(calculatedTax) }}</span>
          </div>
        </div>

        <!-- Discount & Tax Inputs -->
        <div class="cashier-inputs">
          <div class="input-group">
            <label>Diskon</label>
            <input type="text" :value="formatNumberInput(form.discount)" class="cashier-input" readonly />
            <p class="cashier-input-hint">{{ discountHint }}</p>
          </div>
          <div class="input-group">
            <label>
              Pajak
              <span v-if="taxPercentage > 0" class="cashier-input-label-note">
                ({{ taxRateLabel }})
              </span>
            </label>
            <input type="text" :value="formatNumberInput(form.tax)" class="cashier-input" readonly />
            <p v-if="taxPercentage > 0" class="cashier-input-hint cashier-tax-hint">
              Tarif pajak {{ taxRateLabel }} diterapkan pada subtotal setelah diskon.
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="cashier-actions">
          <button class="cashier-btn-reset" @click="resetForm" :disabled="loading">
            Reset
          </button>
          <button class="cashier-btn-submit" @click="handleSubmit" :disabled="loading || totalAmount <= 0">
            {{ loading ? 'Menyimpan...' : 'Simpan Penjualan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <ItemPickerDialog v-model="itemPickerOpen" :excluded-ids="form.items.map((it) => it.id)" transaction-type="SALE"
      :restrict-stock="true" @select="addItem" />

    <BundlePickerDialog v-model="bundlePickerOpen" :excluded-ids="form.bundles.map((b) => b.id)" bundle-type="sale"
      :restrict-stock="true" @select="addBundle" />

    <AccessoryPickerDialog v-model="accessoryPickerOpen" :excluded-ids="form.accessories.map((a) => a.id)"
      :restrict-stock="true" @select="addAccessory" />

    <PaymentModal v-model="showPaymentModal" :transaction-id="savedTransactionId"
      @payment-success="handlePaymentSuccess" @close="handlePaymentModalClose" />

    <!-- Receipt Preview Dialog -->
    <ReceiptPreviewDialog v-model="showReceiptPreview" :transaction-id="savedTransactionId" transaction-type="sale"
      @printed="handleReceiptPrinted" />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import DatePicker from "@/components/ui/DatePicker.vue";
import CustomerSelector from "@/components/modules/customers/CustomerSelector.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import BundlePickerDialog from "@/components/modules/bundles/BundlePickerDialog.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import ReceiptPreviewDialog from "@/components/ui/ReceiptPreviewDialog.vue";
import AccessoryPickerDialog from "@/components/modules/accessories/AccessoryPickerDialog.vue";
import { fetchCustomers, fetchAccessoryByCode, fetchBundleByCode } from "@/services/masterData";
import { getStoredUser } from "@/services/auth";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";
import { ipcRenderer } from "@/services/ipc";
import { useNotification } from "@/composables/useNotification";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useBarcodeScanner } from "@/composables/useBarcodeScanner";
import { useItemStore } from "@/store/items";
import { toDateInput } from "@/utils/dateUtils";
import { useCashierSale } from "@/composables/cashier/useCashierSale";

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
  name: "CashierSalePage",
  components: {
    DatePicker,
    CustomerSelector,
    Icon,
    ItemPickerDialog,
    BundlePickerDialog,
    AccessoryPickerDialog,
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
    const accessoryPickerOpen = ref(false);
    const formKey = ref(0);

    const {
      baseSubtotal,
      bundleSubtotal,
      accessorySubtotal,
      subtotal,
      totalAmount,
      totalItems,
      totalBundles,
      totalAccessories,
      normalizedItems,
      normalizedBundles,
      normalizedAccessories,
      calculateItemPrice,
      calculateBundlePrice,
      calculateAccessoryPrice,
    } = useCashierSale(form);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value || 0);

    const calculatedTax = computed(() => {
      if (taxPercentage.value > 0 && subtotal.value > 0) {
        const amountAfterDiscount = subtotal.value - (Number(form.value.discount) || 0);
        return Math.round((amountAfterDiscount * taxPercentage.value) / 100);
      }
      return 0;
    });

    const { formatNumberInput } = useNumberFormat();
    const taxRateLabel = computed(() => `${taxPercentage.value || 0}%`);
    const lineFilter = ref("all");
    const lineFilterOptions = [
      { label: "Semua", value: "all" },
      { label: "Item", value: "item" },
      { label: "Paket", value: "bundle" },
      { label: "Aksesoris", value: "accessory" },
    ];

    const typeLabels = {
      item: "Item",
      bundle: "Paket",
      accessory: "Aksesoris",
    };

    const formatDiscountLabel = (entry) => {
      if (entry.discount_percentage > 0) {
        return `Diskon ${entry.discount_percentage}%`;
      }
      if (entry.discount_amount > 0) {
        return `Diskon ${formatCurrency(entry.discount_amount)}`;
      }
      return null;
    };

    const assembleLine = (type, entry, price, quantity, codeLabel) => ({
      id: entry.id,
      type,
      typeLabel: typeLabels[type] || type,
      name: entry.name,
      code: codeLabel,
      price,
      quantity,
      subtotal: price * quantity,
      maxQty: entry.available_quantity || 0,
      discountLabel: formatDiscountLabel(entry),
    });

    const lines = computed(() => {
      const itemLines = form.value.items.map((item) => {
        const quantity = item.quantity || 1;
        const price = calculateItemPrice(item);
        return assembleLine("item", item, price, quantity, item.code);
      });
      const bundleLines = form.value.bundles.map((bundle) => {
        const quantity = bundle.quantity || 1;
        const price = calculateBundlePrice(bundle);
        return assembleLine("bundle", bundle, price, quantity, bundle.code);
      });
      const accessoryLines = form.value.accessories.map((accessory) => {
        const quantity = accessory.quantity || 1;
        const price = calculateAccessoryPrice(accessory);
        return assembleLine("accessory", accessory, price, quantity, accessory.code);
      });
      return [...itemLines, ...bundleLines, ...accessoryLines];
    });

    const filteredLines = computed(() => {
      if (lineFilter.value === "all") return lines.value;
      return lines.value.filter((line) => line.type === lineFilter.value);
    });

    const setLineFilter = (value) => {
      lineFilter.value = value;
    };

    const getLineArray = (type) => {
      if (type === "item") return form.value.items;
      if (type === "bundle") return form.value.bundles;
      return form.value.accessories;
    };

    const updateLineQuantity = (line, rawValue) => {
      const array = getLineArray(line.type);
      const target = array.find((entry) => entry.id === line.id);
      if (!target) return;
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed)) return;
      const entered = Math.max(1, Math.floor(parsed));
      const clampMax = line.maxQty > 0 ? line.maxQty : undefined;
      target.quantity = clampMax ? Math.min(entered, clampMax) : entered;
    };

    const removeLine = (line) => {
      const array = getLineArray(line.type);
      const index = array.findIndex((entry) => entry.id === line.id);
      if (index !== -1) {
        array.splice(index, 1);
      }
    };

    const selectedCustomerId = computed(() => {
      const parsed = Number(form.value.customerId);
      return parsed > 0 ? parsed : null;
    });

    const selectedCustomer = computed(() => {
      const id = selectedCustomerId.value;
      if (!id) return null;
      return (
        customers.value.find((customer) => Number(customer.id) === id) || null
      );
    });

    const lastAutoDiscount = ref(null);

    const applyCustomerDiscount = () => {
      const customer = selectedCustomer.value;
      if (!customer || !customer.discount_group_id) {
        form.value.discount = 0;
        lastAutoDiscount.value = null;
        return;
      }

      const percentage = Number(customer.discount_percentage) || 0;
      const amount = Number(customer.discount_amount) || 0;

      if (percentage > 0) {
        const calculated = Math.max(
          0,
          Math.round((subtotal.value * percentage) / 100),
        );
        form.value.discount = calculated;
        lastAutoDiscount.value = {
          type: "percentage",
          customerId: customer.id,
        };
      } else if (amount > 0) {
        form.value.discount = Math.max(0, amount);
        lastAutoDiscount.value = {
          type: "amount",
          customerId: customer.id,
        };
      } else {
        form.value.discount = 0;
        lastAutoDiscount.value = {
          type: "none",
          customerId: customer.id,
        };
      }
    };

    const discountHint = computed(() => {
      const customer = selectedCustomer.value;
      if (customer && customer.discount_group_name) {
        const percentage = Number(customer.discount_percentage) || 0;
        const amount = Number(customer.discount_amount) || 0;
        if (percentage > 0) {
          return `Diskon otomatis dari grup ${customer.discount_group_name} (${percentage}%)`;
        }
        if (amount > 0) {
          return `Diskon otomatis dari grup ${customer.discount_group_name} (${formatCurrency(amount)})`;
        }
        return `Grup diskon ${customer.discount_group_name} belum memiliki potongan aktif.`;
      }
      return "Diskon diatur otomatis berdasarkan grup diskon customer (jika ada).";
    });

    // Barcode scanner - supports item, accessory, and bundle
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

        // 2. Jika tidak ditemukan di items, cari di accessories
        let accessory = null;
        try {
          accessory = await fetchAccessoryByCode(barcode);
        } catch (accessoryError) {
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
            form.value.accessories[existingAccessoryIndex].quantity =
              (form.value.accessories[existingAccessoryIndex].quantity || 1) + 1;
          } else {
            form.value.accessories.push({
              ...accessory,
              quantity: 1,
            });
          }
          showSuccess(`Aksesoris "${accessory.name}" berhasil ditambahkan`);
          return;
        }

        // 3. Jika tidak ditemukan di accessories, cari di bundles
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

          // Cek apakah bundle sesuai untuk transaksi sale
          if (bundle.bundle_type !== "sale" && bundle.bundle_type !== "both") {
            showError(`Paket "${bundle.name}" tidak tersedia untuk dijual`);
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
        showError(`Kode "${barcode}" tidak ditemukan (item, aksesoris, atau paket)`);
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

    const openAccessoryPicker = () => {
      accessoryPickerOpen.value = true;
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

    const addAccessory = (accessory) => {
      const existingIndex = form.value.accessories.findIndex((a) => a.id === accessory.id);
      if (existingIndex >= 0) {
        form.value.accessories[existingIndex].quantity += 1;
      } else {
        form.value.accessories.push({ ...accessory, quantity: 1 });
      }
    };

    const resetForm = () => {
      // Create completely new form object with new array references
      form.value = createDefaultForm();
      // Force Vue reactivity by creating new arrays
      form.value.items = [];
      form.value.bundles = [];
      form.value.accessories = [];
      // Increment key to force re-render of child components
      formKey.value += 1;
    };

    const handleSubmit = async () => {
      if (form.value.items.length === 0 && form.value.bundles.length === 0 && form.value.accessories.length === 0) {
        showError("Pilih minimal 1 item, paket, atau aksesoris");
        return;
      }
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
          tax: Number(form.value.tax) || 0,
          items: normalizedItems.value,
          bundles: normalizedBundles.value,
          accessories: normalizedAccessories.value,
        });

        if (newTransaction && newTransaction.id) {
          savedTransactionId.value = newTransaction.id;
          showPaymentModal.value = true;
        } else {
          showSuccess("Penjualan berhasil disimpan.");
          resetForm();
        }
      } catch (error) {
        showError(error);
      } finally {
        loading.value = false;
      }
    };

    const handlePaymentSuccess = (data) => {
      if (!data.partial) {
        showSuccess("Pembayaran berhasil! Transaksi telah dilunasi.");
        showPaymentModal.value = false;
        // Keep transaction ID for receipt preview
        // Don't reset form yet, wait until receipt is printed/closed
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

    watch(
      () => form.value.customerId,
      () => {
        applyCustomerDiscount();
      },
      { immediate: true },
    );

    watch(
      () => subtotal.value,
      () => {
        if (
          lastAutoDiscount.value &&
          lastAutoDiscount.value.type === "percentage" &&
          Number(form.value.customerId) === lastAutoDiscount.value.customerId
        ) {
          applyCustomerDiscount();
        }
      },
    );

    watch(
      () => customers.value.length,
      (length) => {
        if (length > 0) {
          applyCustomerDiscount();
        }
      },
    );

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
        applyCustomerDiscount();
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
      [() => subtotal.value, () => form.value.discount, () => taxPercentage.value],
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
      discountHint,
      taxPercentage,
      taxRateLabel,
      lineFilter,
      lineFilterOptions,
      filteredLines,
      updateLineQuantity,
      removeLine,
      setLineFilter,
      totalAmount,
      baseSubtotal,
      bundleSubtotal,
      accessorySubtotal,
      totalItems,
      totalBundles,
      totalAccessories,
      calculatedTax,
      openItemPicker,
      openBundlePicker,
      openAccessoryPicker,
      addItem,
      addBundle,
      addAccessory,
      resetForm,
      handleSubmit,
      itemPickerOpen,
      bundlePickerOpen,
      accessoryPickerOpen,
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
.cashier-sale-page {
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
}

.cashier-form-field {
  flex: 1;
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

.unified-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.25rem;
  background: white;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.05);
}

.unified-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.unified-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
}

.picker-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.picker-btn {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 0.85rem;
  background: #fff;
  color: #1f2937;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.picker-btn:hover {
  border-color: #4338ca;
  color: #4338ca;
}

.line-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.line-filter-btn {
  border: 1px solid #e5e7eb;
  background: transparent;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
}

.line-filter-btn.active {
  border-color: #4338ca;
  background: #4338ca;
  color: #fff;
}

.line-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.line-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 780px;
}

.line-table th,
.line-table td {
  padding: 0.65rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}

.line-table th {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: #374151;
}

.line-table tbody tr:hover {
  background: #f8fafc;
}

.line-table .type-cell {
  font-size: 0.85rem;
  color: #6b7280;
}

.line-table .code-cell {
  font-family: monospace;
  color: #6b7280;
}

.line-table .name-cell strong {
  display: block;
  color: #111827;
}

.line-table .price-cell,
.line-table .subtotal-cell {
  font-weight: 600;
  color: #111827;
  text-align: right;
  min-width: 120px;
}

.line-table .quantity-cell {
  width: 120px;
}

.line-table .quantity-input {
  width: 70px;
  padding: 0.35rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  text-align: center;
}

.remove-btn {
  border: none;
  background: transparent;
  color: #dc2626;
  font-weight: 600;
  cursor: pointer;
}

.empty-lines {
  padding: 1.5rem;
  text-align: center;
  color: #6b7280;
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

.breakdown-row.discount span:last-child {
  color: #16a34a;
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

.cashier-input-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.cashier-input-label-note {
  font-size: 0.75rem;
  color: #6c63ff;
  margin-left: 0.35rem;
}

.cashier-tax-hint {
  margin-top: 0.2rem;
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
