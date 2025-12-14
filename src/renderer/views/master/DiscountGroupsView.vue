<template>
  <div class="data-page master-page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>Grup Diskon</h1>
        <p class="subtitle">
          Kelola daftar grup diskon. Grup diskon dapat digunakan untuk
          memberikan diskon kepada pelanggan.
        </p>
      </div>
      <AppButton variant="primary" @click="openCreateDialog">
        <i class="fas fa-plus"></i> Tambah Grup Diskon
      </AppButton>
    </header>

    <!-- Tabel Grup Diskon -->
    <section class="card-section">
      <AppTable
        :columns="columns"
        :rows="discountGroups"
        :loading="loading"
        :searchable-keys="['code', 'name', 'description']"
        :show-index="true"
        :dense="true"
        :default-page-size="20"
      >
        <template #cell-discount_info="{ row }">
          <span v-if="row.discount_percentage > 0" class="discount-badge">
            {{ row.discount_percentage }}%
          </span>
          <span v-else-if="row.discount_amount > 0" class="discount-badge">
            {{ formatCurrency(row.discount_amount) }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
        <template #cell-is_active="{ row }">
          <span
            :class="['badge', row.is_active ? 'badge-success' : 'badge-muted']"
          >
            {{ row.is_active ? "Aktif" : "Nonaktif" }}
          </span>
        </template>
        <template #cell-updated_at="{ row }">
          {{ formatDate(row.updated_at) }}
        </template>
        <template #actions="{ row }">
          <AppButton
            variant="secondary"
            @click="editDiscountGroup(row)"
            title="Edit"
          >
            <i class="fas fa-edit"></i>
            <span>Edit</span>
          </AppButton>
          <AppButton variant="danger" @click="confirmDelete(row)" title="Hapus">
            <i class="fas fa-trash"></i>
            <span>Hapus</span>
          </AppButton>
        </template>
      </AppTable>
    </section>

    <!-- Dialog Form -->
    <Dialog
      v-model="showDialog"
      :title="isEdit ? 'Edit Grup Diskon' : 'Tambah Grup Diskon'"
      @update:modelValue="
        (v) => {
          if (!v) closeDialog();
        }
      "
    >
      <form @submit.prevent="saveDiscountGroup">
        <div class="form-group">
          <label>Nama Grup Diskon <span class="required">*</span></label>
          <input v-model="form.name" type="text" required maxlength="200" />
        </div>

        <div class="form-group">
          <label>Jenis Diskon <span class="required">*</span></label>
          <select v-model="discountType" class="form-select">
            <option value="percentage">Persentase (%)</option>
            <option value="amount">Jumlah Tetap (Rp)</option>
          </select>
        </div>

        <div class="form-group" v-if="discountType === 'percentage'">
          <label>Persentase Diskon <span class="required">*</span></label>
          <input
            v-model.number="form.discount_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
          />
          <small class="form-hint">Masukkan persentase (0-100)</small>
        </div>

        <div class="form-group" v-if="discountType === 'amount'">
          <label>Jumlah Diskon <span class="required">*</span></label>
          <input
            :value="formatNumberInput(form.discount_amount)"
            @input="handleDiscountAmountInput"
            type="text"
            required
          />
          <small class="form-hint">Masukkan jumlah diskon dalam Rupiah</small>
        </div>

        <div class="form-group">
          <label>Deskripsi</label>
          <textarea
            v-model="form.description"
            rows="3"
            maxlength="500"
          ></textarea>
        </div>

        <div class="form-group inline">
          <label for="discount-group-active">Status</label>
          <label class="check-inline">
            <input
              id="discount-group-active"
              type="checkbox"
              v-model="form.is_active"
            />
            <span class="check-text">{{
              form.is_active ? "Aktif" : "Nonaktif"
            }}</span>
          </label>
        </div>

        <div v-if="formError" class="error-message">
          {{ formError }}
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn" @click="closeDialog">Batal</button>
          <button type="submit" class="btn primary" :disabled="loading">
            {{ isEdit ? "Simpan" : "Tambah" }}
          </button>
        </div>
      </form>
    </Dialog>

    <!-- Dialog Konfirmasi Hapus -->
    <Dialog
      v-model="showDeleteDialog"
      title="Hapus Grup Diskon"
      @update:modelValue="
        (v) => {
          if (!v) closeDeleteDialog();
        }
      "
    >
      <p>Yakin ingin menghapus grup diskon ini?</p>
      <p class="warning-text">
        Grup diskon yang sedang digunakan oleh pelanggan tidak dapat dihapus.
      </p>
      <div class="dialog-footer">
        <button class="btn" @click="closeDeleteDialog">Batal</button>
        <button class="btn danger" @click="handleDeleteDiscountGroup">
          Hapus
        </button>
      </div>
    </Dialog>
  </div>
</template>

<script>
import { ref, onMounted, watch } from "vue";
import Dialog from "@/components/ui/Dialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { formatDateShort } from "@/utils/dateUtils";
import {
  fetchDiscountGroups,
  createDiscountGroup,
  updateDiscountGroup,
  deleteDiscountGroup,
} from "@/services/masterData";

export default {
  components: { Dialog, AppTable, AppButton },

  setup() {
    const discountGroups = ref([]);
    const loading = ref(false);
    const formError = ref("");
    const columns = ref([
      { key: "code", label: "Kode", sortable: true },
      { key: "name", label: "Nama", sortable: true },
      { key: "discount_info", label: "Diskon", sortable: false },
      { key: "description", label: "Deskripsi" },
      { key: "is_active", label: "Status", sortable: true, align: "center" },
      { key: "updated_at", label: "Diupdate" },
    ]);
    const showDialog = ref(false);
    const showDeleteDialog = ref(false);
    const selectedDiscountGroup = ref(null);
    const isEdit = ref(false);
    const discountType = ref("percentage");

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();
    const formatDate = formatDateShort;

    // Create input handler for discount amount
    const handleDiscountAmountInput = createInputHandler(
      (value) => (form.value.discount_amount = value)
    );

    const form = ref({
      name: "",
      discount_percentage: 0,
      discount_amount: 0,
      description: "",
      is_active: true,
    });

    // Watch discount type to clear the other field
    watch(discountType, (newType) => {
      if (newType === "percentage") {
        form.value.discount_amount = 0;
      } else {
        form.value.discount_percentage = 0;
      }
    });

    // Load data
    async function loadDiscountGroups() {
      try {
        loading.value = true;
        discountGroups.value = await fetchDiscountGroups();
      } catch (error) {
        alert("Gagal memuat data grup diskon");
        console.error(error);
      } finally {
        loading.value = false;
      }
    }

    // Format currency
    function formatCurrency(value) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);
    }

    // Format date
    // Dialog handlers
    function openCreateDialog() {
      form.value = {
        name: "",
        discount_percentage: 0,
        discount_amount: 0,
        description: "",
        is_active: true,
      };
      discountType.value = "percentage";
      formError.value = "";
      isEdit.value = false;
      showDialog.value = true;
    }

    function editDiscountGroup(discountGroup) {
      selectedDiscountGroup.value = discountGroup;
      form.value = {
        name: discountGroup?.name || "",
        discount_percentage: Number(discountGroup?.discount_percentage) || 0,
        discount_amount: Number(discountGroup?.discount_amount) || 0,
        description: discountGroup?.description || "",
        is_active: Boolean(discountGroup?.is_active),
      };
      // Determine discount type
      if (form.value.discount_percentage > 0) {
        discountType.value = "percentage";
      } else if (form.value.discount_amount > 0) {
        discountType.value = "amount";
      } else {
        discountType.value = "percentage";
      }
      formError.value = "";
      isEdit.value = true;
      showDialog.value = true;
    }

    function closeDialog() {
      showDialog.value = false;
      form.value = {
        name: "",
        discount_percentage: 0,
        discount_amount: 0,
        description: "",
        is_active: true,
      };
      discountType.value = "percentage";
      formError.value = "";
      selectedDiscountGroup.value = null;
    }

    function confirmDelete(discountGroup) {
      selectedDiscountGroup.value = discountGroup;
      showDeleteDialog.value = true;
    }

    function closeDeleteDialog() {
      showDeleteDialog.value = false;
      selectedDiscountGroup.value = null;
    }

    // CRUD operations
    async function saveDiscountGroup() {
      try {
        formError.value = "";
        loading.value = true;

        // Validate discount type
        if (discountType.value === "percentage") {
          if (
            form.value.discount_percentage <= 0 ||
            form.value.discount_percentage > 100
          ) {
            formError.value = "Persentase diskon harus antara 0 dan 100";
            return;
          }
          form.value.discount_amount = 0;
        } else {
          if (form.value.discount_amount <= 0) {
            formError.value = "Jumlah diskon harus lebih dari 0";
            return;
          }
          form.value.discount_percentage = 0;
        }

        const payload = {
          // Code will be auto-generated in backend
          name: String(form.value?.name || "").trim(),
          discount_percentage: Number(form.value?.discount_percentage) || 0,
          discount_amount: Number(form.value?.discount_amount) || 0,
          description: String(form.value?.description || "").trim(),
          is_active: form.value?.is_active ? 1 : 0,
        };

        if (isEdit.value) {
          await updateDiscountGroup(selectedDiscountGroup.value.id, payload);
        } else {
          await createDiscountGroup(payload);
        }

        closeDialog();
        loadDiscountGroups();
      } catch (error) {
        formError.value = error?.message || "Gagal menyimpan grup diskon";
        console.error(error);
      } finally {
        loading.value = false;
      }
    }

    async function deleteDiscountGroupHandler() {
      try {
        loading.value = true;
        await deleteDiscountGroup(selectedDiscountGroup.value.id);
        closeDeleteDialog();
        loadDiscountGroups();
      } catch (error) {
        alert(error?.message || "Gagal menghapus grup diskon");
        console.error(error);
      } finally {
        loading.value = false;
      }
    }

    onMounted(loadDiscountGroups);

    return {
      // Data
      discountGroups,
      columns,
      loading,
      form,
      showDialog,
      showDeleteDialog,
      isEdit,
      discountType,
      formError,

      // Format & Handlers
      formatNumberInput,
      handleDiscountAmountInput,

      // Methods
      openCreateDialog,
      editDiscountGroup,
      closeDialog,
      confirmDelete,
      closeDeleteDialog,
      saveDiscountGroup,
      handleDeleteDiscountGroup: deleteDiscountGroupHandler,
      formatDate,
      formatCurrency,
    };
  },
};
</script>

<style scoped>
.form-group label .required {
  color: #dc2626;
}

.form-hint {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 0.85rem;
}

.discount-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
}

.text-muted {
  color: #6b7280;
}

/* All other styles moved to global style.css utility classes */
</style>
