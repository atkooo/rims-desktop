<template>
  <AppDialog
    v-model="showDialog"
    :title="bundle ? `Kelola Komposisi - ${bundle.name}` : 'Kelola Komposisi'"
    :show-footer="false"
  >
    <div v-if="bundle" class="detail-editor">
      <form class="detail-form" @submit.prevent="handleSubmit">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Jenis</label>
            <select v-model="form.type" class="form-select" @change="handleTypeChange">
              <option value="item">Item</option>
              <option value="accessory">Aksesoris</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              {{ form.type === "item" ? "Pilih Item" : "Pilih Aksesoris" }}
            </label>
            <select v-model="form.referenceId" class="form-select">
              <option value="">-- Pilih --</option>
              <option
                v-for="option in referenceOptions"
                :key="`${form.type}-${option.id}`"
                :value="option.id"
              >
                {{ option.name }}
              </option>
            </select>
          </div>
          <FormInput
            id="quantity"
            label="Jumlah"
            type="number"
            min="1"
            v-model="form.quantity"
            :error="errors.quantity"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="detailNotes">Catatan</label>
          <textarea
            id="detailNotes"
            class="form-textarea"
            rows="2"
            v-model="form.notes"
          ></textarea>
        </div>
        <div class="form-actions">
          <AppButton type="button" variant="secondary" @click="resetForm" v-if="editingDetail">
            Batalkan Edit
          </AppButton>
          <AppButton type="submit" :loading="formSubmitting">
            {{ editingDetail ? "Update Detail" : "Tambah Detail" }}
          </AppButton>
        </div>
        <p v-if="formError" class="submit-error">{{ formError }}</p>
      </form>

      <div class="detail-list">
        <div v-if="detailsError" class="error-banner">
          {{ detailsError }}
        </div>
        <table class="detail-table" v-if="details.length">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Nama</th>
              <th>Jumlah</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="detail in details" :key="detail.id">
              <td>{{ detail.item_id ? "Item" : "Aksesoris" }}</td>
              <td>{{ detail.item_name || detail.accessory_name || "-" }}</td>
              <td>{{ detail.quantity }}</td>
              <td>{{ detail.notes || "-" }}</td>
              <td class="actions">
                <AppButton variant="secondary" @click="startEdit(detail)">
                  Edit
                </AppButton>
                <AppButton
                  variant="danger"
                  :loading="deleteLoadingId === detail.id"
                  @click="removeDetail(detail)"
                >
                  Hapus
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="detail-state">
          Belum ada komposisi untuk paket ini.
        </p>
      </div>
    </div>
    <p v-else class="detail-state">Pilih paket terlebih dahulu.</p>
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import {
  fetchBundleDetailsByBundle,
  createBundleDetail,
  updateBundleDetail,
  deleteBundleDetail,
  fetchAccessories,
} from "@/services/masterData";
import { useItemStore } from "@/store/items";

const defaultForm = () => ({
  type: "item",
  referenceId: "",
  quantity: 1,
  notes: "",
});

export default {
  name: "BundleDetailEditor",
  components: { AppDialog, AppButton, FormInput },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    bundle: {
      type: Object,
      default: null,
    },
  },
  emits: ["update:modelValue", "updated"],
  setup(props, { emit }) {
    const itemStore = useItemStore();
    const accessories = ref([]);
    const accessoriesLoading = ref(false);
    const accessoriesError = ref("");

    const details = ref([]);
    const detailsLoading = ref(false);
    const detailsError = ref("");

    const form = ref(defaultForm());
    const errors = ref({});
    const formError = ref("");
    const formSubmitting = ref(false);
    const editingDetail = ref(null);
    const deleteLoadingId = ref(null);

    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const referenceOptions = computed(() => {
      if (form.value.type === "accessory") return accessories.value;
      return itemStore.items || [];
    });

    const loadAccessories = async () => {
      accessoriesLoading.value = true;
      accessoriesError.value = "";
      try {
        accessories.value = await fetchAccessories();
      } catch (error) {
        accessoriesError.value = error.message || "Gagal memuat aksesoris.";
      } finally {
        accessoriesLoading.value = false;
      }
    };

    const ensureDependencies = async () => {
      if (!itemStore.items.length) {
        await itemStore.fetchItems().catch(() => {});
      }
      if (!accessories.value.length && !accessoriesLoading.value) {
        await loadAccessories();
      }
    };

    const loadDetails = async () => {
      if (!props.bundle?.id) {
        details.value = [];
        return;
      }
      detailsLoading.value = true;
      detailsError.value = "";
      try {
        details.value = await fetchBundleDetailsByBundle(props.bundle.id);
      } catch (error) {
        detailsError.value = error.message || "Gagal memuat detail paket.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const resetForm = () => {
      form.value = defaultForm();
      errors.value = {};
      formError.value = "";
      editingDetail.value = null;
    };

    const validateForm = () => {
      const validationErrors = {};
      if (!form.value.referenceId) {
        validationErrors.referenceId = "Pilih data terlebih dahulu";
      }
      const quantity = Number(form.value.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        validationErrors.quantity = "Jumlah harus lebih dari 0";
      }
      errors.value = validationErrors;
      return Object.keys(validationErrors).length === 0;
    };

    const buildDetailPayload = () => {
      const payload = {
        bundle_id: props.bundle.id,
        quantity: Number(form.value.quantity),
        notes: form.value.notes?.trim() ?? "",
      };
      if (form.value.type === "item") {
        payload.item_id = form.value.referenceId;
        payload.accessory_id = null;
      } else {
        payload.item_id = null;
        payload.accessory_id = form.value.referenceId;
      }
      return payload;
    };

    const handleSubmit = async () => {
      if (!props.bundle) return;
      if (!validateForm()) return;
      formSubmitting.value = true;
      formError.value = "";
      try {
        const payload = buildDetailPayload();
        if (editingDetail.value) {
          await updateBundleDetail(editingDetail.value.id, payload);
        } else {
          await createBundleDetail(payload);
        }
        await loadDetails();
        emit("updated");
        resetForm();
      } catch (error) {
        formError.value = error.message || "Gagal menyimpan detail paket.";
      } finally {
        formSubmitting.value = false;
      }
    };

    const startEdit = (detail) => {
      editingDetail.value = detail;
      form.value = {
        type: detail.item_id ? "item" : "accessory",
        referenceId: detail.item_id || detail.accessory_id || "",
        quantity: detail.quantity,
        notes: detail.notes || "",
      };
      errors.value = {};
      formError.value = "";
    };

    const handleTypeChange = () => {
      form.value.referenceId = "";
    };

    const removeDetail = async (detail) => {
      deleteLoadingId.value = detail.id;
      detailsError.value = "";
      try {
        await deleteBundleDetail(detail.id);
        await loadDetails();
        emit("updated");
        if (editingDetail.value && editingDetail.value.id === detail.id) {
          resetForm();
        }
      } catch (error) {
        detailsError.value = error.message || "Gagal menghapus detail.";
      } finally {
        deleteLoadingId.value = null;
      }
    };

    watch(
      () => showDialog.value,
      async (visible) => {
        if (visible && props.bundle) {
          await ensureDependencies();
          await loadDetails();
          resetForm();
        } else if (!visible) {
          details.value = [];
          resetForm();
        }
      },
    );

    watch(
      () => props.bundle?.id,
      async (bundleId) => {
        if (showDialog.value && bundleId) {
          await loadDetails();
        } else {
          details.value = [];
        }
      },
    );

    onMounted(() => {
      ensureDependencies();
    });

    return {
      showDialog,
      bundle: props.bundle,
      details,
      detailsLoading,
      detailsError,
      form,
      errors,
      formError,
      formSubmitting,
      editingDetail,
      deleteLoadingId,
      referenceOptions,
      handleSubmit,
      startEdit,
      removeDetail,
      resetForm,
      handleTypeChange,
    };
  },
};
</script>

<style scoped>
.detail-editor {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.55rem 0.65rem;
  font-size: 0.95rem;
}

.form-textarea {
  min-height: 70px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.detail-list {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table th {
  background: #f3f4f6;
  font-weight: 600;
}

.detail-table tr:last-child td {
  border-bottom: none;
}

.actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.detail-state {
  text-align: center;
  color: #6b7280;
  padding: 1rem 0;
}

.submit-error {
  color: #b91c1c;
  font-size: 0.9rem;
  margin: 0;
}
</style>
