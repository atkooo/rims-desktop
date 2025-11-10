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
        <h3>Pendapatan Hari Ini</h3>
        <p class="amount">{{ formatCurrency(todayIncome) }}</p>
      </div>
      <div class="card">
        <h3>Total Transaksi Hari Ini</h3>
        <p class="amount">{{ todayTransactions }}</p>
      </div>
      <div class="card">
        <h3>Item Tersedia</h3>
        <p class="amount">{{ availableItems }}</p>
      </div>
      <div class="card">
        <h3>Item Disewa</h3>
        <p class="amount">{{ rentedItems }}</p>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="section">
      <div class="section-header">
        <h2>Transaksi Terbaru</h2>
        <AppButton variant="primary" @click="navigateToTransactions">
          Lihat Semua
        </AppButton>
      </div>

      <DataTable
        :columns="transactionColumns"
        :items="recentTransactions"
        :loading="transactionsLoading"
      />
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
import { useTransactionStore } from "@/store/transactions";
import { useItemStore } from "@/store/items";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";

export default {
  name: "Dashboard",
  components: { AppButton, DataTable },

  setup() {
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const router = useRouter();

    // Load data
    onMounted(async () => {
      await Promise.all([
        transactionStore.fetchTransactions(),
        itemStore.fetchItems(),
      ]);
    });

    // Format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    // Format date
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const navigateToTransactions = () => {
      router.push({ name: "transactions-sales" });
    };

    const navigateToItems = () => {
      router.push({ name: "items" });
    };

    return {
      // Data
      transactionColumns: [
        { key: "id", label: "ID" },
        { key: "transactionDate", label: "Tanggal", format: formatDate },
        { key: "customerName", label: "Customer" },
        { key: "totalAmount", label: "Total", format: formatCurrency },
        { key: "status", label: "Status" },
      ],
      itemColumns: [
        { key: "name", label: "Nama Item" },
        { key: "type", label: "Tipe" },
        { key: "price", label: "Harga", format: formatCurrency },
        { key: "status", label: "Status" },
      ],

      // Computed
      todayIncome: transactionStore.getTodayIncome,
      todayTransactions: transactionStore.getTransactionsByDateRange(
        new Date().toISOString().split("T")[0],
        new Date().toISOString().split("T")[0],
      ).length,
      availableItems: itemStore.items.filter((i) => i.status === "AVAILABLE")
        .length,
      rentedItems: itemStore.items.filter((i) => i.status === "RENTED").length,
      recentTransactions: transactionStore.transactions.slice(0, 5),
      popularItems: itemStore.items.slice(0, 5),
      transactionsLoading: transactionStore.loading,
      itemsLoading: itemStore.loading,

      // Methods
      formatCurrency,
      navigateToTransactions,
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
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card h3 {
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

.section {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
