<template>
  <AppDialog
    v-model="showDialog"
    :title="isEdit ? 'Edit Item' : 'Item Baru'"
    :confirm-text="isEdit ? 'Update' : 'Simpan'"
    :loading="loading"
    @confirm="handleSubmit"
  >
    <form class="item-form" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <!-- Nama & Deskripsi -->
        <div class="form-group grid-span-2">
          <label for="name" class="form-label">Nama Item</label>
          <input
            id="name"
            type="text"
            v-model="form.name"
            class="form-input"
            :class="{ 'is-invalid': !!errors.name }"
            required
          />
          <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
        </div>

        <div class="form-group grid-span-2">
          <label for="description" class="form-label">Deskripsi</label>
          <textarea
            id="description"
            v-model="form.description"
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>

        <!-- Harga & Status -->
        <div class="form-pair">
          <FormInput
            id="price"
            label="Harga"
            type="number"
            v-model.number="form.price"
            :error="errors.price"
            required
          />

          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select">
              <option value="AVAILABLE">Available</option>
              <option value="RENTED">Rented</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>

        <!-- Tipe & Kode -->
        <div class="form-pair">
          <div class="form-group">
            <label class="form-label">Tipe Item</label>
            <select v-model="form.type" class="form-select">
              <option v-for="type in ITEM_TYPE" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
            <div v-if="errors.type" class="error-message">
              {{ errors.type }}
            </div>
          </div>

          <FormInput
            id="code"
            label="Kode Item"
            v-model="form.code"
            :error="errors.code"
          />
        </div>

        <div class="form-group grid-span-2">
          <label class="form-label">Kategori</label>
          <select v-model.number="form.category_id" class="form-select">
            <option :value="null" disabled>
              {{ categories.length ? "Pilih kategori" : "Memuat kategori..." }}
            </option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
          <div v-if="errors.category_id" class="error-message">
            {{ errors.category_id }}
          </div>
        </div>

        <!-- Ukuran -->
        <div class="form-group grid-span-2">
          <label class="form-label">Ukuran</label>
          <select v-model.number="form.size_id" class="form-select">
            <option :value="null">Pilih ukuran</option>
            <option v-for="size in sizeOptions" :key="size.id" :value="size.id">
              {{ size.name }}
            </option>
          </select>
          <div v-if="errors.size_id" class="error-message">
            {{ errors.size_id }}
          </div>
        </div>
      </div>

      <!-- Informasi Rental -->
      <div v-if="form.type === 'RENTAL'" class="form-section">
        <h3>Informasi Rental</h3>
        <div class="form-grid-rental">
          <FormInput
            id="dailyRate"
            label="Harga per Hari"
            type="number"
            v-model.number="form.dailyRate"
            :error="errors.dailyRate"
          />
          <FormInput
            id="weeklyRate"
            label="Harga per Minggu"
            type="number"
            v-model.number="form.weeklyRate"
            :error="errors.weeklyRate"
          />
          <FormInput
            id="deposit"
            label="Deposit"
            type="number"
            v-model.number="form.deposit"
            :error="errors.deposit"
          />
        </div>
      </div>
    </form>
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useItemStore } from "@/store/items";
import { ITEM_TYPE } from "@shared/constants";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import { ipcRenderer } from "@/services/ipc";

const defaultForm = () => ({
  name: "",
  price: 0,
  type: "RENTAL",
  description: "",
  status: "AVAILABLE",
  code: "",
  dailyRate: 0,
  weeklyRate: 0,
  deposit: 0,
  size_id: null,
  category_id: null,
});

export default {
  name: "ItemForm",
  components: { AppDialog, FormInput },
  props: {
    modelValue: Boolean,
    editData: { type: Object, default: null },
  },
  emits: ["update:modelValue", "saved"],
  setup(props, { emit }) {
    const itemStore = useItemStore();
    const loading = ref(false);
    const errors = ref({});
    const form = ref(defaultForm());

    const isEdit = computed(() => !!props.editData);
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });
    const sizeOptions = computed(() => itemStore.sizes || []);
    const categories = ref([]);
    const autoCodeRef = ref("");
    const slugifyCode = (value) =>
      `${value ?? ""}`
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-")
        .slice(0, 20);

    const syncAutoCode = () => {
      const base = form.value.name?.trim() || "";
      if (!base) return;
      const generated = `ITM-${slugifyCode(base) || Date.now()}`;
      if (!form.value.code || form.value.code === autoCodeRef.value) {
        form.value.code = generated;
        autoCodeRef.value = generated;
      }
    };

    const resetForm = () => {
      form.value = props.editData
        ? {
            ...defaultForm(),
            ...props.editData,
            size_id:
              props.editData.size_id ??
              props.editData.sizeId ??
              props.editData.size ??
              null,
            category_id:
              props.editData.category_id ??
              props.editData.categoryId ??
              props.editData.category ??
              null,
          }
        : defaultForm();
      if (!isEdit.value && categories.value.length && !form.value.category_id) {
        form.value.category_id = categories.value[0].id;
      }
      errors.value = {};
      if (!isEdit.value) syncAutoCode();
    };

    const validateForm = () => {
      const e = {};
      if (!form.value.name.trim()) e.name = "Nama item harus diisi";
      if (!form.value.code.trim()) e.code = "Kode item harus diisi";
      if (!form.value.price || form.value.price <= 0)
        e.price = "Harga harus > 0";
      if (!form.value.category_id)
        e.category_id = "Kategori wajib dipilih";
      if (!form.value.size_id) e.size_id = "Ukuran wajib dipilih";
      if (form.value.type === "RENTAL") {
        if (!form.value.dailyRate || form.value.dailyRate <= 0)
          e.dailyRate = "Harga per hari harus > 0";
        if (!form.value.deposit || form.value.deposit <= 0)
          e.deposit = "Deposit harus > 0";
      }
      errors.value = e;
      return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) return;
      loading.value = true;
      try {
        if (isEdit.value)
          await itemStore.updateItem(props.editData.id, form.value);
        else await itemStore.addItem(form.value);
        emit("saved");
        showDialog.value = false;
      } catch (err) {
        console.error("Error saving item:", err);
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.modelValue,
      (val) => val && resetForm(),
    );
    watch(categories, (list) => {
      if (!isEdit.value && list.length && !form.value.category_id) {
        form.value.category_id = list[0].id;
      }
    });
    watch(
      () => form.value.name,
      () => {
        if (!isEdit.value) syncAutoCode();
      },
    );

    const loadCategories = async () => {
      try {
        const data = await ipcRenderer.invoke("categories:getAll");
        categories.value = data;
      } catch (error) {
        console.error("Gagal memuat kategori:", error);
      }
    };

    onMounted(() => {
      itemStore.fetchSizes().catch(() => {});
      loadCategories();
    });

    return {
      form,
      errors,
      loading,
      isEdit,
      showDialog,
      ITEM_TYPE,
      handleSubmit,
      sizeOptions,
      categories,
    };
  },
};
</script>

<style scoped>
/* ===========================
   AREA UTAMA FORM
=========================== */
.item-form {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0.75rem 0.75rem;
  box-sizing: border-box;
  flex: 1 1 auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Grid utama */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem 1.25rem;
  width: 100%;
  overflow-x: hidden;
}

/* Form pair */
.form-pair {
  display: contents;
}

/* Form group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Label */
.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

/* Input, select, textarea */
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  max-width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* Textarea */
.form-textarea {
  resize: vertical;
  min-height: 90px;
}

/* Error state */
.is-invalid {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.8rem;
  margin-top: -0.2rem;
}

/* Section tambahan (Informasi Rental) */
.form-section {
  border-top: 1px solid #e5e7eb;
  margin-top: 1rem;
  padding-top: 1rem;
  overflow-x: hidden;
}

.form-grid-rental {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  width: 100%;
  overflow-x: hidden;
}

/* Judul section */
.form-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}
</style>
