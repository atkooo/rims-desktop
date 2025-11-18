<template>
  <AppDialog
    v-model="visible"
    title="Cari Item"
    :show-footer="false"
    :max-width="540"
  >
    <div class="picker-dialog">
      <div class="picker-controls">
        <FormInput
          id="itemSearch"
          label="Cari item"
          v-model="search"
          placeholder="Masukkan kata kunci..."
        />
        <div class="form-group">
          <label for="typeFilter" class="form-label">Filter Tipe</label>
          <select id="typeFilter" v-model="typeFilter" class="filter-dropdown">
            <option value="">Semua Tipe</option>
            <option v-for="type in itemTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>
      </div>

      <div class="picker-list">
        <div v-if="!filteredItems.length" class="empty-state">
          Tidak ada item yang cocok.
        </div>
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="picker-row"
          :class="{ unavailable: item.status !== 'AVAILABLE' }"
        >
          <div class="picker-meta">
            <Icon name="box" :size="20" class="picker-icon" />
            <div>
              <div class="picker-name">
                {{ item.name }}
                <span v-if="item.code" class="picker-code">{{ item.code }}</span>
              </div>
              <div class="picker-detail">
                {{ item.type || "General" }} ·
                {{ getItemPriceDisplay(item) }} ·
                Stok: {{ item.available_quantity || 0 }}
                <span
                  v-if="getPriceNote(item)"
                  class="price-note"
                >
                  {{ getPriceNote(item) }}
                </span>
              </div>
            </div>
          </div>
          <div class="picker-actions">
            <span class="status-chip" :class="item.status.toLowerCase()">
              {{ item.status }}
            </span>
            <AppButton
              variant="primary"
              size="small"
              :disabled="item.status !== 'AVAILABLE' || (restrictStock && (item.available_quantity || 0) <= 0)"
              @click="selectItem(item)"
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
  import { computed, ref, watch, onBeforeUnmount } from "vue";
import { useItemStore } from "@/store/items";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import { useItemType } from "@/composables/useItemType";
import { eventBus } from "@/utils/eventBus";
import { formatCurrency } from "@/composables/useCurrency";

export default {
  name: "ItemPickerDialog",
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
    transactionType: {
      type: String,
      default: null, // null = tampilkan semua, 'SALE' = hanya SALE dan BOTH, 'RENTAL' = hanya RENTAL dan BOTH
    },
    restrictStock: {
      type: Boolean,
      default: true, // Default true untuk backward compatibility (transaksi)
    },
  },
  emits: ["update:modelValue", "select"],
  setup(props, { emit }) {
    const itemStore = useItemStore();
    const { filterItemsByTransactionType } = useItemType();
    const search = ref("");
    const typeFilter = ref("");
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const itemTypes = computed(() => {
      // Filter item types berdasarkan transactionType
      let items = itemStore.items;
      
      // Jika ada transactionType, filter items terlebih dahulu
      if (props.transactionType) {
        items = filterItemsByTransactionType(items, props.transactionType);
      }
      
      return [
        ...new Set(
          items
            .map((item) => item.type)
            .filter((value) => !!value)
            .map((value) => value.toString()),
        ),
      ].sort();
    });

    const excludedSet = computed(() => new Set(props.excludedIds));

    const filteredItems = computed(() => {
      const term = search.value.toLowerCase();
      // Filter berdasarkan tipe transaksi
      let items = filterItemsByTransactionType(
        itemStore.items,
        props.transactionType
      );
      
      return items
        .filter((item) => !excludedSet.value.has(item.id))
        .filter((item) => {
          if (!term) return true;
          // Cari di nama item atau kode item
          const nameMatch = item.name?.toLowerCase().includes(term) || false;
          const codeMatch = item.code?.toLowerCase().includes(term) || false;
          return nameMatch || codeMatch;
        })
        .filter((item) => {
          if (!typeFilter.value) return true;
          return (item.type || "").toString() === typeFilter.value;
        })
        .slice(0, 80);
    });

    const selectItem = (item) => {
      emit("select", { ...item });
      visible.value = false;
    };

    // Get item price display based on transaction type
    const getItemPriceDisplay = (item) => {
      if (props.transactionType === 'RENTAL') {
        // For rental, show rental_price_per_day
        const rentalPrice = item.rental_price_per_day ?? item.price ?? 0;
        return formatCurrency(rentalPrice) + "/hari";
      } else {
        // For sale or null, show sale_price
        return formatCurrency(item.sale_price ?? item.price ?? 0);
      }
    };

    // Get price note (additional price info)
    const getPriceNote = (item) => {
      if (props.transactionType === 'RENTAL') {
        // For rental, show sale_price if different from rental_price_per_day
        const rentalPrice = item.rental_price_per_day ?? item.price ?? 0;
        const salePrice = item.sale_price ?? item.price ?? 0;
        if (salePrice && salePrice !== rentalPrice) {
          return `(Harga jual: ${formatCurrency(salePrice)})`;
        }
        return null;
      } else {
        // For sale, show original price if different from sale_price
        if (item.sale_price && item.sale_price !== item.price) {
          return `(Harga: ${formatCurrency(item.price)})`;
        }
        return null;
      }
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value && !itemStore.items.length) {
          itemStore.fetchItems();
        }
      },
    );

    const refreshInventory = () => {
      itemStore.fetchItems().catch((error) => {
        console.error("Gagal menyegarkan inventori:", error);
      });
    };

    const unsubscribeInventory = eventBus.on(
      "inventory:updated",
      refreshInventory,
    );

    onBeforeUnmount(() => {
      unsubscribeInventory();
    });

    return {
      search,
      typeFilter,
      itemTypes,
      filteredItems,
      visible,
      formatCurrency,
      selectItem,
      restrictStock: props.restrictStock,
      getItemPriceDisplay,
      getPriceNote,
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

.filter-dropdown {
  width: 100%;
  max-width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 1rem;
  box-sizing: border-box;
  appearance: none;
  cursor: pointer;
}

.filter-dropdown:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
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

.picker-row.unavailable {
  opacity: 0.6;
}

.picker-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.status-chip.available {
  background: #dcfce7;
  color: #166534;
}

.status-chip.rented {
  background: #fee2e2;
  color: #991b1b;
}

.empty-state {
  padding: 1rem;
  color: #6b7280;
  text-align: center;
}

.price-note {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-left: 0.25rem;
}
</style>
