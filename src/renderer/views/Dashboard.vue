<template>
  <div class="dashboard">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">
          Ringkasan aktivitas dan statistik bisnis Anda hari ini.
        </p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="card">
        <h3>Item Tersedia</h3>
        <p class="amount">{{ availableItems }}</p>
      </div>
      <div class="card">
        <h3>Item Disewa</h3>
        <p class="amount">{{ rentedItems }}</p>
      </div>
    </div>

    <!-- Popular Items -->
    <div class="section">
      <div class="section-header">
        <h2>Item Populer</h2>
        <AppButton variant="primary" @click="navigateToItems">
          Kelola Item
        </AppButton>
      </div>

      <DataTable
        :columns="itemColumns"
        :items="popularItems"
        :loading="itemsLoading"
      />
    </div>
  </div>
</template>

<script>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useItemStore } from "@/store/items";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";

export default {
  name: "Dashboard",
  components: { AppButton, DataTable },

  setup() {
    const itemStore = useItemStore();
    const router = useRouter();

    // Load data
    onMounted(async () => {
      await itemStore.fetchItems();
    });

    // Format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    const navigateToItems = () => {
      router.push({ name: "items" });
    };

    return {
      // Data
      itemColumns: [
        { key: "name", label: "Nama Item" },
        { key: "type", label: "Tipe" },
        { 
          key: "price", 
          label: "Harga", 
          format: (value, row) => formatCurrency(row.sale_price || row.rental_price_per_day || 0)
        },
        { key: "status", label: "Status" },
      ],

      // Computed
      availableItems: itemStore.items.filter((i) => i.status === "AVAILABLE")
        .length,
      rentedItems: itemStore.items.filter((i) => i.status === "RENTED").length,
      popularItems: itemStore.items.slice(0, 5),
      itemsLoading: itemStore.loading,

      // Methods
      formatCurrency,
      navigateToItems,
    };
  },
};
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.card h3 {
  margin: 0 0 0.75rem 0;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.amount {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.section {
  background-color: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

</style>
