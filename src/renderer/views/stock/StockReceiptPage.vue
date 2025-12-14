<template>
  <div class="data-page master-page stock-receipt-page">
    <div class="page-header">
      <div>
        <h1>Penerimaan Stok</h1>
        <p class="subtitle">
          Catat penerimaan item, bundle, maupun aksesoris agar stok fisik mengikuti mutasi otomatis.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="secondary" size="small" @click="resetForm">
          Reset Form
        </AppButton>
        <AppButton
          variant="primary"
          :loading="loading"
          :disabled="lines.length === 0"
          @click="handleSubmit"
        >
          Simpan Penerimaan
        </AppButton>
      </div>
    </div>

    <section class="card-section form-section">
      <h3>Produk diterima</h3>
      <div class="form-grid">
        <div class="field-group">
          <label>Tipe Produk</label>
          <select
            v-model="form.type"
            class="form-select"
            :class="{ error: errors.type }"
            @change="handleTypeChange"
          >
            <option :value="null" disabled>Pilih tipe</option>
            <option value="item">Item</option>
            <option value="bundle">Bundle/Paket</option>
            <option value="accessory">Aksesoris</option>
          </select>
          <div v-if="errors.type" class="error-message">{{ errors.type }}</div>
        </div>
        <div class="field-group" v-if="form.type === 'bundle'">
          <label>Tipe Bundle</label>
          <select
            v-model="form.bundleType"
            class="form-select"
            :class="{ error: errors.bundleType }"
          >
            <option :value="null" disabled>Pilih tipe bundle</option>
            <option value="both">Both</option>
            <option value="sale">Sale</option>
            <option value="rental">Rental</option>
          </select>
          <div v-if="errors.bundleType" class="error-message">
            {{ errors.bundleType }}
          </div>
        </div>
        <div class="field-group">
          <label>Jumlah</label>
          <input
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
              <p class="reference-code">{{ selectedReference.code }}</p>
            </div>
            <AppButton variant="ghost" size="small" @click="clearSelection">
              Hapus
            </AppButton>
          </div>
          <AppButton
            v-else
            variant="secondary"
            :disabled="!canOpenPicker"
            size="small"
            @click="openPicker"
          >
            <Icon name="search" size="16" />
            <span>{{ pickerBtnLabel }}</span>
          </AppButton>
        </div>
        <div v-if="errors.reference" class="error-message">{{ errors.reference }}</div>
      </div>

      <div class="actions">
        <AppButton variant="primary" size="small" @click="addLine">
          Tambah ke daftar
        </AppButton>
        <span v-if="infoMessage" class="info-message">{{ infoMessage }}</span>
      </div>
      <div v-if="form.type === 'bundle'" class="bundle-availability-wrapper">
        <div v-if="bundleAvailabilityLoading" class="bundle-availability-banner">
          <Icon name="loader" size="14" class="icon-spin" />
          <span>Memuat informasi komponen...</span>
        </div>
        <div v-else-if="bundleAvailability" class="bundle-availability-card">
          <div class="bundle-availability-header">
            <div>
              <strong>Info paket {{ bundleAvailability.bundleName }}</strong>
              <span class="reference-code">{{ bundleAvailability.bundleCode }}</span>
            </div>
            <span
              class="availability-badge"
              :class="{
                'badge-success': bundleAvailability.maxAssemblable > 0,
                'badge-danger': bundleAvailability.maxAssemblable === 0,
              }"
            >
              {{
                bundleAvailability.maxAssemblable > 0
                  ? `Komponen cukup untuk ${bundleAvailability.maxAssemblable} paket`
                  : "Komponen tidak cukup"
              }}
            </span>
          </div>
          <div class="bundle-availability-stats">
            <div>
              <span>Stok bundle saat ini</span>
              <strong>{{ bundleAvailability.bundleAvailable }}</strong>
            </div>
            <div>
              <span>Komponen terlibat</span>
              <strong>{{ bundleAvailability.components.length }} item</strong>
            </div>
          </div>
          <div class="bundle-components">
            <div
              v-for="component in bundleAvailability.components"
              :key="component.id"
              class="bundle-component"
            >
              <div class="component-title">
                {{ component.name }}
                <span class="reference-code">{{ component.code }}</span>
              </div>
              <div class="component-meta">
                {{ component.type === "item" ? "Item" : "Aksesoris" }} ·
                {{ component.available_quantity }} tersedia · butuh
                {{ component.detail_quantity }} per paket
              </div>
              <div class="component-limit">
                Maksimal {{ component.maxBundles }} paket
              </div>
            </div>
          </div>
        </div>
        <div
          v-else-if="bundleAvailabilityError"
          class="form-error"
          style="margin-top: 0.5rem;"
        >
          {{ bundleAvailabilityError }}
        </div>
      </div>
    </section>

    <section class="card-section form-section">
      <h3>Daftar Penerimaan</h3>
      <div v-if="lines.length === 0" class="empty-state">
        Belum ada produk yang ditambahkan.
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
              <span class="reference-code">{{ line.code }}</span>
            </td>
            <td>{{ line.quantity }}</td>
            <td>
              <AppButton
                variant="ghost"
                size="small"
                @click="removeLine(index)"
              >
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
        placeholder="Supplier, alasan penerimaan, atau referensi."
      />
      <p v-if="errors.submit" class="form-error">{{ errors.submit }}</p>
    </section>

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
</template>

<script>
import { computed, ref, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import Icon from "@/components/ui/Icon.vue";
import ItemPickerDialog from "@/components/modules/items/ItemPickerDialog.vue";
import BundlePickerDialog from "@/components/modules/bundles/BundlePickerDialog.vue";
import AccessoryPickerDialog from "@/components/modules/accessories/AccessoryPickerDialog.vue";
import { getStoredUser } from "@/services/auth";
import { createStockReceipt, fetchBundleAvailability } from "@/services/stock";
import { eventBus } from "@/utils/eventBus";

export default {
  name: "StockReceiptPage",
  components: {
    AppButton,
    FormInput,
    Icon,
    ItemPickerDialog,
    BundlePickerDialog,
    AccessoryPickerDialog,
  },
  setup() {
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
    const bundleAvailability = ref(null);
    const bundleAvailabilityLoading = ref(false);
    const bundleAvailabilityError = ref("");

    const canOpenPicker = computed(
      () =>
        !!form.value.type &&
        (form.value.type !== "bundle" || !!form.value.bundleType),
    );

    const pickerBtnLabel = computed(() => {
      if (form.value.type === "item") return "Cari Item";
      if (form.value.type === "bundle") return "Cari Bundle";
      if (form.value.type === "accessory") return "Cari Aksesoris";
      return "Pilih tipe produk terlebih dahulu";
    });

    const handleTypeChange = () => {
      selectedReference.value = null;
      errors.value.reference = "";
      bundleAvailability.value = null;
      bundleAvailabilityError.value = "";
      bundleAvailabilityLoading.value = false;
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

    const loadBundleAvailability = async (bundleId) => {
      if (!bundleId) {
        bundleAvailability.value = null;
        return;
      }
      bundleAvailabilityLoading.value = true;
      bundleAvailabilityError.value = "";
      try {
        bundleAvailability.value = await fetchBundleAvailability(bundleId);
      } catch (err) {
        bundleAvailabilityError.value = err.message || "Gagal memuat info paket.";
        bundleAvailability.value = null;
      } finally {
        bundleAvailabilityLoading.value = false;
      }
    };

    watch(
      () => [form.value.type, selectedReference.value],
      ([type, reference]) => {
        if (type === "bundle" && reference?.id) {
          loadBundleAvailability(reference.id);
        } else {
          bundleAvailability.value = null;
          bundleAvailabilityError.value = "";
        }
      },
    );

    const addLine = () => {
      const validation = {};
      if (!form.value.type) {
        validation.type = "Tipe wajib dipilih";
      }
      if (form.value.type === "bundle" && !form.value.bundleType) {
        validation.bundleType = "Tipe bundle wajib dipilih";
      }
      if (!selectedReference.value) {
        validation.reference = "Produk wajib dipilih";
      }
      if (!form.value.quantity || form.value.quantity < 1) {
        validation.quantity = "Jumlah minimal 1";
      }
      if (
        form.value.type === "bundle" &&
        bundleAvailability.value &&
        typeof bundleAvailability.value.maxAssemblable === "number" &&
        form.value.quantity > bundleAvailability.value.maxAssemblable
      ) {
        validation.quantity = `Komponen cukup untuk maksimal ${bundleAvailability.value.maxAssemblable} paket`;
      }
      if (Object.keys(validation).length) {
        errors.value = validation;
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
        errors.value.submit = "Tambahkan minimal satu produk.";
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
        eventBus.emit("inventory:updated");
        resetForm();
      } catch (error) {
        errors.value.submit =
          error.message || "Gagal menyimpan penerimaan stok.";
      } finally {
        loading.value = false;
      }
    };

    const resetForm = () => {
      form.value = {
        type: null,
        bundleType: null,
        quantity: 1,
        notes: "",
      };
      selectedReference.value = null;
      lines.value = [];
      errors.value = {};
      infoMessage.value = "";
      bundleAvailability.value = null;
      bundleAvailabilityError.value = "";
    };

    return {
      form,
      errors,
      infoMessage,
      loading,
      lines,
      showItemPicker,
      showBundlePicker,
      showAccessoryPicker,
      selectedReference,
      bundleAvailability,
      bundleAvailabilityLoading,
      bundleAvailabilityError,
      pickerBtnLabel,
      canOpenPicker,
      handleTypeChange,
      openPicker,
      handleItemSelect,
      handleBundleSelect,
      handleAccessorySelect,
      clearSelection,
      addLine,
      removeLine,
      handleSubmit,
      resetForm,
    };
  },
};
</script>

<style scoped>
.stock-receipt-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.25rem;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  font-size: 0.95rem;
}

.picker-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.picker-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selected-reference {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  background: #f9fafb;
}

.reference-code {
  color: #6b7280;
  font-size: 0.8rem;
  font-family: monospace;
}

.actions {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-message {
  color: #0f766e;
  font-weight: 500;
}

.bundle-availability-wrapper {
  margin-top: 0.75rem;
}

.bundle-availability-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475569;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

.bundle-availability-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  background: #f8fafc;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
  margin-top: 0.5rem;
}

.bundle-availability-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.availability-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  background: #dcfce7;
  color: #047857;
  text-transform: none;
}

.availability-badge.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.bundle-availability-stats {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #475569;
}

.bundle-availability-stats div strong {
  display: block;
  font-size: 1rem;
  color: #111827;
}

.bundle-components {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bundle-component {
  padding: 0.65rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.component-title {
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.component-meta {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.component-limit {
  font-size: 0.75rem;
  color: #475569;
  margin-top: 0.25rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

 .lines-table {
   width: 100%;
   border-collapse: collapse;
   margin-top: 0.75rem;
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

.dialog-footer {
  display: flex;
}

.empty-state {
  color: #6b7280;
  font-style: italic;
}

.form-error {
  margin-top: 0.5rem;
  color: #dc2626;
}

.subtitle {
  margin: 0;
  color: #475569;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.text-capitalize {
  text-transform: capitalize;
}
.text-capitalize {
  text-transform: capitalize;
}

.subtitle {
  margin: 0;
  color: #475569;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
