<template>
  <div class="login-shell">
    <section class="login-hero">
      <div class="hero-chip">RIMS Desktop</div>
      <h1>{{ greeting }}, selamat datang kembali</h1>
      <p class="hero-body">
        Pantau inventory, transaksi, dan laporan harian dari satu panel dengan keamanan peran bertingkat.
      </p>
      <ul class="hero-highlights">
        <li v-for="stat in heroHighlights" :key="stat.title">
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-label">{{ stat.title }}</p>
          <span class="stat-detail">{{ stat.detail }}</span>
        </li>
      </ul>
      <div class="hero-footer">
        <span>{{ today }}</span>
        <span class="divider"></span>
        <span>{{ statusBadge }}</span>
      </div>
    </section>
    <form class="login-card" @submit.prevent="login">
      <div class="card-header">
        <span class="logo-chip">RIMS</span>
        <div>
          <p class="eyebrow">Portal internal</p>
          <h2>Masuk ke sistem</h2>
          <p class="subtext">Gunakan akun resmi untuk menjaga keamanan data.</p>
        </div>
      </div>
      <div class="field">
        <label for="username">Username</label>
        <div class="input-shell" :class="{ error: fieldErrors.username }">
          <input
            id="username"
            v-model.trim="username"
            placeholder="contoh: admin01"
            autocomplete="username"
            :disabled="loading"
          />
          <button
            v-if="username"
            type="button"
            class="ghost-btn"
            @click="username = ''"
            aria-label="Hapus username"
          >
            Reset
          </button>
        </div>
        <small v-if="fieldErrors.username" class="field-hint">{{ fieldErrors.username }}</small>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <div class="input-shell" :class="{ error: fieldErrors.password }">
          <input
            id="password"
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            placeholder="Masukkan password"
            autocomplete="current-password"
            :disabled="loading"
          />
          <button type="button" class="ghost-btn" @click="togglePassword" :aria-pressed="showPassword">
            {{ showPassword ? 'Sembunyikan' : 'Lihat' }}
          </button>
        </div>
        <small v-if="fieldErrors.password" class="field-hint">{{ fieldErrors.password }}</small>
      </div>
      <div class="form-meta">
        <label class="remember">
          <input type="checkbox" v-model="rememberMe" :disabled="loading" />
          <span>Ingat saya di perangkat ini</span>
        </label>
        <button type="button" class="link-btn" @click="prefillDemo" :disabled="loading">
          Gunakan akun demo
        </button>
      </div>
      <div class="cta">
        <Button type="submit" :disabled="loading">
          {{ loading ? 'Memproses...' : 'Masuk sekarang' }}
        </Button>
      </div>
      <p v-if="error" class="banner danger">{{ error }}</p>
      <p v-else class="banner info">{{ helperNotice }}</p>
      <div class="foot-note">
        <span>{{ today }}</span>
        <span class="status-indicator" :class="loading ? 'syncing' : 'ready'"></span>
        <span>{{ loading ? 'Menguji kredensial' : 'Sesi aman tersandi' }}</span>
      </div>
    </form>
  </div>
</template>

<script>
import Button from '@ui/Button.vue';

const LAST_USERNAME_KEY = 'rims:last-username';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

export default {
  name: 'LoginPage',
  components: { Button },
  data() {
    const remembered = localStorage.getItem(LAST_USERNAME_KEY) || '';
    return {
      username: remembered,
      password: '',
      rememberMe: Boolean(remembered),
      showPassword: false,
      loading: false,
      error: '',
      fieldErrors: {},
      now: new Date(),
      timer: null,
      heroHighlights: [
        { title: 'Inventaris aktif', value: '1.240+', detail: 'Unit termonitor' },
        { title: 'Transaksi harian', value: '320', detail: 'Rata-rata tersinkron' },
        { title: 'Cabang terhubung', value: '18', detail: 'Realtime update' }
      ]
    };
  },
  computed: {
    greeting() {
      const hour = this.now.getHours();
      if (hour < 12) return 'Selamat pagi';
      if (hour < 15) return 'Selamat siang';
      if (hour < 19) return 'Selamat sore';
      return 'Selamat malam';
    },
    today() {
      return this.now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    },
    helperNotice() {
      return this.$route.query.redirect
        ? 'Anda perlu login untuk melanjutkan ke halaman yang diminta.'
        : 'Kredensial hanya boleh dibagikan kepada staf yang berwenang.';
    },
    statusBadge() {
      return this.loading ? 'Autentikasi berjalan' : 'Sistem siap digunakan';
    }
  },
  mounted() {
    this.timer = setInterval(() => {
      this.now = new Date();
    }, 60000);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    validateFields() {
      const errors = {};
      if (!this.username.trim()) errors.username = 'Username wajib diisi.';
      if (!this.password) errors.password = 'Password wajib diisi.';
      return errors;
    },
    prefillDemo() {
      this.username = 'admin';
      this.password = 'admin';
      this.rememberMe = false;
    },
    async login() {
      this.error = '';
      this.fieldErrors = {};
      const validation = this.validateFields();
      if (Object.keys(validation).length) {
        this.fieldErrors = validation;
        this.error = 'Lengkapi data login terlebih dahulu.';
        return;
      }
      if (!ipcRenderer) {
        this.error = 'IPC tidak tersedia pada lingkungan ini.';
        return;
      }
      this.loading = true;
      try {
        const payload = {
          username: this.username.trim(),
          password: this.password
        };
        const user = await ipcRenderer.invoke('auth:login', payload);
        if (this.rememberMe) {
          localStorage.setItem(LAST_USERNAME_KEY, payload.username);
        } else {
          localStorage.removeItem(LAST_USERNAME_KEY);
        }
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.$router.replace(this.$route.query.redirect || '/');
      } catch (err) {
        this.error = err?.message || 'Gagal login. Periksa kredensial Anda.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-shell {
  width: min(1040px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  align-items: stretch;
}

.login-hero {
  position: relative;
  overflow: hidden;
  padding: 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, #312e81, #4338ca 45%, #6366f1);
  color: #f8fafc;
  box-shadow: 0 35px 70px rgba(15, 23, 42, 0.35);
}

.login-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.4), transparent 60%);
  pointer-events: none;
}

.login-hero > * {
  position: relative;
  z-index: 1;
}

.hero-chip {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(248, 250, 252, 0.4);
  margin-bottom: 12px;
}

.login-hero h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

.hero-body {
  margin: 0 0 24px;
  max-width: 420px;
  line-height: 1.5;
  color: rgba(248, 250, 252, 0.9);
}

.hero-highlights {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.hero-highlights li {
  background: rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(248, 250, 252, 0.2);
  border-radius: 14px;
  padding: 14px;
  backdrop-filter: blur(6px);
}

.stat-value {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.stat-label {
  margin: 2px 0;
  font-size: 14px;
  font-weight: 500;
}

.stat-detail {
  font-size: 12px;
  color: rgba(248, 250, 252, 0.7);
}

.hero-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: rgba(248, 250, 252, 0.85);
}

.divider {
  flex: 0 0 auto;
  width: 18px;
  height: 1px;
  background: rgba(248, 250, 252, 0.4);
}

.login-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 25px 55px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.logo-chip {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 28px rgba(79, 70, 229, 0.35);
}

.eyebrow {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--muted);
  margin: 0 0 4px;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
}

.subtext {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field + .field {
  margin-top: 16px;
}

.input-shell {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 10px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-shell:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--ring);
}

.input-shell input {
  flex: 1;
  border: 0;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: var(--text);
}

.input-shell.error {
  border-color: var(--danger);
}

.field-hint {
  font-size: 12px;
  color: var(--danger);
}

.ghost-btn {
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  padding: 4px 6px;
}

.ghost-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-meta {
  margin: 18px 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.remember input {
  width: 14px;
  height: 14px;
}

.link-btn {
  border: 0;
  background: none;
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.cta :deep(.btn) {
  width: 100%;
  justify-content: center;
}

.banner {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  border: 1px solid transparent;
}

.banner.danger {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.35);
  color: #b91c1c;
}

.banner.info {
  background: rgba(79, 70, 229, 0.08);
  border-color: rgba(79, 70, 229, 0.25);
  color: #312e81;
}

.foot-note {
  margin-top: 16px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

.status-indicator.syncing {
  background: #f59e0b;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 860px) {
  .login-shell {
    grid-template-columns: 1fr;
  }
}
</style>
