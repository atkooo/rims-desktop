<template>
  <div class="bundle-selector">
    <div class="picker-header">
      <div>
        <div class="picker-label">Pilih Paket</div>
        <p class="picker-description">
          Tambahkan paket penjualan yang tersedia
        </p>
      </div>
      <AppButton variant="secondary" class="picker-button" @click="openPicker">
        <Icon name="grid" :size="16" />
        <span>Cari Paket</span>
      </AppButton>
    </div>

    <div class="selected-items" v-if="selectedBundles.length">
      <table class="bundles-table">
        <thead>
          <tr>
            <th>Nama Paket</th>
            <th>Harga Satuan</th>
            <th>Qty</th>
            <th>Stok</th>
            <th>Subtotal</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(bundle, index) in selectedBundles" :key="bundle.id">
            <td class="name-cell">
              <div class="item-name">{{ bundle.name }}</div>
              <div
                v-if="
                  bundle.discount_percentage > 0 || bundle.discount_amount > 0
                "
                class="discount-badge"
              >
                Diskon:
                {{
                  bundle.discount_percentage > 0
                    ? bundle.discount_percentage + "%"
                    : formatCurrency(bundle.discount_amount)
                }}
              </div>
            </td>
            <td class="price-cell">
              {{ formatCurrency(calculateBundlePrice(bundle)) }}
            </td>
            <td class="quantity-cell">
              <input
                type="number"
                v-model.number="bundle.quantity"
                min="1"
                :max="bundle.available_quantity || 0"
                class="quantity-input"
                @input="updateQuantity(index, $event)"
              />
            </td>
            <td class="stock-cell">
              <span :class="{ 'low-stock': (bundle.available_quantity || 0) <= 1 }">
                {{ bundle.available_quantity || 0 }}
              </span>
            </td>
            <td class="subtotal-cell">
              {{ formatCurrency(calculateBundlePrice(bundle) * (bundle.quantity || 1)) }}
            </td>
            <td class="action-cell">
              <AppButton
                variant="danger"
                size="small"
                class="remove-button"
                @click="removeBundle(index)"
              >
                Hapus
              </AppButton>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">Total:</td>
            <td class="total-amount" colspan="2">{{ formatCurrency(total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else class="empty-items">
      <p>Belum ada paket yang dipilih. Klik "Cari Paket" untuk menambahkan.</p>
    </div>

    <BundlePickerDialog
      v-model="pickerOpen"
      :excluded-ids="selectedBundles.map((bundle) => bundle.id)"
      :bundle-type="bundleType"
      @select="selectBundle"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import BundlePickerDialog from "./BundlePickerDialog.vue";
import { formatCurrency } from "@/composables/useCurrency";

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
    bundleType: {
      type: String,
      default: "sale", // "sale" or "rental"
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

    // Calculate price after bundle discount
    const calculateBundlePrice = (bundle) => {
      const basePrice = props.bundleType === "rental" 
        ? (bundle.rental_price_per_day || 0)
        : (bundle.price || 0);

      // Apply bundle discount if bundle has discount_group
      if (bundle.discount_percentage > 0) {
        return Math.round(basePrice * (1 - bundle.discount_percentage / 100));
      } else if (bundle.discount_amount > 0) {
        return Math.max(0, basePrice - bundle.discount_amount);
      }

      return basePrice;
    };

    const total = computed(() =>
      selectedBundles.value.reduce((sum, bundle) => {
        const price = calculateBundlePrice(bundle);
        return sum + price * (bundle.quantity || 1);
      }, 0),
    );

    const selectBundle = (bundle) => {
      // Cek apakah bundle sudah ada di selected bundles
      const existingBundle = selectedBundles.value.find((b) => b.id === bundle.id);
      if (existingBundle) {
        // Jika sudah ada, cek stok sebelum menambah quantity
        const currentQuantity = existingBundle.quantity || 1;
        const availableStock = bundle.available_quantity || 0;
        
        if (currentQuantity >= availableStock) {
          alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
          return;
        }
        
        existingBundle.quantity = currentQuantity + 1;
      } else {
        // Bundle baru, cek stok tersedia
        const availableStock = bundle.available_quantity || 0;
        if (availableStock < 1) {
          alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
          return;
        }
        
        selectedBundles.value.push({
          ...bundle,
          quantity: 1,
        });
      }
      
      pickerOpen.value = false;
      emit("update:modelValue", selectedBundles.value);
    };

    const updateQuantity = (index, event) => {
      const value = parseInt(event.target.value, 10);
      const bundle = selectedBundles.value[index];
      
      if (Number.isNaN(value) || value < 1) {
        selectedBundles.value[index].quantity = 1;
      } else {
        const newQuantity = Math.max(1, Math.floor(value));
        const availableStock = bundle.available_quantity || 0;
        
        // Validasi tidak boleh melebihi stok tersedia
        if (newQuantity > availableStock) {
          alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
          selectedBundles.value[index].quantity = Math.min(availableStock, bundle.quantity || 1);
        } else {
          selectedBundles.value[index].quantity = newQuantity;
        }
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
      calculateBundlePrice,
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
  overflow-x: auto;
  overflow-y: visible;
  width: 100%;
}

.bundles-table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  font-size: 0.9rem;
  table-layout: auto;
}

.bundles-table thead {
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.bundles-table th {
  padding: 0.75rem 0.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bundles-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.bundles-table tbody tr:hover {
  background-color: #f9fafb;
}

.bundles-table tbody tr:last-child td {
  border-bottom: none;
}

.name-cell {
  min-width: 200px;
}

.item-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.discount-badge {
  font-size: 0.75rem;
  color: #16a34a;
  background-color: #dcfce7;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  display: inline-block;
}

.price-cell {
  text-align: right;
  font-weight: 500;
  color: #111827;
  width: 120px;
}

.quantity-cell {
  width: 80px;
}

.quantity-input {
  width: 100%;
  padding: 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}

.quantity-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.stock-cell {
  text-align: center;
  width: 80px;
  font-size: 0.85rem;
}

.stock-cell .low-stock {
  color: #dc2626;
  font-weight: 600;
}

.subtotal-cell {
  text-align: right;
  font-weight: 600;
  color: #111827;
  width: 120px;
}

.action-cell {
  width: 100px;
  text-align: center;
}

.remove-button {
  padding: 0.375rem 0.75rem !important;
  font-size: 0.85rem !important;
}

.bundles-table tfoot {
  background-color: #f9fafb;
  border-top: 2px solid #e5e7eb;
}

.bundles-table tfoot td {
  padding: 1rem 0.5rem;
  font-weight: 600;
}

.total-label {
  text-align: right;
  font-size: 1rem;
  color: #374151;
}

.total-amount {
  font-size: 1.25rem;
  color: #111827;
  text-align: right;
}

.empty-items {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.empty-items p {
  margin: 0;
  font-size: 0.9rem;
}

.discount-badge {
  font-size: 0.75rem;
  color: #16a34a;
  margin-left: 0.5rem;
}
</style>
