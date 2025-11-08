<template>
  <div class="item-selector">
    <div class="search-bar">
      <input
        type="text"
        v-model="search"
        placeholder="Cari item..."
        class="search-input"
      />
      <div v-if="filteredItems.length" class="items-dropdown">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="item-option"
          :class="{ unavailable: item.status !== 'AVAILABLE' }"
          @click="selectItem(item)"
        >
          <div>
            <div class="item-name">{{ item.name }}</div>
            <div class="item-detail">
              {{ formatCurrency(item.price) }} - {{ item.type }}
            </div>
          </div>
          <span class="item-status" :class="item.status.toLowerCase()">
            {{ item.status }}
          </span>
        </div>
      </div>
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
  </div>
</template>

<script>
import { ref, computed } from "vue";
import { useItemStore } from "@/store/items";
import AppButton from "@/components/ui/AppButton.vue";

export default {
  name: "ItemSelector",
  components: { AppButton },

  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },

  emits: ["update:modelValue"],

  setup(props, { emit }) {
    const itemStore = useItemStore();
    const search = ref("");
    const selectedItems = ref(props.modelValue);

    // Filter items berdasarkan pencarian
    const filteredItems = computed(() => {
      if (!search.value) return [];
      return itemStore.items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.value.toLowerCase()) &&
          !selectedItems.value.some((selected) => selected.id === item.id),
      );
    });

    // Hitung total
    const total = computed(() => {
      return selectedItems.value.reduce((sum, item) => {
        return sum + item.price * item.quantity;
      }, 0);
    });

    // Format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    // Pilih item
    const selectItem = (item) => {
      if (item.status !== "AVAILABLE") return;

      selectedItems.value.push({
        ...item,
        quantity: 1,
      });
      search.value = "";
      emit("update:modelValue", selectedItems.value);
    };

    // Update quantity
    const updateQuantity = (index, event) => {
      const value = parseInt(event.target.value);
      if (value < 1) {
        selectedItems.value[index].quantity = 1;
      }
      emit("update:modelValue", selectedItems.value);
    };

    // Hapus item
    const removeItem = (index) => {
      selectedItems.value.splice(index, 1);
      emit("update:modelValue", selectedItems.value);
    };

    return {
      search,
      selectedItems,
      filteredItems,
      total,
      formatCurrency,
      selectItem,
      updateQuantity,
      removeItem,
    };
  },
};
</script>

<style scoped>
.item-selector {
  width: 100%;
}

.search-bar {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 1rem;
}

.items-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.item-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
}

.item-option:hover {
  background-color: #f9fafb;
}

.item-option.unavailable {
  opacity: 0.6;
  cursor: not-allowed;
}

.item-name {
  font-weight: 500;
}

.item-detail {
  font-size: 0.875rem;
  color: #6b7280;
}

.item-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
}

.item-status.available {
  background-color: #dcfce7;
  color: #166534;
}

.item-status.rented {
  background-color: #fee2e2;
  color: #991b1b;
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
