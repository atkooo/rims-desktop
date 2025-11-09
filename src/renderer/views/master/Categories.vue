<template>
  <div class="page">
    <header class="page-header">
      <div class="title-wrap">
        <h1>Kategori</h1>
        <p class="subtitle">
          Kelola daftar kategori. Gunakan Edit untuk ubah nama, deskripsi, dan
          status aktif.
        </p>
      </div>
      <button class="btn primary" @click="openCreateDialog">
        <i class="fas fa-plus"></i> Tambah Kategori
      </button>
    </header>

    <!-- Tabel Kategori -->
    <div class="card">
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
    </div>

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

export default {
  components: { Dialog, AppTable, AppButton },

  setup() {
    const categories = ref([]);
    const loading = ref(false);
    // no per-row toggle; status diatur lewat dialog Edit
    const columns = ref([
      { key: "name", label: "Nama", sortable: true },
      { key: "description", label: "Deskripsi" },
      { key: "is_active", label: "Status", sortable: true, align: "center" },
      { key: "updated_at", label: "Diupdate" },
    ]);
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
        alert("Gagal memuat data kategori");
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
      } catch (error) {
        alert("Gagal menyimpan kategori");
        console.error(error);
      }
    }

    async function deleteCategory() {
      try {
        await window.api.invoke("categories:delete", selectedCategory.value.id);
        closeDeleteDialog();
        loadCategories();
      } catch (error) {
        alert("Gagal menghapus kategori");
        console.error(error);
      }
    }

    onMounted(loadCategories);

    function formatDate(val) {
      if (!val) return "-";
      const d = new Date(val);
      if (isNaN(d)) return String(val);
      try {
        return d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } catch (_) {
        return d.toISOString().slice(0, 10);
      }
    }

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
.page {
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title-wrap h1 {
  margin: 0;
}
.subtitle {
  margin: 0;
  color: #6b7280; /* gray-500 */
  font-size: 0.9rem;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

/* Align checkbox and text nicely */
.form-group.inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.form-group.inline > label {
  margin: 0;
}
.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.check-inline input {
  width: 16px;
  height: 16px;
  margin: 0;
}
.check-text {
  font-weight: 500;
  color: #111827;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #e9ecef;
}

.btn.primary {
  background: #007bff;
  color: white;
}

.btn.danger {
  background: #dc3545;
  color: white;
}

/* Ensure icon buttons are visible */
.btn.icon {
  padding: 6px;
  margin: 0 4px;
  background: transparent;
  color: #334155;
  /* slate-700 */
}

.btn.icon i {
  color: inherit;
}

.btn.icon:hover {
  color: #007bff;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
}

.badge-success {
  background: #dcfce7;
  color: #166534;
}

.badge-muted {
  background: #e5e7eb;
  color: #374151;
}
</style>
