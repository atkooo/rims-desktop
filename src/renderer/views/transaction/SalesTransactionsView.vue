<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div>
        <h1>Transaksi Penjualan</h1>
        <p class="subtitle">
          Daftar transaksi penjualan tanpa aksi edit. Gunakan pencarian global
          di navbar bila perlu.
        </p>
      </div>
      <AppButton variant="secondary" :loading="loading" @click="loadData">
        Refresh Data
      </AppButton>
    </div>

    <section class="card-section">
      <div v-if="searchTerm" class="search-state">
        <Icon name="search" size="14" />
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
          <AppButton variant="secondary" @click="openSaleDetail(item)">
            Detail
          </AppButton>
        </template>
      </DataTable>
    </section>
  </div>

  <AppDialog
    v-model="detailDialogOpen"
    :title="selectedSale ? `Detail Penjualan ${selectedSale.transaction_code}` : 'Detail Penjualan'"
    :show-footer="false"
  >
    <div class="detail-dialog">
      <div v-if="selectedSale" class="sale-meta">
        <div class="meta-item">
          <span>Customer</span>
          <strong>{{ selectedSale.customer_name || "-" }}</strong>
        </div>
        <div class="meta-item">
          <span>Tanggal</span>
          <strong>{{ formatDate(selectedSale.sale_date) }}</strong>
        </div>
        <div class="meta-item">
          <span>Status Pembayaran</span>
          <strong>{{ selectedSale.payment_status || "-" }}</strong>
        </div>
        <div class="meta-item">
          <span>Metode</span>
          <strong>{{ selectedSale.payment_method || "-" }}</strong>
        </div>
        <div class="meta-item">
          <span>Total</span>
          <strong>{{ formatCurrency(selectedSale.total_amount) }}</strong>
        </div>
        <div class="meta-item">
          <span>Dibayar</span>
          <strong>{{ formatCurrency(selectedSale.paid_amount) }}</strong>
        </div>
      </div>

      <div v-if="detailsLoading" class="detail-state">Memuat detail penjualan...</div>
      <div v-else-if="detailError" class="error-banner">
        {{ detailError }}
        <AppButton class="retry-button" variant="secondary" @click="loadSalesDetails(true)">
          Coba Lagi
        </AppButton>
      </div>
      <div v-else-if="!filteredDetails.length" class="detail-state">
        Tidak ada detail item untuk transaksi ini.
      </div>
      <table v-else class="detail-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Jumlah</th>
            <th>Harga</th>
            <th>Subtotal</th>
            <th>Dibuat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="detail in filteredDetails" :key="detail.id">
            <td>{{ detail.item_name || "-" }}</td>
            <td>{{ detail.quantity }}</td>
            <td>{{ formatCurrency(detail.sale_price) }}</td>
            <td>{{ formatCurrency(detail.subtotal) }}</td>
            <td>{{ formatDateTime(detail.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppDialog>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import Icon from "@/components/ui/Icon.vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import {
  fetchSalesTransactions,
  fetchSalesDetails,
} from "@/services/transactions";
import { eventBus } from "@/utils/eventBus";

export default {
  name: "SalesTransactionsView",
  components: { AppButton, DataTable, Icon, AppDialog },
  setup() {
    const sales = ref([]);
    const saleDetails = ref([]);
    const loading = ref(false);
    const detailsLoading = ref(false);
    const error = ref("");
    const searchTerm = ref("");
    const detailDialogOpen = ref(false);
    const selectedSale = ref(null);
    let detachSearchListener;
    const detailError = ref("");

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";
    const formatDateTime = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

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

    const loadSalesDetails = async (force = false) => {
      if (saleDetails.value.length && !force) return;
      detailsLoading.value = true;
      detailError.value = "";
      try {
        saleDetails.value = await fetchSalesDetails();
      } catch (err) {
        detailError.value = err.message || "Gagal memuat detail penjualan.";
      } finally {
        detailsLoading.value = false;
      }
    };

    const filteredDetails = computed(() => {
      if (!selectedSale.value) return [];
      return saleDetails.value.filter(
        (detail) =>
          detail.transaction_code === selectedSale.value.transaction_code,
      );
    });

    const openSaleDetail = async (sale) => {
      selectedSale.value = sale;
      detailDialogOpen.value = true;
      await loadSalesDetails();
    };

    watch(detailDialogOpen, (visible) => {
      if (!visible) selectedSale.value = null;
    });

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
      formatDateTime,
      detailDialogOpen,
      openSaleDetail,
      filteredDetails,
      detailsLoading,
      detailError,
      loadSalesDetails,
      selectedSale,
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

.summary-note {
  font-size: 0.85rem;
  color: #6b7280;
}

.detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sale-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f8fafc;
}

.meta-item span {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.2rem;
}

.meta-item strong {
  font-size: 0.95rem;
  color: #111827;
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
}

.detail-table th,
.detail-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table thead {
  background-color: #f3f4f6;
  font-weight: 600;
}

.retry-button {
  margin-left: 0.75rem;
}
</style>
