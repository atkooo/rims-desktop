<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Buka Kasir</h1>
          <div class="header-session">
            <span class="header-session__label">Kasir</span>
            <span
              class="header-session__status"
              :class="{ active: hasSession, inactive: !hasSession }"
            >
              {{ hasSession ? "Sesi Aktif" : "Sesi Tidak Aktif" }}
            </span>
            <span v-if="hasSession" class="header-session__code">
              Kode: {{ currentSession.session_code }}
            </span>
          </div>
          <p class="subtitle">
            Kelola sesi kasir untuk memulai dan menutup shift harian.
          </p>
        </div>
        <div class="header-actions">
          <div class="header-datetime">
            <span class="header-datetime__date">{{ formattedHeaderDate }}</span>
            <span class="header-datetime__time">{{ formattedHeaderTime }}</span>
          </div>
          <AppButton variant="secondary" :loading="loading" @click="loadData">
            Refresh Data
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Current Session Card -->
    <section v-if="currentSession" class="card-section session-active">
      <div class="session-header">
        <div>
          <h2>Sesi Kasir Aktif</h2>
          <p class="session-code">Kode: {{ currentSession.session_code }}</p>
        </div>
        <div class="session-status">
          <span class="status-badge open">Terbuka</span>
        </div>
      </div>

      <div class="session-details">
        <div class="detail-row">
          <span>Dibuka oleh:</span>
          <strong>{{
            currentSession.full_name || currentSession.username
          }}</strong>
        </div>
        <div class="detail-row">
          <span>Tanggal Buka:</span>
          <strong>{{ formatDateTime(currentSession.opening_date) }}</strong>
        </div>
        <div class="detail-row">
          <span>Saldo Awal:</span>
          <strong>{{ formatCurrency(currentSession.opening_balance) }}</strong>
        </div>
        <div class="detail-row">
          <span>Saldo Diharapkan:</span>
          <strong>{{
            formatCurrency(currentSession.expected_balance || 0)
          }}</strong>
        </div>
      </div>

      <div class="session-actions">
        <AppButton
          v-if="canCloseSession"
          variant="danger"
          :loading="closing"
          @click="showCloseDialog = true"
        >
          Tutup Kasir
        </AppButton>
        <div v-else class="access-denied-message">
          <p>Hanya user yang membuka sesi kasir ini yang dapat menutupnya.</p>
        </div>
      </div>
    </section>

    <!-- Open Session Form -->
    <section v-else class="card-section">
      <h2>Buka Sesi Kasir Baru</h2>
      <div v-if="!canOpenSession" class="access-denied-banner">
        <p>Hanya user dengan role kasir yang dapat membuka sesi kasir.</p>
      </div>
      <template v-else>
      <p class="form-description">
        Masukkan saldo awal kasir untuk memulai sesi baru.
      </p>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <form class="cashier-form">
        <div class="form-group">
          <label for="openingBalance">Saldo Awal (Rp)</label>
          <input
            id="openingBalance"
            :value="formatNumberInput(openForm.openingBalance)"
            @input="handleOpeningBalanceInput"
            type="text"
            class="form-input"
            :class="{ error: errors.openingBalance }"
            placeholder="Masukkan saldo awal kasir"
            required
          />
          <div v-if="errors.openingBalance" class="error-message">
            {{ errors.openingBalance }}
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Catatan (Opsional)</label>
          <textarea
            id="notes"
            v-model="openForm.notes"
            class="form-textarea"
            rows="3"
            placeholder="Catatan tambahan untuk sesi kasir ini"
          ></textarea>
        </div>

        <div class="form-actions">
          <AppButton
            type="button"
            variant="primary"
            :disabled="!openForm.openingBalance || openForm.openingBalance <= 0"
            @click="showConfirmDialog = true"
          >
            Buka Kasir
          </AppButton>
        </div>
      </form>
      </template>
    </section>

    <!-- Confirm Open Session Dialog -->
    <AppDialog
      v-model="showConfirmDialog"
      title="Konfirmasi Buka Kasir"
      confirm-text="Ya, Buka Kasir"
      cancel-text="Batal"
      confirm-variant="primary"
      :loading="opening"
      @confirm="confirmOpenSession"
      @cancel="showConfirmDialog = false"
    >
      <div class="confirm-dialog-content">
        <p class="confirm-message">
          Apakah Anda yakin ingin membuka sesi kasir baru?
        </p>
        <div class="confirm-details">
          <div class="confirm-row">
            <span>Saldo Awal:</span>
            <strong>{{ formatCurrency(openForm.openingBalance) }}</strong>
          </div>
          <div v-if="openForm.notes" class="confirm-row">
            <span>Catatan:</span>
            <strong>{{ openForm.notes }}</strong>
          </div>
        </div>
        <p class="confirm-warning">
          Pastikan saldo awal sudah sesuai sebelum melanjutkan.
        </p>
      </div>
    </AppDialog>

    <!-- Close Session Dialog -->
    <div
      v-if="showCloseDialog"
      class="modal-overlay"
      @click.self="showCloseDialog = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Tutup Sesi Kasir</h2>
          <button class="modal-close" @click="showCloseDialog = false">
            ×
          </button>
        </div>

        <div class="modal-body">
          <div v-if="closeError" class="error-banner">
            {{ closeError }}
          </div>

          <div class="close-session-info">
            <div class="info-row">
              <span>Saldo Awal:</span>
              <strong>{{
                formatCurrency(currentSession?.opening_balance)
              }}</strong>
            </div>
            <div class="info-row">
              <span>Saldo Diharapkan:</span>
              <strong>{{
                formatCurrency(currentSession?.expected_balance || 0)
              }}</strong>
            </div>
            <div class="info-row highlight">
              <span>Selisih:</span>
              <strong
                :class="{
                  positive:
                    (currentSession?.expected_balance || 0) -
                      (currentSession?.opening_balance || 0) >=
                    0,
                  negative:
                    (currentSession?.expected_balance || 0) -
                      (currentSession?.opening_balance || 0) <
                    0,
                }"
              >
                {{
                  formatCurrency(
                    (currentSession?.expected_balance || 0) -
                      (currentSession?.opening_balance || 0),
                  )
                }}
              </strong>
            </div>
          </div>

          <form @submit.prevent="handleCloseSession" class="close-form">
            <div class="form-group">
              <label for="actualBalance">Saldo Akhir Aktual (Rp)</label>
              <input
                id="actualBalance"
                :value="formatNumberInput(closeForm.actualBalance)"
                @input="handleActualBalanceInput"
                type="text"
                class="form-input"
                :class="{ error: closeErrors.actualBalance }"
                placeholder="Masukkan saldo akhir yang sebenarnya"
                required
              />
              <div v-if="closeErrors.actualBalance" class="error-message">
                {{ closeErrors.actualBalance }}
              </div>
            </div>

            <div class="form-group">
              <label for="closeNotes">Catatan Penutupan (Opsional)</label>
              <textarea
                id="closeNotes"
                v-model="closeForm.notes"
                class="form-textarea"
                rows="3"
                placeholder="Catatan tambahan untuk penutupan sesi"
              ></textarea>
            </div>

            <div class="form-actions">
              <AppButton
                type="button"
                variant="secondary"
                @click="showCloseDialog = false"
              >
                Batal
              </AppButton>
              <AppButton
                type="submit"
                variant="danger"
                :loading="closing"
                :disabled="
                  !closeForm.actualBalance || closeForm.actualBalance < 0
                "
              >
                Tutup Kasir
              </AppButton>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Sessions History -->
    <section class="card-section">
      <h2>Riwayat Sesi Kasir</h2>
      <DataTable
        :columns="columns"
        :items="sessions"
        :loading="loading"
        :actions="false"
      />
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import DataTable from "@/components/ui/DataTable.vue";
import {
  getCurrentSession,
  getAllSessions,
  openSession,
  closeSession,
} from "@/services/cashier";
import { getCurrentUser } from "@/services/auth";
import { useNumberFormat } from "@/composables/useNumberFormat";
import { useCurrency } from "@/composables/useCurrency";
import { formatDateTime } from "@/utils/dateUtils";

export default {
  name: "CashierView",
  components: { AppButton, AppDialog, DataTable },
  setup() {
    const currentSession = ref(null);
    const sessions = ref([]);
    const loading = ref(false);
    const opening = ref(false);
    const closing = ref(false);
    const error = ref("");
    const closeError = ref("");
    const showCloseDialog = ref(false);
    const showConfirmDialog = ref(false);
    const currentUser = ref(null);

    const openForm = ref({
      openingBalance: 0,
      notes: "",
    });

    const closeForm = ref({
      actualBalance: 0,
      notes: "",
    });

    const errors = ref({});
    const closeErrors = ref({});

    // Check if user can open session (must be kasir role)
    const canOpenSession = computed(() => {
      return currentUser.value?.role === "kasir";
    });

    // Check if user can close session (must be kasir role AND same user who opened)
    const canCloseSession = computed(() => {
      if (!currentUser.value || currentUser.value.role !== "kasir") {
        return false;
      }
      if (!currentSession.value) {
        return false;
      }
      return currentSession.value.user_id === currentUser.value.id;
    });

    const { formatCurrency } = useCurrency();

    const currentTime = ref(new Date());
    const dateFormatter = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedHeaderDate = computed(() => dateFormatter.format(currentTime.value));
    const formattedHeaderTime = computed(() => timeFormatter.format(currentTime.value));

    let clockInterval = null;
    const startClock = () => {
      if (clockInterval) return;
      clockInterval = setInterval(() => {
        currentTime.value = new Date();
      }, 1000);
    };
    const stopClock = () => {
      if (!clockInterval) return;
      clearInterval(clockInterval);
      clockInterval = null;
    };

    // Use number format composable
    const { formatNumberInput, createInputHandler } = useNumberFormat();

    // Handle opening balance input
    const handleOpeningBalanceInput = createInputHandler(
      (value) => (openForm.value.openingBalance = value)
    );

    // Handle actual balance input
    const handleActualBalanceInput = createInputHandler(
      (value) => (closeForm.value.actualBalance = value)
    );

    const hasSession = computed(() => !!currentSession.value);

    const columns = [
      { key: "session_code", label: "Kode Sesi" },
      { key: "full_name", label: "Kasir" },
      { key: "opening_date", label: "Tanggal Buka", format: formatDateTime },
      { key: "closing_date", label: "Tanggal Tutup", format: formatDateTime },
      { key: "opening_balance", label: "Saldo Awal", format: formatCurrency },
      { key: "closing_balance", label: "Saldo Akhir", format: formatCurrency },
      { key: "difference", label: "Selisih", format: formatCurrency },
      { key: "status", label: "Status" },
    ];

    const loadCurrentSession = async () => {
      try {
        if (!currentUser.value?.id) {
          const user = await getCurrentUser();
          currentUser.value = user;
        }

        if (currentUser.value?.id) {
          const session = await getCurrentSession(
            currentUser.value.id,
            currentUser.value.role
          );
          currentSession.value = session;
        }
      } catch (err) {
        console.error("Error loading current session:", err);
        error.value = err.message || "Gagal memuat sesi kasir saat ini";
      }
    };

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        await loadCurrentSession();

        const allSessions = await getAllSessions({ limit: 50 });
        sessions.value = allSessions || [];
      } catch (err) {
        console.error("Error loading data:", err);
        error.value = err.message || "Gagal memuat data";
      } finally {
        loading.value = false;
      }
    };

    const confirmOpenSession = async () => {
      // Validate before opening
      errors.value = {};
      if (
        !openForm.value.openingBalance ||
        openForm.value.openingBalance <= 0
      ) {
        errors.value.openingBalance = "Saldo awal harus lebih dari 0";
        showConfirmDialog.value = false;
        return;
      }
      
      // Proceed to open session
      await handleOpenSession();
    };

    const handleOpenSession = async () => {
      errors.value = {};
      opening.value = true;
      error.value = "";
      showConfirmDialog.value = false;

      try {
        if (!currentUser.value?.id) {
          const user = await getCurrentUser();
          currentUser.value = user;
        }

        if (!currentUser.value?.id) {
          throw new Error("User tidak ditemukan. Silakan login ulang.");
        }

        if (
          !openForm.value.openingBalance ||
          openForm.value.openingBalance <= 0
        ) {
          errors.value.openingBalance = "Saldo awal harus lebih dari 0";
          opening.value = false;
          return;
        }

        const sessionData = {
          userId: currentUser.value.id,
          openingBalance: openForm.value.openingBalance,
          notes: openForm.value.notes || null,
        };

        const newSession = await openSession(sessionData);
        currentSession.value = newSession;

        // Reset form
        openForm.value = {
          openingBalance: 0,
          notes: "",
        };

        // Reload sessions list
        await loadData();
      } catch (err) {
        console.error("Error opening session:", err);
        error.value = err.message || "Gagal membuka sesi kasir";
      } finally {
        opening.value = false;
      }
    };

    const handleCloseSession = async () => {
      closeErrors.value = {};
      closing.value = true;
      closeError.value = "";

      try {
        if (!currentSession.value?.id) {
          throw new Error("Sesi kasir tidak ditemukan");
        }

        if (
          !closeForm.value.actualBalance ||
          closeForm.value.actualBalance < 0
        ) {
          closeErrors.value.actualBalance =
            "Saldo akhir harus lebih dari atau sama dengan 0";
          closing.value = false;
          return;
        }

        const sessionData = {
          sessionId: currentSession.value.id,
          actualBalance: closeForm.value.actualBalance,
          notes: closeForm.value.notes || null,
        };

        await closeSession(sessionData);

        // Reset
        currentSession.value = null;
        closeForm.value = {
          actualBalance: 0,
          notes: "",
        };
        showCloseDialog.value = false;

        // Reload data
        await loadData();
      } catch (err) {
        console.error("Error closing session:", err);
        closeError.value = err.message || "Gagal menutup sesi kasir";
      } finally {
        closing.value = false;
      }
    };

    watch(showCloseDialog, (value) => {
      if (value) {
        closeErrors.value = {};
        closeError.value = "";
        closeForm.value = {
          actualBalance: Number(currentSession.value?.expected_balance || 0),
          notes: "",
        };
      } else {
        closeErrors.value = {};
        closeError.value = "";
      }
    });

    watch(currentSession, (session) => {
      if (!session) {
        errors.value = {};
        closeErrors.value = {};
        closeError.value = "";
        closeForm.value = {
          actualBalance: 0,
          notes: "",
        };
      }
    });

    onMounted(async () => {
      startClock();
      const user = await getCurrentUser();
      currentUser.value = user;
      await loadData();
    });

    onBeforeUnmount(() => {
      stopClock();
    });

    return {
      currentSession,
      sessions,
      loading,
      opening,
      closing,
      error,
      closeError,
      showCloseDialog,
      showConfirmDialog,
      openForm,
      closeForm,
      errors,
      closeErrors,
      canOpenSession,
      canCloseSession,
      formatCurrency,
      formatDateTime,
      formatNumberInput,
      handleOpeningBalanceInput,
      handleActualBalanceInput,
      columns,
      loadData,
      handleOpenSession,
      confirmOpenSession,
      handleCloseSession,
      formattedHeaderDate,
      formattedHeaderTime,
      hasSession,
    };
  },
};
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-datetime {
  text-align: right;
  display: flex;
  flex-direction: column;
  font-size: 0.825rem;
  color: #6b7280;
}

.header-datetime__time {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.header-session {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.header-session__label {
  font-weight: 600;
  color: #111827;
}

.header-session__status {
  padding: 0.1rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.header-session__status.active {
  background: #dcfce7;
  color: #166534;
}

.header-session__status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.header-session__code {
  font-weight: 600;
  color: #0f172a;
}

.subtitle {
  color: #6b7280;
  margin: 0.25rem 0 0;
}

.session-active {
  border-left: 4px solid #16a34a;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.session-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: #111827;
  font-weight: 600;
}

.session-code {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

/* Using global badge utility classes */
.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
}

.status-badge.open {
  background: #dcfce7;
  color: #166534;
}

.status-badge.closed {
  background: #fee2e2;
  color: #991b1b;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.detail-row span {
  color: #6b7280;
}

.detail-row strong {
  color: #111827;
  font-weight: 600;
}

.session-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
}

/* Using global utility classes for form-input, form-textarea, error-message */
.cashier-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-input.error {
  border-color: #ef4444;
}

.form-textarea {
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.error-message {
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.close-session-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.info-row span {
  color: #6b7280;
}

.info-row strong {
  color: #111827;
  font-weight: 600;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row.highlight {
  font-weight: 600;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  border-top: 2px solid #e5e7eb;
}

.info-row .positive {
  color: #10b981;
}

.info-row .negative {
  color: #ef4444;
}

.close-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-section h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #111827;
  font-weight: 600;
}

/* Confirm Dialog Styles */
.confirm-dialog-content {
  padding: 0.5rem 0;
}

.confirm-message {
  font-size: 1rem;
  color: #111827;
  margin: 0 0 1.5rem 0;
  font-weight: 500;
}

.confirm-details {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.confirm-row:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.confirm-row span {
  color: #6b7280;
}

.confirm-row strong {
  color: #111827;
  font-weight: 600;
}

.confirm-warning {
  font-size: 0.875rem;
  color: #d97706;
  margin: 0;
  padding: 0.75rem;
  background: #fef3c7;
  border-radius: 6px;
  border-left: 3px solid #f59e0b;
}

.access-denied-banner {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.access-denied-banner p {
  margin: 0;
  color: #991b1b;
  font-size: 0.875rem;
  font-weight: 500;
}

.access-denied-message {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
}

.access-denied-message p {
  margin: 0;
  color: #991b1b;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
