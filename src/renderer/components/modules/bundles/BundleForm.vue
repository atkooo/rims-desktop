<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Paket' : 'Paket Baru'"
    :confirm-text="isEdit ? 'Update' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form class="bundle-form" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <FormInput
          id="name"
          label="Nama Paket"
          v-model="form.name"
          :error="errors.name"
          required
        />
        <div class="form-group">
          <label class="form-label" for="bundleType">Tipe Paket</label>
          <select
            id="bundleType"
            class="form-select"
            v-model="form.bundle_type"
            required
          >
            <option :value="null" disabled>Pilih Tipe Paket</option>
            <option value="rental">Rental</option>
            <option value="sale">Sale</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div class="form-group">
          <label for="price" class="form-label">Harga Paket</label>
          <input
            id="price"
            :value="formatNumberInput(form.price)"
            @input="handlePriceInput"
            type="text"
            class="form-input"
            :class="{ error: errors.price }"
          />
          <div v-if="errors.price" class="error-message">
            {{ errors.price }}
          </div>
        </div>
        <div class="form-group">
          <label for="rentalPrice" class="form-label">Harga Sewa / Hari</label>
          <input
            id="rentalPrice"
            :value="formatNumberInput(form.rental_price_per_day)"
            @input="handleRentalPriceInput"
            type="text"
            class="form-input"
            :class="{ error: errors.rental_price_per_day }"
          />
          <div v-if="errors.rental_price_per_day" class="error-message">
            {{ errors.rental_price_per_day }}
          </div>
        </div>
        <!-- Informasi Stok: Stok diatur melalui Manajemen Stok -->
        <div class="form-group grid-span-2">
          <div class="info-box">
            <small>
              <strong>Catatan:</strong> Stok paket diatur melalui menu 
              <strong>Transaksi → Pergerakan Stok</strong>. 
              Stok awal akan otomatis diset ke 0.
            </small>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Grup Diskon (Opsional)</label>
          <select v-model.number="form.discount_group_id" class="form-select">
            <option :value="null">Tidak ada diskon</option>
            <option
              v-for="discountGroup in discountGroups"
              :key="discountGroup.id"
              :value="discountGroup.id"
            >
              {{ discountGroup.name }}
              <template v-if="discountGroup.discount_percentage > 0">
                ({{ discountGroup.discount_percentage }}%)
              </template>
              <template v-else-if="discountGroup.discount_amount > 0">
                (Rp {{ formatCurrency(discountGroup.discount_amount) }})
              </template>
            </option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="description">Deskripsi</label>
        <textarea
          id="description"
          class="form-textarea"
          rows="3"
          v-model="form.description"
        ></textarea>
      </div>

      <label class="switch">
        <input type="checkbox" v-model="form.is_active" />
        <span>Aktif</span>
      </label>

      <p v-if="submitError" class="submit-error">{{ submitError }}</p>
    </form>
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import {
  createBundle,
  updateBundle,
  fetchDiscountGroups,
} from "@/services/masterData";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { ipcRenderer } from "@/services/ipc";

const defaultForm = () => ({
  code: "",
  name: "",
  bundle_type: null,
  description: "",
  price: "",
  rental_price_per_day: "",
  stock_quantity: "",
  available_quantity: "",
  discount_group_id: null,
  is_active: true,
});

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toInteger = (value) => {
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : 0;
};

export default {
  name: "BundleForm",
  components: { AppDialog, FormInput },
  props: {
    modelValue: { type: Boolean, required: true },
    editData: { type: Object, default: null },
  },
  emits: ["update:modelValue", "saved"],
  setup(props, { emit }) {
    const form = ref(defaultForm());
    const errors = ref({});
    const submitError = ref("");
    const loading = ref(false);
    const discountGroups = ref([]);

    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const isEdit = computed(() => !!props.editData);

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Create input handlers for number fields
    const handlePriceInput = createInputHandler(
      (value) => (form.value.price = value)
    );
    const handleRentalPriceInput = createInputHandler(
      (value) => (form.value.rental_price_per_day = value)
    );

    const syncAutoCode = async () => {
      if (isEdit.value) return;
      
      try {
        const generated = await ipcRenderer.invoke("bundles:getNextCode");
        if (!form.value.code) {
          form.value.code = generated;
        }
      } catch (error) {
        console.error("Error generating bundle code:", error);
      }
    };

    const resetForm = () => {
      if (props.editData) {
        form.value = {
          ...defaultForm(),
          ...props.editData,
          bundle_type: props.editData.bundle_type || null,
          discount_group_id: props.editData.discount_group_id ?? null,
          is_active:
            props.editData.is_active === 1 || props.editData.is_active === true,
        };
      } else {
        form.value = defaultForm();
        // Code akan di-generate setelah bundle_type dipilih
      }
      errors.value = {};
      submitError.value = "";
    };

    const validate = () => {
      const validationErrors = {};
      // Kode akan di-generate otomatis, tidak perlu validasi
      if (!form.value.name || !form.value.name.trim()) {
        validationErrors.name = "Nama wajib diisi";
      }
      if (!form.value.bundle_type) {
        validationErrors.bundle_type = "Tipe paket wajib dipilih";
      } else if (!["rental", "sale", "both"].includes(form.value.bundle_type)) {
        validationErrors.bundle_type = "Tipe tidak valid";
      }

      // Stok selalu 0 saat create/edit, akan diatur melalui manajemen stok

      ["price", "rental_price_per_day"].forEach((field) => {
        if (toNumber(form.value[field]) < 0) {
          validationErrors[field] = "Tidak boleh negatif";
        }
      });

      errors.value = validationErrors;
      return Object.keys(validationErrors).length === 0;
    };

    const buildPayload = () => {
      const payload = {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        bundle_type: form.value.bundle_type,
        description: form.value.description?.trim() ?? "",
        price: toNumber(form.value.price),
        rental_price_per_day: toNumber(form.value.rental_price_per_day),
        discount_group_id: form.value.discount_group_id || null,
        is_active: !!form.value.is_active,
      };
      
      // Stok selalu 0 saat create, tidak bisa diubah dari form
      // Stok hanya bisa diubah melalui manajemen stok
      if (!isEdit.value) {
        payload.stock_quantity = 0;
        payload.available_quantity = 0;
      }
      // Jika edit, jangan kirim stock_quantity dan available_quantity
      
      return payload;
    };

    const handleSubmit = async () => {
      if (!validate()) return;
      loading.value = true;
      submitError.value = "";
      try {
        const payload = buildPayload();
        if (isEdit.value) {
          await updateBundle(props.editData.id, payload);
        } else {
          await createBundle(payload);
        }
        emit("saved");
        showDialog.value = false;
      } catch (error) {
        if (
          typeof error?.message === "string" &&
          error.message.toLowerCase().includes("unique")
        ) {
          errors.value = { ...errors.value, code: "Kode sudah digunakan" };
        } else {
          submitError.value = error?.message || "Gagal menyimpan paket.";
        }
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value) resetForm();
      },
    );

    // Watch untuk stock_quantity dihapus karena stok tidak bisa diubah dari form

    const loadDiscountGroups = async () => {
      try {
        const data = await fetchDiscountGroups();
        discountGroups.value = data.filter((dg) => dg.is_active);
      } catch (error) {
        console.error("Gagal memuat grup diskon:", error);
      }
    };

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value || 0);
    };

    onMounted(() => {
      loadDiscountGroups();
    });

    return {
      form,
      errors,
      loading,
      submitError,
      isEdit,
      showDialog,
      handleSubmit,
      discountGroups,
      formatCurrency,
      formatNumberInput,
      handlePriceInput,
      handleRentalPriceInput,
    };
  },
};
</script>

<style scoped>
.bundle-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
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
  min-height: 90px;
  resize: vertical;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #374151;
}

.submit-error {
  color: #b91c1c;
  font-size: 0.9rem;
}

/* Info box untuk catatan stok */
.info-box {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
  grid-column: span 2;
}

.info-box small {
  color: #0369a1;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
