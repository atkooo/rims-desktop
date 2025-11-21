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

    <!-- Cashier Status Card -->
    <section v-if="cashierStatus" class="cashier-status-section">
      <div
        :class="[
          'cashier-status-banner',
          cashierStatus.status === 'open' ? 'open' : 'closed',
        ]"
      >
        <div class="cashier-status-content">
          <div class="cashier-status-info">
            <div class="cashier-status-label">
              <span
                class="status-indicator"
                :class="cashierStatus.status === 'open' ? 'active' : 'inactive'"
              ></span>
              <strong
                >Sesi Kasir:
                {{
                  cashierStatus.status === "open" ? "Aktif" : "Tidak Aktif"
                }}</strong
              >
            </div>
            <div v-if="cashierStatus.status === 'open'" class="cashier-details">
              <span class="detail-item">
                <span class="detail-label">Kode:</span>
                <span class="detail-value">{{
                  cashierStatus.session_code
                }}</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">Saldo Awal:</span>
                <span class="detail-value">{{
                  formatCurrency(cashierStatus.opening_balance)
                }}</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">Saldo Diharapkan:</span>
                <span class="detail-value">{{
                  formatCurrency(cashierStatus.expected_balance || 0)
                }}</span>
              </span>
            </div>
          </div>
          <div class="cashier-status-action">
            <AppButton
              v-if="cashierStatus.status !== 'open'"
              variant="primary"
              size="small"
              @click="$router.push('/transactions/cashier')"
            >
              Buka Kasir
            </AppButton>
            <AppButton
              v-else
              variant="secondary"
              size="small"
              @click="$router.push('/transactions/cashier')"
            >
              Kelola Kasir
            </AppButton>
          </div>
        </div>
      </div>
    </section>

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
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTransactionStore } from "@/store/transactions";
import { useItemStore } from "@/store/items";
import { getCurrentUser } from "@/services/auth";
import { getCurrentSession } from "@/services/cashier";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";

export default {
  name: "Dashboard",
  components: { AppButton, DataTable },

  setup() {
    const transactionStore = useTransactionStore();
    const itemStore = useItemStore();
    const router = useRouter();
    const cashierStatus = ref(null);

    // Load cashier status
    const loadCashierStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          const session = await getCurrentSession(user.id, user.role);
          cashierStatus.value = session
            ? { status: "open", ...session }
            : { status: "closed" };
        } else {
          cashierStatus.value = { status: "closed" };
        }
      } catch (error) {
        console.error("Error loading cashier status:", error);
        cashierStatus.value = { status: "closed" };
      }
    };

    // Load data
    onMounted(async () => {
      await Promise.all([
        transactionStore.fetchTransactions(),
        itemStore.fetchItems(),
        loadCashierStatus(),
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
      cashierStatus,
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

.cashier-status-section {
  margin-bottom: 1.5rem;
}

.cashier-status-banner {
  background-color: white;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #d1d5db;
  overflow: hidden;
  transition: all 0.2s ease;
}

.cashier-status-banner.open {
  border-left: 5px solid #16a34a;
  background: linear-gradient(to right, rgba(22, 163, 74, 0.02) 0%, white 5%);
}

.cashier-status-banner.closed {
  border-left: 5px solid #ef4444;
  background: linear-gradient(to right, rgba(239, 68, 68, 0.02) 0%, white 5%);
}

.cashier-status-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  gap: 1.5rem;
}

.cashier-status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cashier-status-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid white;
}

.status-indicator.active {
  background-color: #16a34a;
  box-shadow:
    0 0 0 4px rgba(22, 163, 74, 0.15),
    0 0 0 8px rgba(22, 163, 74, 0.08);
}

.status-indicator.inactive {
  background-color: #ef4444;
  box-shadow:
    0 0 0 4px rgba(239, 68, 68, 0.15),
    0 0 0 8px rgba(239, 68, 68, 0.08);
}

.cashier-status-label strong {
  font-size: 1.1rem;
  color: #111827;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.cashier-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-left: 1.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-label {
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  color: #111827;
  font-weight: 600;
}

.cashier-status-action {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .cashier-status-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .cashier-status-action {
    width: 100%;
  }

  .cashier-status-action button {
    width: 100%;
  }

  .cashier-details {
    flex-direction: column;
    gap: 0.5rem;
    margin-left: 0;
  }
}
</style>
