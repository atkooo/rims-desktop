<template>
  <div class="data-page master-page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>Kategori</h1>
        <p class="subtitle">
          Kelola daftar kategori. Gunakan Edit untuk ubah nama, deskripsi, dan
          status aktif.
        </p>
      </div>
      <AppButton variant="primary" @click="openCreateDialog">
        <i class="fas fa-plus"></i> Tambah Kategori
      </AppButton>
    </header>

    <!-- Tabel Kategori -->
    <section class="card-section">
      <AppTable
        :columns="columns"
        :rows="categories"
        :loading="loading"
        :searchable-keys="['name', 'description']"
        :show-index="true"
        :dense="true"
        :default-page-size="20"
      >
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
            @click="editCategory(row)"
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
      :title="isEdit ? 'Edit Kategori' : 'Tambah Kategori'"
      @update:modelValue="
        (v) => {
          if (!v) closeDialog();
        }
      "
    >
      <form @submit.prevent="saveCategory">
        <div class="form-group">
          <label>Nama Kategori</label>
          <input v-model="form.name" type="text" required />
        </div>

        <div class="form-group">
          <label>Deskripsi</label>
          <textarea v-model="form.description" rows="3"></textarea>
        </div>

        <div class="form-group inline">
          <label for="category-active">Status</label>
          <label class="check-inline">
            <input
              id="category-active"
              type="checkbox"
              v-model="form.is_active"
            />
            <span class="check-text">{{
              form.is_active ? "Aktif" : "Nonaktif"
            }}</span>
          </label>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn" @click="closeDialog">Batal</button>
          <button type="submit" class="btn primary">
            {{ isEdit ? "Simpan" : "Tambah" }}
          </button>
        </div>
      </form>
    </Dialog>

    <!-- Dialog Konfirmasi Hapus -->
    <Dialog
      v-model="showDeleteDialog"
      title="Hapus Kategori"
      @update:modelValue="
        (v) => {
          if (!v) closeDeleteDialog();
        }
      "
    >
      <p>Yakin ingin menghapus kategori ini?</p>
      <div class="dialog-footer">
        <button class="btn" @click="closeDeleteDialog">Batal</button>
        <button class="btn danger" @click="deleteCategory">Hapus</button>
      </div>
    </Dialog>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import Dialog from "@/components/ui/Dialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { useNotification } from "@/composables/useNotification";
import { formatDateShort } from "@/utils/dateUtils";

export default {
  components: { Dialog, AppTable, AppButton },

  setup() {
    const { showError, showSuccess } = useNotification();
    const categories = ref([]);
    const loading = ref(false);
    // no per-row toggle; status diatur lewat dialog Edit
    const columns = ref([
      { key: "name", label: "Nama", sortable: true },
      { key: "description", label: "Deskripsi" },
      { key: "is_active", label: "Status", sortable: true, align: "center" },
      { key: "updated_at", label: "Diupdate" },
    ]);
    const formatDate = formatDateShort;
    const showDialog = ref(false);
    const showDeleteDialog = ref(false);
    const selectedCategory = ref(null);
    const isEdit = ref(false);

    const form = ref({
      name: "",
      description: "",
      is_active: true,
    });

    // Load data
    async function loadCategories() {
      try {
        loading.value = true;
        categories.value = await window.api.invoke("categories:getAll");
      } catch (error) {
        showError("Gagal memuat data kategori");
        console.error(error);
      } finally {
        loading.value = false;
      }
    }

    // Dialog handlers
    function openCreateDialog() {
      form.value = { name: "", description: "", is_active: true };
      isEdit.value = false;
      showDialog.value = true;
    }

    function editCategory(category) {
      selectedCategory.value = category;
      form.value = {
        name: category?.name || "",
        description: category?.description || "",
        is_active: Boolean(category?.is_active),
      };
      isEdit.value = true;
      showDialog.value = true;
    }

    function closeDialog() {
      showDialog.value = false;
      form.value = { name: "", description: "", is_active: true };
      selectedCategory.value = null;
    }

    function confirmDelete(category) {
      selectedCategory.value = category;
      showDeleteDialog.value = true;
    }

    function closeDeleteDialog() {
      showDeleteDialog.value = false;
      selectedCategory.value = null;
    }

    // CRUD operations
    async function saveCategory() {
      try {
        const payload = {
          name: String(form.value?.name || "").trim(),
          description: String(form.value?.description || "").trim(),
          is_active: form.value?.is_active ? 1 : 0,
        };

        if (isEdit.value) {
          await window.api.invoke("categories:update", {
            id: Number(selectedCategory.value?.id),
            ...payload,
          });
        } else {
          await window.api.invoke("categories:create", payload);
        }

        closeDialog();
        loadCategories();
        showSuccess("Kategori berhasil disimpan");
      } catch (error) {
        showError("Gagal menyimpan kategori");
        console.error(error);
      }
    }

    async function deleteCategory() {
      try {
        await window.api.invoke("categories:delete", selectedCategory.value.id);
        closeDeleteDialog();
        loadCategories();
        showSuccess("Kategori berhasil dihapus");
      } catch (error) {
        showError("Gagal menghapus kategori");
        console.error(error);
      }
    }

    onMounted(loadCategories);

    return {
      // Data
      categories,
      columns,
      loading,
      form,
      showDialog,
      showDeleteDialog,
      isEdit,

      // Methods
      openCreateDialog,
      editCategory,
      closeDialog,
      confirmDelete,
      closeDeleteDialog,
      saveCategory,
      deleteCategory,
      formatDate,
    };
  },
};
</script>

<style scoped>
/* All styles moved to global style.css utility classes */
</style>
