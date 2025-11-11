<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Aksesoris' : 'Aksesoris Baru'"
    :confirm-text="isEdit ? 'Update' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form class="accessory-form" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <FormInput
          id="code"
          label="Kode"
          v-model="form.code"
          :error="errors.code"
          required
        />
        <FormInput
          id="name"
          label="Nama"
          v-model="form.name"
          :error="errors.name"
          required
        />
        <FormInput
          id="purchasePrice"
          label="Harga Beli"
          type="number"
          step="0.01"
          v-model="form.purchase_price"
          :error="errors.purchase_price"
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
          id="salePrice"
          label="Harga Jual"
          type="number"
          step="0.01"
          v-model="form.sale_price"
          :error="errors.sale_price"
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
        <FormInput
          id="minStock"
          label="Minimal Stok"
          type="number"
          v-model="form.min_stock_alert"
          :error="errors.min_stock_alert"
        />
        <div class="form-group">
          <label class="form-label">Grup Diskon (Opsional)</label>
          <select v-model.number="form.discount_group_id" class="form-select" style="width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.55rem 0.65rem; font-size: 0.95rem;">
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
        <label for="description" class="form-label">Deskripsi</label>
        <textarea
          id="description"
          class="form-textarea"
          rows="3"
          v-model="form.description"
        ></textarea>
      </div>

      <div class="form-switches">
        <label class="switch">
          <input type="checkbox" v-model="form.is_available_for_rent" />
          <span>Bisa Disewa</span>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="form.is_available_for_sale" />
          <span>Bisa Dijual</span>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="form.is_active" />
          <span>Aktif</span>
        </label>
      </div>

      <p v-if="submitError" class="submit-error">{{ submitError }}</p>
    </form>
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import { createAccessory, updateAccessory, fetchDiscountGroups } from "@/services/masterData";

const defaultForm = () => ({
  code: "",
  name: "",
  description: "",
  purchase_price: "",
  rental_price_per_day: "",
  sale_price: "",
  stock_quantity: "",
  available_quantity: "",
  min_stock_alert: "",
  discount_group_id: null,
  is_available_for_rent: true,
  is_available_for_sale: true,
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
  name: "AccessoryForm",
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
    const errors = ref({});
    const submitError = ref("");
    const form = ref(defaultForm());
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
          is_available_for_rent:
            props.editData.is_available_for_rent === 1 ||
            props.editData.is_available_for_rent === true,
          is_available_for_sale:
            props.editData.is_available_for_sale === 1 ||
            props.editData.is_available_for_sale === true,
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
      if (!form.value.code || !form.value.code.trim()) {
        validationErrors.code = "Kode wajib diisi";
      }
      if (!form.value.name || !form.value.name.trim()) {
        validationErrors.name = "Nama wajib diisi";
      }

      const stockQty = Math.max(0, toInteger(form.value.stock_quantity));
      const availableQty = Math.max(
        0,
        toInteger(form.value.available_quantity),
      );

      if (stockQty < 0) {
        validationErrors.stock_quantity = "Stok tidak boleh negatif";
      }
      if (availableQty < 0) {
        validationErrors.available_quantity =
          "Stok tersedia tidak boleh negatif";
      }
      if (availableQty > stockQty) {
        validationErrors.available_quantity =
          "Stok tersedia tidak boleh melebihi total stok";
      }

      ["purchase_price", "rental_price_per_day", "sale_price"].forEach(
        (field) => {
          if (toNumber(form.value[field]) < 0) {
            validationErrors[field] = "Tidak boleh bernilai negatif";
          }
        },
      );

      if (toInteger(form.value.min_stock_alert) < 0) {
        validationErrors.min_stock_alert = "Tidak boleh bernilai negatif";
      }

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
        description: form.value.description?.trim() ?? "",
        purchase_price: toNumber(form.value.purchase_price),
        rental_price_per_day: toNumber(form.value.rental_price_per_day),
        sale_price: toNumber(form.value.sale_price),
        stock_quantity: stockQty,
        available_quantity: availableQty,
        min_stock_alert: Math.max(0, toInteger(form.value.min_stock_alert)),
        discount_group_id: form.value.discount_group_id || null,
        is_available_for_rent: !!form.value.is_available_for_rent,
        is_available_for_sale: !!form.value.is_available_for_sale,
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
          await updateAccessory(props.editData.id, payload);
        } else {
          await createAccessory(payload);
        }
        emit("saved");
        showDialog.value = false;
      } catch (error) {
        if (
          typeof error?.message === "string" &&
          error.message.toLowerCase().includes("unique")
        ) {
          errors.value = {
            ...errors.value,
            code: "Kode aksesoris sudah digunakan",
          };
        } else {
          submitError.value =
            error?.message || "Gagal menyimpan data aksesoris.";
        }
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
          errors.value = {};
          submitError.value = "";
        }
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
        discountGroups.value = data.filter(dg => dg.is_active);
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
.accessory-form {
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
  font-size: 0.9rem;
  color: #374151;
}

.form-textarea {
  width: 100%;
  min-height: 90px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.6rem;
  font-size: 0.95rem;
  resize: vertical;
}

.form-textarea:focus {
  outline: none;
  border-color: #4338ca;
  box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.15);
}

.form-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.switch {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #374151;
}

.submit-error {
  color: #b91c1c;
  font-size: 0.9rem;
}
</style>
