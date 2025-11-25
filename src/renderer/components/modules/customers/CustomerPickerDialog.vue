<template>
  <AppDialog
    v-model="visible"
    title="Cari Customer"
    :show-footer="false"
    :max-width="540"
  >
    <div class="picker-dialog">
      <div class="picker-controls">
        <FormInput
          id="customerSearch"
          label="Cari customer"
          v-model="search"
          placeholder="Masukkan nama, kode, atau telepon..."
        />
      </div>

      <div class="picker-list">
        <div v-if="!filteredCustomers.length" class="empty-state">
          Tidak ada customer yang cocok.
        </div>
        <div
          v-for="customer in filteredCustomers"
          :key="customer.id"
          class="picker-row"
        >
          <div class="picker-meta">
            <Icon name="user" :size="20" class="picker-icon" />
            <div>
              <div class="picker-name">
                {{ customer.name }}
                <span v-if="customer.code" class="picker-code">{{ customer.code }}</span>
              </div>
              <div class="picker-detail">
                <span v-if="customer.phone">Telp: {{ customer.phone }}</span>
                <span v-if="customer.phone && customer.email"> · </span>
                <span v-if="customer.email">Email: {{ customer.email }}</span>
                <span v-if="customer.total_transactions !== undefined">
                  <span v-if="customer.phone || customer.email"> · </span>
                  Transaksi: {{ customer.total_transactions || 0 }}
                </span>
              </div>
            </div>
          </div>
          <div class="picker-actions">
            <AppButton
              variant="primary"
              size="small"
              @click="selectCustomer(customer)"
            >
              Pilih
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchCustomers } from "@/services/masterData";

export default {
  name: "CustomerPickerDialog",
  components: {
    AppDialog,
    AppButton,
    FormInput,
    Icon,
  },
  props: {
    modelValue: Boolean,
    excludedIds: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["update:modelValue", "select"],
  setup(props, { emit }) {
    const search = ref("");
    const customers = ref([]);
    const loading = ref(false);
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const excludedSet = computed(() => new Set(props.excludedIds));

    const filteredCustomers = computed(() => {
      const term = search.value.toLowerCase();
      
      return customers.value
        .filter((customer) => !excludedSet.value.has(customer.id))
        .filter((customer) => {
          if (!term) return true;
          // Cari di nama, kode, telepon, atau email
          const nameMatch = customer.name?.toLowerCase().includes(term) || false;
          const codeMatch = customer.code?.toLowerCase().includes(term) || false;
          const phoneMatch = customer.phone?.toLowerCase().includes(term) || false;
          const emailMatch = customer.email?.toLowerCase().includes(term) || false;
          return nameMatch || codeMatch || phoneMatch || emailMatch;
        })
        .slice(0, 80);
    });

    const selectCustomer = (customer) => {
      emit("select", { ...customer });
      visible.value = false;
    };

    const loadCustomers = async () => {
      if (customers.value.length > 0) return; // Already loaded
      
      loading.value = true;
      try {
        customers.value = await fetchCustomers();
      } catch (error) {
        console.error("Gagal memuat customer:", error);
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          loadCustomers();
        }
      },
    );

    return {
      search,
      filteredCustomers,
      visible,
      selectCustomer,
    };
  },
};
</script>

<style scoped>
.picker-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.picker-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  align-items: flex-start;
}

.picker-controls :deep(.form-group) {
  margin-bottom: 0;
}

.picker-controls > .form-group {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}

.picker-controls :deep(.form-label),
.picker-controls > .form-group > .form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.picker-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.picker-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  gap: 1rem;
}

.picker-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.picker-icon {
  color: #4338ca;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.picker-name {
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.picker-code {
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}

.picker-detail {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.empty-state {
  padding: 1rem;
  color: #6b7280;
  text-align: center;
}
</style>

