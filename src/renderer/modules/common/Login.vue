<template>
  <div class="login-card">
    <h1>Masuk ke RIMS Desktop</h1>
    <p>Gunakan kredensial yang terdaftar di database untuk melanjutkan.</p>

    <form class="login-form" @submit.prevent="handleSubmit">
      <label>
        <span>Username</span>
        <input
          v-model.trim="username"
          type="text"
          autocomplete="username"
          placeholder="admin"
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••"
          required
        />
      </label>
      <label class="checkbox">
        <input type="checkbox" v-model="showPassword" />
        <span>Tampilkan password</span>
      </label>

      <button type="submit" :disabled="loading">
        <span v-if="loading">Memproses...</span>
        <span v-else>Masuk</span>
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <small>Default admin: <code>admin / admin123</code> (ubah via modul pengguna).</small>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../../services/auth.js';

export default {
  name: 'LoginPage',
  setup() {
    const router = useRouter();
    const route = useRoute();

    const username = ref('');
    const password = ref('');
    const showPassword = ref(false);
    const loading = ref(false);
    const errorMessage = ref('');

    const handleSubmit = async () => {
      if (loading.value) return;
      loading.value = true;
      errorMessage.value = '';
      try {
        await login(username.value, password.value);
        const redirect = route.query.redirect || '/';
        router.push(redirect);
      } catch (error) {
        console.error('Login gagal', error);
        errorMessage.value =
          error?.message || 'Login gagal. Periksa username / password.';
      } finally {
        loading.value = false;
      }
    };

    return {
      username,
      password,
      showPassword,
      loading,
      errorMessage,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.login-card {
  max-width: 360px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 24px;
  background: #fff;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  color: #334155;
}

.login-form input[type="text"],
.login-form input[type="password"] {
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text);
}

.login-form input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.login-form button {
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}

.login-form button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.login-form button:not(:disabled):hover {
  background: #4338ca;
}

.login-card small {
  color: #64748b;
}

.login-card p {
  margin: 0;
  color: #475569;
}

.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

.error {
  color: #dc2626;
  margin: 0;
}

code {
  background: #eef2ff;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
