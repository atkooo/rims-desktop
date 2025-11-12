<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Transaksi Penjualan</h1>
          <p class="subtitle">
            Daftar transaksi penjualan tanpa aksi edit. Gunakan pencarian global
            di navbar bila perlu.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="primary" @click="openCreateSale">
            Transaksi Penjualan Baru
          </AppButton>
          <AppButton variant="secondary" :loading="loading" @click="loadData">
            Refresh Data
          </AppButton>
        </div>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Penjualan</span>
          <strong>{{ stats.totalSales }}</strong>
          <span class="summary-note">dari {{ totalRecords }} transaksi</span>
        </div>
        <div class="summary-card">
          <span>Total Nilai</span>
          <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
          <span class="summary-note">
            Rata-rata {{ formatCurrency(stats.averageAmount) }}
          </span>
        </div>
        <div class="summary-card">
          <span>Lunas</span>
          <strong>{{ stats.paidSales }}</strong>
          <span class="summary-note">
            Sisa {{ stats.openSales }} transaksi
          </span>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="filters">
        <select v-model="filters.paymentStatus" class="filter-select">
          <option value="">Semua Status Pembayaran</option>
          <option value="paid">Lunas</option>
          <option value="unpaid">Belum Lunas</option>
          <option value="partial">Sebagian</option>
        </select>
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="filteredSales"
          :loading="loading"
          :searchable-keys="[
            'transaction_code',
            'customer_name',
            'payment_status',
          ]"
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
                      @click="goToSaleDetail(row)"
                    >
                      <Icon name="eye" :size="16" />
                      <span>Detail</span>
                    </button>
                    <button
                      v-if="!isPaid(row)"
                      type="button"
                      class="action-menu-item"
                      @click="continuePayment(row)"
                    >
                      <Icon name="credit-card" :size="16" />
                      <span>Lanjutkan Pembayaran</span>
                    </button>
                    <button
                      type="button"
                      class="action-menu-item"
                      @click="handleEdit(row)"
                    >
                      <Icon name="edit" :size="16" />
                      <span>Edit</span>
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
    :edit-data="editingSale"
    :default-type="TRANSACTION_TYPE.SALE"
    @saved="handleSaved"
    fixed-type
  />
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/ui/Icon.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import TransactionForm from "@/components/modules/transactions/TransactionForm.vue";
import { fetchSalesTransactions } from "@/services/transactions";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";

export default {
  name: "SalesTransactionsView",
  components: { AppButton, AppTable, Icon, TransactionForm },
  setup() {
    const sales = ref([]);
    const loading = ref(false);
    const error = ref("");
    const transactionStore = useTransactionStore();
    const showForm = ref(false);
    const editingSale = ref(null);
    const router = useRouter();
    const openMenuId = ref(null);
    const menuPositions = ref({});
    const filters = ref({
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
        key: "sale_date",
        label: "Tanggal",
        format: formatDate,
        sortable: true,
      },
      {
        key: "total_amount",
        label: "Total",
        format: formatCurrency,
        sortable: true,
      },
      { key: "payment_status", label: "Status Pembayaran", sortable: true },
    ];

    const filteredSales = computed(() => {
      let items = sales.value;

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

    const totalRecords = computed(() => sales.value.length);

    const stats = computed(() => {
      const source = filteredSales.value;
      const totalSales = source.length;
      const totalAmount = source.reduce(
        (sum, item) => sum + (item.total_amount || item.totalAmount || 0),
        0,
      );
      const paidSales = source.filter((item) => {
        const status = (
          item.payment_status ||
          item.paymentStatus ||
          ""
        ).toString();
        return status.toLowerCase() === "paid";
      }).length;
      const openSales = totalSales - paidSales;
      const averageAmount = totalSales ? totalAmount / totalSales : 0;
      return { totalSales, totalAmount, paidSales, openSales, averageAmount };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        sales.value = await fetchSalesTransactions();
      } catch (err) {
        error.value = err.message || "Gagal memuat data penjualan.";
      } finally {
        loading.value = false;
      }
    };

    const goToSaleDetail = (sale) => {
      openMenuId.value = null;
      if (!sale.transaction_code) return;
      router.push({
        name: "transaction-sale-detail",
        params: { code: sale.transaction_code },
      });
    };

    const continuePayment = (sale) => {
      openMenuId.value = null;
      if (!sale.id) return;
      router.push({
        name: "transaction-sale-payment",
        params: { id: sale.id },
      });
    };

    const isPaid = (sale) => {
      const status = (sale.payment_status || sale.paymentStatus || "")
        .toString()
        .toLowerCase();
      return status === "paid";
    };

    const openCreateSale = () => {
      editingSale.value = null;
      router.push({ name: "transaction-sale-new" });
    };

    const handleEdit = (sale) => {
      openMenuId.value = null;
      editingSale.value = sale;
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
      editingSale.value = null;
      await loadData();
    };

    onMounted(() => {
      document.addEventListener("click", closeActionMenu);
      loadData();
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", closeActionMenu);
    });

    return {
      sales,
      filteredSales,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
      totalRecords,
      formatDate,
      openMenuId,
      goToSaleDetail,
      continuePayment,
      isPaid,
      showForm,
      editingSale,
      openCreateSale,
      handleEdit,
      handleSaved,
      TRANSACTION_TYPE,
      toggleActionMenu,
      getMenuPosition,
      filters,
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

.summary-note {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
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
