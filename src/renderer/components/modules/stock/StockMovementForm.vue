<template>
  <AppDialog
    v-model="showDialog"
    title="Pergerakan Stok Baru"
    confirm-text="Simpan"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="stock-movement-form">
      <div v-if="errors.submit" class="form-error">
        {{ errors.submit }}
      </div>

      <section class="form-section">
        <h3>Tipe & Pilihan</h3>
        <div class="form-grid">
          <div class="field-group">
            <label for="type">Tipe</label>
            <select
              id="type"
              v-model="form.type"
              class="form-select"
              @change="handleTypeChange"
            >
              <option value="item">Item</option>
              <option value="bundle">Bundle/Paket</option>
              <option value="accessory">Aksesoris</option>
            </select>
          </div>
          <div class="field-group">
            <label for="movementType">Jenis Pergerakan</label>
            <select
              id="movementType"
              v-model="form.movementType"
              class="form-select"
              :class="{ error: errors.movementType }"
              required
            >
              <option value="">Pilih Jenis</option>
              <option value="IN">Masuk (IN)</option>
              <option value="OUT">Keluar (OUT)</option>
            </select>
            <div v-if="errors.movementType" class="error-message">
              {{ errors.movementType }}
            </div>
          </div>
        </div>
        <div class="form-grid">
          <div class="field-group full-width">
            <label>{{ getTypeLabel() }}</label>
            <div class="picker-selector">
              <div v-if="selectedReference" class="selected-reference">
                <span class="reference-name">
                  {{ selectedReference.name }}
                  <span v-if="selectedReference.code" class="reference-code">
                    {{ selectedReference.code }}
                  </span>
                </span>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="small"
                  @click="clearSelection"
                >
                  Hapus
                </AppButton>
              </div>
              <AppButton
                v-else
                type="button"
                variant="secondary"
                @click="openPicker"
              >
                <Icon name="search" :size="16" />
                <span>{{ getPickerButtonLabel() }}</span>
              </AppButton>
            </div>
            <div v-if="errors.referenceId" class="error-message">
              {{ errors.referenceId }}
            </div>
          </div>
        </div>
      </section>

      <section class="form-section">
        <h3>Jumlah</h3>
        <div class="form-grid single-column">
          <div class="field-group">
            <FormInput
              id="quantity"
              label="Jumlah"
              type="number"
              v-model.number="form.quantity"
              :error="errors.quantity"
              required
              min="1"
            />
            <div
              v-if="selectedReference && form.movementType === 'OUT'"
              class="stock-info"
            >
              <small>
                Stok tersedia: {{ selectedReference.available_quantity || 0 }}
                <span
                  v-if="form.quantity > (selectedReference.available_quantity || 0)"
                >
                  ⚠️ Stok tidak mencukupi
                </span>
              </small>
            </div>
          </div>
        </div>
      </section>

      <section class="form-section">
        <h3>Referensi & Catatan</h3>
        <div class="form-grid">
          <div class="field-group">
            <label for="referenceType">Tipe Referensi</label>
            <select
              id="referenceType"
              v-model="form.referenceType"
              class="form-select"
            >
              <option value="">Pilih Tipe Referensi</option>
              <option value="purchase">Pembelian (Purchase)</option>
              <option value="adjustment">Penyesuaian (Adjustment)</option>
              <option value="return">Pengembalian (Return)</option>
              <option value="transfer">Transfer</option>
              <option value="damage">Kerusakan (Damage)</option>
              <option value="other">Lainnya (Other)</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="field-group full-width">
            <FormInput
              id="notes"
              label="Catatan"
              v-model="form.notes"
              type="textarea"
              placeholder="Alasan pergerakan stok"
            />
          </div>
        </div>
      </section>
    </form>

    <!-- Picker Dialogs -->
    <ItemPickerDialog
      v-model="showItemPicker"
      @select="handleItemSelect"
    />
    <BundlePickerDialog
      v-model="showBundlePicker"
      @select="handleBundleSelect"
    />
    <AccessoryPickerDialog
      v-model="showAccessoryPicker"
      @select="handleAccessorySelect"
    />
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { getStoredUser } from "@/services/auth";
import { useItemStore } from "@/store/items";
import { useBundleStore } from "@/store/bundles";
import { createStockMovement } from "@/services/transactions";
import { fetchAccessories } from "@/services/masterData";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import BundlePickerDialog from "@/components/modules/bundles/BundlePickerDialog.vue";
import AccessoryPickerDialog from "@/components/modules/accessories/AccessoryPickerDialog.vue";

export default {
  name: "StockMovementForm",
  components: {
    AppDialog,
    AppButton,
    FormInput,
    Icon,
    ItemPickerDialog,
    BundlePickerDialog,
    AccessoryPickerDialog,
  },

  props: {
    modelValue: Boolean,
  },

  emits: ["update:modelValue", "saved"],

  setup(props, { emit }) {
    const itemStore = useItemStore();
    const bundleStore = useBundleStore();
    const loading = ref(false);
    const errors = ref({});
    const accessories = ref([]);

    // Form state
    const form = ref({
      type: "item", // "item", "bundle", "accessory"
      itemId: "",
      bundleId: "",
      accessoryId: "",
      movementType: "",
      quantity: 1,
      referenceType: "",
      notes: "",
    });

    // Picker dialogs
    const showItemPicker = ref(false);
    const showBundlePicker = ref(false);
    const showAccessoryPicker = ref(false);
    const selectedReference = ref(null);

    // Computed
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    // Methods
    const getTypeLabel = () => {
      if (form.value.type === "item") return "Pilih Item";
      if (form.value.type === "bundle") return "Pilih Bundle/Paket";
      if (form.value.type === "accessory") return "Pilih Aksesoris";
      return "Pilih";
    };

    const getPickerButtonLabel = () => {
      if (form.value.type === "item") return "Cari Item";
      if (form.value.type === "bundle") return "Cari Bundle";
      if (form.value.type === "accessory") return "Cari Aksesoris";
      return "Cari";
    };

    const handleTypeChange = () => {
      // Clear selection when type changes
      selectedReference.value = null;
      form.value.itemId = "";
      form.value.bundleId = "";
      form.value.accessoryId = "";
      errors.value.referenceId = "";
    };

    const openPicker = () => {
      if (form.value.type === "item") {
        showItemPicker.value = true;
      } else if (form.value.type === "bundle") {
        showBundlePicker.value = true;
      } else if (form.value.type === "accessory") {
        showAccessoryPicker.value = true;
      }
    };

    const handleItemSelect = (item) => {
      selectedReference.value = item;
      form.value.itemId = item.id;
      form.value.bundleId = "";
      form.value.accessoryId = "";
      errors.value.referenceId = "";
    };

    const handleBundleSelect = (bundle) => {
      selectedReference.value = bundle;
      form.value.bundleId = bundle.id;
      form.value.itemId = "";
      form.value.accessoryId = "";
      errors.value.referenceId = "";
    };

    const handleAccessorySelect = (accessory) => {
      selectedReference.value = accessory;
      form.value.accessoryId = accessory.id;
      form.value.itemId = "";
      form.value.bundleId = "";
      errors.value.referenceId = "";
    };

    const clearSelection = () => {
      selectedReference.value = null;
      form.value.itemId = "";
      form.value.bundleId = "";
      form.value.accessoryId = "";
      errors.value.referenceId = "";
    };

    const validateForm = () => {
      const newErrors = {};

      // Validate reference selection
      if (form.value.type === "item" && !form.value.itemId) {
        newErrors.referenceId = "Item harus dipilih";
      } else if (form.value.type === "bundle" && !form.value.bundleId) {
        newErrors.referenceId = "Bundle harus dipilih";
      } else if (form.value.type === "accessory" && !form.value.accessoryId) {
        newErrors.referenceId = "Aksesoris harus dipilih";
      }

      if (!form.value.movementType) {
        newErrors.movementType = "Jenis pergerakan harus dipilih";
      }

      if (!form.value.quantity || form.value.quantity < 1) {
        newErrors.quantity = "Jumlah harus minimal 1";
      }

      // Validate stock for OUT movement
      if (
        form.value.movementType === "OUT" &&
        selectedReference.value &&
        form.value.quantity > (selectedReference.value.available_quantity || 0)
      ) {
        newErrors.quantity = "Stok tidak mencukupi";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) {
        return;
      }

      loading.value = true;
      errors.value.submit = "";

      try {
        const user = getStoredUser();
        const movementData = {
          itemId: form.value.itemId || null,
          bundleId: form.value.bundleId || null,
          accessoryId: form.value.accessoryId || null,
          movementType: form.value.movementType,
          quantity: form.value.quantity,
          referenceType: form.value.referenceType || null,
          userId: user?.id || null,
          notes: form.value.notes || null,
        };

        await createStockMovement(movementData);

        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving stock movement:", error);
        errors.value.submit =
          error.message || "Gagal menyimpan pergerakan stok";
      } finally {
        loading.value = false;
      }
    };

    // Reset form when dialog opens
    const resetForm = () => {
      form.value = {
        type: "item",
        itemId: "",
        bundleId: "",
        accessoryId: "",
        movementType: "",
        quantity: 1,
        referenceType: "",
        notes: "",
      };
      selectedReference.value = null;
      errors.value = {};
    };

    // Watch for dialog opening
    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) {
          resetForm();
          if (!itemStore.items.length) {
            itemStore.fetchItems();
          }
          if (!bundleStore.bundles.length) {
            bundleStore.fetchBundles();
          }
          if (!accessories.value.length) {
            fetchAccessories().then((data) => {
              accessories.value = data;
            });
          }
        }
      },
    );

    onMounted(() => {
      if (!itemStore.items.length) {
        itemStore.fetchItems();
      }
      if (!bundleStore.bundles.length) {
        bundleStore.fetchBundles();
      }
      fetchAccessories().then((data) => {
        accessories.value = data;
      });
    });

    return {
      form,
      errors,
      loading,
      showDialog,
      selectedReference,
      showItemPicker,
      showBundlePicker,
      showAccessoryPicker,
      getTypeLabel,
      getPickerButtonLabel,
      handleTypeChange,
      openPicker,
      handleItemSelect,
      handleBundleSelect,
      handleAccessorySelect,
      clearSelection,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
.stock-movement-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-error {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 0;
  font-size: 0.95rem;
}

.form-section {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1.5rem;
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #374151;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.form-grid.single-column {
  grid-template-columns: 1fr;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-group.full-width {
  grid-column: 1 / -1;
}

.form-select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background-color: white;
  font-size: 1rem;
}

.form-select.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
}

.stock-info {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.picker-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  gap: 0.75rem;
}

.reference-name {
  flex: 1;
  font-weight: 500;
  color: #111827;
}

.reference-code {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  background-color: #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
  color: #6b7280;
}
</style>
