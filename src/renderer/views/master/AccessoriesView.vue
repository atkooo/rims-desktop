<template>
  <div class="data-page">
    <div class="page-header">
      <div>
        <h1>Data Aksesoris</h1>
        <p class="subtitle">
          Daftar aksesoris beserta stok dan status ketersediaan.
        </p>
      </div>
      <div class="header-actions">
        <AppButton variant="primary" @click="openCreate">
          Tambah Aksesoris
        </AppButton>
        <AppButton variant="secondary" :loading="loading" @click="loadData">
          Refresh Data
        </AppButton>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Aksesoris</span>
          <strong>{{ stats.totalAccessories }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Stok</span>
          <strong>{{ stats.totalStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Stok Tersedia</span>
          <strong>{{ stats.availableStock }}</strong>
        </div>
        <div class="summary-card">
          <span>Aksesoris Aktif</span>
          <strong>{{ stats.activeAccessories }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <AppTable
        :columns="columns"
        :rows="accessories"
        :loading="loading"
        :searchable-keys="['code', 'name', 'description']"
        row-key="id"
      >
        <template #cell-rental_price_per_day="{ row }">
          {{ formatCurrency(row.rental_price_per_day) }}
        </template>
        <template #cell-sale_price="{ row }">
          {{ formatCurrency(row.sale_price) }}
        </template>
        <template #cell-is_available_for_rent="{ row }">
          {{ row.is_available_for_rent ? "Ya" : "Tidak" }}
        </template>
        <template #cell-is_available_for_sale="{ row }">
          {{ row.is_available_for_sale ? "Ya" : "Tidak" }}
        </template>
        <template #cell-is_active="{ row }">
          {{ row.is_active ? "Aktif" : "Nonaktif" }}
        </template>
        <template #actions="{ row }">
          <div class="action-buttons">
            <AppButton variant="secondary" @click="handleEdit(row)">
              Edit
            </AppButton>
            <AppButton variant="danger" @click="promptDelete(row)">
              Hapus
            </AppButton>
          </div>
        </template>
      </AppTable>
    </section>

    <AccessoryForm
      v-model="showForm"
      :edit-data="editingAccessory"
      @saved="handleFormSaved"
    />

    <AppDialog
      v-model="showDeleteConfirm"
      title="Hapus Aksesoris"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    >
      <p>
        Yakin ingin menghapus
        <strong>{{ accessoryToDelete?.name }}</strong
        >?
      </p>
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AccessoryForm from "@/components/modules/accessories/AccessoryForm.vue";
import { fetchAccessories, deleteAccessory } from "@/services/masterData";

export default {
  name: "AccessoriesView",
  components: { AppButton, AppDialog, AppTable, AccessoryForm },
  setup() {
    const accessories = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingAccessory = ref(null);
    const showDeleteConfirm = ref(false);
    const deleteLoading = ref(false);
    const accessoryToDelete = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      {
        key: "rental_price_per_day",
        label: "Harga Sewa/Hari",
        format: formatCurrency,
      },
      {
        key: "sale_price",
        label: "Harga Jual",
        format: formatCurrency,
      },
      { key: "stock_quantity", label: "Total Stok" },
      { key: "available_quantity", label: "Tersedia" },
      { key: "min_stock_alert", label: "Min Alert" },
      {
        key: "is_available_for_rent",
        label: "Bisa Disewa",
        format: (value) => (value ? "Ya" : "Tidak"),
      },
      {
        key: "is_available_for_sale",
        label: "Bisa Dijual",
        format: (value) => (value ? "Ya" : "Tidak"),
      },
      {
        key: "is_active",
        label: "Status",
        format: (value) => (value ? "Aktif" : "Nonaktif"),
      },
    ];

    const stats = computed(() => {
      const totalAccessories = accessories.value.length;
      const totalStock = accessories.value.reduce(
        (sum, item) => sum + (item.stock_quantity || 0),
        0,
      );
      const availableStock = accessories.value.reduce(
        (sum, item) => sum + (item.available_quantity || 0),
        0,
      );
      const activeAccessories = accessories.value.filter(
        (item) => item.is_active,
      ).length;

      return {
        totalAccessories,
        totalStock,
        availableStock,
        activeAccessories,
      };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        accessories.value = await fetchAccessories();
      } catch (err) {
        error.value = err.message || "Gagal memuat data aksesoris.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    const openCreate = () => {
      editingAccessory.value = null;
      showForm.value = true;
    };

    const handleEdit = (item) => {
      editingAccessory.value = item;
      showForm.value = true;
    };

    const handleFormSaved = () => {
      editingAccessory.value = null;
      loadData();
    };

    const promptDelete = (item) => {
      accessoryToDelete.value = item;
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      if (!accessoryToDelete.value) return;
      deleteLoading.value = true;
      error.value = "";
      try {
        await deleteAccessory(accessoryToDelete.value.id);
        showDeleteConfirm.value = false;
        accessoryToDelete.value = null;
        loadData();
      } catch (err) {
        error.value = err.message || "Gagal menghapus aksesoris.";
      } finally {
        deleteLoading.value = false;
      }
    };

    watch(showForm, (value) => {
      if (!value) editingAccessory.value = null;
    });

    return {
      accessories,
      loading,
      error,
      columns,
      stats,
      loadData,
      showForm,
      editingAccessory,
      showDeleteConfirm,
      deleteLoading,
      accessoryToDelete,
      openCreate,
      handleEdit,
      handleFormSaved,
      promptDelete,
      confirmDelete,
      formatCurrency,
    };
  },
};
</script>

<style scoped>
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
</style>
