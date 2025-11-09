<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Manajemen Item</h1>
          <p class="subtitle">
            Kelola katalog barang dan pantau status stok secara terpusat.
          </p>
        </div>
        <AppButton variant="primary" @click="showForm = true">
          Tambah Item
        </AppButton>
      </div>
    </div>

    <section class="card-section">
      <div class="filters">
        <FormInput
          id="searchItem"
          v-model="filters.search"
          placeholder="Cari item..."
          class="search-input"
        />

        <select v-model="filters.type" class="filter-select">
          <option value="">Semua Tipe</option>
          <option v-for="type in ITEM_TYPE" :key="type" :value="type">
            {{ type }}
          </option>
        </select>

        <select v-model="filters.status" class="filter-select">
          <option value="">Semua Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="RENTED">Rented</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
      </div>
    </section>

    <!-- Items Summary -->
    <section class="card-section">
      <div class="summary-cards">
        <div class="summary-card">
          <h3>Total Items</h3>
          <p class="amount">{{ filteredItems.length }}</p>
        </div>
        <div class="summary-card">
          <h3>Items Available</h3>
          <p class="amount">{{ itemsAvailable }}</p>
        </div>
        <div class="summary-card">
          <h3>Items Rented</h3>
          <p class="amount">{{ itemsRented }}</p>
        </div>
        <div class="summary-card">
          <h3>Total Value</h3>
          <p class="amount">{{ formatCurrency(totalValue) }}</p>
        </div>
      </div>
    </section>

    <!-- Items Table -->
    <section class="card-section">
      <DataTable
        :columns="columns"
        :items="filteredItems"
        :loading="loading"
        actions
        @edit="handleEdit"
        @delete="handleDelete"
      >
        <template #status="{ value }">
          <span class="status-badge" :class="value.toLowerCase()">
            {{ value }}
          </span>
        </template>
      </DataTable>
    </section>

    <!-- Item Form Dialog -->
    <ItemForm
      v-model="showForm"
      :edit-data="editingItem"
      @saved="handleSaved"
    />

    <!-- Delete Confirmation Dialog -->
    <AppDialog
      v-model="showDeleteConfirm"
      title="Hapus Item"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    >
      Apakah Anda yakin ingin menghapus item ini?
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useItemStore } from "@/store/items";
import { ITEM_TYPE } from "@shared/constants";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import DataTable from "@/components/ui/DataTable.vue";
import FormInput from "@/components/ui/FormInput.vue";
import ItemForm from "@/components/modules/items/ItemForm.vue";

export default {
  name: "ItemsPage",

  components: {
    AppButton,
    AppDialog,
    DataTable,
    FormInput,
    ItemForm,
  },

  setup() {
    const itemStore = useItemStore();
    const loading = ref(false);
    const showForm = ref(false);
    const editingItem = ref(null);
    const showDeleteConfirm = ref(false);
    const deleteLoading = ref(false);
    const itemToDelete = ref(null);

    // Filter state
    const filters = ref({
      search: "",
      type: "",
      status: "",
    });

    // Format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    // Table columns
    const columns = [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama Item" },
      { key: "type", label: "Tipe" },
      {
        key: "price",
        label: "Harga",
        format: formatCurrency,
      },
      {
        key: "status",
        label: "Status",
        slot: "status",
      },
    ];

    // Computed
    const filteredItems = computed(() => {
      let result = [...itemStore.items];

      if (filters.value.search) {
        const search = filters.value.search.toLowerCase();
        result = result.filter(
          (item) =>
            item.name.toLowerCase().includes(search) ||
            item.code.toLowerCase().includes(search),
        );
      }

      if (filters.value.type) {
        result = result.filter((item) => item.type === filters.value.type);
      }

      if (filters.value.status) {
        result = result.filter((item) => item.status === filters.value.status);
      }

      return result;
    });

    const itemsAvailable = computed(
      () =>
        filteredItems.value.filter((item) => item.status === "AVAILABLE")
          .length,
    );

    const itemsRented = computed(
      () =>
        filteredItems.value.filter((item) => item.status === "RENTED").length,
    );

    const totalValue = computed(() =>
      filteredItems.value.reduce((sum, item) => sum + item.price, 0),
    );

    // Methods
    const handleEdit = (item) => {
      editingItem.value = item;
      showForm.value = true;
    };

    const handleDelete = (item) => {
      itemToDelete.value = item;
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      if (!itemToDelete.value) return;

      deleteLoading.value = true;
      try {
        await itemStore.deleteItem(itemToDelete.value.id);
        showDeleteConfirm.value = false;
      } catch (error) {
        console.error("Error deleting item:", error);
      } finally {
        deleteLoading.value = false;
        itemToDelete.value = null;
      }
    };

    const handleSaved = () => {
      editingItem.value = null;
      showForm.value = false;
    };

    // Load items
    onMounted(async () => {
      loading.value = true;
      try {
        await itemStore.fetchItems();
      } finally {
        loading.value = false;
      }
    });

    return {
      loading,
      showForm,
      editingItem,
      showDeleteConfirm,
      deleteLoading,
      filters,
      columns,
      filteredItems,
      itemsAvailable,
      itemsRented,
      totalValue,
      ITEM_TYPE,
      formatCurrency,
      handleEdit,
      handleDelete,
      confirmDelete,
      handleSaved,
    };
  },
};
</script>

<style scoped>
.filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filters :deep(.search-input) {
  width: 280px;
  margin: 0;
}

.filters :deep(.search-input .form-input) {
  width: 100%;
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
  min-width: 150px;
  height: 40px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 0;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
}

.summary-card h3 {
  margin: 0 0 0.5rem 0;
  color: #4b5563;
  font-size: 1rem;
}

.amount {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.available {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.rented {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge.maintenance {
  background-color: #fef3c7;
  color: #92400e;
}
</style>
