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
import { getStoredUser, getCurrentUser, logout as authLogout } from '../services/auth.js';

export default {
  data() {
    return {
      currentUser: null,
      syncing: false,
      storageListener: null
    };
  },
  async mounted() {
    await this.refreshUser(true);
    this.storageListener = (event) => this.handleStorage(event);
    window.addEventListener('storage', this.storageListener);
  },
  beforeUnmount() {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  },
  methods: {
    async refreshUser(force = false) {
      if (this.syncing) return;
      this.syncing = true;
      try {
        if (!force) {
          const stored = getStoredUser();
          if (stored) {
            this.currentUser = stored;
            return;
          }
        }
        const user = await getCurrentUser(force);
        this.currentUser = user || null;
      } catch (error) {
        console.warn('Gagal sinkronisasi pengguna', error);
      } finally {
        this.syncing = false;
      }
    },
    handleStorage(event) {
      if (event.key === 'currentUser') {
        this.refreshUser();
      }
    },
    async logout() {
      try {
        await authLogout();
      } catch (error) {
        console.error('Gagal logout', error);
      } finally {
        this.currentUser = null;
        this.$router.push('/login');
      }
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
