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
        <select v-model="typeFilter" class="filter-dropdown">
          <option value="">Semua Tipe</option>
          <option v-for="type in itemTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
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
              <div class="picker-name">{{ item.name }}</div>
              <div class="picker-detail">
                {{ item.type || "General" }} · {{ formatCurrency(item.price) }}
              </div>
            </div>
          </div>
          <div class="picker-actions">
            <span
              class="status-chip"
              :class="item.status.toLowerCase()"
            >
              {{ item.status }}
            </span>
            <AppButton
              variant="primary"
              size="small"
              :disabled="item.status !== 'AVAILABLE'"
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
import { computed, ref, watch } from "vue";
import { useItemStore } from "@/store/items";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";

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
  },
  emits: ["update:modelValue", "select"],
  setup(props, { emit }) {
    const itemStore = useItemStore();
    const search = ref("");
    const typeFilter = ref("");
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const itemTypes = computed(() => {
      return [
        ...new Set(
          itemStore.items
            .map((item) => item.type)
            .filter((value) => !!value)
            .map((value) => value.toString()),
        ),
      ].sort();
    });

    const excludedSet = computed(() => new Set(props.excludedIds));

    const filteredItems = computed(() => {
      const term = search.value.toLowerCase();
      return itemStore.items
        .filter((item) => !excludedSet.value.has(item.id))
        .filter((item) => {
          if (!term) return true;
          return item.name.toLowerCase().includes(term);
        })
        .filter((item) => {
          if (!typeFilter.value) return true;
          return (item.type || "").toString() === typeFilter.value;
        })
        .slice(0, 80);
    });

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    };

    const selectItem = (item) => {
      emit("select", { ...item });
      visible.value = false;
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value && !itemStore.items.length) {
          itemStore.fetchItems();
        }
      },
    );

    return {
      search,
      typeFilter,
      itemTypes,
      filteredItems,
      visible,
      formatCurrency,
      selectItem,
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
}

.filter-dropdown {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.95rem;
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
}

.picker-name {
  font-weight: 600;
  color: #111827;
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
</style>
