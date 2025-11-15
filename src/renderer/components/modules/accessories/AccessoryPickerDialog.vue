<template>
  <AppDialog
    v-model="visible"
    title="Cari Aksesoris"
    :show-footer="false"
    :max-width="540"
  >
    <div class="picker-dialog">
      <div class="picker-controls">
        <FormInput
          id="accessorySearch"
          label="Cari aksesoris"
          v-model="search"
          placeholder="Masukkan kata kunci..."
        />
      </div>

      <div class="picker-list">
        <div v-if="!filteredAccessories.length" class="empty-state">
          Tidak ada aksesoris yang cocok.
        </div>
        <div
          v-for="accessory in filteredAccessories"
          :key="accessory.id"
          class="picker-row"
          :class="{ unavailable: !isAvailable(accessory) }"
        >
          <div class="picker-meta">
            <Icon name="box" :size="20" class="picker-icon" />
            <div>
              <div class="picker-name">{{ accessory.name }}</div>
              <div class="picker-detail">
                {{ formatCurrency(accessory.sale_price ?? 0) }}
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
              </div>
            </div>
          </div>
          <div class="picker-actions">
            <span class="status-chip" :class="isAvailable(accessory) ? 'available' : 'unavailable'">
              {{ isAvailable(accessory) ? "Tersedia" : "Tidak Tersedia" }}
            </span>
            <AppButton
              variant="primary"
              size="small"
              :disabled="!isAvailable(accessory)"
              @click="selectAccessory(accessory)"
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
import { fetchAccessories } from "@/services/masterData";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import { formatCurrency } from "@/composables/useCurrency";

export default {
  name: "AccessoryPickerDialog",
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
    const accessories = ref([]);
    const loading = ref(false);
    const search = ref("");
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const excludedSet = computed(() => new Set(props.excludedIds));

    const isAvailable = (accessory) => {
      return (
        accessory.is_active &&
        accessory.is_available_for_sale &&
        (accessory.available_quantity ?? 0) > 0
      );
    };

    const filteredAccessories = computed(() => {
      const term = search.value.toLowerCase();
      return accessories.value
        .filter((accessory) => !excludedSet.value.has(accessory.id))
        .filter((accessory) => {
          if (!term) return true;
          return (
            accessory.name.toLowerCase().includes(term) ||
            (accessory.code && accessory.code.toLowerCase().includes(term))
          );
        })
        .slice(0, 80);
    });

    const loadAccessories = async () => {
      if (accessories.value.length > 0) return;
      loading.value = true;
      try {
        accessories.value = await fetchAccessories();
      } catch (error) {
        console.error("Gagal memuat aksesoris:", error);
      } finally {
        loading.value = false;
      }
    };

    const selectAccessory = (accessory) => {
      emit("select", { ...accessory });
      visible.value = false;
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          loadAccessories();
        }
      },
    );

    return {
      search,
      filteredAccessories,
      visible,
      formatCurrency,
      selectAccessory,
      isAvailable,
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

.status-chip.unavailable {
  background: #fee2e2;
  color: #991b1b;
}

.empty-state {
  padding: 1rem;
  color: #6b7280;
  text-align: center;
}

.discount-badge {
  font-size: 0.75rem;
  color: #16a34a;
  margin-left: 0.25rem;
}
</style>


