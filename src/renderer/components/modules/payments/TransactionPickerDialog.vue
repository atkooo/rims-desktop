<template>
  <AppDialog
    v-model="visible"
    title="Pilih Transaksi"
    :show-footer="false"
    :max-width="620"
  >
    <div class="picker-dialog">
      <div class="picker-controls">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab', { active: selectedType === tab.id }]"
            @click="selectedType = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

    <div class="search-row">
      <FormInput id="transactionSearch" placeholder="Cari kode/customer..." v-model="search" />
      <AppButton variant="secondary" class="refresh-button" @click="refreshData" size="small">
        Refresh
      </AppButton>
    </div>
      </div>

      <div class="list">
        <div v-if="loading" class="empty-state">Memuat data...</div>
        <div v-else-if="filteredList.length === 0" class="empty-state">
          Tidak ditemukan transaksi.
        </div>
        <div v-for="transaction in filteredList" :key="transaction.id" class="list-row">
          <div>
            <div class="list-name">
              {{ transaction.transaction_code || transaction.id }}
            </div>
            <div class="list-meta">
              {{ transaction.customer_name || "-" }} · {{ formatDate(transaction.transactionDate || transaction.rental_date || transaction.sale_date) }}
            </div>
          </div>
          <div class="list-actions">
            <span class="amount">{{ formatCurrency(transaction.total_amount || 0) }}</span>
            <AppButton variant="primary" size="small" @click="selectTransaction(transaction)">
              Pilih
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppDialog>
</template>

<script>
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import FormInput from "@/components/ui/FormInput.vue";
import { fetchRentalTransactions, fetchSalesTransactions } from "@/services/transactions";

const tabs = [
  { id: "rental", label: "Rental" },
  { id: "sale", label: "Penjualan" },
];

export default {
  name: "TransactionPickerDialog",
  components: {
    AppDialog,
    AppButton,
    FormInput,
  },
  props: {
    modelValue: Boolean,
  },
  emits: ["update:modelValue", "select"],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });
    const selectedType = ref("rental");
    const search = ref("");
    const loading = ref(false);
    const rentals = ref([]);
    const sales = ref([]);

    const loadData = async () => {
      loading.value = true;
      try {
        if (selectedType.value === "rental") {
          rentals.value = await fetchRentalTransactions();
        } else {
          sales.value = await fetchSalesTransactions();
        }
      } finally {
        loading.value = false;
      }
    };

    const formatCurrency = (value) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value || 0);

    const formatDate = (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("id-ID");
    };

    const currentList = computed(() =>
      selectedType.value === "rental" ? rentals.value : sales.value,
    );

    const filteredList = computed(() => {
      const term = search.value.toLowerCase();
      if (!term) return currentList.value;
      return currentList.value.filter((item) => {
        const code = (item.transaction_code || item.id || "").toString().toLowerCase();
        const customer = (item.customer_name || "").toString().toLowerCase();
        return code.includes(term) || customer.includes(term);
      });
    });

    const selectTransaction = (transaction) => {
      emit("select", {
        ...transaction,
        transaction_type: selectedType.value === "rental" ? "RENTAL" : "SALE",
      });
      visible.value = false;
    };

    const refreshData = () => {
      loadData();
    };

    watch(selectedType, () => {
      loadData();
    });

    watch(
      () => props.modelValue,
      (val) => {
        if (val) {
          loadData();
        }
      },
    );

    return {
      visible,
      selectedType,
      tabs,
      search,
      loading,
      filteredList,
      formatCurrency,
      formatDate,
      selectTransaction,
      refreshData,
    };
  },
};
</script>

<style scoped>
.picker-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.picker-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
}

.tab {
  padding: 0.35rem 1rem;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: #4338ca;
  color: #fff;
  border-color: #4338ca;
}

.search-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.search-row .form-input {
  flex: 1;
  height: 40px;
}

.search-row .form-group {
  flex: 1;
  margin-bottom: 0;
}

.refresh-button {
  height: 40px;
  min-height: 40px;
}

.list {
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.list-name {
  font-weight: 600;
  color: #111827;
}

.list-meta {
  font-size: 0.85rem;
  color: #6b7280;
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.amount {
  font-weight: 600;
  color: #111827;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 1rem 0;
}
</style>
