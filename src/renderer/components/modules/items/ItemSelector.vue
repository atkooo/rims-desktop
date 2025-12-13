<template>
  <div class="item-selector">
    <div class="picker-header">
      <div>
        <div class="picker-label">Pilih Item</div>
        <p class="picker-description">
          Buka katalog untuk memilih barang tersedia
        </p>
      </div>
      <AppButton variant="secondary" class="picker-button" @click="openPicker">
        <Icon name="search" :size="16" />
        <span>Cari Item</span>
      </AppButton>
    </div>

    <!-- Selected Items Table -->
    <div class="selected-items">
      <table v-if="selectedItems.length" class="items-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama Item</th>
            <th>Harga Satuan</th>
            <th>Qty</th>
            <th>Subtotal</th>
            <th>Stok</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in selectedItems" :key="item.id">
            <td class="code-cell">
              <span class="item-code">{{ item.code || "-" }}</span>
            </td>
            <td class="name-cell">
              <div class="item-name">{{ item.name }}</div>
              <div v-if="item.discount_percentage > 0 || item.discount_amount > 0" class="discount-badge">
                Diskon:
                {{
                  item.discount_percentage > 0
                    ? item.discount_percentage + "%"
                    : formatCurrency(item.discount_amount)
                }}
              </div>
            </td>
            <td class="price-cell">
              {{ formatCurrency(calculateItemPrice(item)) }}
            </td>
            <td class="quantity-cell">
              <input
                type="number"
                v-model.number="item.quantity"
                min="1"
                :max="restrictStock ? (item.available_quantity || 0) : undefined"
                class="quantity-input"
                @input="updateQuantity(index, $event)"
              />
            </td>
            <td class="subtotal-cell">
              {{ formatCurrency(calculateItemPrice(item) * (item.quantity || 1)) }}
            </td>
            <td class="stock-cell">
              <span :class="{ 'low-stock': (item.available_quantity || 0) <= 1 }">
                {{ item.available_quantity || 0 }}
              </span>
            </td>
            <td class="action-cell">
              <AppButton
                variant="danger"
                size="small"
                class="remove-button"
                @click="removeItem(index)"
              >
                Hapus
              </AppButton>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">Total:</td>
            <td class="total-amount" colspan="3">{{ formatCurrency(total) }}</td>
          </tr>
        </tfoot>
      </table>
      <div v-else class="empty-items">
        <p>Belum ada item yang dipilih. Klik "Cari Item" untuk menambahkan.</p>
      </div>
    </div>
    <ItemPickerDialog
      v-model="pickerOpen"
      :excluded-ids="selectedItems.map((it) => it.id)"
      :transaction-type="transactionType"
      :restrict-stock="restrictStock"
      @select="selectItem"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import { useItemStore } from "@/store/items";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import { formatCurrency } from "@/composables/useCurrency";

export default {
  name: "ItemSelector",
  components: { AppButton, Icon, ItemPickerDialog },

  props: {
    modelValue: {
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

  emits: ["update:modelValue"],

  setup(props, { emit }) {
    const itemStore = useItemStore();
    const pickerOpen = ref(false);
    const selectedItems = ref(props.modelValue);
    const transactionType = computed(() => props.transactionType);

    // Watch for changes in modelValue to sync with parent
    watch(
      () => props.modelValue,
      (newValue) => {
        // Only update if the arrays are actually different (by reference or content)
        const currentStr = JSON.stringify(selectedItems.value);
        const newStr = JSON.stringify(newValue || []);
        if (currentStr !== newStr) {
          selectedItems.value = newValue ? [...newValue] : [];
        }
      },
      { deep: true, immediate: true }
    );

    // Calculate price after item discount
    const calculateItemPrice = (item) => {
      // Use rental_price_per_day for rental transactions, sale_price for sale transactions
      let basePrice;
      if (transactionType.value === 'RENTAL') {
        basePrice = item.rental_price_per_day ?? 0;
      } else {
        basePrice = item.sale_price ?? 0;
      }

      // Apply item discount if item has discount_group (only for sale transactions)
      if (transactionType.value !== 'RENTAL') {
        if (item.discount_percentage > 0) {
          return Math.round(basePrice * (1 - item.discount_percentage / 100));
        } else if (item.discount_amount > 0) {
          return Math.max(0, basePrice - item.discount_amount);
        }
      }

      return basePrice;
    };

    const total = computed(() => {
      return selectedItems.value.reduce((sum, item) => {
        const price = calculateItemPrice(item);
        return sum + price * (item.quantity || 1);
      }, 0);
    });

    const selectItem = (item) => {
      // Jika restrictStock aktif, cek status dan stok
      if (props.restrictStock) {
        if (item.status !== "AVAILABLE") return;

        // Cek apakah item sudah ada di selected items
        const existingItem = selectedItems.value.find((i) => i.id === item.id);
        if (existingItem) {
          // Jika sudah ada, cek stok sebelum menambah quantity
          const currentQuantity = existingItem.quantity || 1;
          const availableStock = item.available_quantity || 0;
          
          if (currentQuantity >= availableStock) {
            alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
            return;
          }
          
          existingItem.quantity = currentQuantity + 1;
        } else {
          // Item baru, cek stok tersedia
          const availableStock = item.available_quantity || 0;
          if (availableStock < 1) {
            alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
            return;
          }
          
          selectedItems.value.push({
            ...item,
            quantity: 1,
          });
        }
      } else {
        // Jika tidak restrictStock, hanya cek status (bukan stok)
        if (item.status !== "AVAILABLE") return;

        // Cek apakah item sudah ada di selected items
        const existingItem = selectedItems.value.find((i) => i.id === item.id);
        if (existingItem) {
          // Jika sudah ada, tambah quantity tanpa cek stok
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          // Item baru, tambah tanpa cek stok
          selectedItems.value.push({
            ...item,
            quantity: 1,
          });
        }
      }
      
      pickerOpen.value = false;
      emit("update:modelValue", selectedItems.value);
    };

    const updateQuantity = (index, event) => {
      const value = parseInt(event.target.value, 10);
      const item = selectedItems.value[index];
      
      if (Number.isNaN(value) || value < 1) {
        selectedItems.value[index].quantity = 1;
      } else {
        const newQuantity = Math.max(1, Math.floor(value));
        
        // Jika restrictStock aktif, validasi tidak boleh melebihi stok tersedia
        if (props.restrictStock) {
          const availableStock = item.available_quantity || 0;
          if (newQuantity > availableStock) {
            alert(`Stok tidak mencukupi. Stok tersedia: ${availableStock}`);
            selectedItems.value[index].quantity = Math.min(availableStock, item.quantity || 1);
          } else {
            selectedItems.value[index].quantity = newQuantity;
          }
        } else {
          // Jika tidak restrictStock, tidak ada batasan maksimal
          selectedItems.value[index].quantity = newQuantity;
        }
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
      calculateItemPrice,
      selectItem,
      updateQuantity,
      removeItem,
      openPicker,
      pickerOpen,
      transactionType,
      restrictStock: props.restrictStock,
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
  overflow-x: auto;
  overflow-y: visible;
  width: 100%;
}

.items-table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  font-size: 0.9rem;
  table-layout: auto;
}

.items-table thead {
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.items-table th {
  padding: 0.75rem 0.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.items-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.items-table tbody tr:hover {
  background-color: #f9fafb;
}

.items-table tbody tr:last-child td {
  border-bottom: none;
}

.code-cell {
  font-family: monospace;
  font-size: 0.85rem;
  color: #6b7280;
  width: 100px;
}

.item-code {
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
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

.subtotal-cell {
  text-align: right;
  font-weight: 600;
  color: #111827;
  width: 120px;
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

.action-cell {
  width: 100px;
  text-align: center;
}

.remove-button {
  padding: 0.375rem 0.75rem !important;
  font-size: 0.85rem !important;
}

.items-table tfoot {
  background-color: #f9fafb;
  border-top: 2px solid #e5e7eb;
}

.items-table tfoot td {
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
</style>
