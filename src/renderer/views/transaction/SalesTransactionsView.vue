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
      <div v-if="searchTerm" class="search-state">
        <Icon name="search" :size="14" />
        <span>Pencarian navbar: "{{ searchTerm }}"</span>
      </div>

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
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable
        :columns="columns"
        :items="filteredSales"
        :loading="loading"
        :actions="true"
        :show-edit="false"
        :show-delete="false"
      >
        <template #actions="{ item }">
          <div class="table-actions">
            <AppButton variant="secondary" @click="goToSaleDetail(item)">
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

  <TransactionForm
    v-model="showForm"
    :edit-data="editingSale"
    :default-type="TRANSACTION_TYPE.SALE"
    @saved="handleSaved"
    fixed-type
  />
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/ui/Icon.vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import TransactionForm from "@/components/modules/transactions/TransactionForm.vue";
import { fetchSalesTransactions } from "@/services/transactions";
import { eventBus } from "@/utils/eventBus";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_TYPE } from "@shared/constants";

export default {
  name: "SalesTransactionsView",
  components: { AppButton, DataTable, Icon, TransactionForm },
  setup() {
    const sales = ref([]);
    const loading = ref(false);
    const error = ref("");
    const searchTerm = ref("");
    let detachSearchListener;
    const transactionStore = useTransactionStore();
    const showForm = ref(false);
    const editingSale = ref(null);
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
      { key: "sale_date", label: "Tanggal", format: formatDate },
      { key: "total_amount", label: "Total", format: formatCurrency },
      { key: "payment_status", label: "Status Pembayaran" },
    ];

    const filteredSales = computed(() => {
      if (!searchTerm.value.trim()) return sales.value;
      const term = searchTerm.value.toLowerCase();
      return sales.value.filter((item) => {
        const code = item.transaction_code || item.transactionCode;
        const customer =
          item.customer_name || item.customerName || item.customer;
        const status = item.payment_status || item.paymentStatus;
        return [code, customer, status]
          .filter(Boolean)
          .some((field) => field.toString().toLowerCase().includes(term));
      });
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

    const handleSearch = (query = "") => {
      searchTerm.value = query;
    };

    const goToSaleDetail = (sale) => {
      if (!sale.transaction_code) return;
      router.push({
        name: "transaction-sale-detail",
        params: { code: sale.transaction_code },
      });
    };

    const openCreateSale = () => {
      editingSale.value = null;
      showForm.value = true;
    };

    const handleEdit = (sale) => {
      editingSale.value = sale;
      showForm.value = true;
    };

    const handleSaved = async () => {
      showForm.value = false;
      editingSale.value = null;
      await loadData();
    };

    const handleDelete = async (sale) => {
      const confirmed = window.confirm(
        `Hapus transaksi ${sale.transaction_code}? Tindakan ini tidak dapat dibatalkan.`,
      );
      if (!confirmed) return;

      try {
        await transactionStore.deleteTransaction(sale.id);
        await loadData();
      } catch (error) {
        console.error("Gagal menghapus transaksi:", error);
      }
    };

    onMounted(() => {
      loadData();
      detachSearchListener = eventBus.on("global-search", handleSearch);
    });

    onBeforeUnmount(() => {
      if (detachSearchListener) {
        detachSearchListener();
      }
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
      searchTerm,
      totalRecords,
      formatDate,
      goToSaleDetail,
      showForm,
      editingSale,
      openCreateSale,
      handleEdit,
      handleSaved,
      handleDelete,
      TRANSACTION_TYPE,
    };
  },
};
</script>

<style scoped>
.search-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.85rem;
}

.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
}
</style>
