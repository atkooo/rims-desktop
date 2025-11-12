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
          >
            <option value="rental">Rental</option>
            <option value="sale">Sale</option>
          </select>
        </div>
        <FormInput
          id="price"
          label="Harga Paket"
          type="number"
          step="0.01"
          v-model="form.price"
          :error="errors.price"
        />
        <FormInput
          id="rentalPrice"
          label="Harga Sewa / Hari"
          type="number"
          step="0.01"
          v-model="form.rental_price_per_day"
          :error="errors.rental_price_per_day"
        />
        <FormInput
          id="stockQty"
          label="Total Stok"
          type="number"
          v-model="form.stock_quantity"
          :error="errors.stock_quantity"
        />
        <FormInput
          id="availableQty"
          label="Stok Tersedia"
          type="number"
          v-model="form.available_quantity"
          :error="errors.available_quantity"
        />
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

const defaultForm = () => ({
  code: "",
  name: "",
  bundle_type: "rental",
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

    const resetForm = () => {
      if (props.editData) {
        form.value = {
          ...defaultForm(),
          ...props.editData,
          bundle_type: props.editData.bundle_type || "rental",
          discount_group_id: props.editData.discount_group_id ?? null,
          is_active:
            props.editData.is_active === 1 || props.editData.is_active === true,
        };
      } else {
        form.value = defaultForm();
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
      if (!["rental", "sale"].includes(form.value.bundle_type)) {
        validationErrors.bundle_type = "Tipe tidak valid";
      }

      const stockQty = Math.max(0, toInteger(form.value.stock_quantity));
      const availableQty = Math.max(
        0,
        toInteger(form.value.available_quantity),
      );

      if (availableQty > stockQty) {
        validationErrors.available_quantity =
          "Stok tersedia tidak boleh melebihi total stok";
      }

      ["price", "rental_price_per_day"].forEach((field) => {
        if (toNumber(form.value[field]) < 0) {
          validationErrors[field] = "Tidak boleh negatif";
        }
      });

      errors.value = validationErrors;
      return Object.keys(validationErrors).length === 0;
    };

    const buildPayload = () => {
      const stockQty = Math.max(0, toInteger(form.value.stock_quantity));
      const requestedAvailable =
        form.value.available_quantity === "" ||
        form.value.available_quantity === null ||
        form.value.available_quantity === undefined
          ? stockQty
          : Math.max(0, toInteger(form.value.available_quantity));
      const availableQty = Math.min(stockQty, requestedAvailable);

      return {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        bundle_type: form.value.bundle_type,
        description: form.value.description?.trim() ?? "",
        price: toNumber(form.value.price),
        rental_price_per_day: toNumber(form.value.rental_price_per_day),
        stock_quantity: stockQty,
        available_quantity: availableQty,
        discount_group_id: form.value.discount_group_id || null,
        is_active: !!form.value.is_active,
      };
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

    watch(
      () => form.value.stock_quantity,
      (qty) => {
        const stockQty = Math.max(0, toInteger(qty));
        if (toInteger(form.value.available_quantity) > stockQty) {
          form.value.available_quantity = stockQty.toString();
        }
      },
    );

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
</style>
