<template>
  <div class="data-page search-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Hasil Pencarian</h1>
          <p class="subtitle" v-if="searchQuery && !loading">
            Menemukan <strong>{{ totalResults }}</strong> hasil untuk: <strong>"{{ searchQuery }}"</strong>
          </p>
          <p class="subtitle" v-else-if="loading">
            Mencari...
          </p>
          <p class="subtitle" v-else>
            Masukkan kata kunci untuk mencari transaksi atau pelanggan
          </p>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar-container">
      <form class="search-form" @submit.prevent="handleSearch">
        <Icon name="search" :size="18" class="search-icon" />
        <input
          v-model="localSearchQuery"
          type="text"
          class="search-input"
          placeholder="Cari transaksi, pelanggan, atau kode transaksi..."
          @input="handleInput"
        />
        <button type="submit" class="search-submit-btn" :disabled="loading || !localSearchQuery.trim()">
          <Icon v-if="loading" name="refresh-cw" :size="16" class="spinning" />
          <span v-else>Cari</span>
        </button>
        <button
          v-if="localSearchQuery"
          type="button"
          class="search-clear-btn"
          @click="clearSearch"
          aria-label="Clear search"
        >
          <Icon name="x" :size="16" />
        </button>
      </form>
    </div>

    <section class="card-section">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Mencari data...</p>
      </div>

      <div v-else-if="error" class="error-banner">
        {{ error }}
      </div>

      <div v-else-if="!searchQuery" class="empty-state">
        <div class="empty-icon-wrapper">
          <Icon name="search" :size="64" />
        </div>
        <h3>Mulai Pencarian</h3>
        <p>Gunakan search bar di atas untuk mencari transaksi atau pelanggan</p>
        <div class="search-tips">
          <p class="tips-title">Tips pencarian:</p>
          <ul>
            <li>Kode transaksi (contoh: TRX-2024-001)</li>
            <li>Nama pelanggan</li>
            <li>Nomor telepon pelanggan</li>
            <li>Email pelanggan</li>
          </ul>
        </div>
      </div>

      <div v-else-if="hasResults" class="search-results">
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div v-if="filteredTransactions.length > 0" class="summary-card">
            <div class="summary-icon transaction">
              <Icon name="file-text" :size="24" />
            </div>
            <div class="summary-content">
              <div class="summary-value">{{ filteredTransactions.length }}</div>
              <div class="summary-label">Transaksi</div>
            </div>
          </div>
          <div v-if="filteredCustomers.length > 0" class="summary-card">
            <div class="summary-icon customer">
              <Icon name="users" :size="24" />
            </div>
            <div class="summary-content">
              <div class="summary-value">{{ filteredCustomers.length }}</div>
              <div class="summary-label">Pelanggan</div>
            </div>
          </div>
        </div>

        <!-- Transactions Section -->
        <div v-if="filteredTransactions.length > 0" class="result-section">
          <div class="section-header">
            <h2 class="section-title">
              <Icon name="file-text" :size="20" />
              Transaksi
              <span class="badge">{{ filteredTransactions.length }}</span>
            </h2>
          </div>
          <div class="table-container">
            <AppTable
              :columns="transactionColumns"
              :rows="filteredTransactions"
              :loading="false"
              :searchable-keys="[]"
              row-key="id"
              :default-page-size="10"
              :show-search="false"
              show-index
            >
              <template #cell-transaction_code="{ row }">
                <span v-html="highlightText(row.transaction_code, searchQuery)"></span>
              </template>
              <template #cell-customer_name="{ row }">
                <span v-html="highlightText(row.customer_name, searchQuery)"></span>
              </template>
              <template #actions="{ row }">
                <button
                  type="button"
                  class="action-btn"
                  @click="goToTransactionDetail(row)"
                >
                  <Icon name="eye" :size="16" />
                  <span>Detail</span>
                </button>
              </template>
            </AppTable>
          </div>
        </div>

        <!-- Customers Section -->
        <div v-if="filteredCustomers.length > 0" class="result-section">
          <div class="section-header">
            <h2 class="section-title">
              <Icon name="users" :size="20" />
              Pelanggan
              <span class="badge">{{ filteredCustomers.length }}</span>
            </h2>
          </div>
          <div class="table-container">
            <AppTable
              :columns="customerColumns"
              :rows="filteredCustomers"
              :loading="false"
              :searchable-keys="[]"
              row-key="id"
              :default-page-size="10"
              :show-search="false"
              show-index
            >
              <template #cell-code="{ row }">
                <span v-html="highlightText(row.code, searchQuery)"></span>
              </template>
              <template #cell-name="{ row }">
                <span v-html="highlightText(row.name, searchQuery)"></span>
              </template>
              <template #cell-phone="{ row }">
                <span v-html="highlightText(row.phone, searchQuery)"></span>
              </template>
              <template #cell-email="{ row }">
                <span v-html="highlightText(row.email, searchQuery)"></span>
              </template>
              <template #actions="{ row }">
                <button
                  type="button"
                  class="action-btn"
                  @click="goToCustomerDetail(row)"
                >
                  <Icon name="eye" :size="16" />
                  <span>Detail</span>
                </button>
              </template>
            </AppTable>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="!hasResults" class="empty-state no-results">
          <div class="empty-icon-wrapper">
            <Icon name="x-circle" :size="64" />
          </div>
          <h3>Tidak Ada Hasil Ditemukan</h3>
          <p>Tidak ada hasil untuk <strong>"{{ searchQuery }}"</strong></p>
          <div class="empty-actions">
            <button type="button" class="action-btn-primary" @click="clearSearch">
              <Icon name="x" :size="16" />
              <span>Hapus Pencarian</span>
            </button>
          </div>
          <div class="search-tips">
            <p class="tips-title">Coba:</p>
            <ul>
              <li>Periksa ejaan kata kunci</li>
              <li>Gunakan kata kunci yang lebih umum</li>
              <li>Pastikan format kode transaksi benar</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/ui/Icon.vue";
import AppTable from "@/components/ui/AppTable.vue";
import { fetchRentalTransactions, fetchSalesTransactions } from "@/services/transactions";
import { fetchCustomers } from "@/services/masterData";
import { eventBus } from "@/utils/eventBus";
import { useCurrency } from "@/composables/useCurrency";

export default {
  name: "SearchResultsView",
  components: { Icon, AppTable },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const searchQuery = ref(route.query.q || "");
    const localSearchQuery = ref(route.query.q || "");
    const allTransactions = ref([]);
    const allCustomers = ref([]);
    const loading = ref(false);
    const error = ref("");
    let searchTimeout = null;

    const { formatCurrency } = useCurrency();
    const formatDate = (value) => {
      return value ? new Date(value).toLocaleDateString("id-ID") : "-";
    };

    const highlightText = (text, query) => {
      if (!text || !query || !query.trim()) {
        return escapeHtml(String(text || ""));
      }

      const escapedText = escapeHtml(String(text));
      const escapedQuery = escapeHtml(query.trim());
      // Escape special regex characters
      const escapedQueryForRegex = escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedQueryForRegex})`, "gi");
      
      return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    };

    const escapeHtml = (text) => {
      if (!text) return "";
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return String(text).replace(/[&<>"']/g, (m) => map[m]);
    };

    const transactionColumns = [
      { key: "transaction_code", label: "Kode", sortable: true },
      { key: "customer_name", label: "Pelanggan", sortable: true },
      {
        key: "transaction_date",
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
      {
        key: "transaction_type",
        label: "Tipe",
        format: (value) => value === "rental" ? "Rental" : "Penjualan",
        sortable: true,
      },
      {
        key: "payment_status",
        label: "Status Pembayaran",
        format: (value) => value === "paid" ? "Lunas" : "Belum Lunas",
        sortable: true,
      },
    ];

    const customerColumns = [
      { key: "code", label: "Kode", sortable: true },
      { key: "name", label: "Nama", sortable: true },
      { key: "phone", label: "Telepon", sortable: true },
      { key: "email", label: "Email", sortable: true },
      {
        key: "total_transactions",
        label: "Total Transaksi",
        sortable: true,
      },
    ];

    const searchInData = (data, query, keys) => {
      if (!query) return data;
      const q = query.toLowerCase().trim();
      return data.filter((item) =>
        keys.some((key) => {
          const value = item[key];
          return value && String(value).toLowerCase().includes(q);
        })
      );
    };

    const filteredTransactions = computed(() => {
      return searchInData(
        allTransactions.value,
        searchQuery.value,
        ["transaction_code", "customer_name"]
      );
    });

    const filteredCustomers = computed(() => {
      return searchInData(
        allCustomers.value,
        searchQuery.value,
        ["code", "name", "phone", "email"]
      );
    });

    const hasResults = computed(() => {
      return filteredTransactions.value.length > 0 || filteredCustomers.value.length > 0;
    });

    const totalResults = computed(() => {
      return filteredTransactions.value.length + filteredCustomers.value.length;
    });

    const loadData = async () => {
      if (!searchQuery.value.trim()) {
        allTransactions.value = [];
        allCustomers.value = [];
        return;
      }

      loading.value = true;
      error.value = "";

      try {
        const [rentals, sales, customersData] = await Promise.all([
          fetchRentalTransactions(),
          fetchSalesTransactions(),
          fetchCustomers(),
        ]);

        // Combine rentals and sales with transaction_type
        const combinedTransactions = [
          ...rentals.map((t) => ({ ...t, transaction_type: "rental", transaction_date: t.rental_date })),
          ...sales.map((t) => ({ ...t, transaction_type: "sale", transaction_date: t.sale_date })),
        ];

        allTransactions.value = combinedTransactions;
        allCustomers.value = customersData || [];
      } catch (err) {
        error.value = err.message || "Gagal memuat data pencarian.";
        allTransactions.value = [];
        allCustomers.value = [];
      } finally {
        loading.value = false;
      }
    };

    const goToTransactionDetail = (transaction) => {
      if (transaction.transaction_type === "rental") {
        router.push({
          name: "transaction-rental-detail",
          params: { code: transaction.transaction_code },
        });
      } else {
        router.push({
          name: "transaction-sale-detail",
          params: { code: transaction.transaction_code },
        });
      }
    };

    const goToCustomerDetail = (customer) => {
      router.push({
        name: "customers",
        query: { highlight: customer.id },
      });
    };

    // Listen to global-search event
    const handleGlobalSearch = (query) => {
      localSearchQuery.value = query;
      searchQuery.value = query;
      router.replace({ query: { q: query } });
      loadData();
    };

    const handleSearch = () => {
      if (!localSearchQuery.value.trim()) return;
      searchQuery.value = localSearchQuery.value.trim();
      router.replace({ query: { q: searchQuery.value } });
      loadData();
    };

    const handleInput = () => {
      // Clear timeout if user is still typing
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };

    const clearSearch = () => {
      localSearchQuery.value = "";
      searchQuery.value = "";
      router.replace({ query: {} });
      allTransactions.value = [];
      allCustomers.value = [];
    };

    // Watch route query changes
    watch(
      () => route.query.q,
      (newQuery) => {
        if (newQuery !== searchQuery.value) {
          searchQuery.value = newQuery || "";
          if (searchQuery.value) {
            loadData();
          } else {
            allTransactions.value = [];
            allCustomers.value = [];
          }
        }
      }
    );

    onMounted(() => {
      // Listen to global-search event
      eventBus.on("global-search", handleGlobalSearch);

      // Load data if query exists
      if (searchQuery.value) {
        loadData();
      }
    });

    onBeforeUnmount(() => {
      eventBus.off("global-search", handleGlobalSearch);
    });

    return {
      searchQuery,
      localSearchQuery,
      filteredTransactions,
      filteredCustomers,
      loading,
      error,
      hasResults,
      totalResults,
      transactionColumns,
      customerColumns,
      goToTransactionDetail,
      goToCustomerDetail,
      handleSearch,
      handleInput,
      clearSearch,
      highlightText,
    };
  },
};
</script>

<style scoped>
.search-page {
  max-width: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 0;
  font-size: 15px;
  color: #6b7280;
  line-height: 1.5;
}

.subtitle strong {
  color: #111827;
  font-weight: 600;
}

/* Search Bar */
.search-bar-container {
  margin-bottom: 24px;
}

.search-form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px 4px 4px 48px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-form:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.search-form .search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  transition: color 0.2s ease;
}

.search-form:focus-within .search-icon {
  color: #4f46e5;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #111827;
  outline: none;
  padding: 12px 8px;
  min-width: 0;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-left: 8px;
}

.search-submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca, #5855eb);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.search-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.search-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 4px;
}

.search-clear-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: #6b7280;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

.loading-state p {
  margin: 0;
  font-size: 15px;
  color: #6b7280;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: #6b7280;
}

.empty-icon-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0f9ff, #e0e7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #6366f1;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 15px;
  color: #6b7280;
  max-width: 500px;
}

.empty-state.no-results .empty-icon-wrapper {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: #ef4444;
}

.empty-actions {
  margin-bottom: 32px;
}

.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-primary:hover {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.search-tips {
  margin-top: 24px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  text-align: left;
  max-width: 500px;
}

.tips-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.search-tips ul {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.search-tips li {
  margin: 6px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.error-banner {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #991b1b;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border-left: 4px solid #dc2626;
  font-size: 14px;
  font-weight: 500;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.summary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.summary-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-icon.transaction {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #2563eb;
}

.summary-icon.customer {
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  color: #4f46e5;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Search Results */
.search-results {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.result-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.result-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 14px;
  margin-left: 4px;
}

.table-container {
  margin-top: 16px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Search Highlight */
.search-highlight {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(146, 64, 14, 0.2);
}

/* Responsive */
@media (max-width: 768px) {
  .search-form {
    flex-wrap: wrap;
    padding: 8px;
  }

  .search-input {
    width: 100%;
    margin-bottom: 8px;
  }

  .search-submit-btn {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .header-content h1 {
    font-size: 24px;
  }
}
</style>

