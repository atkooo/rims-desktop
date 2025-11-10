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
        <h3>Item & Jenis Pergerakan</h3>
        <div class="form-grid">
          <div class="field-group">
            <label for="itemId">Item</label>
            <select
              id="itemId"
              v-model="form.itemId"
              class="form-select"
              :class="{ error: errors.itemId }"
              required
            >
              <option value="">Pilih Item</option>
              <option
                v-for="item in items"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }} - Stok: {{ item.available_quantity || 0 }}
              </option>
            </select>
            <div v-if="errors.itemId" class="error-message">
              {{ errors.itemId }}
            </div>
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
              v-if="selectedItem && form.movementType === 'OUT'"
              class="stock-info"
            >
              <small>
                Stok tersedia: {{ selectedItem.available_quantity || 0 }}
                <span
                  v-if="form.quantity > (selectedItem.available_quantity || 0)"
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
            <FormInput
              id="referenceType"
              label="Tipe Referensi"
              v-model="form.referenceType"
              placeholder="Contoh: purchase, adjustment, return"
            />
          </div>
          <div class="field-group">
            <FormInput
              id="referenceId"
              label="ID Referensi"
              type="number"
              v-model.number="form.referenceId"
              placeholder="ID transaksi terkait (opsional)"
            />
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

  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { getStoredUser } from "@/services/auth";
import { useItemStore } from "@/store/items";
import { createStockMovement } from "@/services/transactions";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";

export default {
  name: "StockMovementForm",
  components: {
    AppDialog,
    FormInput,
  },

  props: {
    modelValue: Boolean,
  },

  emits: ["update:modelValue", "saved"],

  setup(props, { emit }) {
    const itemStore = useItemStore();
    const loading = ref(false);
    const errors = ref({});

    // Form state
    const form = ref({
      itemId: "",
      movementType: "",
      quantity: 1,
      referenceType: "",
      referenceId: "",
      notes: "",
    });

    // Computed
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const items = computed(() => itemStore.items);
    const selectedItem = computed(() =>
      itemStore.items.find((item) => item.id === form.value.itemId),
    );

    // Methods
    const validateForm = () => {
      const newErrors = {};

      if (!form.value.itemId) {
        newErrors.itemId = "Item harus dipilih";
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
        selectedItem.value &&
        form.value.quantity > (selectedItem.value.available_quantity || 0)
      ) {
        newErrors.quantity = "Stok tidak mencukupi";
      }

      errors.value = newErrors;
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;

      loading.value = true;
      try {
        const user = getStoredUser();
        const movementData = {
          ...form.value,
          userId: user?.id || 1,
        };

        await createStockMovement(movementData);

        emit("saved");
        showDialog.value = false;
      } catch (error) {
        console.error("Error saving stock movement:", error);
        errors.value.submit = error.message || "Gagal menyimpan pergerakan stok";
      } finally {
        loading.value = false;
      }
    };

    // Reset form when dialog opens
    const resetForm = () => {
      form.value = {
        itemId: "",
        movementType: "",
        quantity: 1,
        referenceType: "",
        referenceId: "",
        notes: "",
      };
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
        }
      },
    );

    onMounted(() => {
      if (!itemStore.items.length) {
        itemStore.fetchItems();
      }
    });

    return {
      form,
      errors,
      loading,
      showDialog,
      items,
      selectedItem,
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
</style>


