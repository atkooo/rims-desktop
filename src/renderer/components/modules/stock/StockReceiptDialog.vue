<template>
  <AppDialog v-model="showDialog" title="Penerimaan Stok Baru" :max-width="780">
    <div class="receipt-dialog">
      <div class="page-header">
        <div>
          <h1>Penerimaan Stok Baru</h1>
          <p class="subtitle">
            Catat penerimaan barang baru dari supplier langsung ke gudang agar status stok sesuai.
          </p>
        </div>
      </div>

      <section class="card-section form-section">
        <h3>Produk diterima</h3>
        <div class="form-grid">
          <div class="field-group">
            <label for="type">Tipe Produk</label>
            <select
              id="type"
              v-model="form.type"
              class="form-select"
              :class="{ error: errors.type }"
              @change="handleTypeChange"
            >
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
            <select
              id="bundleType"
              v-model="form.bundleType"
              class="form-select"
              :class="{ error: errors.bundleType }"
            >
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
            <label for="quantity">Jumlah</label>
            <input
              id="quantity"
              type="number"
              min="1"
              v-model.number="form.quantity"
              class="form-input"
            />
            <div v-if="errors.quantity" class="error-message">
              {{ errors.quantity }}
            </div>
          </div>
        </div>

        <div class="picker-section">
          <label>Produk</label>
          <div class="picker-selector">
            <div v-if="selectedReference" class="selected-reference">
              <div>
                <strong>{{ selectedReference.name }}</strong>
                <div class="reference-code" v-if="selectedReference.code">
                  {{ selectedReference.code }}
                </div>
              </div>
              <AppButton variant="ghost" size="small" @click="clearSelection">
                Hapus
              </AppButton>
            </div>
            <AppButton
              v-else
              variant="secondary"
              :disabled="!canOpenPicker"
              @click="openPicker"
            >
              <Icon name="search" :size="16" />
              <span>{{ pickerBtnLabel }}</span>
            </AppButton>
          </div>
          <div v-if="errors.reference" class="error-message">
            {{ errors.reference }}
          </div>
        </div>

        <div class="actions">
          <AppButton variant="primary" size="small" @click="addLine">
            Tambah ke daftar
          </AppButton>
          <div v-if="infoMessage" class="info-message">{{ infoMessage }}</div>
        </div>
      </section>

      <section class="card-section form-section">
        <h3>Daftar Penerimaan</h3>
        <div v-if="lines.length === 0" class="empty-state">
          Belum ada item yang ditambahkan ke penerimaan.
        </div>
        <table v-else class="lines-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tipe</th>
              <th>Produk</th>
              <th>Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in lines" :key="line.id">
              <td>{{ index + 1 }}</td>
              <td class="text-capitalize">{{ line.type }}</td>
              <td>
                <strong>{{ line.name }}</strong>
                <div class="reference-code">{{ line.code }}</div>
              </td>
              <td>{{ line.quantity }}</td>
              <td>
                <AppButton variant="ghost" size="small" @click="removeLine(index)">
                  Hapus
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card-section form-section">
        <h3>Catatan</h3>
        <FormInput
          id="notes"
          label="Catatan"
          type="textarea"
          v-model="form.notes"
          placeholder="Misalnya supplier, alasan penerimaan, dll."
        />
      </section>

      <div v-if="errors.submit" class="form-error">
        {{ errors.submit }}
      </div>

      <div class="dialog-footer">
        <AppButton variant="secondary" @click="closeDialog">Batal</AppButton>
        <AppButton
          variant="primary"
          :loading="loading"
          :disabled="lines.length === 0"
          @click="handleSubmit"
        >
          Simpan Penerimaan
        </AppButton>
      </div>

      <ItemPickerDialog
        v-model="showItemPicker"
        :restrict-stock="false"
        :check-status="false"
        @select="handleItemSelect"
      />
      <BundlePickerDialog
        v-model="showBundlePicker"
        :bundle-type="form.bundleType || 'both'"
        :restrict-stock="false"
        @select="handleBundleSelect"
      />
      <AccessoryPickerDialog
        v-model="showAccessoryPicker"
        :restrict-stock="false"
        :check-status="false"
        @select="handleAccessorySelect"
      />
    </div>
  </AppDialog>
</template>

<script>
import { ref, computed, watch } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import BundlePickerDialog from "@/components/modules/bundles/BundlePickerDialog.vue";
import AccessoryPickerDialog from "@/components/modules/accessories/AccessoryPickerDialog.vue";
import { getStoredUser } from "@/services/auth";
import { createStockReceipt } from "@/services/stock";

export default {
  name: "StockReceiptDialog",
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
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const form = ref({
      type: null,
      bundleType: null,
      quantity: 1,
      notes: "",
    });

    const errors = ref({});
    const infoMessage = ref("");
    const loading = ref(false);
    const lines = ref([]);
    const showItemPicker = ref(false);
    const showBundlePicker = ref(false);
    const showAccessoryPicker = ref(false);
    const selectedReference = ref(null);

    const canOpenPicker = computed(
      () => !!form.value.type && (form.value.type !== "bundle" || !!form.value.bundleType),
    );

    const pickerBtnLabel = computed(() => {
      if (form.value.type === "item") return "Cari Item";
      if (form.value.type === "bundle") return "Cari Bundle";
      if (form.value.type === "accessory") return "Cari Aksesoris";
      return "Pilih tipe terlebih dahulu";
    });

    const handleTypeChange = () => {
      selectedReference.value = null;
      errors.value.reference = "";
    };

    const openPicker = () => {
      if (!form.value.type) {
        errors.value.type = "Tipe wajib dipilih";
        return;
      }
      if (form.value.type === "bundle" && !form.value.bundleType) {
        errors.value.bundleType = "Tipe bundle wajib dipilih";
        return;
      }

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
      errors.value.reference = "";
    };
      const handleBundleSelect = (bundle) => {
        selectedReference.value = bundle;
        errors.value.reference = "";
      };
      const handleAccessorySelect = (accessory) => {
        selectedReference.value = accessory;
        errors.value.reference = "";
      };

    const clearSelection = () => {
      selectedReference.value = null;
      errors.value.reference = "";
    };

    const addLine = () => {
      const newErrors = {};
      if (!form.value.type) {
        newErrors.type = "Tipe wajib dipilih";
      }
      if (form.value.type === "bundle" && !form.value.bundleType) {
        newErrors.bundleType = "Tipe bundle wajib dipilih";
      }
      if (!selectedReference.value) {
        newErrors.reference = "Produk wajib dipilih";
      }
      if (!form.value.quantity || form.value.quantity < 1) {
        newErrors.quantity = "Jumlah minimal 1";
      }
      if (Object.keys(newErrors).length) {
        errors.value = newErrors;
        return;
      }

      lines.value.push({
        id: Date.now() + Math.random(),
        type: form.value.type,
        bundleType: form.value.bundleType,
        referenceId: selectedReference.value.id,
        name: selectedReference.value.name || selectedReference.value.code,
        code: selectedReference.value.code || "-",
        quantity: form.value.quantity,
      });

      form.value.quantity = 1;
      selectedReference.value = null;
      errors.value = {};
      infoMessage.value = "Line berhasil ditambahkan.";
    };

    const removeLine = (index) => {
      lines.value.splice(index, 1);
      infoMessage.value = "";
    };

    const validateLines = () => {
      if (!lines.value.length) {
        errors.value.submit = "Tambahkan minimal satu produk yang diterima.";
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      errors.value.submit = "";
      if (!validateLines()) {
        return;
      }

      loading.value = true;
      try {
        const payload = {
          userId: getStoredUser()?.id || null,
          notes: form.value.notes,
          lines: lines.value.map((line) => ({
            type: line.type,
            referenceId: line.referenceId,
            quantity: line.quantity,
          })),
        };
        await createStockReceipt(payload);
        emit("saved");
        closeDialog();
      } catch (error) {
        errors.value.submit = error.message || "Gagal menyimpan penerimaan stok.";
      } finally {
        loading.value = false;
      }
    };

    const closeDialog = () => {
      showDialog.value = false;
      lines.value = [];
      form.value = {
        type: null,
        bundleType: null,
        quantity: 1,
        notes: "",
      };
      selectedReference.value = null;
      errors.value = {};
      infoMessage.value = "";
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (!value) {
          closeDialog();
        }
      },
    );

    return {
      showDialog,
      form,
      errors,
      infoMessage,
      loading,
      lines,
      showItemPicker,
      showBundlePicker,
      showAccessoryPicker,
      selectedReference,
      canOpenPicker,
      pickerBtnLabel,
      openPicker,
      handleItemSelect,
      handleBundleSelect,
      handleAccessorySelect,
      clearSelection,
      addLine,
      removeLine,
      handleSubmit,
      closeDialog,
    };
  },
};
</script>

<style scoped>
.receipt-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.subtitle {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  align-items: end;
}

.picker-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.picker-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-reference {
  display: flex;
  flex: 1;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.reference-code {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
}

.errors {
  color: #dc2626;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-message {
  color: #0f766e;
  font-weight: 500;
}

.lines-table {
  width: 100%;
  border-collapse: collapse;
}

.lines-table th,
.lines-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.lines-table th {
  background: #f9fafb;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.empty-state {
  color: #6b7280;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  background: #fff;
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  font-size: 0.95rem;
}

.error-message {
  font-size: 0.8rem;
  color: #dc2626;
}

.text-capitalize {
  text-transform: capitalize;
}
</style>
