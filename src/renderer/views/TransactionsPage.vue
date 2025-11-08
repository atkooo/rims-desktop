<template>
  <div class="transactions-page">
    <div class="page-header">
      <div class="header-content">
        <h1>Transaksi</h1>
        <AppButton variant="primary" @click="showForm = true">
          Transaksi Baru
        </AppButton>
      </div>

      <!-- Filters -->
      <div class="filters">
        <FormInput
          id="searchCustomer"
          v-model="filters.search"
          placeholder="Cari customer..."
          class="search-input"
        />

        <select v-model="filters.status" class="status-filter">
          <option value="">Semua Status</option>
          <option
            v-for="status in TRANSACTION_STATUS"
            :key="status"
            :value="status"
          >
            {{ status }}
          </option>
        </select>

        <div class="date-range">
          <FormInput
            id="startDate"
            type="date"
            v-model="filters.startDate"
            class="date-input"
          />
          <span>to</span>
          <FormInput
            id="endDate"
            type="date"
            v-model="filters.endDate"
            class="date-input"
          />
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <DataTable
      :columns="columns"
      :items="filteredTransactions"
      :loading="loading"
      actions
      @edit="handleEdit"
      :showDelete="false"
    >
      <template #actions="{ item }">
        <AppButton
          v-if="item.status === TRANSACTION_STATUS.PENDING"
          variant="success"
          class="action-button"
          @click="completeTransaction(item)"
        >
          Complete
        </AppButton>
        <AppButton
          v-if="item.status === TRANSACTION_STATUS.PENDING"
          variant="danger"
          class="action-button"
          @click="cancelTransaction(item)"
        >
          Cancel
        </AppButton>
        <AppButton
          variant="secondary"
          class="action-button"
          @click="viewDetails(item)"
        >
          Detail
        </AppButton>
      </template>
    </DataTable>

    <!-- Transaction Form Dialog -->
    <TransactionForm
      v-model="showForm"
      :edit-data="editingTransaction"
      @saved="handleSaved"
    />

    <!-- Confirmation Dialog -->
    <AppDialog
      v-model="showConfirm"
      :title="confirmTitle"
      :confirm-text="confirmAction"
      :confirm-variant="confirmVariant"
      :loading="confirmLoading"
      @confirm="handleConfirm"
    >
      {{ confirmMessage }}
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useTransactionStore } from "@/store/transactions";
import { TRANSACTION_STATUS } from "@shared/constants";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import DataTable from "@/components/ui/DataTable.vue";
import FormInput from "@/components/ui/FormInput.vue";
import TransactionForm from "@/components/modules/transactions/TransactionForm.vue";

export default {
  name: "TransactionsPage",

  components: {
    AppButton,
    AppDialog,
    DataTable,
    FormInput,
    TransactionForm,
  },

  setup() {
    const transactionStore = useTransactionStore();
    const loading = ref(false);
    const showForm = ref(false);
    const editingTransaction = ref(null);

    // Konfirmasi dialog state
    const showConfirm = ref(false);
    const confirmTitle = ref("");
    const confirmMessage = ref("");
    const confirmAction = ref("");
    const confirmVariant = ref("primary");
    const confirmLoading = ref(false);
    const confirmCallback = ref(null);

    // Filter state
    const filters = ref({
      search: "",
      status: "",
      startDate: "",
      endDate: "",
    });

    // Table columns
    const columns = [
      { key: "id", label: "ID" },
      {
        key: "transactionDate",
        label: "Tanggal",
        format: (value) => new Date(value).toLocaleDateString("id-ID"),
      },
      { key: "customerName", label: "Customer" },
      {
        key: "totalAmount",
        label: "Total",
        format: (value) =>
          new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
          }).format(value),
      },
      { key: "status", label: "Status" },
    ];

    // Filter transactions
    const filteredTransactions = computed(() => {
      let result = [...transactionStore.transactions];

      if (filters.value.search) {
        const search = filters.value.search.toLowerCase();
        result = result.filter(
          (t) =>
            t.customerName.toLowerCase().includes(search) ||
            t.id.toString().includes(search),
        );
      }

      if (filters.value.status) {
        result = result.filter((t) => t.status === filters.value.status);
      }

      if (filters.value.startDate && filters.value.endDate) {
        result = result.filter((t) => {
          const date = new Date(t.transactionDate);
          return (
            date >= new Date(filters.value.startDate) &&
            date <= new Date(filters.value.endDate)
          );
        });
      }

      return result;
    });

    // Load transactions
    onMounted(async () => {
      loading.value = true;
      try {
        await transactionStore.fetchTransactions();
      } finally {
        loading.value = false;
      }
    });

    // Handle edit
    const handleEdit = (transaction) => {
      editingTransaction.value = transaction;
      showForm.value = true;
    };

    // Handle save
    const handleSaved = () => {
      editingTransaction.value = null;
      showForm.value = false;
    };

    // Show confirmation dialog
    const showConfirmation = (title, message, action, variant, callback) => {
      confirmTitle.value = title;
      confirmMessage.value = message;
      confirmAction.value = action;
      confirmVariant.value = variant;
      confirmCallback.value = callback;
      showConfirm.value = true;
    };

    // Complete transaction
    const completeTransaction = (transaction) => {
      showConfirmation(
        "Complete Transaction",
        "Are you sure you want to complete this transaction?",
        "Complete",
        "success",
        async () => {
          confirmLoading.value = true;
          try {
            await transactionStore.updateTransactionStatus(
              transaction.id,
              TRANSACTION_STATUS.COMPLETED,
            );
          } finally {
            confirmLoading.value = false;
            showConfirm.value = false;
          }
        },
      );
    };

    // Cancel transaction
    const cancelTransaction = (transaction) => {
      showConfirmation(
        "Cancel Transaction",
        "Are you sure you want to cancel this transaction?",
        "Cancel",
        "danger",
        async () => {
          confirmLoading.value = true;
          try {
            await transactionStore.updateTransactionStatus(
              transaction.id,
              TRANSACTION_STATUS.CANCELLED,
            );
          } finally {
            confirmLoading.value = false;
            showConfirm.value = false;
          }
        },
      );
    };

    // Handle confirmation
    const handleConfirm = () => {
      if (confirmCallback.value) {
        confirmCallback.value();
      }
    };

    // View transaction details
    const viewDetails = (transaction) => {
      // TODO: Implement transaction details view
      console.log("View details:", transaction);
    };

    return {
      loading,
      showForm,
      editingTransaction,
      showConfirm,
      confirmTitle,
      confirmMessage,
      confirmAction,
      confirmVariant,
      confirmLoading,
      filters,
      columns,
      filteredTransactions,
      TRANSACTION_STATUS,
      handleEdit,
      handleSaved,
      completeTransaction,
      cancelTransaction,
      handleConfirm,
      viewDetails,
    };
  },
};
</script>

<style scoped>
.transactions-page {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.status-filter {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  width: 150px;
}

.action-button {
  padding: 0.25rem 0.5rem !important;
  font-size: 0.875rem !important;
}
</style>
