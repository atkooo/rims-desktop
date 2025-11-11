<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Pelanggan' : 'Pelanggan Baru'"
    :confirm-text="isEdit ? 'Update' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form class="customer-form" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <FormInput
          id="customerName"
          label="Nama Lengkap"
          v-model="form.name"
          :error="errors.name"
          maxlength="200"
          required
        />
        <FormInput
          id="customerPhone"
          label="Nomor Telepon"
          v-model="form.phone"
          :error="errors.phone"
          maxlength="20"
        />
        <FormInput
          id="customerEmail"
          label="Email"
          type="email"
          v-model="form.email"
          :error="errors.email"
          maxlength="100"
        />
        <FormInput
          id="customerIdCardNumber"
          label="Nomor KTP"
          v-model="form.id_card_number"
          :error="errors.id_card_number"
          maxlength="50"
        />
        <div class="form-group">
          <label class="form-label" for="customerDiscountGroup">Grup Diskon</label>
          <select
            id="customerDiscountGroup"
            v-model="form.discount_group_id"
            class="form-select"
          >
            <option value="">Tidak Ada</option>
              <option
                v-for="group in discountGroups"
                :key="group.id"
                :value="group.id"
              >
                {{ group.name }}
                <template v-if="group.discount_percentage > 0">
                  ({{ group.discount_percentage }}%)
                </template>
                <template v-else-if="group.discount_amount > 0">
                  ({{ formatCurrency(group.discount_amount) }})
                </template>
              </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="customerStatus">Status</label>
          <select
            id="customerStatus"
            v-model="form.is_active"
            class="form-select"
          >
            <option :value="true">Aktif</option>
            <option :value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="customerAddress">Alamat</label>
        <textarea
          id="customerAddress"
          v-model="form.address"
          class="form-textarea"
          rows="3"
          maxlength="500"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="customerNotes">Catatan</label>
        <textarea
          id="customerNotes"
          v-model="form.notes"
          class="form-textarea"
          rows="3"
          maxlength="500"
        ></textarea>
      </div>

      <div class="document-section">
        <h3>Dokumen Penyewa</h3>
        <p class="document-hint">
          Format yang didukung: JPG, PNG, WebP. Ukuran maksimal 5MB per file.
        </p>

        <div class="document-grid">
          <div class="document-card">
            <label class="form-label">Foto Diri</label>
            <label class="file-input">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="handleFileSelect('photo', $event)"
              />
              <span>Pilih File</span>
            </label>
            <p v-if="documentErrors.photo" class="error-message">
              {{ documentErrors.photo }}
            </p>

            <div v-if="photoPreview" class="preview">
              <img :src="photoPreview" alt="Foto pelanggan" />
              <div class="preview-meta">
                <span class="file-name">{{ photoFileName }}</span>
                <button
                  type="button"
                  class="link-button"
                  @click="clearDocument('photo')"
                >
                  Hapus
                </button>
              </div>
            </div>

            <label v-else-if="existingPhotoPath" class="remove-checkbox">
              <input type="checkbox" v-model="removePhoto" />
              <span>Hapus foto tersimpan</span>
            </label>
          </div>

          <div class="document-card">
            <label class="form-label">Foto KTP</label>
            <label class="file-input">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="handleFileSelect('idCard', $event)"
              />
              <span>Pilih File</span>
            </label>
            <p v-if="documentErrors.idCard" class="error-message">
              {{ documentErrors.idCard }}
            </p>

            <div v-if="idCardPreview" class="preview">
              <img :src="idCardPreview" alt="Foto KTP" />
              <div class="preview-meta">
                <span class="file-name">{{ idCardFileName }}</span>
                <button
                  type="button"
                  class="link-button"
                  @click="clearDocument('idCard')"
                >
                  Hapus
                </button>
              </div>
            </div>

            <label v-else-if="existingIdCardPath" class="remove-checkbox">
              <input type="checkbox" v-model="removeIdCard" />
              <span>Hapus KTP tersimpan</span>
            </label>
          </div>
        </div>
      </div>

      <p v-if="submitError" class="submit-error">{{ submitError }}</p>
    </form>
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import {
  createCustomer,
  updateCustomer,
  fetchCustomerDocument,
  fetchDiscountGroups,
} from "@/services/masterData";

const defaultForm = () => ({
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  id_card_number: "",
  notes: "",
  discount_group_id: "",
  is_active: true,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

export default {
  name: "CustomerForm",
  components: { AppDialog, FormInput },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    editData: {
      type: Object,
      default: null,
    },
  },
  emits: ["update:modelValue", "saved"],
  setup(props, { emit }) {
    const loading = ref(false);
    const form = ref(defaultForm());
    const errors = ref({});
    const submitError = ref("");
    const documentErrors = ref({ photo: "", idCard: "" });
    const discountGroups = ref([]);

    const photoPayload = ref(null);
    const idCardPayload = ref(null);

    const photoPreview = ref("");
    const idCardPreview = ref("");
    const photoFileName = ref("");
    const idCardFileName = ref("");

    const existingPhotoPath = ref(null);
    const existingIdCardPath = ref(null);
    const removePhoto = ref(false);
    const removeIdCard = ref(false);

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    };

    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const isEdit = computed(() => !!props.editData?.id);

    const readFileAsDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Gagal membaca file"));
        reader.readAsDataURL(file);
      });

    const buildPayload = async (file) => {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.split(",")[1];
      return {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64,
        encoding: "base64",
        preview: dataUrl,
      };
    };

    const resetDocuments = () => {
      photoPayload.value = null;
      idCardPayload.value = null;
      photoPreview.value = "";
      idCardPreview.value = "";
      photoFileName.value = "";
      idCardFileName.value = "";
      documentErrors.value = { photo: "", idCard: "" };
      removePhoto.value = false;
      removeIdCard.value = false;
    };

    const resetForm = () => {
      form.value = defaultForm();
      errors.value = {};
      submitError.value = "";
      existingPhotoPath.value = props.editData?.photo_path ?? null;
      existingIdCardPath.value = props.editData?.id_card_image_path ?? null;
      resetDocuments();

      if (props.editData) {
        form.value = {
          ...form.value,
          ...props.editData,
          discount_group_id: props.editData.discount_group_id || "",
          is_active:
            props.editData.is_active === true ||
            props.editData.is_active === 1 ||
            props.editData.is_active === "1",
        };
        loadExistingDocuments();
      }
    };

    const loadDiscountGroups = async () => {
      try {
        discountGroups.value = await fetchDiscountGroups();
      } catch (error) {
        console.error("Gagal memuat discount groups:", error);
      }
    };

    const loadExistingDocuments = async () => {
      if (existingPhotoPath.value) {
        try {
          const result = await fetchCustomerDocument(existingPhotoPath.value);
          if (result?.dataUrl) {
            photoPreview.value = result.dataUrl;
            photoFileName.value = result.fileName ?? "foto-pelanggan";
          }
        } catch (error) {
          console.warn("Gagal memuat foto pelanggan:", error?.message ?? error);
        }
      }

      if (existingIdCardPath.value) {
        try {
          const result = await fetchCustomerDocument(existingIdCardPath.value);
          if (result?.dataUrl) {
            idCardPreview.value = result.dataUrl;
            idCardFileName.value = result.fileName ?? "ktp";
          }
        } catch (error) {
          console.warn("Gagal memuat foto KTP:", error?.message ?? error);
        }
      }
    };

    const validate = () => {
      const validationErrors = {};

      // Code is optional - will be auto-generated if empty
      // No validation needed for code

      if (!form.value.name || !form.value.name.trim()) {
        validationErrors.name = "Nama pelanggan wajib diisi";
      }

      if (form.value.email && !/.+@.+\..+/.test(form.value.email)) {
        validationErrors.email = "Format email tidak valid";
      }

      errors.value = validationErrors;
      return Object.keys(validationErrors).length === 0;
    };

    const handleFileSelect = async (type, event) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        documentErrors.value = {
          ...documentErrors.value,
          [type === "photo" ? "photo" : "idCard"]:
            "Format file harus JPG, PNG, atau WebP",
        };
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        documentErrors.value = {
          ...documentErrors.value,
          [type === "photo" ? "photo" : "idCard"]:
            "Ukuran file melebihi 5MB",
        };
        return;
      }

      try {
        const payload = await buildPayload(file);

        if (type === "photo") {
          photoPayload.value = payload;
          photoPreview.value = payload.preview;
          photoFileName.value = file.name;
          removePhoto.value = false;
        } else {
          idCardPayload.value = payload;
          idCardPreview.value = payload.preview;
          idCardFileName.value = file.name;
          removeIdCard.value = false;
        }

        documentErrors.value = {
          ...documentErrors.value,
          [type === "photo" ? "photo" : "idCard"]: "",
        };
      } catch (error) {
        documentErrors.value = {
          ...documentErrors.value,
          [type === "photo" ? "photo" : "idCard"]:
            "Gagal memproses file. Silakan coba lagi.",
        };
      }
    };

    const clearDocument = (type) => {
      if (type === "photo") {
        photoPayload.value = null;
        photoPreview.value = "";
        photoFileName.value = "";
        if (existingPhotoPath.value) {
          removePhoto.value = true;
        }
      } else {
        idCardPayload.value = null;
        idCardPreview.value = "";
        idCardFileName.value = "";
        if (existingIdCardPath.value) {
          removeIdCard.value = true;
        }
      }
    };

    const handleSubmit = async () => {
      if (!validate()) return;

      loading.value = true;
      submitError.value = "";

      const payload = {
        // Code will be auto-generated if empty (for new customers)
        code: form.value.code?.trim() || "",
        name: form.value.name.trim(),
        phone: form.value.phone?.trim() || "",
        email: form.value.email?.trim() || "",
        address: form.value.address?.trim() || "",
        id_card_number: form.value.id_card_number?.trim() || "",
        notes: form.value.notes?.trim() || "",
        discount_group_id: form.value.discount_group_id || null,
        is_active: !!form.value.is_active,
      };

      const options = {};

      if (photoPayload.value) {
        payload.photo = {
          name: photoPayload.value.name,
          mimeType: photoPayload.value.mimeType,
          data: photoPayload.value.data,
          encoding: photoPayload.value.encoding,
        };
      } else if (removePhoto.value) {
        options.removePhoto = true;
      }

      if (idCardPayload.value) {
        payload.id_card_image = {
          name: idCardPayload.value.name,
          mimeType: idCardPayload.value.mimeType,
          data: idCardPayload.value.data,
          encoding: idCardPayload.value.encoding,
        };
      } else if (removeIdCard.value) {
        options.removeIdCard = true;
      }

      try {
        if (isEdit.value) {
          await updateCustomer(props.editData.id, payload, options);
        } else {
          await createCustomer(payload);
        }
        emit("saved");
        showDialog.value = false;
      } catch (error) {
        submitError.value =
          error?.message || "Gagal menyimpan data pelanggan.";
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          resetForm();
        } else {
          resetDocuments();
        }
      },
    );

    watch(
      () => props.editData,
      () => {
        if (props.modelValue) {
          resetForm();
        }
      },
    );

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          loadDiscountGroups();
        }
      },
    );

    onMounted(() => {
      if (props.modelValue) {
        loadDiscountGroups();
      }
    });

    return {
      showDialog,
      isEdit,
      loading,
      form,
      errors,
      submitError,
      documentErrors,
      photoPreview,
      idCardPreview,
      photoFileName,
      idCardFileName,
      existingPhotoPath,
      existingIdCardPath,
      removePhoto,
      removeIdCard,
      discountGroups,
      formatCurrency,
      handleSubmit,
      handleFileSelect,
      clearDocument,
    };
  },
};
</script>

<style scoped>
.customer-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.95rem;
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.document-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.document-section h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}

.document-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
}

.document-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.file-input {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.45rem 0.8rem;
  border: 1px dashed #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  color: #1d4ed8;
  background: #fff;
  font-size: 0.9rem;
  font-weight: 500;
}

.file-input input {
  display: none;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.6rem;
}

.preview img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 4px;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.file-name {
  font-size: 0.85rem;
  color: #374151;
  word-break: break-all;
}

.link-button {
  border: none;
  background: none;
  padding: 0;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.85rem;
}

.link-button:hover {
  text-decoration: underline;
}

.remove-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #4b5563;
}

.error-message {
  margin: 0;
  color: #dc2626;
  font-size: 0.82rem;
}

.submit-error {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.9rem;
}
</style>

