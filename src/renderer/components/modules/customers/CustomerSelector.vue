<template>
  <div class="customer-selector">
    <div class="customer-display">
      <div v-if="selectedCustomer" class="selected-customer">
        <Icon name="user" :size="16" />
        <div class="customer-info">
          <span class="customer-name">{{ selectedCustomer.name }}</span>
          <span v-if="selectedCustomer.code" class="customer-code">{{ selectedCustomer.code }}</span>
        </div>
        <div class="customer-actions">
          <AppButton
            variant="secondary"
            size="small"
            @click="openPicker"
          >
            Ubah
          </AppButton>
          <AppButton
            v-if="allowClear"
            variant="danger"
            size="small"
            @click="clearCustomer"
          >
            Hapus
          </AppButton>
        </div>
      </div>
      <div v-else class="no-customer">
        <AppButton
          variant="secondary"
          size="small"
          @click="openPicker"
        >
          <Icon name="search" :size="16" />
          <span>{{ placeholder }}</span>
        </AppButton>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
    <CustomerPickerDialog
      v-model="pickerOpen"
      @select="selectCustomer"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import CustomerPickerDialog from "@/components/modules/customers/CustomerPickerDialog.vue";
import { fetchCustomers } from "@/services/masterData";

export default {
  name: "CustomerSelector",
  components: {
    AppButton,
    Icon,
    CustomerPickerDialog,
  },
  props: {
    modelValue: {
      type: [String, Number],
      default: null,
    },
    placeholder: {
      type: String,
      default: "Pilih Customer",
    },
    error: {
      type: String,
      default: null,
    },
    allowClear: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const pickerOpen = ref(false);
    const customers = ref([]);
    const loading = ref(false);

    const selectedCustomer = computed(() => {
      if (!props.modelValue || props.modelValue === "" || props.modelValue === null) return null;
      return customers.value.find((c) => c.id === props.modelValue) || null;
    });

    const loadCustomers = async () => {
      if (customers.value.length > 0) return;
      
      loading.value = true;
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customer:", error);
      } finally {
        loading.value = false;
      }
    };

    const selectCustomer = (customer) => {
      emit("update:modelValue", customer.id);
    };

    const openPicker = () => {
      pickerOpen.value = true;
      loadCustomers();
    };

    const clearCustomer = () => {
      emit("update:modelValue", "");
    };

    // Load customers when component is mounted if there's a value
    watch(
      () => props.modelValue,
      (value) => {
        if (value && customers.value.length === 0) {
          loadCustomers();
        }
      },
      { immediate: true }
    );

    return {
      pickerOpen,
      selectedCustomer,
      selectCustomer,
      openPicker,
      clearCustomer,
    };
  },
};
</script>

<style scoped>
.customer-selector {
  width: 100%;
}

.customer-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-customer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.customer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.customer-name {
  font-weight: 500;
  color: #111827;
}

.customer-code {
  font-size: 0.75rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}

.no-customer {
  display: flex;
}

.error-message {
  font-size: 0.875rem;
  color: #dc2626;
  margin-top: 0.25rem;
}
</style>

