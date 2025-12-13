<template>
  <AppDialog v-model="showDialog" title="Mutasi Stok Baru" confirm-text="Simpan" :loading="loading"
    @confirm="handleSubmit">
    <form @submit.prevent="handleSubmit" class="stock-movement-form">
      <div v-if="errors.submit" class="form-error">
        {{ errors.submit }}
      </div>

      <section class="form-section">
        <h3>Tipe & Pilihan</h3>
        <div class="form-grid">
          <div class="field-group">
            <label for="type">Tipe</label>
            <select id="type" v-model="form.type" class="form-select" :class="{ error: errors.type }"
              @change="handleTypeChange" required>
              <option :value="null" disabled>Pilih Tipe</option>
              <option value="item">Item</option>
              <option value="bundle">Bundle/Paket</option>
              <option value="accessory">Aksesoris</option>
            </select>
            <div v-if="errors.type" class="error-message">
              {{ errors.type }}
            </div>
          </div>
          <div class="field-group" v-if="form.type === 'bundle'">
            <label for="bundleType">Tipe Bundle</label>
            <select id="bundleType" v-model="form.bundleType" class="form-select" :class="{ error: errors.bundleType }"
              @change="handleBundleTypeChange" required>
              <option :value="null" disabled>Pilih Tipe Bundle</option>
              <option value="both">Both</option>
              <option value="sale">Sale</option>
              <option value="rental">Rental</option>
            </select>
            <div v-if="errors.bundleType" class="error-message">
              {{ errors.bundleType }}
            </div>
          </div>
          <div class="field-group">
            <label for="movementType">Jenis Mutasi</label>
            <select id="movementType" v-model="form.movementType" class="form-select"
              :class="{ error: errors.movementType }" required>
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
                <AppButton type="button" variant="secondary" size="small" @click="clearSelection">
                  Hapus
                </AppButton>
              </div>
              <AppButton v-else type="button" variant="secondary"
                :disabled="!form.type || (form.type === 'bundle' && !form.bundleType)" @click="openPicker">
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
            <FormInput id="quantity" label="Jumlah" type="number" v-model.number="form.quantity"
              :error="errors.quantity" required min="1" :max="maxBundleQuantity" />
            <div v-if="selectedReference && form.movementType === 'OUT'" class="stock-info">
              <small>
                Stok tersedia: {{ selectedReference.available_quantity || 0 }}
                <span v-if="form.quantity > (selectedReference.available_quantity || 0)">
                  ⚠️ Stok tidak mencukupi
                </span>
              </small>
            </div>
            <div v-if="selectedReference && form.movementType === 'IN' && form.type === 'bundle'" class="stock-info">
              <small>
                <span v-if="maxBundleQuantity !== null">
                  Maksimal yang bisa dibuat: <strong>{{ maxBundleQuantity }}</strong>
                  <span v-if="form.quantity > maxBundleQuantity" class="text-warning">
                    ⚠️ Melebihi stok item/aksesoris yang tersedia
                  </span>
                </span>
                <span v-else-if="bundleCompositionLoading" class="text-muted">
                  Memuat komposisi paket...
                </span>
                <span v-else-if="bundleCompositionError" class="text-danger">
                  {{ bundleCompositionError }}
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
            <select id="referenceType" v-model="form.referenceType" class="form-select">
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
            <FormInput id="notes" label="Catatan" v-model="form.notes" type="textarea"
              placeholder="Alasan mutasi stok" />
          </div>
        </div>
      </section>
    </form>

    <!-- Picker Dialogs -->
    <ItemPickerDialog v-model="showItemPicker" :restrict-stock="false" :check-status="form.movementType === 'OUT'" @select="handleItemSelect" />
    <BundlePickerDialog v-model="showBundlePicker" :bundle-type="form.bundleType || 'both'" :restrict-stock="false"
      @select="handleBundleSelect" />
    <AccessoryPickerDialog v-model="showAccessoryPicker" :restrict-stock="false" @select="handleAccessorySelect" />
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { getStoredUser } from "@/services/auth";
import { useItemStore } from "@/store/items";
import { useBundleStore } from "@/store/bundles";
import { createStockMovement } from "@/services/transactions";
import { fetchAccessories, fetchBundleDetailsByBundle } from "@/services/masterData";
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
    const maxBundleQuantity = ref(null);
    const bundleCompositionLoading = ref(false);
    const bundleCompositionError = ref("");

    // Form state
    const form = ref({
      type: null, // "item", "bundle", "accessory"
      bundleType: null, // "sale", "rental", "both"
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
      return "Pilih Tipe terlebih dahulu";
    };

    const getPickerButtonLabel = () => {
      if (form.value.type === "item") return "Cari Item";
      if (form.value.type === "bundle") return "Cari Bundle";
      if (form.value.type === "accessory") return "Cari Aksesoris";
      return "Pilih Tipe terlebih dahulu";
    };

    const handleTypeChange = () => {
      // Clear selection when type changes
      selectedReference.value = null;
      form.value.itemId = "";
      form.value.bundleId = "";
      form.value.accessoryId = "";
      errors.value.referenceId = "";
      // Reset bundle type when switching away from bundle
      if (form.value.type !== "bundle") {
        form.value.bundleType = null;
      }
    };

    const handleBundleTypeChange = () => {
      // Clear bundle selection when bundle type changes
      if (form.value.type === "bundle") {
        selectedReference.value = null;
        form.value.bundleId = "";
        errors.value.referenceId = "";
        maxBundleQuantity.value = null;
        bundleCompositionError.value = "";
      }
    };

    const openPicker = () => {
      if (!form.value.type) {
        errors.value.type = "Pilih tipe terlebih dahulu";
        return;
      }
      if (form.value.type === "item") {
        showItemPicker.value = true;
      } else if (form.value.type === "bundle") {
        if (!form.value.bundleType) {
          errors.value.bundleType = "Pilih tipe bundle terlebih dahulu";
          return;
        }
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

    const handleBundleSelect = async (bundle) => {
      selectedReference.value = bundle;
      form.value.bundleId = bundle.id;
      form.value.itemId = "";
      form.value.accessoryId = "";
      errors.value.referenceId = "";
      
      // Reset max quantity
      maxBundleQuantity.value = null;
      bundleCompositionError.value = "";
      
      // Jika movement type IN, hitung maksimal bundle yang bisa dibuat
      if (form.value.movementType === "IN") {
        await calculateMaxBundleQuantity(bundle.id);
      }
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
      maxBundleQuantity.value = null;
      bundleCompositionError.value = "";
    };

    const calculateMaxBundleQuantity = async (bundleId) => {
      if (!bundleId || form.value.movementType !== "IN") {
        maxBundleQuantity.value = null;
        return;
      }

      bundleCompositionLoading.value = true;
      bundleCompositionError.value = "";
      maxBundleQuantity.value = null;

      try {
        // Ambil komposisi bundle
        const bundleDetails = await fetchBundleDetailsByBundle(bundleId);

        if (!bundleDetails || bundleDetails.length === 0) {
          bundleCompositionError.value = "Paket belum memiliki komposisi";
          maxBundleQuantity.value = 0;
          return;
        }

        // Hitung kebutuhan item dan aksesoris
        const requiredItems = new Map(); // item_id -> quantity per bundle
        const requiredAccessories = new Map(); // accessory_id -> quantity per bundle

        for (const detail of bundleDetails) {
          if (detail.item_id) {
            const current = requiredItems.get(detail.item_id) || 0;
            requiredItems.set(detail.item_id, current + detail.quantity);
          } else if (detail.accessory_id) {
            const current = requiredAccessories.get(detail.accessory_id) || 0;
            requiredAccessories.set(detail.accessory_id, current + detail.quantity);
          }
        }

        // Hitung maksimal bundle yang bisa dibuat
        let maxBundles = Infinity;

        // Cek stok item
        for (const [itemId, qtyPerBundle] of requiredItems) {
          const item = itemStore.items.find((i) => i.id === itemId);
          if (!item) {
            bundleCompositionError.value = `Item dengan ID ${itemId} tidak ditemukan`;
            maxBundleQuantity.value = 0;
            return;
          }
          const availableStock = item.available_quantity || 0;
          const maxFromItem = Math.floor(availableStock / qtyPerBundle);
          maxBundles = Math.min(maxBundles, maxFromItem);
        }

        // Cek stok aksesoris
        for (const [accessoryId, qtyPerBundle] of requiredAccessories) {
          const accessory = accessories.value.find((a) => a.id === accessoryId);
          if (!accessory) {
            // Fetch accessories jika belum ada
            const allAccessories = await fetchAccessories();
            const foundAccessory = allAccessories.find((a) => a.id === accessoryId);
            if (!foundAccessory) {
              bundleCompositionError.value = `Aksesoris dengan ID ${accessoryId} tidak ditemukan`;
              maxBundleQuantity.value = 0;
              return;
            }
            const availableStock = foundAccessory.available_quantity || 0;
            const maxFromAccessory = Math.floor(availableStock / qtyPerBundle);
            maxBundles = Math.min(maxBundles, maxFromAccessory);
          } else {
            const availableStock = accessory.available_quantity || 0;
            const maxFromAccessory = Math.floor(availableStock / qtyPerBundle);
            maxBundles = Math.min(maxBundles, maxFromAccessory);
          }
        }

        maxBundleQuantity.value = maxBundles === Infinity ? 0 : maxBundles;
      } catch (error) {
        console.error("Error calculating max bundle quantity:", error);
        bundleCompositionError.value = error.message || "Gagal menghitung maksimal bundle";
        maxBundleQuantity.value = null;
      } finally {
        bundleCompositionLoading.value = false;
      }
    };

    const validateForm = () => {
      const newErrors = {};

      // Validate type selection
      if (!form.value.type) {
        newErrors.type = "Tipe wajib dipilih";
      }

      // Validate bundle type if type is bundle
      if (form.value.type === "bundle" && !form.value.bundleType) {
        newErrors.bundleType = "Tipe bundle wajib dipilih";
      }

      // Validate reference selection
      if (form.value.type === "item" && !form.value.itemId) {
        newErrors.referenceId = "Item harus dipilih";
      } else if (form.value.type === "bundle" && !form.value.bundleId) {
        newErrors.referenceId = "Bundle harus dipilih";
      } else if (form.value.type === "accessory" && !form.value.accessoryId) {
        newErrors.referenceId = "Aksesoris harus dipilih";
      }

      if (!form.value.movementType) {
        newErrors.movementType = "Jenis mutasi harus dipilih";
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

      // Validate stock for IN bundle movement
      if (
        form.value.movementType === "IN" &&
        form.value.type === "bundle" &&
        maxBundleQuantity.value !== null &&
        form.value.quantity > maxBundleQuantity.value
      ) {
        newErrors.quantity = `Maksimal ${maxBundleQuantity.value} paket yang bisa dibuat berdasarkan stok item/aksesoris yang tersedia`;
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
        await Promise.all([
          itemStore.fetchItems(),
          bundleStore.fetchBundles(true),
        ]);

        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving stock movement:", error);
        errors.value.submit =
          error.message || "Gagal menyimpan mutasi stok";
      } finally {
        loading.value = false;
      }
    };

    // Reset form when dialog opens
    const resetForm = () => {
      form.value = {
        type: null,
        bundleType: null,
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
      maxBundleQuantity.value = null;
      bundleCompositionError.value = "";
      bundleCompositionLoading.value = false;
    };

    // Watch for movementType change to calculate max bundle quantity
    watch(
      () => [form.value.movementType, form.value.bundleId],
      async ([newMovementType, bundleId]) => {
        if (newMovementType === "IN" && bundleId && form.value.type === "bundle") {
          await calculateMaxBundleQuantity(bundleId);
        } else {
          maxBundleQuantity.value = null;
          bundleCompositionError.value = "";
        }
      },
    );

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
      maxBundleQuantity,
      bundleCompositionLoading,
      bundleCompositionError,
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
.stock-info {
  margin-top: 0.5rem;
}

.stock-info small {
  display: block;
  color: #6b7280;
}

.stock-info .text-warning {
  color: #d97706;
  font-weight: 500;
}

.stock-info .text-danger {
  color: #dc2626;
  font-weight: 500;
}

.stock-info .text-muted {
  color: #9ca3af;
}
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

/* Using global utility classes for form-grid, form-select, error-message */
.form-grid {
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

.form-select.error {
  border-color: #dc2626;
}

.error-message {
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
