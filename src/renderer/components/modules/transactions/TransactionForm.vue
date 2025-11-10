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
            <label for="customerId">Customer</label>
            <select
              id="customerId"
              v-model="form.customerId"
              :class="{ error: errors.customerId }"
              class="form-select"
            >
              <option value="">Pilih Customer</option>
              <option
                v-for="customer in customers"
                :key="customer.id"
                :value="customer.id"
              >
                {{ customer.name }} {{ customer.code ? `(${customer.code})` : "" }}
              </option>
            </select>
            <div v-if="errors.customerId" class="error-message">
              {{ errors.customerId }}
            </div>
          </div>
        </div>

        <div class="form-grid dates-grid">
          <div class="field-group" v-if="isRental">
            <FormInput
              id="rentalDate"
              label="Tanggal Sewa"
              type="date"
              v-model="form.rentalDate"
              :error="errors.rentalDate"
            />
          </div>
          <div class="field-group" v-if="isRental">
            <FormInput
              id="plannedReturnDate"
              label="Rencana Kembali"
              type="date"
              v-model="form.plannedReturnDate"
              :error="errors.plannedReturnDate"
            />
          </div>
          <div class="field-group" v-else>
            <FormInput
              id="saleDate"
              label="Tanggal Penjualan"
              type="date"
              v-model="form.saleDate"
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
      <ItemSelector v-model="form.items" />
      <div v-if="errors.items" class="error-message">
        {{ errors.items }}
      </div>
    </section>

    <section class="form-section" v-if="!isRental">
      <h3>Pilih Paket</h3>
      <BundleSelector v-model="form.bundles" />
    </section>

      <section class="form-section">
        <h3>Ringkasan</h3>
        <div class="summary-grid">
        <div class="summary-line">
          <span>Total Item</span>
          <strong>{{ totalItems }}</strong>
        </div>
        <div class="summary-line" v-if="!isRental">
          <span>Total Paket</span>
          <strong>{{ bundleCount }}</strong>
        </div>
        <div class="summary-line">
          <span>Subtotal</span>
          <strong>{{ formatCurrency(subtotal) }}</strong>
        </div>
        <div
          class="summary-line"
          v-if="!isRental && bundleSubtotal > 0"
        >
          <span>Subtotal Paket</span>
          <strong>{{ formatCurrency(bundleSubtotal) }}</strong>
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
            <FormInput
              id="deposit"
              label="Deposit"
              type="number"
              min="0"
              v-model.number="form.deposit"
            />
          </div>
          <div class="field-group" v-if="!isRental">
            <FormInput
              id="discount"
              label="Diskon"
              type="number"
              min="0"
              v-model.number="form.discount"
            />
          </div>
          <div class="field-group" v-if="!isRental">
            <FormInput
              id="tax"
              label="Pajak"
              type="number"
              min="0"
              v-model.number="form.tax"
            />
          </div>
          <div class="field-group">
            <FormInput
              id="paidAmount"
              label="Jumlah Dibayar"
              type="number"
              min="0"
              v-model.number="form.paidAmount"
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
import ItemSelector from "@/components/modules/items/ItemSelector.vue";
import BundleSelector from "@/components/modules/bundles/BundleSelector.vue";
import { fetchCustomers } from "@/services/masterData";
import { getStoredUser } from "@/services/auth";
import { TRANSACTION_TYPE } from "@shared/constants";

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
  { value: "partial", label: "Pembayaran Parsial" },
  { value: "paid", label: "Lunas" },
];

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

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
      notes: "",
    };
};

export default {
  name: "TransactionForm",
  components: {
    AppDialog,
    FormInput,
    ItemSelector,
    BundleSelector,
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

    const baseSubtotal = computed(() => {
      return form.value.items.reduce((sum, item) => {
        const price =
          isRental.value
            ? item.rental_price_per_day ?? item.price ?? 0
            : item.sale_price ?? item.price ?? 0;
        return sum + price * (item.quantity || 1);
      }, 0);
    });

    const itemSubtotal = computed(() => {
      return baseSubtotal.value * (isRental.value ? totalDays.value : 1);
    });

    const bundleSubtotal = computed(() => {
      return form.value.bundles.reduce((sum, bundle) => {
        return sum + (Number(bundle.price) || 0) * (bundle.quantity || 0);
      }, 0);
    });

    const subtotal = computed(() => {
      if (!form.value.items.length && !form.value.bundles.length) {
        if (isEdit.value) {
          return Number(props.editData?.total_amount ?? 0);
        }
        return 0;
      }
      if (isRental.value) return itemSubtotal.value;
      return itemSubtotal.value + bundleSubtotal.value;
    });

    const bundleCount = computed(() =>
      form.value.bundles.reduce((sum, bundle) => sum + (bundle.quantity || 0), 0),
    );

    const totalAmount = computed(() => {
      const numericSubtotal = subtotal.value;
      if (isRental.value) {
        return (
          numericSubtotal + (Number(form.value.deposit) || 0)
        );
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

    const normalizedItems = computed(() => {
      const multiplier = isRental.value ? totalDays.value : 1;
      return form.value.items.map((item) => {
        const basePrice =
          isRental.value
            ? item.rental_price_per_day ?? item.price ?? 0
            : item.sale_price ?? item.price ?? 0;
        return {
          itemId: item.id,
          quantity: item.quantity || 1,
          rentalPrice: isRental.value ? basePrice : 0,
          salePrice: isRental.value ? 0 : basePrice,
          subtotal: basePrice * (item.quantity || 1) * multiplier,
        };
      });
    });

    const normalizedBundles = computed(() =>
      form.value.bundles.map((bundle) => ({
        bundleId: bundle.id,
        quantity: Math.max(1, Number(bundle.quantity) || 1),
      })),
    );

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    };

    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customer:", error);
      }
    };

    const mapEditData = () => {
      if (!props.editData) return createDefaultForm();
      const base = createDefaultForm();
      const type =
        (props.editData.transaction_type || props.editData.transactionType || "")
          .toString()
          .toLowerCase()
          .includes("rental")
          ? TRANSACTION_TYPE.RENTAL
          : TRANSACTION_TYPE.SALE;
      const mapped = {
        ...base,
        ...{
          customerId: props.editData.customer_id || props.editData.customerId || "",
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
        mapped.rentalDate = toDateInput(props.editData.rental_date) || base.rentalDate;
        mapped.plannedReturnDate =
          toDateInput(props.editData.planned_return_date) || base.plannedReturnDate;
      } else {
        mapped.saleDate = toDateInput(props.editData.sale_date) || base.saleDate;
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

    const loadItemsForEdit = () => {
      if (!props.editData) return;
      const ensureItems = itemStore.items.length
        ? Promise.resolve()
        : itemStore.fetchItems();
      ensureItems
        .then(() => {
          form.value.items = buildEditItems();
        })
        .catch((error) => {
          console.error("Gagal memuat item untuk edit transaksi:", error);
        });
    };

    const resetForm = () => {
      form.value = props.editData
        ? mapEditData()
        : createDefaultForm(defaultType.value);
      errors.value = {};
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

    const validateForm = () => {
      const newErrors = {};
      if (!form.value.customerId) {
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
          new Date(form.value.rentalDate) > new Date(form.value.plannedReturnDate)
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
        form.value.bundles.length === 0
      ) {
        newErrors.items = "Pilih minimal 1 item atau paket";
      }
      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
      try {
        const user = getStoredUser();
        const transactionDate = isRental.value
          ? form.value.rentalDate
          : form.value.saleDate;

        if (isEdit.value && props.editData) {
          const payload = {
            customerId: form.value.customerId,
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
            customerId: form.value.customerId,
            userId: user?.id || 1,
            paymentMethod: form.value.paymentMethod,
            paymentStatus: form.value.paymentStatus,
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
              paidAmount: Number(form.value.paidAmount) || 0,
            });
          } else {
            await transactionStore.createTransaction({
              ...basePayload,
              saleDate: form.value.saleDate,
              subtotal: subtotal.value,
              discount: Number(form.value.discount) || 0,
              tax: Number(form.value.tax) || 0,
              paidAmount:
                Number(form.value.paidAmount) || Number(totalAmount.value),
              bundles: normalizedBundles.value,
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
      fixedTypeLabel,
      formatCurrency,
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
</style>
