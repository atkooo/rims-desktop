<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Transaksi' : 'Transaksi Baru'"
    :confirm-text="isEdit ? 'Perbarui' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="transaction-form">
      <div v-if="errors.submit" class="form-error">
        {{ errors.submit }}
      </div>

      <section class="form-section">
        <h3>Detail Transaksi</h3>
        <div class="form-grid">
          <div class="field-group">
            <label for="transactionType">Jenis Transaksi</label>
            <select
              v-if="!fixedType"
              id="transactionType"
              v-model="form.transactionType"
              class="form-select"
            >
              <option
                v-for="option in transactionTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <div v-else class="fixed-type">
              <span>{{ fixedTypeLabel }}</span>
              <input type="hidden" v-model="form.transactionType" />
            </div>
          </div>
          <div class="field-group">
            <label for="customerId">
              Customer
              <span v-if="!isRental" class="optional-label">(Opsional)</span>
            </label>
            <select
              id="customerId"
              v-model="form.customerId"
              :class="{ error: errors.customerId }"
              class="form-select"
            >
              <option value="">
                {{ isRental ? "Pilih Customer" : "Tanpa Customer" }}
              </option>
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
        </div>

        <div class="form-grid dates-grid">
          <div class="field-group" v-if="isRental">
            <DatePicker
              id="rentalDate"
              label="Tanggal Sewa"
              v-model="form.rentalDate"
              mode="rental"
              :error="errors.rentalDate"
            />
          </div>
          <div class="field-group" v-if="isRental">
            <DatePicker
              id="plannedReturnDate"
              label="Rencana Kembali"
              v-model="form.plannedReturnDate"
              mode="plannedReturn"
              :min-date="form.rentalDate"
              :error="errors.plannedReturnDate"
            />
          </div>
          <div class="field-group" v-else>
            <DatePicker
              id="saleDate"
              label="Tanggal Penjualan"
              v-model="form.saleDate"
              mode="sale"
              :error="errors.saleDate"
            />
          </div>
        </div>

        <div class="form-grid">
          <div class="field-group">
            <label for="paymentMethod">Metode Pembayaran</label>
            <select
              id="paymentMethod"
              v-model="form.paymentMethod"
              class="form-select"
            >
              <option
                v-for="method in paymentMethods"
                :key="method.value"
                :value="method.value"
              >
                {{ method.label }}
              </option>
            </select>
          </div>
          <div class="field-group">
            <label for="paymentStatus">Status Pembayaran</label>
            <select
              id="paymentStatus"
              v-model="form.paymentStatus"
              class="form-select"
            >
              <option
                v-for="status in paymentStatusOptions"
                :key="status.value"
                :value="status.value"
              >
                {{ status.label }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section class="form-section">
        <h3>Pilih Item</h3>
        <ItemSelector 
          v-model="form.items" 
          :transaction-type="isRental ? 'RENTAL' : 'SALE'" 
        />
        <div v-if="errors.items" class="error-message">
          {{ errors.items }}
        </div>
      </section>

      <section class="form-section">
        <h3>Pilih Paket</h3>
        <BundleSelector 
          v-model="form.bundles" 
          :bundle-type="isRental ? 'rental' : 'sale'"
        />
      </section>

      <section class="form-section" v-if="!isRental">
        <h3>Pilih Aksesoris</h3>
        <AccessorySelector v-model="form.accessories" />
      </section>

      <section class="form-section">
        <h3>Ringkasan</h3>
        <div class="summary-grid">
          <div class="summary-line">
            <span>Total Item</span>
            <strong>{{ totalItems }}</strong>
          </div>
          <div class="summary-line">
            <span>Total Paket</span>
            <strong>{{ bundleCount }}</strong>
          </div>
          <div class="summary-line" v-if="!isRental">
            <span>Total Aksesoris</span>
            <strong>{{ accessoryCount }}</strong>
          </div>
          <div class="summary-line">
            <span>Subtotal</span>
            <strong>{{ formatCurrency(subtotal) }}</strong>
          </div>
          <div class="summary-line" v-if="bundleSubtotal > 0">
            <span>Subtotal Paket</span>
            <strong>{{ formatCurrency(bundleSubtotal) }}</strong>
          </div>
          <div class="summary-line" v-if="!isRental && accessorySubtotal > 0">
            <span>Subtotal Aksesoris</span>
            <strong>{{ formatCurrency(accessorySubtotal) }}</strong>
          </div>
          <div class="summary-line" v-if="isRental">
            <span>Total Hari</span>
            <strong>{{ totalDays }}</strong>
          </div>
          <div class="summary-line" v-if="isRental">
            <span>Deposit</span>
            <strong>{{ formatCurrency(Number(form.deposit) || 0) }}</strong>
          </div>
          <div class="summary-line" v-if="!isRental">
            <span>Diskon</span>
            <strong>{{ formatCurrency(Number(form.discount) || 0) }}</strong>
          </div>
          <div class="summary-line" v-if="!isRental">
            <span>Pajak</span>
            <strong>{{ formatCurrency(Number(form.tax) || 0) }}</strong>
          </div>
          <div class="summary-line total-line">
            <span>Total Bayar</span>
            <strong>{{ formatCurrency(totalAmount) }}</strong>
          </div>
        </div>
      </section>

      <section class="form-section">
        <h3>Detail Pembayaran</h3>
        <div class="form-grid">
          <div class="field-group" v-if="isRental">
            <label for="deposit" class="form-label">Deposit</label>
            <input
              id="deposit"
              :value="formatNumberInput(form.deposit)"
              @input="handleDepositInput"
              type="text"
              class="form-input"
            />
          </div>
          <div class="field-group" v-if="!isRental">
            <label for="discount" class="form-label">Diskon</label>
            <input
              id="discount"
              :value="formatNumberInput(form.discount)"
              @input="handleDiscountInput"
              type="text"
              class="form-input"
              :readonly="isDiscountReadonly"
            />
            <div v-if="getDiscountHint()" class="form-hint">
              {{ getDiscountHint() }}
            </div>
          </div>
          <div class="field-group" v-if="!isRental">
            <label for="tax" class="form-label">Pajak</label>
            <input
              id="tax"
              :value="formatNumberInput(form.tax)"
              @input="handleTaxInput"
              type="text"
              class="form-input"
            />
          </div>
          <div class="field-group">
            <label for="paidAmount" class="form-label">Jumlah Dibayar</label>
            <input
              id="paidAmount"
              :value="formatNumberInput(form.paidAmount)"
              @input="handlePaidAmountInput"
              type="text"
              class="form-input"
            />
          </div>
        </div>
      </section>

      <section class="form-section">
        <h3>Catatan</h3>
        <FormInput
          id="notes"
          label="Catatan"
          type="textarea"
          v-model="form.notes"
        />
      </section>
    </form>
  </AppDialog>
</template>

<script>
import { ref, computed, watch } from "vue";
import { useTransactionStore } from "@/store/transactions";
import { useItemStore } from "@/store/items";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import AccessorySelector from "@/components/modules/accessories/AccessorySelector.vue";
import { fetchCustomers } from "@/services/masterData";
import { getStoredUser } from "@/services/auth";
import { TRANSACTION_TYPE } from "@shared/constants";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { toDateInput } from "@/utils/dateUtils";

const transactionTypeOptions = [
  { value: TRANSACTION_TYPE.RENTAL, label: "Sewa & Pengembalian" },
  { value: TRANSACTION_TYPE.SALE, label: "Penjualan Toko" },
];

const paymentMethods = [
  { value: "cash", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "card", label: "Kartu" },
];

const paymentStatusOptions = [
  { value: "unpaid", label: "Belum Dibayar" },
  { value: "paid", label: "Lunas" },
];

const createDefaultForm = (type = TRANSACTION_TYPE.RENTAL) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    customerId: "",
    transactionType: type,
    rentalDate: toDateInput(today),
    plannedReturnDate: toDateInput(tomorrow),
    saleDate: toDateInput(today),
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    deposit: 0,
    discount: 0,
    tax: 0,
    paidAmount: 0,
    items: [],
    bundles: [],
    accessories: [],
    notes: "",
  };
};

export default {
  name: "TransactionForm",
  components: {
    AppDialog,
    FormInput,
    DatePicker,
    ItemSelector,
    BundleSelector,
    AccessorySelector,
  },
  props: {
    modelValue: Boolean,
    editData: {
      type: Object,
      default: null,
    },
    defaultType: {
      type: String,
      default: TRANSACTION_TYPE.RENTAL,
    },
    fixedType: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "saved"],
  setup(props, { emit }) {
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const loading = ref(false);
    const errors = ref({});
    const defaultType = computed(
      () => props.defaultType || TRANSACTION_TYPE.RENTAL,
    );
    const form = ref(createDefaultForm(defaultType.value));
    const customers = ref([]);

    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const isEdit = computed(() => !!props.editData);
    const isRental = computed(
      () => form.value.transactionType === TRANSACTION_TYPE.RENTAL,
    );

    const totalDays = computed(() => {
      if (!isRental.value) return 1;
      const from = new Date(form.value.rentalDate);
      const to = new Date(form.value.plannedReturnDate);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
      const diffMs = to - from;
      if (diffMs < 0) return 1;
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    });

    // Calculate item price after discount (for sales)
    const calculateItemPrice = (item) => {
      if (isRental.value) {
        return item.rental_price_per_day ?? item.price ?? 0;
      }

      // For sales, use sale_price and apply item discount
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
      const basePrice = isRental.value 
        ? (bundle.rental_price_per_day || 0)
        : (bundle.price || 0);

      // Apply bundle discount if bundle has discount_group
      if (bundle.discount_percentage > 0) {
        return Math.round(basePrice * (1 - bundle.discount_percentage / 100));
      } else if (bundle.discount_amount > 0) {
        return Math.max(0, basePrice - bundle.discount_amount);
      }

      return basePrice;
    };

    const baseSubtotal = computed(() => {
      return form.value.items.reduce((sum, item) => {
        const price = calculateItemPrice(item);
        return sum + price * (item.quantity || 1);
      }, 0);
    });

    const itemSubtotal = computed(() => {
      return baseSubtotal.value * (isRental.value ? totalDays.value : 1);
    });

    const bundleSubtotal = computed(() => {
      const multiplier = isRental.value ? totalDays.value : 1;
      return form.value.bundles.reduce((sum, bundle) => {
        const price = calculateBundlePrice(bundle);
        return sum + price * (bundle.quantity || 0) * multiplier;
      }, 0);
    });

    // Calculate accessory price after discount (for sales)
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

    const accessorySubtotal = computed(() => {
      if (isRental.value) return 0; // Accessories are only for sales
      return form.value.accessories.reduce((sum, accessory) => {
        const price = calculateAccessoryPrice(accessory);
        return sum + price * (accessory.quantity || 1);
      }, 0);
    });

    const subtotal = computed(() => {
      if (!form.value.items.length && !form.value.bundles.length && !form.value.accessories.length) {
        if (isEdit.value) {
          return Number(props.editData?.total_amount ?? 0);
        }
        return 0;
      }
      if (isRental.value) return itemSubtotal.value + bundleSubtotal.value;
      return itemSubtotal.value + bundleSubtotal.value + accessorySubtotal.value;
    });

    const bundleCount = computed(() =>
      form.value.bundles.reduce(
        (sum, bundle) => sum + (bundle.quantity || 0),
        0,
      ),
    );

    const accessoryCount = computed(() =>
      form.value.accessories.reduce(
        (sum, accessory) => sum + (accessory.quantity || 1),
        0,
      ),
    );

    const totalAmount = computed(() => {
      const numericSubtotal = subtotal.value;
      if (isRental.value) {
        return numericSubtotal + (Number(form.value.deposit) || 0);
      }
      return (
        numericSubtotal -
        (Number(form.value.discount) || 0) +
        (Number(form.value.tax) || 0)
      );
    });

    const fixedTypeLabel = computed(() => {
      const option = transactionTypeOptions.find(
        (opt) => opt.value === form.value.transactionType,
      );
      return option ? option.label : "";
    });

    const totalItems = computed(() =>
      form.value.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    );

    const getDiscountHint = () => {
      if (!isRental.value && form.value.customerId) {
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
      if (!isRental.value) {
        return "Diskon diatur dari grup diskon customer (jika ada)";
      }
      return "";
    };

    const isDiscountReadonly = computed(() => {
      // Untuk sale transaction, diskon selalu readonly (hanya dari konfigurasi)
      if (!isRental.value) {
        return true;
      }
      return false;
    });

    const normalizedItems = computed(() => {
      const multiplier = isRental.value ? totalDays.value : 1;
      return form.value.items.map((item) => {
        const price = calculateItemPrice(item);
        return {
          itemId: item.id,
          quantity: item.quantity || 1,
          rentalPrice: isRental.value ? price : 0,
          salePrice: isRental.value ? 0 : price,
          subtotal: price * (item.quantity || 1) * multiplier,
        };
      });
    });

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

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    };

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Create input handlers for number fields
    const handleDepositInput = createInputHandler(
      (value) => (form.value.deposit = value)
    );
    const handleDiscountInput = createInputHandler(
      (value) => (form.value.discount = value)
    );
    const handleTaxInput = createInputHandler(
      (value) => (form.value.tax = value)
    );
    const handlePaidAmountInput = createInputHandler(
      (value) => (form.value.paidAmount = value)
    );

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customer:", error);
      }
    };

    const lastAutoAppliedDiscount = ref(null);

    // Watch for customer changes and auto-apply discount from discount group (for sales only)
    watch(
      () => [form.value.customerId, isRental.value],
      ([customerId, isRental], [oldCustomerId]) => {
        if (!isRental && customerId) {
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
        } else if (!isRental && !customerId) {
          // No customer selected, reset discount to 0
          form.value.discount = 0;
          lastAutoAppliedDiscount.value = null;
        }
      },
    );

    // Also watch subtotal to recalculate percentage-based discounts (for sales only, only if auto-applied)
    watch(
      () => [subtotal.value, isRental.value, form.value.customerId],
      ([newSubtotal, isRental, customerId]) => {
        if (!isRental && customerId && lastAutoAppliedDiscount.value) {
          const customer = customers.value.find((c) => c.id === customerId);
          if (
            customer &&
            customer.discount_group_id &&
            customer.discount_percentage > 0 &&
            lastAutoAppliedDiscount.value.type === "percentage" &&
            lastAutoAppliedDiscount.value.customerId === customerId
          ) {
            // Recalculate percentage discount when subtotal changes (only if it was auto-applied)
            const calculatedDiscount =
              (newSubtotal * customer.discount_percentage) / 100;
            form.value.discount = Math.round(calculatedDiscount);
          }
        } else if (
          !isRental &&
          (!customerId || !lastAutoAppliedDiscount.value)
        ) {
          // If no customer or no auto-applied discount, ensure discount is 0
          form.value.discount = 0;
        }
      },
    );

    const mapEditData = () => {
      if (!props.editData) return createDefaultForm();
      const base = createDefaultForm();
      const type = (
        props.editData.transaction_type ||
        props.editData.transactionType ||
        ""
      )
        .toString()
        .toLowerCase()
        .includes("rental")
        ? TRANSACTION_TYPE.RENTAL
        : TRANSACTION_TYPE.SALE;
      const mapped = {
        ...base,
        ...{
          customerId:
            props.editData.customer_id || props.editData.customerId || "",
          transactionType: type,
          notes: props.editData.notes || "",
          paymentMethod: props.editData.payment_method || base.paymentMethod,
          paymentStatus: props.editData.payment_status || base.paymentStatus,
          deposit: Number(props.editData.deposit ?? 0),
          discount: Number(props.editData.discount ?? 0),
          tax: Number(props.editData.tax ?? 0),
          paidAmount: Number(
            props.editData.paid_amount ?? props.editData.paidAmount ?? 0,
          ),
        },
      };

      if (type === TRANSACTION_TYPE.RENTAL) {
        mapped.rentalDate =
          toDateInput(props.editData.rental_date) || base.rentalDate;
        mapped.plannedReturnDate =
          toDateInput(props.editData.planned_return_date) ||
          base.plannedReturnDate;
      } else {
        mapped.saleDate =
          toDateInput(props.editData.sale_date) || base.saleDate;
      }

      mapped.items = [];
      return mapped;
    };

    const buildEditItems = () => {
      if (!props.editData) return [];
      const itemIds = (props.editData.item_ids || "")
        .toString()
        .split(",")
        .map((value) => Number(value))
        .filter(Boolean);
      const quantities = (props.editData.quantities || "")
        .toString()
        .split(",")
        .map((value) => Number(value))
        .filter(Boolean);

      return itemIds
        .map((id, index) => {
          const item = itemStore.getItemById(id);
          if (!item) return null;
          return {
            ...item,
            quantity: quantities[index] || 1,
          };
        })
        .filter(Boolean);
    };

    const recalculateDiscountForEdit = () => {
      // Recalculate discount if customer has discount_group (for sale transactions in edit mode)
      if (
        !isRental.value &&
        form.value.customerId &&
        customers.value.length > 0
      ) {
        const customer = customers.value.find(
          (c) => c.id === form.value.customerId,
        );
        if (customer && customer.discount_group_id) {
          if (customer.discount_percentage > 0) {
            const calculatedDiscount =
              (subtotal.value * customer.discount_percentage) / 100;
            form.value.discount = Math.round(calculatedDiscount);
            lastAutoAppliedDiscount.value = {
              type: "percentage",
              customerId: form.value.customerId,
            };
          } else if (customer.discount_amount > 0) {
            form.value.discount = customer.discount_amount;
            lastAutoAppliedDiscount.value = {
              type: "amount",
              customerId: form.value.customerId,
            };
          }
        }
      }
    };

    const loadItemsForEdit = () => {
      if (!props.editData) return;
      const ensureItems = itemStore.items.length
        ? Promise.resolve()
        : itemStore.fetchItems();
      ensureItems
        .then(() => {
          form.value.items = buildEditItems();
          // After items are loaded, recalculate discount if customer has discount_group
          // Delay to ensure subtotal is calculated
          setTimeout(() => {
            recalculateDiscountForEdit();
          }, 50);
        })
        .catch((error) => {
          console.error("Gagal memuat item untuk edit transaksi:", error);
        });
    };

    // Watch customers to recalculate discount when customers are loaded (for edit mode)
    watch(
      () => customers.value.length,
      () => {
        if (
          isEdit.value &&
          !isRental.value &&
          form.value.customerId &&
          customers.value.length > 0
        ) {
          // Delay to ensure items are loaded first
          setTimeout(() => {
            recalculateDiscountForEdit();
          }, 100);
        }
      },
    );

    const resetForm = () => {
      form.value = props.editData
        ? mapEditData()
        : createDefaultForm(defaultType.value);
      errors.value = {};
      lastAutoAppliedDiscount.value = null;
    };

    watch(
      () => props.modelValue,
      (visible) => {
        if (visible) {
          resetForm();
          loadCustomers();
          loadItemsForEdit();
          if (!itemStore.items.length) {
            itemStore.fetchItems().catch((error) => {
              console.error("Gagal memuat item:", error);
            });
          }
        }
      },
    );

    watch(
      () => props.defaultType,
      (newType, oldType) => {
        if (newType !== oldType && !isEdit.value && props.modelValue) {
          form.value = createDefaultForm(defaultType.value);
        }
      },
    );

    // Auto-calculate deposit from selected items for rental transactions
    watch(
      () => [form.value.items, isRental.value],
      ([items, isRentalValue]) => {
        if (isRentalValue && !isEdit.value) {
          // Calculate total deposit from all selected items
          // Deposit = sum of (item.deposit * item.quantity) for each item
          const totalDeposit = items.reduce((sum, item) => {
            const itemDeposit = Number(item.deposit ?? 0);
            const quantity = Number(item.quantity ?? 1);
            return sum + (itemDeposit * quantity);
          }, 0);
          form.value.deposit = totalDeposit;
        }
      },
      { deep: true },
    );

    const validateForm = () => {
      const newErrors = {};
      // Customer is required for rental transactions, optional for sales
      if (isRental.value && !form.value.customerId) {
        newErrors.customerId = "Customer harus dipilih";
      }
      if (isRental.value) {
        if (!form.value.rentalDate) {
          newErrors.rentalDate = "Tanggal sewa harus diisi";
        }
        if (!form.value.plannedReturnDate) {
          newErrors.plannedReturnDate = "Tanggal kembali harus diisi";
        }
        if (
          form.value.rentalDate &&
          form.value.plannedReturnDate &&
          new Date(form.value.rentalDate) >
            new Date(form.value.plannedReturnDate)
        ) {
          newErrors.plannedReturnDate =
            "Tanggal kembali harus sama atau setelah tanggal sewa";
        }
      } else if (!form.value.saleDate) {
        newErrors.saleDate = "Tanggal penjualan harus diisi";
      }
      if (
        !isEdit.value &&
        form.value.items.length === 0 &&
        form.value.bundles.length === 0 &&
        (!isRental.value && form.value.accessories.length === 0)
      ) {
        newErrors.items = isRental.value 
          ? "Pilih minimal 1 item atau paket"
          : "Pilih minimal 1 item, paket, atau aksesoris";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      
      // Cek payment status jika edit mode
      if (isEdit.value && props.editData) {
        const paymentStatus = (
          props.editData.payment_status ||
          props.editData.paymentStatus ||
          ""
        )
          .toString()
          .toLowerCase();
        
        if (paymentStatus === "paid") {
          alert("Transaksi yang sudah dibayar tidak dapat di-edit.");
          return;
        }
      }
      
      loading.value = true;
      try {
        const user = getStoredUser();
        const transactionDate = isRental.value
          ? form.value.rentalDate
          : form.value.saleDate;

        if (isEdit.value && props.editData) {
          const payload = {
            customerId: form.value.customerId || null,
            notes: form.value.notes,
            totalAmount:
              Number(totalAmount.value) ||
              Number(props.editData.total_amount ?? 0),
            transactionDate,
          };
          if (isRental.value) {
            payload.rentalDate = form.value.rentalDate;
            payload.plannedReturnDate = form.value.plannedReturnDate;
          } else {
            payload.saleDate = form.value.saleDate;
          }
          await transactionStore.updateTransaction(props.editData.id, payload);
        } else {
          const basePayload = {
            type: form.value.transactionType,
            customerId: form.value.customerId || null,
            userId: user?.id || 1,
            notes: form.value.notes,
            totalAmount: Number(totalAmount.value),
            transactionDate,
            items: normalizedItems.value,
          };
          if (isRental.value) {
            await transactionStore.createTransaction({
              ...basePayload,
              rentalDate: form.value.rentalDate,
              plannedReturnDate: form.value.plannedReturnDate,
              totalDays: totalDays.value,
              subtotal: subtotal.value,
              deposit: Number(form.value.deposit) || 0,
              bundles: normalizedBundles.value,
            });
          } else {
            await transactionStore.createTransaction({
              ...basePayload,
              saleDate: form.value.saleDate,
              subtotal: subtotal.value,
              discount: Number(form.value.discount) || 0,
              tax: Number(form.value.tax) || 0,
              bundles: normalizedBundles.value,
              accessories: normalizedAccessories.value,
            });
          }
        }
        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving transaction:", error);
        errors.value.submit = error?.message || "Gagal menyimpan transaksi";
      } finally {
        loading.value = false;
      }
    };

    return {
      form,
      errors,
      loading,
      showDialog,
      isEdit,
      transactionTypeOptions,
      paymentMethods,
      paymentStatusOptions,
      customers,
      isRental,
      subtotal,
      totalAmount,
      totalDays,
      totalItems,
      bundleSubtotal,
      bundleCount,
      accessorySubtotal,
      accessoryCount,
      fixedTypeLabel,
      formatCurrency,
      formatNumberInput,
      handleDepositInput,
      handleDiscountInput,
      handleTaxInput,
      handlePaidAmountInput,
      getDiscountHint,
      isDiscountReadonly,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
.form-error {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.transaction-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1.25rem;
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.dates-grid {
  align-items: flex-end;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background-color: white;
  font-size: 1rem;
}

.form-select.error {
  border-color: #dc2626;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.summary-line {
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: #4b5563;
}

.summary-line strong {
  color: #111827;
}

.summary-line.total-line {
  background: linear-gradient(135deg, #4338ca, #6366f1);
  color: #fff;
}

.summary-line.total-line strong {
  color: #fff;
}

.payment-section .form-grid {
  margin-top: 0.5rem;
}

.error-message {
  color: #dc2626;
  font-size: 0.85rem;
}

.optional-label {
  color: #6b7280;
  font-weight: normal;
  font-size: 0.85em;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input[readonly] {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
  border-color: #d1d5db;
}

.form-hint {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
