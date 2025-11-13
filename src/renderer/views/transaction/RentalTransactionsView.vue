<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Transaksi Sewa</h1>
          <p class="subtitle">
            Ringkasan transaksi sewa langsung dari database.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="primary" @click="openCreateRental">
            Transaksi Sewa Baru
          </AppButton>
          <AppButton
            variant="secondary"
            :loading="loading"
            @click="handleRefresh"
          >
            Refresh Data
          </AppButton>
        </div>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Transaksi</span>
          <strong>{{ stats.totalRentals }}</strong>
        </div>
        <div class="summary-card">
          <span>Pending</span>
          <strong>{{ stats.pendingRentals }}</strong>
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

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="filters">
        <select v-model="filters.status" class="filter-select">
          <option value="">Semua Status Sewa</option>
          <option value="pending">Pending (Belum Bayar)</option>
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
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="filteredItems"
          :loading="loading"
          :searchable-keys="['transaction_code', 'customer_name', 'status']"
          row-key="id"
          default-page-size="10"
        >
          <template #actions="{ row }">
            <div class="action-menu-wrapper">
              <button
                type="button"
                class="action-menu-trigger"
                :data-item-id="row.id"
                @click.stop="toggleActionMenu(row.id)"
                :aria-expanded="openMenuId === row.id"
              >
                <Icon name="more-vertical" :size="18" />
              </button>
              <Teleport to="body">
                <transition name="fade-scale">
                  <div
                    v-if="openMenuId === row.id"
                    class="action-menu"
                    :style="getMenuPosition(row.id)"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="action-menu-item"
                      @click="goToRentalDetail(row)"
                    >
                      <Icon name="eye" :size="16" />
                      <span>Detail</span>
                    </button>
                    <button
                      v-if="canEdit(row)"
                      type="button"
                      class="action-menu-item"
                      @click="handleEdit(row)"
                    >
                      <Icon name="edit" :size="16" />
                      <span>Edit</span>
                    </button>
                    <button
                      v-if="canEdit(row)"
                      type="button"
                      class="action-menu-item"
                      @click="openPaymentModal(row)"
                    >
                      <Icon name="credit-card" :size="16" />
                      <span>Bayar</span>
                    </button>
                    <button
                      v-if="canEdit(row)"
                      type="button"
                      class="action-menu-item danger"
                      @click="handleCancel(row)"
                    >
                      <Icon name="x-circle" :size="16" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </transition>
              </Teleport>
            </div>
          </template>
        </AppTable>
      </div>
    </section>
  </div>

  <TransactionForm
    v-model="showForm"
    :edit-data="editingRental"
    :default-type="TRANSACTION_TYPE.RENTAL"
    @saved="handleSaved"
    fixed-type
  />

  <!-- Payment Modal -->
  <PaymentModal
    v-model="showPaymentModal"
    :transaction-id="selectedTransactionId"
    transaction-type="rental"
    @payment-success="handlePaymentSuccess"
    @close="handlePaymentModalClose"
  />
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import Icon from "@/components/ui/Icon.vue";
import TransactionForm from "@/components/modules/transactions/TransactionForm.vue";
import PaymentModal from "@/components/modules/transactions/PaymentModal.vue";
import { fetchRentalTransactions, cancelTransaction } from "@/services/transactions";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "RentalTransactionsView",
  components: { AppButton, AppTable, Icon, TransactionForm, PaymentModal },
  setup() {
    const rentals = ref([]);
    const loading = ref(false);
    const error = ref("");
    const transactionStore = useTransactionStore();
    const showForm = ref(false);
    const editingRental = ref(null);
    const router = useRouter();
    const openMenuId = ref(null);
    const menuPositions = ref({});
    const showPaymentModal = ref(false);
    const selectedTransactionId = ref(null);
    const { showSuccess, showError } = useNotification();
    const filters = ref({
      status: "",
      paymentStatus: "",
    });

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const columns = [
      { key: "transaction_code", label: "Kode", sortable: true },
      { key: "customer_name", label: "Customer", sortable: true },
      {
        key: "rental_date",
        label: "Tanggal Sewa",
        format: formatDate,
        sortable: true,
      },
      {
        key: "planned_return_date",
        label: "Rencana Kembali",
        format: formatDate,
        sortable: true,
      },
      {
        key: "total_amount",
        label: "Total",
        format: formatCurrency,
        sortable: true,
      },
      { 
        key: "status", 
        label: "Status Sewa", 
        sortable: true,
        format: (value) => getRentalStatusLabel(value)
      },
    ];

    const getRentalStatusLabel = (status) => {
      const labels = {
        pending: "Pending (Belum Bayar)",
        active: "Aktif",
        returned: "Dikembalikan",
        cancelled: "Dibatalkan",
        overdue: "Terlambat",
      };
      return labels[status] || status;
    };

    const stats = computed(() => {
      const totalRentals = rentals.value.length;
      const pendingRentals = rentals.value.filter(
        (rental) => rental.status === "pending",
      ).length;
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
        pendingRentals,
        activeRentals: activeRentalsCount,
        overdueRentals,
        totalAmount,
      };
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

    const goToRentalDetail = (rental) => {
      openMenuId.value = null;
      if (!rental.transaction_code) return;
      router.push({
        name: "transaction-rental-detail",
        params: { code: rental.transaction_code },
      });
    };

    const continuePayment = (rental) => {
      openMenuId.value = null;
      if (!rental.id) return;
      router.push({
        name: "transaction-rental-payment",
        params: { id: rental.id },
      });
    };

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

    const canEdit = (rental) => {
      return !isPaid(rental) && !isCancelled(rental);
    };

    const filteredItems = computed(() => {
      let items = rentals.value;

      // Filter by status
      if (filters.value.status) {
        items = items.filter((item) => item.status === filters.value.status);
      }

      // Filter by payment status
      if (filters.value.paymentStatus) {
        items = items.filter((item) => {
          const paymentStatus = (
            item.payment_status ||
            item.paymentStatus ||
            ""
          )
            .toString()
            .toLowerCase();
          return paymentStatus === filters.value.paymentStatus.toLowerCase();
        });
      }

      return items;
    });

    const handleRefresh = () => {
      loadData();
    };

    const openCreateRental = () => {
      router.push({ name: "transaction-rental-new" });
    };

    const handleEdit = (rental) => {
      // Cek apakah transaksi sudah dibatalkan
      if (isCancelled(rental)) {
        showError("Transaksi yang sudah dibatalkan tidak dapat di-edit.");
        return;
      }
      
      // Cek apakah transaksi sudah dibayar
      if (isPaid(rental)) {
        showError("Transaksi yang sudah dibayar tidak dapat di-edit.");
        return;
      }
      
      openMenuId.value = null;
      editingRental.value = rental;
      showForm.value = true;
    };

    const toggleActionMenu = async (itemId) => {
      if (openMenuId.value === itemId) {
        openMenuId.value = null;
      } else {
        openMenuId.value = itemId;
        await nextTick();
        updateMenuPosition(itemId);
      }
    };

    const updateMenuPosition = (itemId) => {
      const trigger = document.querySelector(`[data-item-id="${itemId}"]`);
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      menuPositions.value[itemId] = {
        top: rect.bottom + 4 + "px",
        left: rect.right - 120 + "px",
      };
    };

    const getMenuPosition = (itemId) => {
      return menuPositions.value[itemId] || { top: "0px", left: "0px" };
    };

    const closeActionMenu = (event) => {
      if (!event.target.closest(".action-menu-wrapper")) {
        openMenuId.value = null;
      }
    };

    const handleSaved = async () => {
      showForm.value = false;
      editingRental.value = null;
      await loadData();
    };

    const openPaymentModal = (rental) => {
      openMenuId.value = null;
      if (!rental?.id) return;
      
      // Cek jika transaksi sudah dibatalkan
      if (isCancelled(rental)) {
        showError("Transaksi yang sudah dibatalkan tidak dapat dibayar.");
        return;
      }
      
      // Cek jika transaksi sudah dibayar
      if (isPaid(rental)) {
        showError("Transaksi yang sudah dibayar tidak dapat dibayar lagi.");
        return;
      }
      
      selectedTransactionId.value = rental.id;
      showPaymentModal.value = true;
    };

    const handlePaymentSuccess = (data) => {
      if (!data.partial) {
        showSuccess("Pembayaran berhasil! Transaksi telah dilunasi.");
        showPaymentModal.value = false;
        const transactionCode = data.transaction?.transaction_code;
        selectedTransactionId.value = null;
        // Redirect to detail transaction after successful payment
        if (transactionCode) {
          setTimeout(() => {
            router.push({
              name: "transaction-rental-detail",
              params: { code: transactionCode },
              query: { printReceipt: "true" },
            });
          }, 500);
        } else {
          loadData();
        }
      } else {
        showSuccess("Pembayaran berhasil! Masih ada sisa pembayaran.");
        loadData();
      }
    };

    const handlePaymentModalClose = (data) => {
      showPaymentModal.value = false;
      selectedTransactionId.value = null;
      
      // If modal closed without payment (unpaid), just refresh data
      if (data?.unpaid) {
        loadData(); // Refresh to show updated status
      }
    };

    const handleCancel = async (rental) => {
      openMenuId.value = null;
      
      if (!rental.id) return;
      
      // Konfirmasi cancel
      if (!confirm(`Apakah Anda yakin ingin membatalkan transaksi ${rental.transaction_code}? Stok akan dikembalikan.`)) {
        return;
      }

      try {
        await cancelTransaction(rental.id, "rental");
        showSuccess("Transaksi berhasil di-cancel. Stok telah dikembalikan.");
        await loadData();
      } catch (error) {
        showError(error.message || "Gagal membatalkan transaksi.");
      }
    };

    onMounted(() => {
      document.addEventListener("click", closeActionMenu);
      loadData();
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", closeActionMenu);
    });

    return {
      rentals,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
      formatDate,
      filteredItems,
      showForm,
      editingRental,
      openMenuId,
      openCreateRental,
      handleEdit,
      handleSaved,
      TRANSACTION_TYPE,
      handleRefresh,
      goToRentalDetail,
      isPaid,
      isCancelled,
      canEdit,
      toggleActionMenu,
      getMenuPosition,
      showPaymentModal,
      selectedTransactionId,
      openPaymentModal,
      handlePaymentSuccess,
      handlePaymentModalClose,
      handleCancel,
      filters,
      getRentalStatusLabel,
    };
  },
};
</script>

<style scoped>
.action-menu-wrapper {
  position: relative;
  display: inline-block;
}

.action-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-menu-trigger:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.action-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.action-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.action-menu-item:hover {
  background: #f9fafb;
}

.action-menu-item.danger {
  color: #dc2626;
}

.action-menu-item.danger:hover {
  background: #fee2e2;
  color: #991b1b;
}

.action-menu-item .icon {
  flex-shrink: 0;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
}

.summary-card span {
  display: block;
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.summary-card strong {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.table-container {
  margin-top: 1.5rem;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #fff;
  color: #374151;
  font-size: 0.875rem;
  min-width: 180px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:hover {
  border-color: #9ca3af;
}

.filter-select:focus {
  outline: none;
  border-color: #4338ca;
  box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
}
</style>
