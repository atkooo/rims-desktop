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
            <label for="purchasePrice" class="form-label">Harga Beli</label>
            <input
              id="purchasePrice"
              :value="formatNumberInput(form.purchase_price)"
              @input="handlePurchasePriceInput"
              type="text"
              class="form-input"
              :class="{ error: errors.purchase_price }"
            />
            <div v-if="errors.purchase_price" class="error-message">
              {{ errors.purchase_price }}
            </div>
          </div>

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
        </div>

        <div class="form-pair">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select" required>
              <option :value="null" disabled>Pilih Status</option>
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
            <select v-model="form.type" class="form-select" required>
              <option :value="null" disabled>Pilih Tipe Item</option>
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
          <label class="form-label">
            Ukuran <span class="required">*</span>
          </label>
          <div class="size-selection">
            <button class="size-trigger" type="button" @click="openSizePicker">
              <div class="size-trigger-text">
                <template v-if="selectedSize">
                  <strong>{{ selectedSize.name }}</strong>
                  <span v-if="selectedSize.code"> · {{ selectedSize.code }}</span>
                  <span class="size-trigger-meta">
                    {{ selectedSize.description || "Tanpa deskripsi" }}
                  </span>
                </template>
                <template v-else>
                  Pilih ukuran item
                </template>
              </div>
              <span class="size-trigger-action">
                {{ selectedSize ? "Ganti" : "Pilih" }}
              </span>
            </button>
            <button
              v-if="selectedSize"
              type="button"
              class="size-clear"
              @click="clearSelectedSize"
            >
              Hapus pilihan
            </button>
          </div>
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
            <label for="deposit" class="form-label">Deposit <span class="label-optional">(Opsional)</span></label>
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

    <ItemSizePickerDialog
      v-model="showSizePicker"
      @select="handleSizeSelect"
    />
  </AppDialog>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useItemStore } from "@/store/items";
import { ITEM_TYPE } from "@shared/constants";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ItemSizePickerDialog from "@/components/modules/items/ItemSizePickerDialog.vue";
import { ipcRenderer } from "@/services/ipc";
import { fetchDiscountGroups } from "@/services/masterData";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useItemType } from "@/composables/useItemType";

const defaultForm = () => ({
  name: "",
  purchase_price: 0,
  price: 0,
  sale_price: 0,
  rental_price_per_day: 0,
  type: null,
  description: "",
  status: null,
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
  components: { AppDialog, FormInput, ItemSizePickerDialog },
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
    const showSizePicker = ref(false);
    const selectedSize = computed(() => {
      const value = form.value.size_id;
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const numericId = Number(value);
      if (Number.isNaN(numericId)) return null;
      return (
        itemStore.sizes.find(
          (size) => Number(size.id) === numericId,
        ) || null
      );
    });
    const categories = ref([]);
    const discountGroups = ref([]);
    const autoCodeRef = ref("");
    const generatingCode = ref(false);

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Create input handlers for number fields
    const handlePurchasePriceInput = createInputHandler(
      (value) => (form.value.purchase_price = value)
    );
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

    const syncAutoCode = async () => {
      if (isEdit.value || generatingCode.value || !form.value.type) return;
      
      try {
        generatingCode.value = true;
        const itemType = form.value.type;
        const generated = await ipcRenderer.invoke("items:getNextCode", itemType);
        
        if (!form.value.code || form.value.code === autoCodeRef.value) {
          form.value.code = generated;
          autoCodeRef.value = generated;
        }
      } catch (error) {
        console.error("Error generating code:", error);
      } finally {
        generatingCode.value = false;
      }
    };

    const resetForm = () => {
      form.value = props.editData
        ? {
            ...defaultForm(),
            ...props.editData,
            // Map database column to form field
            purchase_price: props.editData.purchase_price ?? 0,
            sale_price: props.editData.sale_price ?? 0,
            rental_price_per_day:
              props.editData.rental_price_per_day ?? 0,
            dailyRate:
              props.editData.dailyRate ??
              props.editData.rental_price_per_day ??
              0,
            weeklyRate: props.editData.weeklyRate ?? 0,
            deposit: props.editData.deposit ?? 0,
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
      // Jangan auto-select kategori, biarkan user memilih
      errors.value = {};
      // Pastikan data ukuran tersedia untuk menampilkan ringkasan
      if (!itemStore.sizes.length) {
        itemStore.fetchSizes().catch(() => {});
      }
      // Code akan di-generate saat type dipilih
    };

    const validateForm = () => {
      const e = {};
      if (!form.value.name.trim()) e.name = "Nama item harus diisi";
      // Kode akan di-generate otomatis, tidak perlu validasi
      if (form.value.purchase_price < 0)
        e.purchase_price = "Harga beli tidak boleh negatif";
      if (!form.value.price || form.value.price <= 0)
        e.price = "Harga harus > 0";
      if (!form.value.type) e.type = "Tipe item wajib dipilih";
      if (!form.value.status) e.status = "Status wajib dipilih";
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
        // Deposit is optional, no validation needed
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
      async (newType) => {
        if (!newType) return;
        const availability = getAvailabilityByType(newType);
        form.value.is_available_for_rent = availability.is_available_for_rent;
        form.value.is_available_for_sale = availability.is_available_for_sale;
        
        // Regenerate code when type changes (only for new items)
        if (!isEdit.value) {
          await syncAutoCode();
        }
      }
    );

    watch(
      () => props.modelValue,
      (val) => val && resetForm(),
    );
    // Jangan auto-select kategori saat categories loaded
    // Code is now generated based on type, not name
    // Removed watch for name as it's no longer needed

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

    const openSizePicker = () => {
      showSizePicker.value = true;
      if (!itemStore.sizes.length) {
        itemStore.fetchSizes().catch(() => {});
      }
    };

    const handleSizeSelect = (size) => {
      form.value.size_id = size.id;
      errors.value.size_id = "";
    };

    const clearSelectedSize = () => {
      form.value.size_id = null;
    };

    return {
      form,
      errors,
      loading,
      isEdit,
      showDialog,
      ITEM_TYPE,
      handleSubmit,
      categories,
      discountGroups,
      formatCurrency,
      formatNumberInput,
      handlePurchasePriceInput,
      handlePriceInput,
      handleSalePriceInput,
      handleDailyRateInput,
      handleWeeklyRateInput,
      handleDepositInput,
      showSizePicker,
      openSizePicker,
      handleSizeSelect,
      clearSelectedSize,
      selectedSize,
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

/* Form group - using global utility classes */
.form-group {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Textarea */
.form-textarea {
  min-height: 90px;
}

/* Error state */
.is-invalid {
  border-color: #dc2626;
}

.error-message {
  margin-top: -0.2rem;
  font-size: 0.8rem;
}

.form-hint {
  display: block;
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  line-height: 1.6;
}

.size-selection {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.size-trigger {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.size-trigger:hover {
  border-color: #6366f1;
}

.size-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: #111827;
}

.size-trigger-text strong {
  font-weight: 600;
}

.size-trigger-text span {
  color: #6b7280;
  font-size: 0.85rem;
}

.size-trigger-meta {
  font-size: 0.8rem;
  color: #9ca3af;
}

.size-trigger-action {
  font-size: 0.85rem;
  color: #4f46e5;
}

.size-clear {
  border: none;
  background: none;
  padding: 0.25rem 0;
  font-size: 0.8rem;
  color: #6b7280;
  cursor: pointer;
  align-self: flex-start;
  text-decoration: underline;
  transition: color 0.15s ease;
}

.size-clear:hover {
  color: #374151;
  text-decoration: none;
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
