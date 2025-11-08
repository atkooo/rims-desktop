<template>
  <header class="topbar">
    <div class="topbar__left">
      <button
        class="icon-btn"
        type="button"
        :aria-pressed="collapsed"
        aria-label="Toggle sidebar"
        @click="emit('toggle-sidebar')"
      >
        <Icon name="menu" size="20" />
      </button>
      <div class="topbar__brand">
        <h2>RIMS Desktop</h2>
        <p>Monitoring Center</p>
      </div>
      <form class="topbar__search" @submit.prevent="handleSearch">
        <Icon name="search" size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Cari transaksi, pelanggan, atau kode invoice"
        />
        <button type="submit" :disabled="searchBusy">
          {{ searchBusy ? "Mencari..." : "Cari" }}
        </button>
      </form>
    </div>
    <div class="topbar__right">
      <div class="topbar__metrics">
        <div class="metric">
          <span>Pending</span>
          <strong>{{ pendingTransactions }}</strong>
        </div>
        <div class="metric">
          <span>Selesai Hari Ini</span>
          <strong>{{ completedToday }}</strong>
        </div>
      </div>
      <button
        class="icon-btn"
        type="button"
        aria-label="Refresh notifikasi"
        @click="refreshTransactions"
      >
        <Icon name="bell" size="20" />
        <span v-if="pendingTransactions" class="icon-badge">
          {{ pendingTransactions }}
        </span>
      </button>
      <button class="icon-btn" type="button" aria-label="Tagihan menunggu">
        <Icon name="message" size="20" />
        <span v-if="awaitingPayments" class="icon-badge">
          {{ awaitingPayments }}
        </span>
      </button>
      <div class="profile-card">
        <div class="profile-info">
          <span class="role">{{ roleLabel }}</span>
          <strong>{{ currentUser?.full_name || "Pengguna" }}</strong>
        </div>
        <div class="avatar">{{ initials }}</div>
        <Icon name="chevron-down" size="16" class="chevron" />
      </div>
      <button class="logout-btn" type="button" @click="logout">
        Keluar
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import Icon from "./Icon.vue";
import {
  getStoredUser,
  getCurrentUser,
  logout as authLogout,
} from "../services/auth.js";
import { useTransactionStore } from "@/store/transactions";
import { eventBus } from "@/utils/eventBus";
import { TRANSACTION_STATUS } from "../../shared/constants";

const { collapsed } = defineProps({
  collapsed: { type: Boolean, default: false },
});

const emit = defineEmits(["toggle-sidebar"]);

const router = useRouter();
const currentUser = ref(null);
const syncing = ref(false);
const searchQuery = ref("");
const searchBusy = ref(false);
const transactionStore = useTransactionStore();
let storageListener = null;
let searchTimeout = null;

const pendingTransactions = computed(() => {
  return (transactionStore.transactions || []).filter(
    (t) => t.status !== TRANSACTION_STATUS.COMPLETED,
  ).length;
});

const awaitingPayments = computed(() => {
  return (transactionStore.transactions || []).filter((t) => {
    const pay = (t.payment_status || t.status || "").toString().toLowerCase();
    return ["pending", "partial", "unpaid"].includes(pay);
  }).length;
});

const completedToday = computed(() => {
  const today = new Date().toISOString().split("T")[0];
  return (transactionStore.transactions || []).filter((t) => {
    if (t.status !== TRANSACTION_STATUS.COMPLETED) return false;
    const dateSource =
      t.transactionDate ||
      t.sale_date ||
      t.rental_date ||
      t.created_at ||
      "";
    return dateSource.toString().startsWith(today);
  }).length;
});

const roleLabel = computed(() => currentUser.value?.role || "User");

const initials = computed(() => {
  const name = currentUser.value?.full_name || currentUser.value?.username;
  if (!name) return "PG";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const handleSearch = () => {
  eventBus.emit("global-search", searchQuery.value.trim());
  searchBusy.value = true;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchBusy.value = false;
  }, 350);
};

const refreshTransactions = () => {
  if (!transactionStore.loading) {
    transactionStore.fetchTransactions().catch(() => {});
  }
};

const refreshUser = async (force = false) => {
  if (syncing.value) return;
  syncing.value = true;
  try {
    if (!force) {
      const stored = getStoredUser();
      if (stored) {
        currentUser.value = stored;
        return;
      }
    }
    const user = await getCurrentUser(force);
    currentUser.value = user || null;
  } catch (error) {
    console.warn("Gagal sinkronisasi pengguna", error);
  } finally {
    syncing.value = false;
  }
};

const logout = async () => {
  try {
    await authLogout();
  } catch (error) {
    console.error("Gagal logout", error);
  } finally {
    currentUser.value = null;
    router.push("/login");
  }
};

const handleStorage = (event) => {
  if (event.key === "currentUser") {
    refreshUser();
  }
};

onMounted(() => {
  refreshUser(true);
  storageListener = (event) => handleStorage(event);
  window.addEventListener("storage", storageListener);
  if (!transactionStore.transactions.length) {
    transactionStore.fetchTransactions().catch(() => {});
  }
});

onBeforeUnmount(() => {
  if (storageListener) {
    window.removeEventListener("storage", storageListener);
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});
</script>

<style>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(6px);
}

.topbar__left,
.topbar__right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.topbar__brand h2 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.topbar__brand p {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.topbar__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #f8fafc;
  flex: 1;
  min-width: 260px;
}

.topbar__search input {
  border: none;
  background: transparent;
  flex: 1;
  font-size: 14px;
  color: #0f172a;
  outline: none;
}

.topbar__search button {
  border: none;
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.topbar__search button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-btn {
  border: 1px solid var(--border);
  background: #fff;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  cursor: pointer;
  position: relative;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.icon-btn:hover {
  background: #f1f5f9;
  box-shadow: inset 0 0 0 1px #e2e8f0;
}

.icon-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.topbar__metrics {
  display: flex;
  gap: 12px;
}

.metric {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  min-width: 110px;
}

.metric span {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric strong {
  display: block;
  font-size: 18px;
  color: #0f172a;
}

.profile-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
}

.profile-info {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.profile-info .role {
  font-size: 11px;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.profile-info strong {
  font-size: 13px;
  color: #0f172a;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #c084fc);
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn {
  border: none;
  padding: 8px 16px;
  border-radius: 999px;
  background: #f43f5e;
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(244, 63, 94, 0.24);
  transition: transform 0.2s ease;
}

.logout-btn:hover {
  transform: translateY(-1px);
}

@media (max-width: 1100px) {
  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .topbar__left,
  .topbar__right {
    width: 100%;
    justify-content: space-between;
  }

  .topbar__search {
    min-width: 100%;
  }
}

@media (max-width: 768px) {
  .topbar__metrics {
    width: 100%;
    justify-content: space-between;
  }

  .metric {
    flex: 1;
    text-align: center;
  }
}
</style>
