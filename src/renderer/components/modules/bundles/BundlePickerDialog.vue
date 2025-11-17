<template>
  <AppDialog
    v-model="visible"
    :title="getDialogTitle()"
    :show-footer="false"
    :max-width="600"
  >
    <div class="picker-dialog">
      <div class="picker-controls">
        <FormInput
          id="bundleSearch"
          label="Cari paket"
          v-model="search"
          placeholder="Masukkan nama atau kode..."
        />
        <div class="form-group">
          <label for="statusFilter" class="form-label">Filter Status</label>
          <select
            id="statusFilter"
            v-model="statusFilter"
            class="filter-dropdown"
          >
            <option value="">Semua Status Aktif</option>
            <option value="open">Tersedia</option>
            <option value="soldout">Habis</option>
          </select>
        </div>
      </div>

      <div class="picker-list">
        <div v-if="!filteredBundles.length" class="empty-state">
          Tidak ada paket yang cocok.
        </div>
        <div
          v-for="bundle in filteredBundles"
          :key="bundle.id"
          class="picker-row"
          :class="{ 
            unavailable: !allowZeroStock && bundle.available_quantity <= 0 
          }"
        >
          <div class="picker-meta">
            <Icon name="box" :size="20" class="picker-icon" />
            <div>
              <div class="picker-name">{{ bundle.name }}</div>
              <div class="picker-detail">
                {{ bundle.code }} · 
                {{ getBundlePriceDisplay(bundle) }}
              </div>
            </div>
          </div>
          <div class="picker-actions">
            <span
              class="status-chip"
              :class="bundle.available_quantity <= 0 ? 'soldout' : 'available'"
            >
              {{ bundle.available_quantity <= 0 ? "Habis" : "Tersedia" }}
            </span>
            <AppButton
              variant="primary"
              size="small"
              :disabled="!allowZeroStock && bundle.available_quantity <= 0"
              @click="selectBundle(bundle)"
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
import { computed, ref, watch, toRef } from "vue";
import { useBundleStore } from "@/store/bundles";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import { formatCurrency } from "@/composables/useCurrency";

export default {
  name: "BundlePickerDialog",
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
    bundleType: {
      type: String,
      default: "sale", // "sale", "rental", or "both"
    },
    allowZeroStock: {
      type: Boolean,
      default: false, // Jika true, bundle dengan stok 0 bisa dipilih (untuk pergerakan stok)
    },
  },
  emits: ["update:modelValue", "select"],
  setup(props, { emit }) {
    const bundleStore = useBundleStore();
    const search = ref("");
    const statusFilter = ref("");

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const excludedSet = computed(() => new Set(props.excludedIds));

    const getDialogTitle = () => {
      if (props.bundleType === "rental") return "Cari Paket Sewa";
      if (props.bundleType === "both") return "Cari Paket (Sale & Rental)";
      return "Cari Paket Penjualan";
    };

    const filteredBundles = computed(() => {
      const term = search.value.toLowerCase();
      let bundles;
      
      if (props.bundleType === "both") {
        // For "both", combine sale and rental bundles, removing duplicates
        const saleIds = new Set(bundleStore.saleBundles.map(b => b.id));
        bundles = [
          ...bundleStore.saleBundles,
          ...bundleStore.rentalBundles.filter(b => !saleIds.has(b.id))
        ];
      } else if (props.bundleType === "rental") {
        bundles = bundleStore.rentalBundles;
      } else {
        bundles = bundleStore.saleBundles;
      }
      
      return bundles
        .filter((bundle) => !excludedSet.value.has(bundle.id))
        .filter((bundle) => {
          if (!term) return true;
          return (
            bundle.name.toLowerCase().includes(term) ||
            (bundle.code || "").toLowerCase().includes(term)
          );
        })
        .filter((bundle) => {
          if (!statusFilter.value) return true;
          if (statusFilter.value === "open") {
            return bundle.available_quantity > 0;
          }
          return bundle.available_quantity <= 0;
        })
        .slice(0, 80);
    });

    const selectBundle = (bundle) => {
      emit("select", { ...bundle });
      visible.value = false;
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          // Always refresh bundles when picker opens to get latest data
          bundleStore.fetchBundles(true).catch((error) => {
            console.error("Gagal memuat paket:", error);
          });
        }
      },
    );

    const getBundlePriceDisplay = (bundle) => {
      if (props.bundleType === "both") {
        // For "both", show both prices if available
        const parts = [];
        if (bundle.price) {
          parts.push(formatCurrency(bundle.price));
        }
        if (bundle.rental_price_per_day) {
          parts.push(formatCurrency(bundle.rental_price_per_day) + "/hari");
        }
        return parts.length > 0 ? parts.join(" / ") : "-";
      } else if (props.bundleType === "rental") {
        return formatCurrency(bundle.rental_price_per_day || 0) + "/hari";
      } else {
        return formatCurrency(bundle.price || 0);
      }
    };

    return {
      search,
      statusFilter,
      visible,
      filteredBundles,
      formatCurrency,
      selectBundle,
      getDialogTitle,
      getBundlePriceDisplay,
      bundleType: toRef(props, "bundleType"),
      allowZeroStock: toRef(props, "allowZeroStock"),
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

.status-chip.soldout {
  background: #fee2e2;
  color: #991b1b;
}

.empty-state {
  padding: 1rem;
  color: #6b7280;
  text-align: center;
}
</style>
