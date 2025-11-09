<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Transaksi Sewa</h1>
          <p class="subtitle">Ringkasan transaksi sewa langsung dari database.</p>
        </div>
        <div class="header-actions">
          <AppButton variant="primary" @click="openCreateRental">
            Transaksi Sewa Baru
          </AppButton>
          <AppButton
            variant="secondary"
            :loading="currentLoading"
            @click="handleRefresh"
          >
            Refresh Data
          </AppButton>
        </div>
      </div>
    </div>

      <div class="tab-group">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
        :class="{ active: currentTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <section class="card-section">
      <div class="summary-grid" v-if="currentTab === 'all'">
        <div class="summary-card">
          <span>Total Transaksi</span>
          <strong>{{ stats.totalRentals }}</strong>
        </div>
        <div class="summary-card">
          <span>Aktif</span>
          <strong>{{ stats.activeRentals }}</strong>
        </div>
        <div class="summary-card">
          <span>Terlambat</span>
          <strong>{{ stats.overdueRentals }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Nilai</span>
          <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
        </div>
      </div>

      <div class="summary-grid" v-else>
        <div class="summary-card">
          <span>Transaksi Aktif</span>
          <strong>{{ activeStats.activeCount }}</strong>
        </div>
        <div class="summary-card">
          <span>Nilai Tertahan</span>
          <strong>{{ formatCurrency(activeStats.totalValue) }}</strong>
        </div>
        <div class="summary-card">
          <span>Sewa Terlambat</span>
          <strong>{{ activeStats.overdueCount }}</strong>
        </div>
        <div class="summary-card">
          <span>Rata-rata Hari Terlambat</span>
          <strong>{{ activeStats.avgOverdueDays }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="currentError" class="error-banner">
        {{ currentError }}
      </div>

      <DataTable
        :columns="displayedColumns"
        :items="displayedItems"
        :loading="currentLoading"
        :actions="true"
        :show-edit="false"
        :show-delete="false"
      >
        <template #actions="{ item }">
          <div class="table-actions">
            <AppButton variant="secondary" @click="openRentalDetail(item)">
              Detail
            </AppButton>
            <AppButton variant="primary" @click="handleEdit(item)">
              Edit
            </AppButton>
            <AppButton variant="danger" @click="handleDelete(item)">
              Hapus
            </AppButton>
          </div>
        </template>
      </DataTable>
    </section>
  </div>

  <AppDialog
    v-model="detailDialogOpen"
    :title="
      selectedRental
        ? `Detail Transaksi ${selectedRental.transaction_code || ''}`
        : 'Detail Transaksi'
    "
    :show-footer="false"
  >
      <div class="detail-dialog">
        <div v-if="selectedRental" class="detail-grid">
          <div class="detail-card">
            <h4>Info Umum</h4>
            <div class="detail-item">
              <span>Customer</span>
              <strong>{{ selectedRental.customer_name || "-" }}</strong>
            </div>
            <div class="detail-item">
              <span>Tanggal Sewa</span>
              <strong>{{ formatDate(selectedRental.rental_date) }}</strong>
            </div>
            <div class="detail-item">
              <span>Rencana Kembali</span>
              <strong>{{ formatDate(selectedRental.planned_return_date) }}</strong>
            </div>
          </div>

          <div class="detail-card">
            <h4>Keuangan</h4>
            <div class="detail-item">
              <span>Status</span>
              <strong>{{ selectedRental.status || "-" }}</strong>
            </div>
            <div class="detail-item">
              <span>Total Nilai</span>
              <strong>{{ formatCurrency(selectedRental.total_amount) }}</strong>
            </div>
            <div class="detail-item">
              <span>Dibayar</span>
              <strong>{{ formatCurrency(selectedRental.paid_amount) }}</strong>
            </div>
          </div>
        </div>

        <div v-if="detailsLoading" class="detail-state">
          Memuat detail transaksi...
        </div>
        <div v-else-if="detailError" class="error-banner">
          {{ detailError }}
          <AppButton
            class="retry-button"
            variant="secondary"
            @click="loadRentalDetails(true)"
          >
            Coba Lagi
          </AppButton>
        </div>
        <div v-else-if="!filteredDetails.length" class="detail-state">
          Tidak ada item terkait transaksi ini.
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Jumlah</th>
              <th>Harga Sewa</th>
              <th>Subtotal</th>
              <th>Dikembalikan</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="detail in filteredDetails" :key="detail.id">
              <td>{{ detail.item_name || "-" }}</td>
              <td>{{ detail.quantity }}</td>
              <td>{{ formatCurrency(detail.rental_price) }}</td>
              <td>{{ formatCurrency(detail.subtotal) }}</td>
              <td>{{ detail.is_returned ? "Ya" : "Belum" }}</td>
              <td>{{ detail.notes || "-" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
  </AppDialog>

  <TransactionForm
    v-model="showForm"
    :edit-data="editingRental"
    :default-type="TRANSACTION_TYPE.RENTAL"
    @saved="handleSaved"
    fixed-type
  />
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import TransactionForm from "@/components/modules/transactions/TransactionForm.vue";
import {
  fetchRentalTransactions,
  fetchRentalDetails,
} from "@/services/transactions";
import { fetchActiveRentals } from "@/services/reports";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";

export default {
  name: "RentalTransactionsView",
  components: { AppButton, DataTable, AppDialog, TransactionForm },
  setup() {
    const rentals = ref([]);
    const activeRentals = ref([]);
    const rentalDetails = ref([]);
    const loading = ref(false);
    const activeLoading = ref(false);
    const detailsLoading = ref(false);
    const error = ref("");
    const activeError = ref("");
    const detailError = ref("");
    const detailDialogOpen = ref(false);
    const selectedRental = ref(null);
    const currentTab = ref("all");
    const transactionStore = useTransactionStore();
    const showForm = ref(false);
    const editingRental = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const columns = [
      { key: "transaction_code", label: "Kode" },
      { key: "customer_name", label: "Customer" },
      { key: "rental_date", label: "Tanggal Sewa", format: formatDate },
      {
        key: "planned_return_date",
        label: "Rencana Kembali",
        format: formatDate,
      },
      { key: "total_amount", label: "Total", format: formatCurrency },
      { key: "status", label: "Status Sewa" },
    ];
    const activeColumns = [
      ...columns,
      {
        key: "days_overdue",
        label: "Terlambat (hari)",
        format: (value) => (value > 0 ? value : "-"),
      },
    ];

    const tabs = [
      { id: "all", label: "Semua Transaksi" },
      { id: "active", label: "Sewa Aktif" },
    ];

    const stats = computed(() => {
      const totalRentals = rentals.value.length;
      const activeRentalsCount = rentals.value.filter(
        (rental) => rental.status === "active",
      ).length;
      const overdueRentals = rentals.value.filter(
        (rental) => rental.status === "overdue",
      ).length;
      const totalAmount = rentals.value.reduce(
        (sum, rental) => sum + (rental.total_amount || 0),
        0,
      );
      return {
        totalRentals,
        activeRentals: activeRentalsCount,
        overdueRentals,
        totalAmount,
      };
    });

    const activeStats = computed(() => {
      const list = activeRentals.value;
      const activeCount = list.length;
      const totalValue = list.reduce(
        (sum, item) => sum + (item.total_amount || 0),
        0,
      );
      const overdue = list.filter((item) => (item.days_overdue || 0) > 0);
      const overdueCount = overdue.length;
      const avgOverdueDays = overdueCount
        ? (
            overdue.reduce((sum, item) => sum + (item.days_overdue || 0), 0) /
            overdueCount
          ).toFixed(1)
        : 0;
      return { activeCount, totalValue, overdueCount, avgOverdueDays };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        rentals.value = await fetchRentalTransactions();
      } catch (err) {
        error.value = err.message || "Gagal memuat data sewa.";
      } finally {
        loading.value = false;
      }
    };

    const loadActiveRentals = async () => {
      if (activeLoading.value) return;
      activeLoading.value = true;
      activeError.value = "";
      try {
        activeRentals.value = await fetchActiveRentals();
      } catch (err) {
        activeError.value = err.message || "Gagal memuat data sewa aktif.";
      } finally {
        activeLoading.value = false;
      }
    };

    const loadRentalDetails = async (force = false) => {
      if (rentalDetails.value.length && !force) return;
      detailsLoading.value = true;
      detailError.value = "";
      try {
        rentalDetails.value = await fetchRentalDetails();
      } catch (err) {
        detailError.value = err.message || "Gagal memuat detail sewa.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const filteredDetails = computed(() => {
      if (!selectedRental.value) return [];
      return rentalDetails.value.filter(
        (detail) =>
          detail.transaction_code === selectedRental.value.transaction_code,
      );
    });

    const displayedItems = computed(() =>
      currentTab.value === "all" ? rentals.value : activeRentals.value,
    );
    const displayedColumns = computed(() =>
      currentTab.value === "all" ? columns : activeColumns,
    );
    const currentLoading = computed(() =>
      currentTab.value === "all" ? loading.value : activeLoading.value,
    );
    const currentError = computed(() =>
      currentTab.value === "all" ? error.value : activeError.value,
    );

    const openRentalDetail = async (rental) => {
      const enriched =
        rentals.value.find(
          (item) => item.transaction_code === rental.transaction_code,
        ) || rental;
      selectedRental.value = enriched;
      detailDialogOpen.value = true;
      await loadRentalDetails();
    };

    const switchTab = (tabId) => {
      currentTab.value = tabId;
      if (tabId === "active" && !activeRentals.value.length) {
        loadActiveRentals();
      }
    };

    const handleRefresh = () => {
      if (currentTab.value === "all") loadData();
      else loadActiveRentals();
    };

    const openCreateRental = () => {
      editingRental.value = null;
      showForm.value = true;
    };

    const handleEdit = (rental) => {
      editingRental.value = rental;
      showForm.value = true;
    };

    const handleSaved = async () => {
      showForm.value = false;
      editingRental.value = null;
      await loadData();
    };

    const handleDelete = async (rental) => {
      const confirmed = window.confirm(
        `Hapus transaksi ${rental.transaction_code}? Tindakan ini tidak dapat dibatalkan.`,
      );
      if (!confirmed) return;

      try {
        await transactionStore.deleteTransaction(rental.id);
        await loadData();
      } catch (error) {
        console.error("Gagal menghapus transaksi:", error);
      }
    };

    watch(detailDialogOpen, (visible) => {
      if (!visible) selectedRental.value = null;
    });

    onMounted(() => {
      loadData();
    });

    return {
      rentals,
      activeRentals,
      loading,
      activeLoading,
      error,
      activeError,
      columns,
      activeColumns,
      stats,
      activeStats,
      loadData,
      loadActiveRentals,
      detailDialogOpen,
      selectedRental,
      openRentalDetail,
      filteredDetails,
      detailsLoading,
      detailError,
      loadRentalDetails,
      formatCurrency,
      formatDate,
      currentTab,
      tabs,
      switchTab,
      displayedItems,
      displayedColumns,
      currentLoading,
      currentError,
      showForm,
      editingRental,
      openCreateRental,
      handleEdit,
      handleSaved,
      handleDelete,
      TRANSACTION_TYPE,
      handleRefresh,
    };
  },
};
</script>

<style scoped>
.tab-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.tab-button {
  padding: 0.45rem 1.2rem;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background-color: #fff;
  color: #374151;
  font-size: 0.9rem;
  cursor: pointer;
  line-height: 1;
  transition: all 0.2s ease;
}

.tab-button.active {
  background-color: #4338ca;
  color: #fff;
  border-color: #4338ca;
  box-shadow: 0 6px 14px rgba(67, 56, 202, 0.25);
}

.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
}

.detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.detail-card {
  padding: 0.95rem 1rem;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background-color: #f8fafc;
}

.detail-card h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #4338ca;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.9rem;
  color: #485263;
}

.detail-item span {
  color: #6b7280;
}

.detail-state {
  text-align: center;
  padding: 1rem 0;
  color: #6b7280;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.detail-table th,
.detail-table td {
  padding: 0.6rem 0.9rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}

.detail-table thead {
  background-color: #eef2ff;
  font-weight: 600;
  color: #1e1e1e;
}

.retry-button {
  margin-left: 0.75rem;
}
</style>
