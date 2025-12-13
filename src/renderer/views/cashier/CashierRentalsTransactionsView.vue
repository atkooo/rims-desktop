<template>
  <div class="cashier-transactions-page">
    <div class="page-header">
      <h1>Transaksi Rental</h1>
      <p class="subtitle">Daftar transaksi rental</p>
    </div>

    <div class="filters-section">
      <select v-model="filters.status" class="filter-select">
        <option value="">Semua Status</option>
        <option value="pending">Pending</option>
        <option value="active">Aktif</option>
        <option value="returned">Dikembalikan</option>
        <option value="overdue">Terlambat</option>
        <option value="cancelled">Dibatalkan</option>
      </select>
      <select v-model="filters.paymentStatus" class="filter-select">
        <option value="">Semua Status Pembayaran</option>
        <option value="paid">Lunas</option>
        <option value="unpaid">Belum Lunas</option>
      </select>
      <button class="btn-refresh" @click="loadData" :disabled="loading">
        <Icon name="refresh-cw" :size="16" />
        Refresh
      </button>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div class="table-container">
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Customer</th>
            <th>Tanggal Rental</th>
            <th>Tanggal Kembali</th>
            <th>Total</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="loading-state">Memuat data...</td>
          </tr>
          <tr v-else-if="filteredRentals.length === 0">
            <td colspan="7" class="empty-state">Tidak ada transaksi</td>
          </tr>
          <tr v-else v-for="rental in filteredRentals" :key="rental.id">
            <td><strong>{{ rental.transaction_code }}</strong></td>
            <td>{{ rental.customer_name || "-" }}</td>
            <td>{{ formatDate(rental.rental_date) }}</td>
            <td>{{ formatDate(rental.planned_return_date) }}</td>
            <td><strong>{{ formatCurrency(rental.total_amount) }}</strong></td>
            <td>
              <span class="status-badge" :class="getStatusClass(rental)">
                {{ getStatusLabel(rental) }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  class="btn-action"
                  @click="goToDetail(rental)"
                  title="Detail"
                >
                  <Icon name="eye" :size="16" />
                </button>
                <button
                  v-if="isPaid(rental)"
                  class="btn-action"
                  @click="printReceipt(rental)"
                  title="Cetak Struk"
                >
                  <Icon name="printer" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Receipt Preview Dialog -->
    <ReceiptPreviewDialog
      v-model="showReceiptPreview"
      :transaction-id="selectedTransactionId"
      transaction-type="rental"
      @printed="handleReceiptPrinted"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/ui/Icon.vue";
import ReceiptPreviewDialog from "@/components/ui/ReceiptPreviewDialog.vue";
import { fetchRentalTransactions } from "@/services/transactions";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "CashierRentalsTransactionsView",
  components: {
    Icon,
    ReceiptPreviewDialog,
  },
  setup() {
    const router = useRouter();
    const { showSuccess, showError } = useNotification();
    const rentals = ref([]);
    const loading = ref(false);
    const error = ref("");
    const filters = ref({
      status: "",
      paymentStatus: "",
    });
    const showReceiptPreview = ref(false);
    const selectedTransactionId = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const isCancelled = (rental) => {
      if (!rental) return false;
      const status = (rental.status || "").toString().toLowerCase();
      return status === "cancelled";
    };

    const isPaid = (rental) => {
      if (!rental || isCancelled(rental)) return false;
      const status = (rental.payment_status || rental.paymentStatus || "")
        .toString()
        .toLowerCase();
      return status === "paid";
    };

    const getStatusLabel = (rental) => {
      if (isCancelled(rental)) return "Dibatalkan";
      const status = (rental.status || "").toString().toLowerCase();
      if (status === "pending") return "Pending";
      if (status === "active") return "Aktif";
      if (status === "returned") return "Dikembalikan";
      if (status === "overdue") return "Terlambat";
      return "Unknown";
    };

    const getStatusClass = (rental) => {
      if (isCancelled(rental)) return "status-cancelled";
      const status = (rental.status || "").toString().toLowerCase();
      if (status === "pending") return "status-pending";
      if (status === "active") return "status-active";
      if (status === "returned") return "status-returned";
      if (status === "overdue") return "status-overdue";
      return "status-unknown";
    };

    const filteredRentals = computed(() => {
      let items = rentals.value;
      
      if (filters.value.status) {
        items = items.filter((item) => {
          if (isCancelled(item) && filters.value.status !== "cancelled") return false;
          const status = (item.status || "").toString().toLowerCase();
          return status === filters.value.status.toLowerCase();
        });
      }
      
      if (filters.value.paymentStatus) {
        items = items.filter((item) => {
          if (isCancelled(item)) return false;
          const paymentStatus = (item.payment_status || item.paymentStatus || "")
            .toString()
            .toLowerCase();
          return paymentStatus === filters.value.paymentStatus.toLowerCase();
        });
      }
      
      // Sort by date descending (newest first)
      return [...items].sort((a, b) => {
        const dateA = new Date(a.rental_date || a.created_at || 0);
        const dateB = new Date(b.rental_date || b.created_at || 0);
        return dateB - dateA;
      });
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        rentals.value = await fetchRentalTransactions();
      } catch (err) {
        error.value = err.message || "Gagal memuat data rental.";
      } finally {
        loading.value = false;
      }
    };

    const goToDetail = (rental) => {
      if (!rental.transaction_code) return;
      router.push({
        name: "cashier-transaction-rental-detail",
        params: { code: rental.transaction_code },
      });
    };

    const printReceipt = (rental) => {
      if (!rental?.id) return;
      selectedTransactionId.value = rental.id;
      showReceiptPreview.value = true;
    };

    const handleReceiptPrinted = (result) => {
      if (result && result.success) {
        showSuccess("Struk berhasil dicetak!");
      }
      selectedTransactionId.value = null;
    };

    onMounted(() => {
      loadData();
    });

    return {
      rentals,
      loading,
      error,
      filters,
      filteredRentals,
      showReceiptPreview,
      selectedTransactionId,
      formatCurrency,
      formatDate,
      isPaid,
      isCancelled,
      getStatusLabel,
      getStatusClass,
      loadData,
      goToDetail,
      printReceipt,
      handleReceiptPrinted,
    };
  },
};
</script>

<style scoped>
.cashier-transactions-page {
  padding: 1.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.subtitle {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.filters-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #4338ca;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-banner {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table thead {
  background: #f9fafb;
}

.transactions-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.transactions-table td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.transactions-table tbody tr:hover {
  background: #f9fafb;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-paid {
  background: #dcfce7;
  color: #166534;
}

.status-unpaid {
  background: #fef3c7;
  color: #92400e;
}

.status-pending {
  background: #dbeafe;
  color: #1e40af;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-returned {
  background: #e0e7ff;
  color: #4338ca;
}

.status-overdue {
  background: #fee2e2;
  color: #991b1b;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-unknown {
  background: #f3f4f6;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
}

.btn-action:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
  color: #111827;
}
</style>

