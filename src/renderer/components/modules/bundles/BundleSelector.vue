<template>
  <div class="bundle-selector">
    <div class="picker-header">
      <div>
        <div class="picker-label">Pilih Paket</div>
        <p class="picker-description">Tambahkan paket penjualan yang tersedia</p>
      </div>
      <AppButton variant="secondary" class="picker-button" @click="openPicker">
        <Icon name="grid" :size="16" />
        <span>Cari Paket</span>
      </AppButton>
    </div>

    <div class="selected-items" v-if="selectedBundles.length">
      <div
        v-for="(bundle, index) in selectedBundles"
        :key="bundle.id"
        class="selected-item"
      >
        <div class="item-info">
          <span class="item-name">{{ bundle.name }}</span>
          <span class="item-price">
            {{ formatCurrency(bundle.price) }}
          </span>
        </div>
        <div class="item-actions">
          <input
            type="number"
            v-model.number="bundle.quantity"
            min="1"
            class="quantity-input"
            @input="updateQuantity(index, $event)"
          />
          <AppButton
            variant="danger"
            class="remove-button"
            @click="removeBundle(index)"
          >
            &times;
          </AppButton>
        </div>
      </div>
      <div class="total-section">
        <span>Total Paket</span>
        <span class="total-amount">{{ formatCurrency(total) }}</span>
      </div>
    </div>

    <div v-else class="empty-state">
      Belum ada paket yang dipilih.
    </div>

    <BundlePickerDialog
      v-model="pickerOpen"
      :excluded-ids="selectedBundles.map((bundle) => bundle.id)"
      @select="selectBundle"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import BundlePickerDialog from "./BundlePickerDialog.vue";

export default {
  name: "BundleSelector",
  components: {
    AppButton,
    Icon,
    BundlePickerDialog,
  },
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const pickerOpen = ref(false);
    const selectedBundles = ref(props.modelValue);

    watch(
      () => props.modelValue,
      (value) => {
        selectedBundles.value = value;
      },
    );

    const total = computed(() =>
      selectedBundles.value.reduce((sum, bundle) => {
        return sum + (bundle.price || 0) * (bundle.quantity || 1);
      }, 0),
    );

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    };

    const selectBundle = (bundle) => {
      selectedBundles.value.push({
        ...bundle,
        quantity: 1,
      });
      pickerOpen.value = false;
      emit("update:modelValue", selectedBundles.value);
    };

    const updateQuantity = (index, event) => {
      const value = parseInt(event.target.value, 10);
      if (Number.isNaN(value) || value < 1) {
        selectedBundles.value[index].quantity = 1;
      } else {
        selectedBundles.value[index].quantity = value;
      }
      emit("update:modelValue", selectedBundles.value);
    };

    const removeBundle = (index) => {
      selectedBundles.value.splice(index, 1);
      emit("update:modelValue", selectedBundles.value);
    };

    const openPicker = () => {
      pickerOpen.value = true;
    };

    return {
      pickerOpen,
      selectedBundles,
      total,
      formatCurrency,
      selectBundle,
      updateQuantity,
      removeBundle,
      openPicker,
    };
  },
};
</script>

<style scoped>
.bundle-selector {
  width: 100%;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.picker-label {
  font-size: 0.95rem;
  color: #475569;
  margin-bottom: 0.25rem;
}

.picker-description {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.picker-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-items {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.selected-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 600;
  color: #111827;
}

.item-price {
  font-size: 0.85rem;
  color: #6b7280;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quantity-input {
  width: 60px;
  padding: 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.remove-button {
  padding: 0.25rem 0.5rem !important;
  font-size: 1rem !important;
}

.total-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  font-weight: 500;
  gap: 0.5rem;
}

.total-amount {
  font-size: 1.1rem;
  color: #111827;
}

.empty-state {
  padding: 1rem;
  border: 1px dashed #e5e7eb;
  border-radius: 4px;
  text-align: center;
  color: #6b7280;
}
</style>
