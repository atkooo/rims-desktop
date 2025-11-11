<template>
  <div class="data-page cashier-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Buka Kasir</h1>
          <p class="subtitle">
            Kelola sesi kasir untuk memulai dan menutup shift harian.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" :loading="loading" @click="loadData">
            Refresh Data
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Current Session Card -->
    <section v-if="currentSession" class="card-section">
      <div class="session-card open-session">
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
            <strong>{{ currentSession.full_name || currentSession.username }}</strong>
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
            <strong>{{ formatCurrency(currentSession.expected_balance || 0) }}</strong>
          </div>
        </div>

        <div class="session-actions">
          <AppButton variant="danger" :loading="closing" @click="showCloseDialog = true">
            Tutup Kasir
          </AppButton>
        </div>
      </div>
    </section>

    <!-- Open Session Form -->
    <section v-else class="card-section">
      <div class="session-card">
        <h2>Buka Sesi Kasir Baru</h2>
        <p class="form-description">
          Masukkan saldo awal kasir untuk memulai sesi baru.
        </p>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <form @submit.prevent="handleOpenSession" class="cashier-form">
          <div class="form-group">
            <label for="openingBalance">Saldo Awal (Rp)</label>
            <input
              id="openingBalance"
              v-model.number="openForm.openingBalance"
              type="number"
              step="0.01"
              min="0"
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
              type="submit"
              variant="primary"
              :loading="opening"
              :disabled="!openForm.openingBalance || openForm.openingBalance <= 0"
            >
              Buka Kasir
            </AppButton>
          </div>
        </form>
      </div>
    </section>

    <!-- Close Session Dialog -->
    <div v-if="showCloseDialog" class="modal-overlay" @click.self="showCloseDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Tutup Sesi Kasir</h2>
          <button class="modal-close" @click="showCloseDialog = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="closeError" class="error-banner">
            {{ closeError }}
          </div>

          <div class="close-session-info">
            <div class="info-row">
              <span>Saldo Awal:</span>
              <strong>{{ formatCurrency(currentSession?.opening_balance) }}</strong>
            </div>
            <div class="info-row">
              <span>Saldo Diharapkan:</span>
              <strong>{{ formatCurrency(currentSession?.expected_balance || 0) }}</strong>
            </div>
            <div class="info-row highlight">
              <span>Selisih:</span>
              <strong
                :class="{
                  positive: (currentSession?.expected_balance || 0) - (currentSession?.opening_balance || 0) >= 0,
                  negative: (currentSession?.expected_balance || 0) - (currentSession?.opening_balance || 0) < 0,
                }"
              >
                {{ formatCurrency((currentSession?.expected_balance || 0) - (currentSession?.opening_balance || 0)) }}
              </strong>
            </div>
          </div>

          <form @submit.prevent="handleCloseSession" class="close-form">
            <div class="form-group">
              <label for="actualBalance">Saldo Akhir Aktual (Rp)</label>
              <input
                id="actualBalance"
                v-model.number="closeForm.actualBalance"
                type="number"
                step="0.01"
                min="0"
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
                :disabled="!closeForm.actualBalance || closeForm.actualBalance < 0"
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
import { ref, computed, onMounted } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import {
  getCurrentSession,
  getAllSessions,
  openSession,
  closeSession,
} from "@/services/cashier";
import { getCurrentUser } from "@/services/auth";

export default {
  name: "CashierView",
  components: { AppButton, DataTable },
  setup() {
    const currentSession = ref(null);
    const sessions = ref([]);
    const loading = ref(false);
    const opening = ref(false);
    const closing = ref(false);
    const error = ref("");
    const closeError = ref("");
    const showCloseDialog = ref(false);
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

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    });

    const formatCurrency = (value) => currencyFormatter.format(value ?? 0);

    const formatDateTime = (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    };

    const formatDate = (value) =>
      value ? new Date(value).toLocaleDateString("id-ID") : "-";

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
          const session = await getCurrentSession(currentUser.value.id);
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

    const handleOpenSession = async () => {
      errors.value = {};
      opening.value = true;
      error.value = "";

      try {
        if (!currentUser.value?.id) {
          const user = await getCurrentUser();
          currentUser.value = user;
        }

        if (!currentUser.value?.id) {
          throw new Error("User tidak ditemukan. Silakan login ulang.");
        }

        if (!openForm.value.openingBalance || openForm.value.openingBalance <= 0) {
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

        if (!closeForm.value.actualBalance || closeForm.value.actualBalance < 0) {
          closeErrors.value.actualBalance = "Saldo akhir harus lebih dari atau sama dengan 0";
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

    onMounted(async () => {
      const user = await getCurrentUser();
      currentUser.value = user;
      await loadData();
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
      openForm,
      closeForm,
      errors,
      closeErrors,
      formatCurrency,
      formatDateTime,
      formatDate,
      columns,
      loadData,
      handleOpenSession,
      handleCloseSession,
    };
  },
};
</script>

<style scoped>
.cashier-page {
  max-width: 1200px;
  margin: 0 auto;
}

.session-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.session-card.open-session {
  border-left: 4px solid #10b981;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.session-code {
  color: #6b7280;
  font-size: 14px;
  margin-top: 4px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.open {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.closed {
  background: #fee2e2;
  color: #991b1b;
}

.session-details {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.detail-row:last-child {
  border-bottom: none;
}

.session-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.form-description {
  color: #6b7280;
  margin-bottom: 24px;
}

.cashier-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #374151;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.error {
  border-color: #ef4444;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.error-message {
  color: #ef4444;
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
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row.highlight {
  font-weight: 600;
  padding-top: 12px;
  margin-top: 8px;
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
  gap: 20px;
}
</style>

