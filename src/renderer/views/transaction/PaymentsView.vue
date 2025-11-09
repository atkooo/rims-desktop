<template>
  <div class="data-page transaction-page">
    <div class="page-header">
        <div class="header-content">
          <div>
            <h1>Pembayaran</h1>
            <p class="subtitle">
              Kelola riwayat pembayaran dari transaksi sewa maupun jual.
            </p>
          </div>
          <div class="header-actions">
            <AppButton variant="secondary" :loading="loading" @click="loadData">
              Refresh Data
            </AppButton>
            <AppButton variant="primary" @click="showForm = true">
              Pembayaran Baru
            </AppButton>
          </div>
        </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Pembayaran</span>
          <strong>{{ payments.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Nilai</span>
          <strong>{{ formatCurrency(stats.totalAmount) }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

      <DataTable
        :columns="columns"
        :items="payments"
        :loading="loading"
        actions
        @edit="handleEdit"
        @delete="handleDelete"
      >
        <template #actions="{ item }">
          <div class="table-actions">
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

    <!-- Payment Form Dialog -->
    <PaymentForm
      v-model="showForm"
      :edit-data="editingPayment"
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
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import DataTable from "@/components/ui/DataTable.vue";
import PaymentForm from "@/components/modules/payments/PaymentForm.vue";
import {
  fetchPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from "@/services/transactions";

export default {
  name: "PaymentsView",
  components: { AppButton, AppDialog, DataTable, PaymentForm },
  setup() {
    const payments = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingPayment = ref(null);

    // Confirmation dialog state
    const showConfirm = ref(false);
    const confirmTitle = ref("");
    const confirmMessage = ref("");
    const confirmAction = ref("");
    const confirmVariant = ref("primary");
    const confirmLoading = ref(false);
    const confirmCallback = ref(null);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });
    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);
    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("id-ID") : "-";

    const columns = [
      { key: "transaction_type", label: "Tipe Transaksi" },
      { key: "transaction_id", label: "Referensi ID" },
      { key: "amount", label: "Jumlah", format: formatCurrency },
      { key: "payment_method", label: "Metode" },
      { key: "payment_date", label: "Tanggal", format: formatDate },
      { key: "reference_number", label: "No Referensi" },
      { key: "user_name", label: "Petugas" },
      { key: "notes", label: "Catatan" },
    ];

    const stats = computed(() => {
      const totalAmount = payments.value.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );
      return { totalAmount };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        payments.value = await fetchPayments();
      } catch (err) {
        error.value = err.message || "Gagal memuat data pembayaran.";
      } finally {
        loading.value = false;
      }
    };

    // Handle edit
    const handleEdit = (payment) => {
      editingPayment.value = payment;
      showForm.value = true;
    };

    // Handle save
    const handleSaved = async () => {
      editingPayment.value = null;
      showForm.value = false;
      await loadData();
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

    // Handle delete
    const handleDelete = (payment) => {
      showConfirmation(
        "Hapus Pembayaran",
        `Apakah Anda yakin ingin menghapus pembayaran ID ${payment.id}? Tindakan ini tidak dapat dibatalkan.`,
        "Hapus",
        "danger",
        async () => {
          confirmLoading.value = true;
          try {
            await deletePayment(payment.id);
            await loadData();
          } catch (error) {
            console.error("Error deleting payment:", error);
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

    onMounted(loadData);

    return {
      payments,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
      showForm,
      editingPayment,
      handleEdit,
      handleSaved,
      handleDelete,
      showConfirm,
      confirmTitle,
      confirmMessage,
      confirmAction,
      confirmVariant,
      confirmLoading,
      handleConfirm,
    };
  },
};
</script>

<style scoped>
.table-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
