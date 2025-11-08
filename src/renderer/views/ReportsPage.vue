<template>
  <div class="reports-page">
    <div class="page-header">
      <h1>Laporan</h1>
    </div>

    <!-- Report Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <FormInput
          id="startDate"
          label="Tanggal Mulai"
          type="date"
          v-model="filters.startDate"
        />
        <FormInput
          id="endDate"
          label="Tanggal Akhir"
          type="date"
          v-model="filters.endDate"
        />
        <AppButton variant="primary" :loading="loading" @click="generateReport">
          Generate Report
        </AppButton>
      </div>
    </div>

    <!-- Report Summary -->
    <div v-if="hasData" class="summary-section">
      <div class="summary-cards">
        <div class="summary-card">
          <h3>Total Pendapatan</h3>
          <p class="amount">{{ formatCurrency(summary.totalIncome) }}</p>
          <div class="breakdown">
            <div>Rental: {{ formatCurrency(summary.rentalIncome) }}</div>
            <div>Sales: {{ formatCurrency(summary.salesIncome) }}</div>
          </div>
        </div>
        <div class="summary-card">
          <h3>Total Transaksi</h3>
          <p class="amount">{{ summary.totalTransactions }}</p>
          <div class="breakdown">
            <div>Rental: {{ summary.rentalTransactions }}</div>
            <div>Sales: {{ summary.salesTransactions }}</div>
          </div>
        </div>
        <div class="summary-card">
          <h3>Item Terlaris</h3>
          <div class="top-items">
            <div
              v-for="item in summary.topItems"
              :key="item.id"
              class="top-item"
            >
              <span>{{ item.name }}</span>
              <span>{{ item.count }}x</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Actions -->
      <div class="report-actions">
        <AppButton variant="secondary" @click="exportPDF">
          <i class="fas fa-file-pdf"></i> Export PDF
        </AppButton>
        <AppButton variant="secondary" @click="exportExcel">
          <i class="fas fa-file-excel"></i> Export Excel
        </AppButton>
        <AppButton variant="secondary" @click="printReport">
          <i class="fas fa-print"></i> Print
        </AppButton>
      </div>

      <!-- Report Details -->
      <div class="details-section">
        <div class="tabs">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: currentTab === tab.id }"
            @click="currentTab = tab.id"
          >
            {{ tab.label }}
          </div>
        </div>

        <!-- Transactions Table -->
        <div v-if="currentTab === 'transactions'" class="tab-content">
          <DataTable
            :columns="transactionColumns"
            :items="reportData.transactions"
            :loading="loading"
          />
        </div>

        <!-- Items Performance -->
        <div v-if="currentTab === 'items'" class="tab-content">
          <DataTable
            :columns="itemColumns"
            :items="reportData.items"
            :loading="loading"
          />
        </div>

        <!-- Charts -->
        <div v-if="currentTab === 'charts'" class="tab-content charts-grid">
          <div class="chart-container">
            <h3>Pendapatan Harian</h3>
            <!-- Add your chart component here -->
          </div>
          <div class="chart-container">
            <h3>Distribusi Tipe Transaksi</h3>
            <!-- Add your chart component here -->
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else-if="!loading" class="no-data">
      <p>
        Pilih rentang tanggal dan klik Generate Report untuk melihat laporan
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import { useTransactionStore } from "../store/transactions";
import { useItemStore } from "../store/items";
import AppButton from "../components/ui/AppButton.vue";
import DataTable from "../components/ui/DataTable.vue";
import FormInput from "../components/ui/FormInput.vue";

export default {
  name: "ReportsPage",

  components: {
    AppButton,
    DataTable,
    FormInput,
  },

  setup() {
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const loading = ref(false);
    const currentTab = ref("transactions");

    // Filters
    const filters = ref({
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    });

    // Report data
    const reportData = ref({
      transactions: [],
      items: [],
    });

    // Summary data
    const summary = ref({
      totalIncome: 0,
      rentalIncome: 0,
      salesIncome: 0,
      totalTransactions: 0,
      rentalTransactions: 0,
      salesTransactions: 0,
      topItems: [],
    });

    // Table columns
    const transactionColumns = [
      {
        key: "transactionDate",
        label: "Tanggal",
        format: (value) => new Date(value).toLocaleDateString("id-ID"),
      },
      { key: "customerName", label: "Customer" },
      { key: "type", label: "Tipe" },
      {
        key: "totalAmount",
        label: "Total",
        format: formatCurrency,
      },
      { key: "status", label: "Status" },
    ];

    const itemColumns = [
      { key: "name", label: "Item" },
      { key: "type", label: "Tipe" },
      { key: "totalTransactions", label: "Total Transaksi" },
      {
        key: "totalAmount",
        label: "Total Pendapatan",
        format: formatCurrency,
      },
    ];

    // Tabs
    const tabs = [
      { id: "transactions", label: "Daftar Transaksi" },
      { id: "items", label: "Performa Item" },
      { id: "charts", label: "Grafik" },
    ];

    // Computed
    const hasData = computed(() => {
      return reportData.value.transactions.length > 0;
    });

    // Methods
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    };

    const generateReport = async () => {
      loading.value = true;
      try {
        // Get transactions for date range
        const transactions = await transactionStore.getTransactionsByDateRange(
          filters.value.startDate,
          filters.value.endDate,
        );

        // Process data
        reportData.value.transactions = transactions;

        // Calculate summary
        const rentalTransactions = transactions.filter(
          (t) => t.type === "RENTAL",
        );
        const salesTransactions = transactions.filter((t) => t.type === "SALE");

        summary.value = {
          totalIncome: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
          rentalIncome: rentalTransactions.reduce(
            (sum, t) => sum + t.totalAmount,
            0,
          ),
          salesIncome: salesTransactions.reduce(
            (sum, t) => sum + t.totalAmount,
            0,
          ),
          totalTransactions: transactions.length,
          rentalTransactions: rentalTransactions.length,
          salesTransactions: salesTransactions.length,
          topItems: calculateTopItems(transactions),
        };

        // Process items performance
        reportData.value.items = calculateItemsPerformance(transactions);
      } catch (error) {
        console.error("Error generating report:", error);
      } finally {
        loading.value = false;
      }
    };

    const calculateTopItems = (transactions) => {
      const itemCounts = {};
      transactions.forEach((transaction) => {
        transaction.items.forEach((item) => {
          if (!itemCounts[item.id]) {
            itemCounts[item.id] = {
              id: item.id,
              name: item.name,
              count: 0,
            };
          }
          itemCounts[item.id].count += item.quantity;
        });
      });

      return Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    const calculateItemsPerformance = (transactions) => {
      const itemPerformance = {};
      transactions.forEach((transaction) => {
        transaction.items.forEach((item) => {
          if (!itemPerformance[item.id]) {
            itemPerformance[item.id] = {
              id: item.id,
              name: item.name,
              type: item.type,
              totalTransactions: 0,
              totalAmount: 0,
            };
          }
          itemPerformance[item.id].totalTransactions += item.quantity;
          itemPerformance[item.id].totalAmount += item.price * item.quantity;
        });
      });

      return Object.values(itemPerformance).sort(
        (a, b) => b.totalAmount - a.totalAmount,
      );
    };

    const exportPDF = async () => {
      // TODO: Implement PDF export
    };

    const exportExcel = async () => {
      // TODO: Implement Excel export
    };

    const printReport = async () => {
      // TODO: Implement report printing
    };

    return {
      loading,
      filters,
      reportData,
      summary,
      currentTab,
      tabs,
      transactionColumns,
      itemColumns,
      hasData,
      formatCurrency,
      generateReport,
      exportPDF,
      exportExcel,
      printReport,
    };
  },
};
</script>

<style scoped>
.reports-page {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.filters-section {
  margin-bottom: 2rem;
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.summary-section {
  margin-bottom: 2rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  margin: 0 0 0.5rem 0;
  color: #4b5563;
  font-size: 1rem;
}

.amount {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.breakdown {
  font-size: 0.875rem;
  color: #6b7280;
}

.top-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.top-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.report-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.details-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab {
  padding: 1rem 1.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.tab:hover {
  color: #111827;
}

.tab.active {
  color: #4f46e5;
  border-bottom: 2px solid #4f46e5;
}

.tab-content {
  padding: 1.5rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.chart-container {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #374151;
}

.no-data {
  text-align: center;
  color: #6b7280;
  padding: 3rem;
}
</style>

