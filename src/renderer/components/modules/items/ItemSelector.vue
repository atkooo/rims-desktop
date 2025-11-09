<template>
  <div class="item-selector">
    <div class="picker-header">
      <div>
        <div class="picker-label">Pilih Item</div>
        <p class="picker-description">Buka katalog untuk memilih barang tersedia</p>
      </div>
      <AppButton variant="secondary" class="picker-button" @click="openPicker">
        <Icon name="search" :size="16" />
        <span>Cari Item</span>
      </AppButton>
    </div>

    <!-- Selected Items -->
    <div class="selected-items">
      <div
        v-for="(item, index) in selectedItems"
        :key="item.id"
        class="selected-item"
      >
        <div class="item-info">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-price">{{ formatCurrency(item.price) }}</span>
        </div>
        <div class="item-actions">
          <input
            type="number"
            v-model.number="item.quantity"
            min="1"
            class="quantity-input"
            @input="updateQuantity(index, $event)"
          />
          <AppButton
            variant="danger"
            class="remove-button"
            @click="removeItem(index)"
          >
            &times;
          </AppButton>
        </div>
      </div>

      <div v-if="selectedItems.length" class="total-section">
        <span>Total:</span>
        <span class="total-amount">{{ formatCurrency(total) }}</span>
      </div>
    </div>
    <ItemPickerDialog
      v-model="pickerOpen"
      :excluded-ids="selectedItems.map((it) => it.id)"
      @select="selectItem"
    />
  </div>
</template>

<script>
import { ref, computed } from "vue";
import { useItemStore } from "@/store/items";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";

export default {
  name: "ItemSelector",
  components: { AppButton, Icon, ItemPickerDialog },

  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },

  emits: ["update:modelValue"],

  setup(props, { emit }) {
    const itemStore = useItemStore();
    const pickerOpen = ref(false);
    const selectedItems = ref(props.modelValue);

    const total = computed(() => {
      return selectedItems.value.reduce((sum, item) => {
        return sum + item.price * (item.quantity || 1);
      }, 0);
    });

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    };

    const selectItem = (item) => {
      if (item.status !== "AVAILABLE") return;

      selectedItems.value.push({
        ...item,
        quantity: 1,
      });
      pickerOpen.value = false;
      emit("update:modelValue", selectedItems.value);
    };

    const updateQuantity = (index, event) => {
      const value = parseInt(event.target.value);
      if (Number.isNaN(value) || value < 1) {
        selectedItems.value[index].quantity = 1;
      } else {
        selectedItems.value[index].quantity = value;
      }
      emit("update:modelValue", selectedItems.value);
    };

    const removeItem = (index) => {
      selectedItems.value.splice(index, 1);
      emit("update:modelValue", selectedItems.value);
    };

    const openPicker = () => {
      pickerOpen.value = true;
      if (!itemStore.items.length) {
        itemStore.fetchItems();
      }
    };

    return {
      selectedItems,
      total,
      formatCurrency,
      selectItem,
      updateQuantity,
      removeItem,
      openPicker,
      pickerOpen,
    };
  },
};
</script>

<style scoped>
.item-selector {
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
</style>
