<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Transaksi' : 'Transaksi Baru'"
    :confirm-text="isEdit ? 'Update' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="transaction-form">
      <!-- Customer Info -->
      <div class="form-section">
        <h3>Informasi Customer</h3>
        <FormInput
          id="customerName"
          label="Nama Customer"
          v-model="form.customerName"
          :error="errors.customerName"
          required
        />
      </div>

      <!-- Items Selection -->
      <div class="form-section">
        <h3>Pilih Item</h3>
        <ItemSelector v-model="form.items" />
        <div v-if="errors.items" class="error-message">
          {{ errors.items }}
        </div>
      </div>

      <!-- Additional Info -->
      <div class="form-section">
        <h3>Informasi Tambahan</h3>
        <FormInput
          id="notes"
          label="Catatan"
          v-model="form.notes"
          type="textarea"
        />
      </div>

      <!-- Summary -->
      <div class="form-section summary">
        <div class="summary-row">
          <span>Total Items:</span>
          <span>{{ totalItems }}</span>
        </div>
        <div class="summary-row">
          <span>Total Amount:</span>
          <span class="total-amount">{{ formatCurrency(totalAmount) }}</span>
        </div>
      </div>
    </form>
  </AppDialog>
</template>

<script>
import { ref, computed, watch } from "vue";
import { useTransactionStore } from "@/store/transactions";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ItemSelector from "@/components/modules/items/ItemSelector.vue";

export default {
  name: "TransactionForm",
  components: {
    AppDialog,
    FormInput,
    ItemSelector,
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
    const transactionStore = useTransactionStore();
    const loading = ref(false);
    const errors = ref({});

    // Form state
    const form = ref({
      customerName: "",
      items: [],
      notes: "",
      transactionDate: new Date().toISOString(),
    });

    // Computed
    const isEdit = computed(() => !!props.editData);
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const totalItems = computed(() => {
      return form.value.items.reduce((sum, item) => sum + item.quantity, 0);
    });

    const totalAmount = computed(() => {
      return form.value.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
    });

    // Methods
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    const validateForm = () => {
      const newErrors = {};

      if (!form.value.customerName.trim()) {
        newErrors.customerName = "Nama customer harus diisi";
      }

      if (!form.value.items.length) {
        newErrors.items = "Pilih minimal 1 item";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;

      loading.value = true;
      try {
        const transactionData = {
          ...form.value,
          totalAmount: totalAmount.value,
        };

        if (isEdit.value) {
          await transactionStore.updateTransaction(
            props.editData.id,
            transactionData,
          );
        } else {
          await transactionStore.createTransaction(transactionData);
        }

        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving transaction:", error);
      } finally {
        loading.value = false;
      }
    };

    // Reset form when dialog opens
    const resetForm = () => {
      if (props.editData) {
        form.value = { ...props.editData };
      } else {
        form.value = {
          customerName: "",
          items: [],
          notes: "",
          transactionDate: new Date().toISOString(),
        };
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
      totalItems,
      totalAmount,
      formatCurrency,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
.transaction-form {
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

.summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.total-amount {
  font-size: 1.25rem;
  color: #111827;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
