<template>
  <header class="topbar">
    <div class="left">
      <h2>RIMS Desktop</h2>
    </div>
    <div class="center">
      <input v-model="q" @input="onInput" placeholder="Cari cepat (Barang, Pelanggan, Transaksi)"
        aria-label="Pencarian cepat" autocomplete="off" />
    </div>
    <div class="right">
      <div class="user">{{ currentUser?.full_name || 'User' }}</div>
      <button class="logout-btn" @click="logout" title="Logout">Keluar</button>
    </div>
  </header>
</template>
<script>
import debounce from '@utils/debounce';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

export default {
  emits: ['search'],
  data() {
    return {
      q: '',
      debounced: null,
      currentUser: null
    };
  },
  mounted() {
    this.debounced = debounce((val) => this.$emit('search', val), 250);
    this.loadUser();
  },
  methods: {
    onInput() { this.debounced && this.debounced(this.q); },
    loadUser() {
      const userRaw = localStorage.getItem('currentUser');
      this.currentUser = userRaw ? JSON.parse(userRaw) : null;
    },
    async logout() {
      try {
        if (ipcRenderer) await ipcRenderer.invoke('auth:logout');
        localStorage.removeItem('currentUser');
        this.$router.push('/login');
      } catch (e) {
        console.error('Logout error:', e);
        localStorage.removeItem('currentUser');
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

.topbar .center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.topbar .center input {
  width: 60%;
}

.topbar .right {
  display: flex;
  align-items: center;
  gap: 12px;
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
