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
          <div class="form-group">
            <label for="price" class="form-label">Harga Dasar</label>
            <input
              id="price"
              :value="formatNumberInput(form.price)"
              @input="handlePriceInput"
              type="text"
              class="form-input"
              :class="{ error: errors.price }"
              required
            />
            <div v-if="errors.price" class="error-message">
              {{ errors.price }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select">
              <option value="AVAILABLE">Available</option>
              <option value="RENTED">Rented</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>

        <!-- Harga Jual (ditampilkan berdasarkan tipe item) -->
        <div class="form-pair">
          <!-- Harga Jual: tampilkan jika SALE atau BOTH -->
          <div 
            v-if="form.type === 'SALE' || form.type === 'BOTH'" 
            class="form-group"
          >
            <label for="salePrice" class="form-label">Harga Jual</label>
            <input
              id="salePrice"
              :value="formatNumberInput(form.sale_price)"
              @input="handleSalePriceInput"
              type="text"
              class="form-input"
              :class="{ error: errors.sale_price }"
            />
            <div v-if="errors.sale_price" class="error-message">
              {{ errors.sale_price }}
            </div>
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

        <div class="form-group grid-span-2">
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

        <!-- Informasi Stok: Stok diatur melalui Manajemen Stok -->
        <div class="form-group grid-span-2">
          <div class="info-box">
            <small>
              <strong>Catatan:</strong> Stok item diatur melalui menu 
              <strong>Stok & Gudang → Manajemen Stok</strong>. 
              Stok awal akan otomatis diset ke 0.
            </small>
          </div>
        </div>
      </div>

      <!-- Informasi Rental -->
      <div v-if="form.type === 'RENTAL' || form.type === 'BOTH'" class="form-section">
        <h3>Informasi Rental</h3>
        <div class="form-grid-rental">
          <div class="form-group">
            <label for="dailyRate" class="form-label">Harga per Hari</label>
            <input
              id="dailyRate"
              :value="formatNumberInput(form.dailyRate)"
              @input="handleDailyRateInput"
              type="text"
              class="form-input"
              :class="{ error: errors.dailyRate }"
            />
            <div v-if="errors.dailyRate" class="error-message">
              {{ errors.dailyRate }}
            </div>
          </div>
          <div class="form-group">
            <label for="weeklyRate" class="form-label">Harga per Minggu</label>
            <input
              id="weeklyRate"
              :value="formatNumberInput(form.weeklyRate)"
              @input="handleWeeklyRateInput"
              type="text"
              class="form-input"
              :class="{ error: errors.weeklyRate }"
            />
            <div v-if="errors.weeklyRate" class="error-message">
              {{ errors.weeklyRate }}
            </div>
          </div>
          <div class="form-group">
            <label for="deposit" class="form-label">Deposit</label>
            <input
              id="deposit"
              :value="formatNumberInput(form.deposit)"
              @input="handleDepositInput"
              type="text"
              class="form-input"
              :class="{ error: errors.deposit }"
            />
            <div v-if="errors.deposit" class="error-message">
              {{ errors.deposit }}
            </div>
          </div>
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
import { fetchDiscountGroups } from "@/services/masterData";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useItemType } from "@/composables/useItemType";

const defaultForm = () => ({
  name: "",
  price: 0,
  sale_price: 0,
  rental_price_per_day: 0,
  type: "RENTAL",
  description: "",
  status: "AVAILABLE",
  code: "",
  dailyRate: 0,
  weeklyRate: 0,
  deposit: 0,
  size_id: null,
  category_id: null,
  discount_group_id: null,
  stock_quantity: 0,
  available_quantity: 0,
  is_available_for_rent: true,
  is_available_for_sale: false,
  is_active: true,
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
    const { getAvailabilityByType } = useItemType();
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
    const discountGroups = ref([]);
    const autoCodeRef = ref("");
    const slugifyCode = (value) =>
      `${value ?? ""}`
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-")
        .slice(0, 20);

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Create input handlers for number fields
    const handlePriceInput = createInputHandler(
      (value) => (form.value.price = value)
    );
    const handleSalePriceInput = createInputHandler(
      (value) => (form.value.sale_price = value)
    );
    const handleDailyRateInput = createInputHandler(
      (value) => {
        form.value.dailyRate = value;
        // Sync dailyRate to rental_price_per_day for backend compatibility
        form.value.rental_price_per_day = value;
      }
    );
    const handleWeeklyRateInput = createInputHandler(
      (value) => (form.value.weeklyRate = value)
    );
    const handleDepositInput = createInputHandler(
      (value) => (form.value.deposit = value)
    );

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
            // Map database column to form field
            sale_price: props.editData.sale_price ?? 0,
            rental_price_per_day:
              props.editData.rental_price_per_day ?? 0,
            dailyRate:
              props.editData.dailyRate ??
              props.editData.rental_price_per_day ??
              0,
            weeklyRate: props.editData.weeklyRate ?? 0,
            // Stok tidak bisa diubah dari form, tetap tampilkan nilai saat ini untuk info saja
            // Tapi saat submit, akan di-ignore dan tidak di-update
            stock_quantity: props.editData.stock_quantity ?? 0,
            available_quantity: props.editData.available_quantity ?? 0,
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
            discount_group_id: props.editData.discount_group_id ?? null,
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
      // Kode akan di-generate otomatis, tidak perlu validasi
      if (!form.value.price || form.value.price <= 0)
        e.price = "Harga harus > 0";
      if (!form.value.category_id) e.category_id = "Kategori wajib dipilih";
      if (!form.value.size_id) e.size_id = "Ukuran wajib dipilih";
      
      // Stok selalu 0 saat create/edit, akan diatur melalui manajemen stok
      
      // Validasi berdasarkan tipe item
      if (form.value.type === "SALE" || form.value.type === "BOTH") {
        if (!form.value.sale_price || form.value.sale_price <= 0)
          e.sale_price = "Harga jual harus > 0";
      }
      
      if (form.value.type === "RENTAL" || form.value.type === "BOTH") {
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
        // Hapus stock_quantity dan available_quantity dari payload
        // Stok hanya bisa diubah melalui manajemen stok
        const payload = { ...form.value };
        if (!isEdit.value) {
          // Saat create, force stok = 0
          payload.stock_quantity = 0;
          payload.available_quantity = 0;
        } else {
          // Saat edit, jangan kirim stok, biarkan tidak berubah
          delete payload.stock_quantity;
          delete payload.available_quantity;
        }
        
        if (isEdit.value)
          await itemStore.updateItem(props.editData.id, payload);
        else await itemStore.addItem(payload);
        emit("saved");
        showDialog.value = false;
      } catch (err) {
        console.error("Error saving item:", err);
      } finally {
        loading.value = false;
      }
    };

    // Auto-set is_available_for_rent dan is_available_for_sale berdasarkan tipe item
    watch(
      () => form.value.type,
      (newType) => {
        const availability = getAvailabilityByType(newType);
        form.value.is_available_for_rent = availability.is_available_for_rent;
        form.value.is_available_for_sale = availability.is_available_for_sale;
      },
      { immediate: true }
    );

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
      itemStore.fetchSizes().catch(() => {});
      loadCategories();
      loadDiscountGroups();
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
      discountGroups,
      formatCurrency,
      formatNumberInput,
      handlePriceInput,
      handleSalePriceInput,
      handleDailyRateInput,
      handleWeeklyRateInput,
      handleDepositInput,
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

.form-hint {
  display: block;
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  line-height: 1.6;
}

.label-optional {
  font-weight: normal;
  color: #9ca3af;
  font-size: 0.85em;
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

/* Info box untuk catatan stok */
.info-box {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
}

.info-box small {
  color: #0369a1;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
