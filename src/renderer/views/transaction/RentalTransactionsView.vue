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
            <AppButton variant="secondary" @click="goToRentalDetail(item)">
              Detail
            </AppButton>
            <AppButton 
              v-if="!isPaid(item)" 
              variant="success" 
              @click="continuePayment(item)"
            >
              Lanjutkan Pembayaran
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

  <TransactionForm
    v-model="showForm"
    :edit-data="editingRental"
    :default-type="TRANSACTION_TYPE.RENTAL"
    @saved="handleSaved"
    fixed-type
  />
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import TransactionForm from "@/components/modules/transactions/TransactionForm.vue";
import {
  fetchRentalTransactions,
} from "@/services/transactions";
import { fetchActiveRentals } from "@/services/reports";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";

export default {
  name: "RentalTransactionsView",
  components: { AppButton, DataTable, TransactionForm },
  setup() {
    const rentals = ref([]);
    const activeRentals = ref([]);
    const loading = ref(false);
    const activeLoading = ref(false);
    const error = ref("");
    const activeError = ref("");
    const currentTab = ref("all");
    const transactionStore = useTransactionStore();
    const showForm = ref(false);
    const editingRental = ref(null);
    const router = useRouter();

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

    const goToRentalDetail = (rental) => {
      if (!rental.transaction_code) return;
      router.push({
        name: "transaction-rental-detail",
        params: { code: rental.transaction_code },
      });
    };

    const continuePayment = (rental) => {
      if (!rental.id) return;
      router.push({
        name: "transaction-rental-payment",
        params: { id: rental.id },
      });
    };

    const isPaid = (rental) => {
      const status = (rental.payment_status || rental.paymentStatus || "").toString().toLowerCase();
      return status === "paid";
    };

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
      router.push({ name: "transaction-rental-new" });
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
      goToRentalDetail,
      continuePayment,
      isPaid,
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
</style>
