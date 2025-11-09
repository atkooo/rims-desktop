<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Booking Barang</h1>
          <p class="subtitle">
            Kelola booking barang dan jadwal pelaksanaannya.
          </p>
        </div>
        <AppButton variant="primary" @click="showForm = true">
          Booking Baru
        </AppButton>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Booking</span>
          <strong>{{ stats.totalBookings }}</strong>
        </div>
        <div class="summary-card">
          <span>Pending</span>
          <strong>{{ stats.pending }}</strong>
        </div>
        <div class="summary-card">
          <span>Confirmed</span>
          <strong>{{ stats.confirmed }}</strong>
        </div>
      </div>
    </section>

    <section class="card-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <DataTable
        :columns="columns"
        :items="bookings"
        :loading="loading"
        actions
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </section>

    <!-- Booking Form Dialog -->
    <BookingForm
      v-model="showForm"
      :edit-data="editingBooking"
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
import BookingForm from "@/components/modules/bookings/BookingForm.vue";
import {
  fetchBookings,
  createBooking,
  updateBooking,
  deleteBooking,
} from "@/services/transactions";

export default {
  name: "BookingsView",
  components: { AppButton, AppDialog, DataTable, BookingForm },
  setup() {
    const bookings = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingBooking = ref(null);

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
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

    const columns = [
      { key: "booking_code", label: "Kode" },
      { key: "customer_name", label: "Customer" },
      { key: "item_name", label: "Item" },
      { key: "quantity", label: "Jumlah" },
      { key: "booking_date", label: "Tanggal Booking", format: formatDate },
      { key: "planned_start_date", label: "Mulai", format: formatDate },
      { key: "planned_end_date", label: "Selesai", format: formatDate },
      { key: "estimated_price", label: "Estimasi", format: formatCurrency },
      { key: "deposit", label: "DP", format: formatCurrency },
      { key: "status", label: "Status" },
    ];

    const stats = computed(() => {
      const totalBookings = bookings.value.length;
      const pending = bookings.value.filter(
        (item) => item.status === "pending",
      ).length;
      const confirmed = bookings.value.filter(
        (item) => item.status === "confirmed",
      ).length;
      return { totalBookings, pending, confirmed };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        bookings.value = await fetchBookings();
      } catch (err) {
        error.value = err.message || "Gagal memuat data booking.";
      } finally {
        loading.value = false;
      }
    };

    // Handle edit
    const handleEdit = (booking) => {
      editingBooking.value = booking;
      showForm.value = true;
    };

    // Handle save
    const handleSaved = async () => {
      editingBooking.value = null;
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
    const handleDelete = (booking) => {
      showConfirmation(
        "Hapus Booking",
        `Apakah Anda yakin ingin menghapus booking ${booking.booking_code}? Tindakan ini tidak dapat dibatalkan.`,
        "Hapus",
        "danger",
        async () => {
          confirmLoading.value = true;
          try {
            await deleteBooking(booking.id);
            await loadData();
          } catch (error) {
            console.error("Error deleting booking:", error);
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
      bookings,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
      showForm,
      editingBooking,
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
.data-page {
  padding: 0;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.card-section {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #4b5563;
}

.summary-card strong {
  font-size: 1.4rem;
  color: #111827;
}

.error-banner {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: #fee2e2;
  color: #991b1b;
  margin-bottom: 1rem;
}
</style>
