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
        <div class="header-actions">
          <AppButton variant="secondary" :loading="loading" @click="loadData">
            Refresh Data
          </AppButton>
          <AppButton variant="primary" @click="showForm = true">
            Booking Baru
          </AppButton>
        </div>
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

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
      <AppTable
        :columns="columns"
        :rows="bookings"
        :loading="loading"
        :searchable-keys="['booking_code', 'customer_name', 'item_name', 'status']"
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
                    @click="handleEdit(row)"
                  >
                    <Icon name="edit" :size="16" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    class="action-menu-item danger"
                    @click="handleDelete(row)"
                  >
                    <Icon name="trash" :size="16" />
                    <span>Hapus</span>
                  </button>
                </div>
              </transition>
            </Teleport>
          </div>
        </template>
      </AppTable>
      </div>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppTable from "@/components/ui/AppTable.vue";
import Icon from "@/components/ui/Icon.vue";
import BookingForm from "@/components/modules/bookings/BookingForm.vue";
import {
  fetchBookings,
  createBooking,
  updateBooking,
  deleteBooking,
} from "@/services/transactions";

export default {
  name: "BookingsView",
  components: { AppButton, AppDialog, AppTable, Icon, BookingForm },
  setup() {
    const bookings = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showForm = ref(false);
    const editingBooking = ref(null);
    const openMenuId = ref(null);
    const menuPositions = ref({});

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
      { key: "booking_code", label: "Kode", sortable: true },
      { key: "customer_name", label: "Customer", sortable: true },
      { key: "item_name", label: "Item", sortable: true },
      { key: "quantity", label: "Jumlah", sortable: true, align: "center" },
      { key: "booking_date", label: "Tanggal Booking", format: formatDate, sortable: true },
      { key: "planned_start_date", label: "Mulai", format: formatDate, sortable: true },
      { key: "planned_end_date", label: "Selesai", format: formatDate, sortable: true },
      { key: "estimated_price", label: "Estimasi", format: formatCurrency, sortable: true, align: "right" },
      { key: "deposit", label: "DP", format: formatCurrency, sortable: true, align: "right" },
      { key: "status", label: "Status", sortable: true },
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
      openMenuId.value = null;
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
      openMenuId.value = null;
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
      const trigger = document.querySelector(
        `[data-item-id="${itemId}"]`,
      );
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

    // Handle confirmation
    const handleConfirm = () => {
      if (confirmCallback.value) {
        confirmCallback.value();
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
      bookings,
      loading,
      error,
      columns,
      stats,
      loadData,
      formatCurrency,
      showForm,
      editingBooking,
      openMenuId,
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
      toggleActionMenu,
      getMenuPosition,
    };
  },
};
 </script>

<style scoped>
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
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
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
</style>
