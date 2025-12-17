<template>
  <div class="cashier-home">
    <div class="home-container">
      <div class="dashboard-header">
        <h2 class="dashboard-title">Dashboard Kasir</h2>
        <p class="dashboard-subtitle">Ringkasan transaksi hari ini</p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card sales">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <h3 class="card-label">Total Penjualan</h3>
            <p class="card-value">{{ formatCurrency(summary.salesTotal) }}</p>
            <p class="card-meta">{{ summary.salesCount }} transaksi</p>
          </div>
        </div>

        <div class="summary-card rental">
          <div class="card-icon">📦</div>
          <div class="card-content">
            <h3 class="card-label">Total Rental</h3>
            <p class="card-value">{{ formatCurrency(summary.rentalTotal) }}</p>
            <p class="card-meta">{{ summary.rentalCount }} transaksi</p>
          </div>
        </div>

        <div class="summary-card revenue">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <h3 class="card-label">Total Pendapatan</h3>
            <p class="card-value">{{ formatCurrency(summary.totalRevenue) }}</p>
            <p class="card-meta">{{ summary.totalTransactions }} total transaksi</p>
          </div>
        </div>

        <div class="summary-card payments">
          <div class="card-icon">💳</div>
          <div class="card-content">
            <h3 class="card-label">Total Pembayaran</h3>
            <p class="card-value">{{ formatCurrency(summary.paymentsTotal) }}</p>
            <p class="card-meta">{{ summary.paymentsCount }} pembayaran</p>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="recent-transactions-section">
        <div class="section-header">
          <h3 class="section-title">Transaksi Terbaru</h3>
          <a href="#" class="view-all">Lihat Semua →</a>
        </div>

        <div v-if="recentTransactions.length > 0" class="transactions-table">
          <table>
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>Tipe</th>
                <th>Pelanggan</th>
                <th>Jumlah</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trans in recentTransactions.slice(0, 5)" :key="`${trans.type}-${trans.id}`">
                <td class="trans-id">{{ trans.id }}</td>
                <td>
                  <span class="badge" :class="trans.type === 'SALE' ? 'sale' : 'rental'">
                    {{ trans.type === 'SALE' ? 'Penjualan' : 'Rental' }}
                  </span>
                </td>
                <td>{{ trans.customer || '-' }}</td>
                <td class="amount">{{ formatCurrency(trans.total) }}</td>
                <td class="time">{{ formatDate(trans.date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-data">
          <p>Belum ada transaksi hari ini</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from "vue";
import { fetchSalesTransactions, fetchRentalTransactions, fetchPayments } from "@/services/transactions";
import { useCurrency } from "@/composables/useCurrency";
import { formatDateShort } from "@/utils/dateUtils";

export default {
  name: "CashierHome",
  setup() {
    const { formatCurrency } = useCurrency();
    const formatDate = formatDateShort;
    const loading = ref(false);
    const summary = reactive({
      salesTotal: 0,
      salesCount: 0,
      rentalTotal: 0,
      rentalCount: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      paymentsTotal: 0,
      paymentsCount: 0,
    });
    const recentTransactions = ref([]);

    const loadDashboardData = async () => {
      loading.value = true;
      try {
        const [salesData, rentalData, paymentsData] = await Promise.all([
          fetchSalesTransactions(),
          fetchRentalTransactions(),
          fetchPayments(),
        ]);

        // Process sales data
        if (salesData && Array.isArray(salesData)) {
          const today = new Date().toDateString();
          const todaysSales = salesData.filter((sale) => {
            return new Date(sale.sale_date).toDateString() === today;
          });

          summary.salesCount = todaysSales.length;
          summary.salesTotal = todaysSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        }

        // Process rental data
        if (rentalData && Array.isArray(rentalData)) {
          const today = new Date().toDateString();
          const todaysRentals = rentalData.filter((rental) => {
            return new Date(rental.rental_date).toDateString() === today;
          });

          summary.rentalCount = todaysRentals.length;
          summary.rentalTotal = todaysRentals.reduce((sum, rental) => sum + (rental.total_amount || 0), 0);
        }

        // Process payments data
        if (paymentsData && Array.isArray(paymentsData)) {
          const today = new Date().toDateString();
          const todaysPayments = paymentsData.filter((payment) => {
            return new Date(payment.date).toDateString() === today;
          });

          summary.paymentsCount = todaysPayments.length;
          summary.paymentsTotal = todaysPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        }

        summary.totalRevenue = summary.salesTotal + summary.rentalTotal;
        summary.totalTransactions = summary.salesCount + summary.rentalCount;

        // Build recent transactions list
        const allTransactions = [];
        if (salesData && Array.isArray(salesData)) {
          allTransactions.push(
            ...salesData.map((s) => ({
              id: s.id,
              type: "SALE",
              customer: s.customer_name || "-",
              total: s.total_amount || 0,
              date: s.sale_date,
            }))
          );
        }
        if (rentalData && Array.isArray(rentalData)) {
          allTransactions.push(
            ...rentalData.map((r) => ({
              id: r.id,
              type: "RENTAL",
              customer: r.customer_name || "-",
              total: r.total_amount || 0,
              date: r.rental_date,
            }))
          );
        }

        // Sort by date descending
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        recentTransactions.value = allTransactions;
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadDashboardData();
    });

    return {
      summary,
      recentTransactions,
      loading,
      formatCurrency,
      formatDate,
    };
  },
};
</script>

<style scoped>
.cashier-home {
  padding: 2rem;
  min-height: 100%;
  background: #f5f5f5;
}

.home-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.dashboard-subtitle {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
}

/* Summary Cards Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  transition: all 0.2s ease;
}

.summary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.summary-card.sales {
  border-left-color: #10b981;
}

.summary-card.rental {
  border-left-color: #8b5cf6;
}

.summary-card.revenue {
  border-left-color: #3b82f6;
}

.summary-card.payments {
  border-left-color: #f59e0b;
}

.card-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 0.5rem 0;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.card-meta {
  font-size: 0.8rem;
  color: #9ca3af;
  margin: 0;
}

/* Recent Transactions Section */
.recent-transactions-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.view-all {
  color: #4f46e5;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.view-all:hover {
  color: #4338ca;
}

/* Transactions Table */
.transactions-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

th {
  padding: 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

tbody tr {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s;
}

tbody tr:hover {
  background: #f9fafb;
}

td {
  padding: 1rem;
  font-size: 0.875rem;
}

.trans-id {
  color: #4f46e5;
  font-weight: 500;
  font-family: monospace;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.sale {
  background: #dcfce7;
  color: #166534;
}

.badge.rental {
  background: #ede9fe;
  color: #6d28d9;
}

.amount {
  color: #111827;
  font-weight: 600;
}

.time {
  color: #9ca3af;
  font-size: 0.8rem;
}

.no-data {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.no-data p {
  margin: 0;
  font-size: 0.95rem;
}

/* Responsive */
@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    flex-direction: column;
  }

  .card-icon {
    font-size: 2rem;
  }

  .dashboard-title {
    font-size: 1.5rem;
  }

  table {
    font-size: 0.8rem;
  }

  th,
  td {
    padding: 0.75rem;
  }
}
</style>
