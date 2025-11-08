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
      <div class="profile-shell" ref="profileMenuRef">
        <button
          type="button"
          class="profile-card"
          @click="toggleProfileMenu"
          :aria-expanded="profileMenuOpen"
        >
          <div class="profile-info">
            <span class="role">{{ roleLabel }}</span>
            <strong>{{ currentUser?.full_name || "Pengguna" }}</strong>
          </div>
          <div class="avatar">{{ initials }}</div>
          <Icon name="chevron-down" size="16" class="chevron" />
        </button>
        <transition name="fade-scale">
          <div v-if="profileMenuOpen" class="profile-menu">
            <button type="button" @click="goToProfile">
              <Icon name="user" size="16" />
              <span>Profil Saya</span>
            </button>
            <button type="button" class="logout" @click="logout">
              <Icon name="log-out" size="16" />
              <span>Keluar</span>
            </button>
          </div>
        </transition>
      </div>
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
const profileMenuOpen = ref(false);
const profileMenuRef = ref(null);

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

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value;
};

const closeProfileMenu = () => {
  profileMenuOpen.value = false;
};

const goToProfile = () => {
  closeProfileMenu();
  router.push("/settings/system");
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
  closeProfileMenu();
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

const handleClickOutside = (event) => {
  if (!profileMenuRef.value) return;
  if (!profileMenuRef.value.contains(event.target)) {
    profileMenuOpen.value = false;
  }
};

onMounted(() => {
  refreshUser(true);
  storageListener = (event) => handleStorage(event);
  window.addEventListener("storage", storageListener);
  if (!transactionStore.transactions.length) {
    transactionStore.fetchTransactions().catch(() => {});
  }
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  if (storageListener) {
    window.removeEventListener("storage", storageListener);
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  document.removeEventListener("click", handleClickOutside);
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
  flex-wrap: nowrap;
  gap: 12px;
  padding: 14px 20px;
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(6px);
  overflow-x: auto;
}

.topbar__left,
.topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  min-width: 0;
}

.topbar__left {
  flex: 1 1 auto;
}

.topbar__right {
  flex: 0 0 auto;
  white-space: nowrap;
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px 56px 4px 40px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #f8fafc;
  flex: 1 1 320px;
  min-width: 200px;
  max-width: 480px;
}

.topbar__search .search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.topbar__search input {
  border: none;
  background: transparent;
  flex: 1 1 auto;
  width: 100%;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  padding: 6px 0;
}

.topbar__search button {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s ease;
  white-space: nowrap;
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

.profile-shell {
  position: relative;
  flex-shrink: 0;
}

.profile-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.profile-card:hover,
.profile-card:focus-visible {
  box-shadow: 0 0 0 2px #e0e7ff;
  outline: none;
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

.profile-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow:
    0 20px 45px rgba(15, 23, 42, 0.15),
    0 2px 12px rgba(15, 23, 42, 0.05);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 20;
}

.profile-menu button {
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  cursor: pointer;
  transition: background 0.2s ease;
}

.profile-menu button.logout {
  color: #dc2626;
}

.profile-menu button:hover {
  background: #f8fafc;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

/* Keep layout identical across window sizes; rely on horizontal scroll if space is tight. */
</style>
