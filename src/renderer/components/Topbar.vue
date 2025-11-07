<template>
  <header class="topbar">
    <div class="left">
      <h2>RIMS Desktop</h2>
    </div>
    <div class="right">
      <span class="role" v-if="currentUser">{{ currentUser.role }}</span>
      <div class="user">{{ currentUser?.full_name || 'Pengguna' }}</div>
      <button class="logout-btn" @click="logout">Keluar</button>
    </div>
  </header>
</template>
<script>
export default {
  data() {
    return {
      currentUser: null
    };
  },
  mounted() {
    this.syncUser();
    window.addEventListener('storage', this.syncUser);
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.syncUser);
  },
  methods: {
    syncUser() {
      const userRaw = localStorage.getItem('currentUser');
      this.currentUser = userRaw ? JSON.parse(userRaw) : null;
    },
    logout() {
      localStorage.removeItem('currentUser');
      this.currentUser = null;
      this.$router.push('/login');
    }
  }
};
</script>
<style>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}

.topbar h2 {
  margin: 0;
  font-size: 16px;
}

.topbar .right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role {
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: .08em;
  color: #6366f1;
  background: #eef2ff;
  padding: 4px 8px;
  border-radius: 999px;
}

.user {
  color: #334155;
  font-weight: 600;
}

.logout-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  transition: background .15s;
}

.logout-btn:hover {
  background: #f1f5f9;
}
</style>
