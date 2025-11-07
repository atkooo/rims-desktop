<template>
  <div class="login-card">
    <h1>Masuk ke RIMS</h1>
    <p>Aplikasi terhubung dengan database RIMS Desktop. Silakan pilih peran untuk masuk ke contoh antarmuka.</p>
    <div class="login-actions">
      <button type="button" @click="login('admin')">Masuk sebagai Admin</button>
      <button type="button" @click="login('manager')">Masuk sebagai Manager</button>
      <button type="button" @click="login('staff')">Masuk sebagai Staff</button>
    </div>
    <small>Peran yang dipilih menentukan akses menu. Data pengguna disimpan sementara di localStorage.</small>
  </div>
</template>

<script>
import { useRouter, useRoute } from 'vue-router';

export default {
  name: 'LoginPage',
  setup() {
    const router = useRouter();
    const route = useRoute();

    const login = (role) => {
      const user = {
        id: 1,
        username: `${role}@demo`,
        full_name: role.charAt(0).toUpperCase() + role.slice(1) + ' Demo',
        role
      };
      localStorage.setItem('currentUser', JSON.stringify(user));
      const redirect = route.query.redirect || '/';
      router.push(redirect);
    };

    return {
      login
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
  gap: 12px;
}

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-actions button {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  cursor: pointer;
  font-size: 14px;
  transition: background .15s, border-color .15s;
}

.login-actions button:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.login-card small {
  color: #64748b;
}

.login-card h1 {
  margin: 0;
}

.login-card p {
  margin: 0;
  color: #475569;
}
</style>

