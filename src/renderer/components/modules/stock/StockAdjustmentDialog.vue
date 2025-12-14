<template>
  <AppDialog
    v-model="showDialog"
    title="Penyesuaian Stock Opname"
    :max-width="520"
    :show-footer="false"
  >
    <div class="adjustment-dialog">
      <p class="subtitle">
        Catatan penyesuaian hanya muncul jika stok fisik tidak sesuai dengan mutasi. Pastikan sudah cek audit sebelum menyimpan.
      </p>
      <div class="summary-card">
        <header>
          <span class="summary-label">Produk</span>
          <strong>{{ entityName || "-" }}</strong>
        </header>
        <div class="summary-values">
          <div>
            <small>Stok Sistem</small>
            <p>{{ formatNumber(currentQuantity) }}</p>
          </div>
          <div>
            <small>Stok Log</small>
            <p>{{ formatNumber(calculatedQuantity) }}</p>
          </div>
          <div class="difference">
            <small>Selisih</small>
            <p>
              {{ formatNumber(Math.abs(difference)) }}
              <span class="difference-note">
                {{ difference >= 0 ? "Sistem terlalu banyak" : "Sistem kurang" }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="field-group">
          <label>Tipe Penyesuaian</label>
          <select v-model="form.movementType" class="form-select">
            <option value="IN">Tambah Stok (IN)</option>
            <option value="OUT">Kurangi Stok (OUT)</option>
          </select>
        </div>
        <div class="field-group">
          <label>Jumlah Koreksi</label>
          <input
            type="number"
            min="1"
            v-model.number="form.quantity"
            class="form-input"
          />
          <small class="hint">
            Takaran default mengikuti selisih, ubah jika perlu.
          </small>
        </div>
      </div>

      <FormInput
        id="adjustmentNotes"
        label="Catatan"
        type="textarea"
        v-model="form.notes"
        placeholder="Misal: Audit 12 Des 2025, lanjutkan koreksi."
      />

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div class="dialog-footer">
        <AppButton variant="secondary" class="ghost-action" @click="closeDialog">Batal</AppButton>
        <AppButton
          variant="primary"
          :disabled="!canSubmit"
          :loading="loading"
          @click="submitAdjustment"
        >
          Simpan Penyesuaian
        </AppButton>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import { createStockAdjustment } from "@/services/stock";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "StockAdjustmentDialog",
  components: {
    AppDialog,
    AppButton,
    FormInput,
  },
  props: {
    modelValue: Boolean,
    entityId: Number,
    entityType: {
      type: String,
      default: "item",
    },
    entityName: {
      type: String,
      default: "",
    },
    currentQuantity: {
      type: Number,
      default: 0,
    },
    calculatedQuantity: {
      type: Number,
      default: 0,
    },
    userId: {
      type: Number,
      default: null,
    },
  },
  emits: ["update:modelValue", "saved"],
  setup(props, { emit }) {
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const form = ref({
      movementType: "OUT",
      quantity: 0,
      notes: "",
    });

    const loading = ref(false);
    const error = ref("");

    const difference = computed(() => {
      return (props.currentQuantity || 0) - (props.calculatedQuantity || 0);
    });

    const canSubmit = computed(() => {
      return form.value.quantity > 0 && !!props.entityId;
    });

    const populateDefaults = () => {
      form.value.notes = "";
      const diff = Math.abs(difference.value);
      form.value.quantity = diff || 1;
      form.value.movementType = difference.value >= 0 ? "OUT" : "IN";
      error.value = "";
    };

    watch(
      () => props.entityId,
      (value) => {
        if (value && showDialog.value) {
          populateDefaults();
        }
      },
    );

    watch(
      () => showDialog.value,
      (value) => {
        if (value) {
          populateDefaults();
        } else {
          error.value = "";
        }
      },
    );

    const { showSuccess, showError } = useNotification();

    const getFriendlyMessage = (err) => {
      if (!err) return "Gagal menyimpan penyesuaian.";
      if (err.message && err.message.startsWith("SQLITE")) {
        return "Koreksi gagal karena kendala database, coba lagi beberapa saat.";
      }
      return err.message || "Gagal menyimpan penyesuaian.";
    };

    const submitAdjustment = async () => {
      if (!canSubmit.value) return;
      loading.value = true;
      error.value = "";
      try {
        await createStockAdjustment({
          entityType: props.entityType,
          entityId: props.entityId,
          movementType: form.value.movementType,
          quantity: form.value.quantity,
          notes: form.value.notes,
          userId: props.userId || null,
        });
        emit("saved");
        showDialog.value = false;
        showSuccess("Penyesuaian stok berhasil disimpan.");
      } catch (err) {
        const friendly = getFriendlyMessage(err);
        error.value = friendly;
        showError(friendly);
      } finally {
        loading.value = false;
      }
    };

    const closeDialog = () => {
      showDialog.value = false;
    };

    const { formatNumberInput } = useNumberFormat();
    const formatNumber = formatNumberInput;

    return {
      showDialog,
      form,
      difference,
      submitAdjustment,
      closeDialog,
      loading,
      error,
      canSubmit,
      formatNumber,
    };
  },
};
</script>

<style scoped>
.adjustment-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 360px;
}

.subtitle {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.summary-card header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.summary-card .summary-label {
  font-size: 0.8rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.summary-card strong {
  font-size: 1.1rem;
}

.summary-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  align-items: center;
}

.summary-values div {
  border-radius: 10px;
  padding: 0.3rem 0.5rem;
  background: #f9fafb;
  text-align: center;
}

.summary-values small {
  display: block;
  color: #6b7280;
  font-size: 0.75rem;
  margin-bottom: 0.1rem;
}

.summary-values p {
  margin: 0;
  font-weight: 600;
  color: #111827;
}

.summary-values .difference {
  grid-column: span 3;
}

.difference-note {
  display: block;
  font-size: 0.7rem;
  color: #9d174d;
}

.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-select,
.form-input {
  border: 1px solid #d4d4d8;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
  transition: border 0.2s ease;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.hint {
  font-size: 0.75rem;
  color: #6b7280;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.error-banner {
  background: #fee2e2;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #991b1b;
}

.ghost-action {
  background: transparent;
  border: 1px dashed #cbd5f5;
  color: #475569;
}

.ghost-action:hover:not(:disabled) {
  background: #f8fafc;
}
</style>
