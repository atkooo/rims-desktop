<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>Ukuran Item</h1>
        <p class="subtitle">
          Kelola daftar ukuran standar yang digunakan pada katalog item.
        </p>
      </div>
      <AppButton variant="primary" @click="openCreateDialog">
        <i class="fas fa-plus"></i>
        Tambah Ukuran
      </AppButton>
    </div>

    <section class="card-section">
      <AppTable
        :columns="columns"
        :rows="sizes"
        :loading="loading"
        :show-index="true"
        row-key="id"
        :dense="true"
      >
        <template #cell-is_active="{ row }">
          <span
            class="badge"
            :class="row.is_active ? 'badge-success' : 'badge-muted'"
          >
            {{ row.is_active ? "Aktif" : "Nonaktif" }}
          </span>
        </template>
        <template #cell-updated_at="{ row }">
          {{ formatDate(row.updated_at) }}
        </template>
        <template #actions="{ row }">
          <AppButton variant="secondary" @click="editSize(row)">
            Edit
          </AppButton>
          <AppButton variant="danger" @click="confirmDelete(row)" title="Hapus">
            Hapus
          </AppButton>
        </template>
      </AppTable>
    </section>

    <Dialog
      v-model="showDialog"
      :title="isEdit ? 'Edit Ukuran' : 'Tambah Ukuran'"
      @update:modelValue="
        (val) => {
          if (!val) closeDialog();
        }
      "
    >
      <form class="form" @submit.prevent="saveSize">
        <div class="form-group">
          <label>Nama Ukuran</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Misal: Medium"
          />
        </div>
        <div class="form-group">
          <label>Deskripsi</label>
          <textarea v-model="form.description" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Catatan</label>
          <textarea v-model="form.notes" rows="2"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Urutan</label>
            <input v-model.number="form.sort_order" type="number" min="0" />
          </div>
          <label class="check-inline">
            <input type="checkbox" v-model="form.is_active" />
            <span>Aktif</span>
          </label>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn" @click="closeDialog">Batal</button>
          <button type="submit" class="btn primary">
            {{ isEdit ? "Simpan Perubahan" : "Simpan" }}
          </button>
        </div>
      </form>
    </Dialog>

    <Dialog
      v-model="showDeleteDialog"
      title="Hapus Ukuran"
      @update:modelValue="
        (val) => {
          if (!val) closeDeleteDialog();
        }
      "
    >
      <p>
        Ukuran <strong>{{ selectedSize?.name }}</strong> akan dihapus.
      </p>
      <div class="dialog-footer">
        <button class="btn" @click="closeDeleteDialog">Batal</button>
        <button class="btn danger" @click="deleteSize">Hapus</button>
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

export default {
  name: "ItemSizesView",
  components: { Dialog, AppTable, AppButton },
  setup() {
    const { showError, showSuccess } = useNotification();
    const sizes = ref([]);
    const loading = ref(false);
    const showDialog = ref(false);
    const showDeleteDialog = ref(false);
    const isEdit = ref(false);
    const selectedSize = ref(null);
    const form = ref({
      code: "",
      name: "",
      description: "",
      notes: "",
      sort_order: 0,
      is_active: true,
    });

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama Ukuran" },
      { key: "description", label: "Deskripsi" },
      { key: "notes", label: "Catatan" },
      { key: "sort_order", label: "Urutan", align: "center" },
      { key: "is_active", label: "Status" },
      { key: "updated_at", label: "Diperbarui" },
    ];

    const loadSizes = async () => {
      loading.value = true;
      try {
        sizes.value = await window.api.invoke("itemSizes:getAll");
      } catch (error) {
        console.error("Gagal memuat ukuran item:", error);
      } finally {
        loading.value = false;
      }
    };

    const openCreateDialog = () => {
      isEdit.value = false;
      form.value = {
        code: "",
        name: "",
        description: "",
        notes: "",
        sort_order: sizes.value.length + 1,
        is_active: true,
      };
      showDialog.value = true;
    };

    const editSize = (row) => {
      selectedSize.value = row;
      isEdit.value = true;
      form.value = { ...row };
      showDialog.value = true;
    };

    const closeDialog = () => {
      showDialog.value = false;
      selectedSize.value = null;
    };

    const confirmDelete = (row) => {
      selectedSize.value = row;
      showDeleteDialog.value = true;
    };

    const closeDeleteDialog = () => {
      showDeleteDialog.value = false;
      selectedSize.value = null;
    };

    const saveSize = async () => {
      try {
        const payload = {
          ...form.value,
          sort_order: Number(form.value.sort_order) || 0,
        };
        if (isEdit.value) {
          await window.api.invoke("itemSizes:update", {
            id: selectedSize.value.id,
            ...payload,
          });
        } else {
          await window.api.invoke("itemSizes:create", payload);
        }
        closeDialog();
        await loadSizes();
        showSuccess("Ukuran berhasil disimpan");
      } catch (error) {
        showError(error);
      }
    };

    const deleteSize = async () => {
      try {
        await window.api.invoke("itemSizes:delete", selectedSize.value.id);
        closeDeleteDialog();
        await loadSizes();
        showSuccess("Ukuran berhasil dihapus");
      } catch (error) {
        showError(error);
        console.error(error);
      }
    };

    const formatDate = (value) => {
      if (!value) return "-";
      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? value
        : d.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
    };

    onMounted(loadSizes);

    return {
      sizes,
      loading,
      columns,
      form,
      isEdit,
      selectedSize,
      showDialog,
      showDeleteDialog,
      openCreateDialog,
      editSize,
      closeDialog,
      confirmDelete,
      closeDeleteDialog,
      saveSize,
      deleteSize,
      formatDate,
    };
  },
};
</script>
<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* All other styles moved to global style.css utility classes */
</style>
