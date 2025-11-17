<template>
  <div class="accessory-selector">
    <div class="picker-header">
      <div>
        <div class="picker-label">Pilih Aksesoris</div>
        <p class="picker-description">
          Buka katalog untuk memilih aksesoris tersedia
        </p>
      </div>
      <AppButton variant="secondary" class="picker-button" @click="openPicker">
        <Icon name="search" :size="16" />
        <span>Cari Aksesoris</span>
      </AppButton>
    </div>

    <!-- Selected Accessories -->
    <div class="selected-items">
      <div
        v-for="(accessory, index) in selectedAccessories"
        :key="accessory.id"
        class="selected-item"
      >
        <div class="item-info">
          <span class="item-name">{{ accessory.name }}</span>
          <span class="item-price">
            {{ formatCurrency(calculateAccessoryPrice(accessory)) }}
            <span
              v-if="accessory.discount_percentage > 0 || accessory.discount_amount > 0"
              class="discount-badge"
            >
              (Diskon:
              {{
                accessory.discount_percentage > 0
                  ? accessory.discount_percentage + "%"
                  : formatCurrency(accessory.discount_amount)
              }})
            </span>
          </span>
        </div>
        <div class="item-actions">
          <input
            type="number"
            v-model.number="accessory.quantity"
            min="1"
            :max="restrictStock ? (accessory.available_quantity || 999) : undefined"
            class="quantity-input"
            @input="updateQuantity(index, $event)"
          />
          <AppButton
            variant="danger"
            class="remove-button"
            @click="removeAccessory(index)"
          >
            &times;
          </AppButton>
        </div>
      </div>

      <div v-if="selectedAccessories.length" class="total-section">
        <span>Total:</span>
        <span class="total-amount">{{ formatCurrency(total) }}</span>
      </div>
    </div>
    <AccessoryPickerDialog
      v-model="pickerOpen"
      :excluded-ids="selectedAccessories.map((acc) => acc.id)"
      :restrict-stock="restrictStock"
      @select="selectAccessory"
    />
  </div>
</template>

<script>
import { ref, computed } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import AccessoryPickerDialog from "@/components/modules/accessories/AccessoryPickerDialog.vue";
import { formatCurrency } from "@/composables/useCurrency";

export default {
  name: "AccessorySelector",
  components: { AppButton, Icon, AccessoryPickerDialog },

  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    restrictStock: {
      type: Boolean,
      default: true, // Default true untuk backward compatibility (transaksi)
    },
  },

  emits: ["update:modelValue"],

  setup(props, { emit }) {
    const pickerOpen = ref(false);
    const selectedAccessories = ref(props.modelValue);

    // Calculate price after accessory discount
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

    const total = computed(() => {
      return selectedAccessories.value.reduce((sum, accessory) => {
        const price = calculateAccessoryPrice(accessory);
        return sum + price * (accessory.quantity || 1);
      }, 0);
    });

    const selectAccessory = (accessory) => {
      // Jika restrictStock aktif, cek ketersediaan
      if (props.restrictStock) {
        if (!accessory.is_available_for_sale || !accessory.is_active) return;

        // Cek apakah accessory sudah ada di selected accessories
        const existingAccessory = selectedAccessories.value.find((a) => a.id === accessory.id);
        if (existingAccessory) {
          // Jika sudah ada, cek stok sebelum menambah quantity
          const currentQuantity = existingAccessory.quantity || 1;
          const availableStock = accessory.available_quantity || 0;
          
          if (currentQuantity >= availableStock) {
            alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
            return;
          }
          
          existingAccessory.quantity = currentQuantity + 1;
        } else {
          // Accessory baru, cek stok tersedia
          const availableStock = accessory.available_quantity || 0;
          if (availableStock < 1) {
            alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
            return;
          }
          
          selectedAccessories.value.push({
            ...accessory,
            quantity: 1,
          });
        }
      } else {
        // Jika tidak restrictStock, hanya cek is_active
        if (!accessory.is_active) return;

        // Cek apakah accessory sudah ada di selected accessories
        const existingAccessory = selectedAccessories.value.find((a) => a.id === accessory.id);
        if (existingAccessory) {
          // Jika sudah ada, tambah quantity tanpa cek stok
          existingAccessory.quantity = (existingAccessory.quantity || 1) + 1;
        } else {
          // Accessory baru, tambah tanpa cek stok
          selectedAccessories.value.push({
            ...accessory,
            quantity: 1,
          });
        }
      }
      
      pickerOpen.value = false;
      emit("update:modelValue", selectedAccessories.value);
    };

    const updateQuantity = (index, event) => {
      const value = parseInt(event.target.value, 10);
      const accessory = selectedAccessories.value[index];
      
      if (Number.isNaN(value) || value < 1) {
        selectedAccessories.value[index].quantity = 1;
      } else {
        // Jika restrictStock aktif, batasi berdasarkan available_quantity
        if (props.restrictStock) {
          const maxQty = accessory.available_quantity || 999;
          selectedAccessories.value[index].quantity = Math.max(1, Math.min(maxQty, Math.floor(value)));
        } else {
          // Jika tidak restrictStock, tidak ada batasan maksimal
          selectedAccessories.value[index].quantity = Math.max(1, Math.floor(value));
        }
      }
      emit("update:modelValue", selectedAccessories.value);
    };

    const removeAccessory = (index) => {
      selectedAccessories.value.splice(index, 1);
      emit("update:modelValue", selectedAccessories.value);
    };

    const openPicker = () => {
      pickerOpen.value = true;
    };

    return {
      selectedAccessories,
      total,
      formatCurrency,
      calculateAccessoryPrice,
      selectAccessory,
      updateQuantity,
      removeAccessory,
      openPicker,
      pickerOpen,
      restrictStock: props.restrictStock,
    };
  },
};
</script>

<style scoped>
.accessory-selector {
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
}

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.item-info {
  display: flex;
  flex-direction: column;
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
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  font-weight: 500;
}

.total-amount {
  font-size: 1.25rem;
  color: #111827;
}

.discount-badge {
  font-size: 0.75rem;
  color: #16a34a;
  margin-left: 0.5rem;
}
</style>


