<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Booking' : 'Booking Baru'"
    :confirm-text="isEdit ? 'Update' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="booking-form">
      <!-- Customer Selection -->
      <div class="form-section">
        <h3>Customer</h3>
        <select
          v-model="form.customerId"
          class="form-select"
          :class="{ error: errors.customerId }"
          required
        >
          <option value="">Pilih Customer</option>
          <option
            v-for="customer in customers"
            :key="customer.id"
            :value="customer.id"
          >
            {{ customer.name }} - {{ customer.phone || customer.code }}
          </option>
        </select>
        <div v-if="errors.customerId" class="error-message">
          {{ errors.customerId }}
        </div>
      </div>

      <!-- Item Selection -->
      <div class="form-section">
        <h3>Item</h3>
        <select
          v-model="form.itemId"
          class="form-select"
          :class="{ error: errors.itemId }"
          required
        >
          <option value="">Pilih Item</option>
          <option
            v-for="item in availableItems"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }} - {{ formatCurrency(item.price) }}
          </option>
        </select>
        <div v-if="errors.itemId" class="error-message">
          {{ errors.itemId }}
        </div>
      </div>

      <!-- Quantity -->
      <div class="form-section">
        <FormInput
          id="quantity"
          label="Jumlah"
          type="number"
          v-model.number="form.quantity"
          :error="errors.quantity"
          required
          min="1"
        />
      </div>

      <!-- Dates -->
      <div class="form-section">
        <h3>Tanggal</h3>
        <FormInput
          id="bookingDate"
          label="Tanggal Booking"
          type="date"
          v-model="form.bookingDate"
          :error="errors.bookingDate"
          required
        />
        <FormInput
          id="plannedStartDate"
          label="Tanggal Mulai"
          type="date"
          v-model="form.plannedStartDate"
          :error="errors.plannedStartDate"
          required
        />
        <FormInput
          id="plannedEndDate"
          label="Tanggal Selesai"
          type="date"
          v-model="form.plannedEndDate"
          :error="errors.plannedEndDate"
          required
        />
      </div>

      <!-- Pricing -->
      <div class="form-section">
        <h3>Harga & Deposit</h3>
        <FormInput
          id="estimatedPrice"
          label="Estimasi Harga"
          type="number"
          v-model.number="form.estimatedPrice"
          :error="errors.estimatedPrice"
          min="0"
        />
        <FormInput
          id="deposit"
          label="Deposit"
          type="number"
          v-model.number="form.deposit"
          :error="errors.deposit"
          min="0"
        />
      </div>

      <!-- Status -->
      <div class="form-section">
        <h3>Status</h3>
        <select v-model="form.status" class="form-select">
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
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
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { getStoredUser } from "@/services/auth";
import { fetchCustomers } from "@/services/masterData";
import { useItemStore } from "@/store/items";
import { createBooking, updateBooking } from "@/services/transactions";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";

export default {
  name: "BookingForm",
  components: {
    AppDialog,
    FormInput,
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
    const itemStore = useItemStore();
    const loading = ref(false);
    const errors = ref({});
    const customers = ref([]);

    // Form state
    const form = ref({
      customerId: "",
      itemId: "",
      quantity: 1,
      bookingDate: new Date().toISOString().split("T")[0],
      plannedStartDate: "",
      plannedEndDate: "",
      estimatedPrice: 0,
      deposit: 0,
      status: "pending",
      notes: "",
    });

    // Computed
    const isEdit = computed(() => !!props.editData);
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const availableItems = computed(() =>
      itemStore.items.filter((item) => item.status === "AVAILABLE"),
    );

    // Methods
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    const validateForm = () => {
      const newErrors = {};

      if (!form.value.customerId) {
        newErrors.customerId = "Customer harus dipilih";
      }

      if (!form.value.itemId) {
        newErrors.itemId = "Item harus dipilih";
      }

      if (!form.value.quantity || form.value.quantity < 1) {
        newErrors.quantity = "Jumlah harus minimal 1";
      }

      if (!form.value.bookingDate) {
        newErrors.bookingDate = "Tanggal booking harus diisi";
      }

      if (!form.value.plannedStartDate) {
        newErrors.plannedStartDate = "Tanggal mulai harus diisi";
      }

      if (!form.value.plannedEndDate) {
        newErrors.plannedEndDate = "Tanggal selesai harus diisi";
      }

      if (
        form.value.plannedStartDate &&
        form.value.plannedEndDate &&
        form.value.plannedStartDate > form.value.plannedEndDate
      ) {
        newErrors.plannedEndDate = "Tanggal selesai harus setelah tanggal mulai";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;

      loading.value = true;
      try {
        const user = getStoredUser();
        const bookingData = {
          ...form.value,
          userId: user?.id || 1,
        };

        if (isEdit.value) {
          await updateBooking(props.editData.id, bookingData);
        } else {
          await createBooking(bookingData);
        }

        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving booking:", error);
        errors.value.submit = error.message || "Gagal menyimpan booking";
      } finally {
        loading.value = false;
      }
    };

    // Reset form when dialog opens
    const resetForm = () => {
      if (props.editData) {
        form.value = {
          customerId: props.editData.customer_id || props.editData.customerId,
          itemId: props.editData.item_id || props.editData.itemId,
          quantity: props.editData.quantity || 1,
          bookingDate: props.editData.booking_date
            ? props.editData.booking_date.split("T")[0]
            : new Date().toISOString().split("T")[0],
          plannedStartDate: props.editData.planned_start_date
            ? props.editData.planned_start_date.split("T")[0]
            : "",
          plannedEndDate: props.editData.planned_end_date
            ? props.editData.planned_end_date.split("T")[0]
            : "",
          estimatedPrice: props.editData.estimated_price || 0,
          deposit: props.editData.deposit || 0,
          status: props.editData.status || "pending",
          notes: props.editData.notes || "",
        };
      } else {
        form.value = {
          customerId: "",
          itemId: "",
          quantity: 1,
          bookingDate: new Date().toISOString().split("T")[0],
          plannedStartDate: "",
          plannedEndDate: "",
          estimatedPrice: 0,
          deposit: 0,
          status: "pending",
          notes: "",
        };
      }
      errors.value = {};
    };

    // Load customers
    const loadCustomers = async () => {
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };

    // Watch for dialog opening
    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) {
          resetForm();
          loadCustomers();
          if (!itemStore.items.length) {
            itemStore.fetchItems();
          }
        }
      },
    );

    onMounted(() => {
      if (!itemStore.items.length) {
        itemStore.fetchItems();
      }
    });

    return {
      form,
      errors,
      loading,
      isEdit,
      showDialog,
      customers,
      availableItems,
      formatCurrency,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
.booking-form {
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

.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
  font-size: 0.95rem;
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



