<template>
  <div class="activation-container">
    <div class="activation-card">
      <div class="activation-header">
        <div class="logo-wrapper">
          <img src="@/assets/logo.png" alt="RIMS Logo" class="logo" />
        </div>
        <h1>Aktivasi Aplikasi</h1>
        <p class="subtitle">Aplikasi memerlukan aktivasi untuk melanjutkan</p>
      </div>

      <div class="activation-content">
        <!-- Machine ID Display -->
        <div class="info-section">
          <div class="info-item">
            <label>Machine ID</label>
            <div class="machine-id-display">
              <code>{{ formattedMachineId }}</code>
              <button
                type="button"
                class="copy-button"
                @click="copyMachineId"
                :title="copied ? 'Disalin!' : 'Salin Machine ID'"
              >
                <svg
                  v-if="!copied"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  ></path>
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
            <p class="info-hint">
              Kirim Machine ID ini kepada administrator untuk aktivasi
            </p>
          </div>
        </div>

        <!-- Status Display -->
        <div class="status-section">
          <div class="status-card" :class="statusClass">
            <div class="status-icon">
              <svg
                v-if="status.isActive"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg
                v-else-if="status.offline"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="status-text">
              <h3>{{ statusTitle }}</h3>
              <p>{{ statusMessage }}</p>
            </div>
          </div>
        </div>

        <!-- License Key Form (Optional) -->
        <div v-if="showLicenseForm" class="license-section">
          <form class="license-form" @submit.prevent="handleVerify">
            <div class="form-group">
              <label for="licenseKey">
                <span>License Key (Opsional)</span>
              </label>
              <div class="input-wrapper">
                <svg
                  class="input-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <input
                  id="licenseKey"
                  v-model.trim="licenseKey"
                  type="text"
                  placeholder="Masukkan license key jika ada"
                />
              </div>
            </div>
            <button
              type="submit"
              class="verify-button"
              :disabled="verifying"
              :class="{ loading: verifying }"
            >
              <span v-if="verifying" class="button-content">
                <svg
                  class="spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    class="spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-dasharray="32"
                    stroke-dashoffset="32"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      dur="2s"
                      values="0 32;16 16;0 32;0 32"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="stroke-dashoffset"
                      dur="2s"
                      values="0;-16;-32;-32"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
                Memverifikasi...
              </span>
              <span v-else class="button-content">
                Verifikasi
                <svg
                  class="button-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </button>
          </form>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <button
            type="button"
            class="refresh-button"
            @click="handleRefresh"
            :disabled="checking"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              :class="{ spinning: checking }"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
              ></path>
            </svg>
            {{ checking ? "Memeriksa..." : "Periksa Status" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Notification Component Success -->
    <AppNotification
      v-model="showNotification"
      type="success"
      title="Berhasil"
      :message="notificationMessage"
      :duration="3000"
      @close="showNotification = false"
    />

    <!-- Notification Component Error -->
    <AppNotification
      v-model="showErrorNotification"
      type="error"
      title="Error"
      :message="errorNotificationMessage"
      :duration="4000"
      @close="showErrorNotification = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  getMachineId,
  checkActivationStatus,
  verifyActivation,
  formatMachineId,
} from "@/services/activation";
import AppNotification from "@/components/ui/AppNotification.vue";

export default {
  name: "ActivationPage",
  components: {
    AppNotification,
  },
  setup() {
    const router = useRouter();

    const machineId = ref("");
    const status = ref({
      isActive: false,
      offline: false,
      error: null,
    });
    const licenseKey = ref("");
    const checking = ref(false);
    const verifying = ref(false);
    const copied = ref(false);
    const showLicenseForm = ref(true);
    const showNotification = ref(false);
    const showErrorNotification = ref(false);
    const notificationMessage = ref("");
    const errorNotificationMessage = ref("");

    const formattedMachineId = computed(() => {
      if (!machineId.value) return "Loading...";
      return formatMachineId(machineId.value);
    });

    const statusClass = computed(() => {
      if (status.value.isActive) return "status-active";
      if (status.value.offline) return "status-offline";
      return "status-inactive";
    });

    const statusTitle = computed(() => {
      if (status.value.isActive) return "Aplikasi Aktif";
      if (status.value.offline)
        return "Tidak Dapat Terhubung";
      return "Aplikasi Tidak Aktif";
    });

    const statusMessage = computed(() => {
      if (status.value.isActive) {
        return "Aplikasi telah diaktifkan. Anda dapat melanjutkan menggunakan aplikasi.";
      }
      if (status.value.offline) {
        return "Tidak dapat terhubung ke server aktivasi. Aplikasi akan berfungsi dalam mode offline sementara.";
      }
      return "Aplikasi belum diaktifkan. Silakan hubungi administrator dengan Machine ID di atas.";
    });

    const loadMachineId = async () => {
      try {
        machineId.value = await getMachineId();
      } catch (error) {
        console.error("Error loading machine ID:", error);
        errorNotificationMessage.value =
          "Gagal memuat Machine ID: " + error.message;
        showErrorNotification.value = true;
      }
    };

    const loadStatus = async (forceRefresh = false) => {
      checking.value = true;
      try {
        const result = await checkActivationStatus(forceRefresh);
        status.value = {
          isActive: result.isActive || false,
          offline: result.offline || false,
          error: result.error || null,
        };

        // If active, redirect to login after a short delay
        if (status.value.isActive && !status.value.offline) {
          notificationMessage.value = "Aplikasi berhasil diaktifkan!";
          showNotification.value = true;
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        }
      } catch (error) {
        console.error("Error checking status:", error);
        errorNotificationMessage.value =
          "Gagal memeriksa status aktivasi: " + error.message;
        showErrorNotification.value = true;
      } finally {
        checking.value = false;
      }
    };

    const handleRefresh = async () => {
      await loadStatus(true);
    };

    const handleVerify = async () => {
      if (verifying.value) return;
      verifying.value = true;
      try {
        const result = await verifyActivation();
        if (result.success) {
          notificationMessage.value = result.message || "Verifikasi berhasil!";
          showNotification.value = true;
          await loadStatus(true);
        } else {
          errorNotificationMessage.value = result.message || "Verifikasi gagal";
          showErrorNotification.value = true;
        }
      } catch (error) {
        errorNotificationMessage.value = "Gagal memverifikasi: " + error.message;
        showErrorNotification.value = true;
      } finally {
        verifying.value = false;
      }
    };

    const copyMachineId = async () => {
      if (!machineId.value) {
        return;
      }

      const resetCopied = () => {
        setTimeout(() => {
          copied.value = false;
        }, 2000);
      };

      try {
        await navigator.clipboard.writeText(machineId.value);
        copied.value = true;
        resetCopied();
      } catch (error) {
        console.error("Error copying machine ID:", error);
        // Fallback: select text
        const textArea = document.createElement("textarea");
        textArea.value = machineId.value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        copied.value = true;
        resetCopied();
      }
    };

    onMounted(async () => {
      await loadMachineId();
      await loadStatus();
    });

    return {
      machineId,
      formattedMachineId,
      status,
      licenseKey,
      checking,
      verifying,
      copied,
      showLicenseForm,
      showNotification,
      showErrorNotification,
      notificationMessage,
      errorNotificationMessage,
      statusClass,
      statusTitle,
      statusMessage,
      handleRefresh,
      handleVerify,
      copyMachineId,
    };
  },
};
</script>

<style scoped>
.activation-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.activation-card {
  width: 100%;
  background: #ffffff;
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(15, 23, 42, 0.12),
    0 8px 24px rgba(15, 23, 42, 0.08);
  padding: 40px 36px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.activation-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-wrapper {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo {
  height: 64px;
  width: auto;
  object-fit: contain;
}

.activation-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #64748b;
  font-size: 15px;
  margin: 0;
  line-height: 1.5;
}

.activation-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section {
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.machine-id-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.machine-id-display code {
  flex: 1;
  font-family: "Courier New", monospace;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}

.copy-button {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.copy-button svg {
  width: 18px;
  height: 18px;
}

.info-hint {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.status-section {
  margin: 8px 0;
}

.status-card {
  padding: 20px;
  border-radius: 12px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  border: 2px solid;
}

.status-card.status-active {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #166534;
}

.status-card.status-inactive {
  background: #fef2f2;
  border-color: #ef4444;
  color: #991b1b;
}

.status-card.status-offline {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #92400e;
}

.status-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.status-icon svg {
  width: 100%;
  height: 100%;
}

.status-text {
  flex: 1;
}

.status-text h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
}

.status-text p {
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.license-section {
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.license-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label span {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  display: block;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 20px;
  height: 20px;
  color: #9ca3af;
  pointer-events: none;
  z-index: 1;
}

.form-group input {
  width: 100%;
  padding: 12px 14px 12px 44px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  background: #ffffff;
  color: #111827;
  transition: all 0.2s ease;
  outline: none;
}

.form-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.action-section {
  display: flex;
  gap: 12px;
}

.refresh-button,
.verify-button {
  flex: 1;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
}

.refresh-button {
  background: #f3f4f6;
  color: #374151;
}

.refresh-button:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-button svg {
  width: 18px;
  height: 18px;
}

.refresh-button svg.spinning {
  animation: spin 1s linear infinite;
}

.verify-button {
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    var(--primary-600) 100%
  );
  color: white;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.verify-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

.verify-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.verify-button.loading {
  pointer-events: none;
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.button-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.verify-button:hover:not(:disabled) .button-icon {
  transform: translateX(2px);
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

.spinner-circle {
  opacity: 0.25;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .activation-card {
    padding: 32px 24px;
    border-radius: 16px;
  }

  .activation-header h1 {
    font-size: 24px;
  }

  .logo {
    height: 56px;
  }
}
</style>

