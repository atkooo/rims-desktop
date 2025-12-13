<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-wrapper">
          <img src="@/assets/logo.png" alt="RIMS Logo" class="logo" />
        </div>
        <h1>Selamat Datang</h1>
        <p class="subtitle">Masuk ke RIMS Desktop untuk melanjutkan</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="username">
            <span>Username</span>
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
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
            <input
              id="username"
              v-model.trim="username"
              type="text"
              autocomplete="username"
              placeholder="Masukkan username"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">
            <span>Password</span>
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
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clip-rule="evenodd"
              />
            </svg>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Masukkan password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
              :aria-label="
                showPassword ? 'Sembunyikan password' : 'Tampilkan password'
              "
            >
              <svg
                v-if="showPassword"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
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
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                ></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="submit-button"
          :disabled="loading"
          :class="{ loading: loading }"
        >
          <span v-if="loading" class="button-content">
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
            Memproses...
          </span>
          <span v-else class="button-content">
            Masuk
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

    <!-- Notification Component Success -->
    <AppNotification
      v-model="showNotification"
      type="success"
      title="Login Berhasil"
      message="Selamat datang! Anda akan diarahkan ke halaman utama."
      :duration="2000"
      @close="showNotification = false"
    />

    <!-- Notification Component Error -->
    <AppNotification
      v-model="showErrorNotification"
      type="error"
      title="Login Gagal"
      :message="errorNotificationMessage"
      :duration="4000"
      @close="showErrorNotification = false"
    />
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { login, getCurrentUser } from "@/services/auth.js";
import AppNotification from "@/components/ui/AppNotification.vue";

export default {
  name: "LoginPage",
  components: {
    AppNotification,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    const username = ref("");
    const password = ref("");
    const showPassword = ref(false);
    const loading = ref(false);
    const showNotification = ref(false);
    const showErrorNotification = ref(false);
    const errorNotificationMessage = ref("");

    const handleSubmit = async () => {
      if (loading.value) return;
      loading.value = true;
      showErrorNotification.value = false;

      try {
        const user = await login(username.value, password.value);

        showNotification.value = true;
        loading.value = false;

        setTimeout(() => {
          // Redirect cashier to cashier page
          if (user?.role === "kasir") {
            router.push("/cashier");
          } else {
            const redirect = route.query.redirect || "/";
            router.push(redirect);
          }
        }, 2000);
      } catch (error) {
        console.error("Login gagal", error);
        errorNotificationMessage.value = "Username atau password salah";
        showErrorNotification.value = true;
        loading.value = false;
      }
    };

    return {
      username,
      password,
      showPassword,
      loading,
      showNotification,
      showErrorNotification,
      errorNotificationMessage,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
.login-container {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

.login-card {
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

.login-header {
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

.login-header h1 {
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

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  background: #ffffff;
}

.form-group input::placeholder {
  color: #9ca3af;
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  transition: all 0.2s ease;
  z-index: 1;
}

.password-toggle:hover {
  background: #f3f4f6;
  color: #374151;
}

.password-toggle svg {
  width: 20px;
  height: 20px;
}

.submit-button {
  width: 100%;
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    var(--primary-600) 100%
  );
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  position: relative;
  overflow: hidden;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.submit-button.loading {
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

.submit-button:hover:not(:disabled) .button-icon {
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
  .login-card {
    padding: 32px 24px;
    border-radius: 16px;
  }

  .login-header h1 {
    font-size: 24px;
  }

  .logo {
    height: 56px;
  }
}
</style>
