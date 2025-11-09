<template>
    <AppDialog
      v-model="showDialog"
      :title="isEdit ? 'Edit Pembayaran' : 'Pembayaran Baru'"
      :confirm-text="isEdit ? 'Update' : 'Simpan'"
      :loading="loading"
      @confirm="handleSubmit"
    >
    <form @submit.prevent="handleSubmit" class="payment-form">
      <!-- Transaction Reference -->
      <div class="form-section">
        <h3>Referensi Transaksi</h3>
        <select
          v-model="form.transactionType"
          class="form-select"
          :class="{ error: errors.transactionType }"
          required
        >
          <option value="">Pilih Tipe Transaksi</option>
          <option value="rental">Rental</option>
          <option value="sale">Sale</option>
        </select>
        <div v-if="errors.transactionType" class="error-message">
          {{ errors.transactionType }}
        </div>
        <div class="reference-row">
          <FormInput
            id="transactionId"
            label="ID Transaksi"
            :value="selectedTransactionLabel"
            :error="errors.transactionId"
            placeholder="Pilih transaksi dari daftar"
            readonly
            class="reference-input"
          />
          <AppButton variant="secondary" class="picker-button" @click="openPicker">
            Cari Transaksi
          </AppButton>
        </div>
        <input type="hidden" v-model.number="form.transactionId" />
      </div>

      <!-- Payment Details -->
      <div class="form-section">
        <h3>Detail Pembayaran</h3>
        <div class="payment-grid">
          <FormInput
            id="amount"
            label="Jumlah Pembayaran"
            type="number"
            v-model.number="form.amount"
            :error="errors.amount"
            required
            min="1"
          />
          <FormInput
            id="paymentDate"
            label="Tanggal Pembayaran"
            type="datetime-local"
            v-model="form.paymentDate"
            :error="errors.paymentDate"
            required
          />
        </div>
        <select
          v-model="form.paymentMethod"
          class="form-select"
          :class="{ error: errors.paymentMethod }"
          required
        >
          <option value="">Pilih Metode</option>
          <option value="cash">Cash</option>
          <option value="transfer">Transfer</option>
          <option value="card">Card</option>
        </select>
        <div v-if="errors.paymentMethod" class="error-message">
          {{ errors.paymentMethod }}
        </div>
        <FormInput
          id="referenceNumber"
          label="No Referensi"
          v-model="form.referenceNumber"
          :error="errors.referenceNumber"
          placeholder="No rekening/transaksi (opsional)"
        />
      </div>

      <!-- Notes -->
      <div class="form-section">
        <FormInput
          id="notes"
          label="Catatan"
          v-model="form.notes"
          type="textarea"
        />
      </div>
    </form>
  </AppDialog>
  <TransactionPickerDialog
    v-model="pickerOpen"
    @select="handleTransactionSelect"
  />
</template>

<script>
import { ref, computed, watch } from "vue";
import { getStoredUser } from "@/services/auth";
import { createPayment, updatePayment } from "@/services/transactions";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import AppButton from "@/components/ui/AppButton.vue";
import TransactionPickerDialog from "@/components/modules/payments/TransactionPickerDialog.vue";

export default {
  name: "PaymentForm",
  components: {
    AppDialog,
    FormInput,
    AppButton,
    TransactionPickerDialog,
  },

  props: {
    modelValue: Boolean,
    editData: {
      type: Object,
      default: null,
    },
  },

  emits: ["update:modelValue", "saved"],

  setup(props, { emit }) {
    const loading = ref(false);
    const errors = ref({});
    const pickerOpen = ref(false);
    const selectedTransaction = ref(null);

    // Form state
    const form = ref({
      transactionType: "",
      transactionId: "",
      amount: 0,
      paymentDate: new Date().toISOString().slice(0, 16),
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
    });

    // Computed
    const isEdit = computed(() => !!props.editData);
    const selectedTransactionLabel = computed(() => {
      if (!selectedTransaction.value) return "";
      const code =
        selectedTransaction.value.transaction_code ||
        selectedTransaction.value.transactionCode ||
        selectedTransaction.value.id;
      const customer =
        selectedTransaction.value.customer_name ||
        selectedTransaction.value.customerName ||
        "Unknown";
      return `${code} • ${customer}`;
    });
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    // Methods
    const validateForm = () => {
      const newErrors = {};

      if (!form.value.transactionType) {
        newErrors.transactionType = "Tipe transaksi harus dipilih";
      }

      if (!form.value.transactionId || form.value.transactionId < 1) {
        newErrors.transactionId = "ID transaksi harus diisi";
      }

      if (!form.value.amount || form.value.amount < 1) {
        newErrors.amount = "Jumlah pembayaran harus diisi";
      }

      if (!form.value.paymentDate) {
        newErrors.paymentDate = "Tanggal pembayaran harus diisi";
      }

      if (!form.value.paymentMethod) {
        newErrors.paymentMethod = "Metode pembayaran harus dipilih";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const openPicker = () => {
      pickerOpen.value = true;
    };

    const handleTransactionSelect = (transaction) => {
      selectedTransaction.value = transaction;
      form.value.transactionId = transaction.id;
      form.value.transactionType =
        (transaction.transaction_type || "").toLowerCase() === "rental"
          ? "rental"
          : "sale";
      errors.value.transactionId = "";
      errors.value.transactionType = "";
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;

      loading.value = true;
      try {
        const user = getStoredUser();
        const paymentData = {
          ...form.value,
          userId: user?.id || 1,
          paymentDate: new Date(form.value.paymentDate).toISOString(),
        };

        if (isEdit.value) {
          await updatePayment(props.editData.id, paymentData);
        } else {
          await createPayment(paymentData);
        }

        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving payment:", error);
        errors.value.submit = error.message || "Gagal menyimpan pembayaran";
      } finally {
        loading.value = false;
      }
    };

    // Reset form when dialog opens
    const resetForm = () => {
      if (props.editData) {
        form.value = {
          transactionType: props.editData.transaction_type || "",
          transactionId: props.editData.transaction_id || "",
          amount: props.editData.amount || 0,
          paymentDate: props.editData.payment_date
            ? new Date(props.editData.payment_date)
                .toISOString()
                .slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          paymentMethod: props.editData.payment_method || "cash",
          referenceNumber: props.editData.reference_number || "",
          notes: props.editData.notes || "",
        };
        selectedTransaction.value = {
          id: props.editData.transaction_id,
          transaction_code: props.editData.transaction_code,
          customer_name: props.editData.customer_name,
          transaction_type: props.editData.transaction_type,
        };
      } else {
        form.value = {
          transactionType: "",
          transactionId: "",
          amount: 0,
          paymentDate: new Date().toISOString().slice(0, 16),
          paymentMethod: "cash",
          referenceNumber: "",
          notes: "",
        };
        selectedTransaction.value = null;
      }
      errors.value = {};
    };

    // Watch for dialog opening
    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) resetForm();
      },
    );

    return {
      form,
      errors,
      loading,
      isEdit,
      showDialog,
      handleSubmit,
      pickerOpen,
      openPicker,
      selectedTransactionLabel,
      handleTransactionSelect,
    };
  },
};
</script>

<style scoped>
.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1.5rem;
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #374151;
}

.reference-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.reference-row .form-group {
  flex: 1;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.reference-row .form-input {
  height: 40px;
}

.picker-button {
  align-self: flex-end;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.picker-button {
  white-space: nowrap;
}

.reference-input .form-input {
  min-width: 0;
}

.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.form-select.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>

