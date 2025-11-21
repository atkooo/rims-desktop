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
        <Icon name="menu" :size="20" />
      </button>
      <div class="topbar__brand">
        <h2>RIMS Desktop</h2>
        <p>Monitoring Center</p>
      </div>
      <form class="topbar__search" @submit.prevent="handleSearch">
        <Icon name="search" :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari transaksi, pelanggan, atau kode transaksi"
          :disabled="searchBusy"
        />
        <button
          v-if="searchQuery && !searchBusy"
          type="button"
          class="clear-btn"
          @click="clearSearch"
          aria-label="Clear search"
        >
          <Icon name="x" :size="14" />
        </button>
        <button type="submit" :disabled="searchBusy || !searchQuery.trim()" class="search-btn">
          <Icon v-if="searchBusy" name="refresh-cw" :size="14" class="spinning" />
          <span v-else>Cari</span>
        </button>
      </form>
    </div>
    <div class="topbar__right">
      <div class="notification-shell" ref="notificationMenuRef">
        <button
          class="icon-btn"
          type="button"
          aria-label="Notifikasi"
          :aria-expanded="notificationMenuOpen"
          @click="toggleNotificationMenu"
          ref="notificationButtonRef"
        >
          <Icon name="bell" :size="20" />
          <span v-if="totalNotifications > 0" class="icon-badge">
            {{ totalNotifications }}
          </span>
        </button>
        <Teleport to="body">
          <transition name="fade-scale">
            <div
              v-if="notificationMenuOpen"
              class="notification-menu"
              ref="notificationMenuDropdownRef"
              :style="{
                top: notificationMenuPosition.top + 'px',
                left: notificationMenuPosition.left + 'px',
              }"
            >
              <div class="notification-menu-header">
                <h3>Notifikasi</h3>
                <button
                  type="button"
                  class="notification-refresh-btn"
                  @click="refreshAllNotifications"
                  :disabled="transactionStore.loading"
                  aria-label="Refresh"
                >
                  <Icon name="refresh-cw" :size="16" />
                </button>
              </div>
              <div class="notification-menu-content">
                <div
                  v-if="transactionStore.loading"
                  class="notification-loading"
                >
                  Memuat...
                </div>
                <div
                  v-else-if="allNotificationsList.length === 0"
                  class="notification-empty"
                >
                  <Icon name="check-circle" :size="24" />
                  <p>Tidak ada notifikasi</p>
                </div>
                <div v-else class="notification-list">
                  <button
                    v-for="notification in allNotificationsList"
                    :key="`${notification.type}-${notification.id}`"
                    type="button"
                    class="notification-item"
                    :class="`notification-item--${notification.type}`"
                    @click="handleNotificationItemClick(notification)"
                  >
                    <div class="notification-item-icon">
                      <Icon
                        :name="getNotificationIcon(notification)"
                        :size="16"
                      />
                    </div>
                    <div class="notification-item-content">
                      <div class="notification-item-header">
                        <span class="notification-type-badge" :class="`notification-type--${notification.type}`">
                          {{ getNotificationTypeLabel(notification.type) }}
                        </span>
                        <div class="notification-item-title">
                          {{ getNotificationTitle(notification) }}
                        </div>
                      </div>
                      <div class="notification-item-message">
                        {{ getNotificationMessage(notification) }}
                      </div>
                      <div class="notification-item-meta">
                        {{ getNotificationMeta(notification) }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              <div v-if="allNotificationsList.length > 0" class="notification-menu-footer">
              </div>
            </div>
          </transition>
        </Teleport>
      </div>
      <div class="profile-shell" ref="profileMenuRef">
        <button
          type="button"
          class="profile-card"
          @click="toggleProfileMenu"
          :aria-expanded="profileMenuOpen"
          ref="profileButtonRef"
        >
          <div class="profile-info">
            <span class="role">{{ roleLabel }}</span>
            <strong>{{ currentUser?.full_name || "Pengguna" }}</strong>
          </div>
          <div class="avatar">{{ initials }}</div>
          <Icon name="chevron-down" :size="16" class="chevron" />
        </button>
        <Teleport to="body">
          <transition name="fade-scale">
            <div
              v-if="profileMenuOpen"
              class="profile-menu"
              ref="profileMenuDropdownRef"
              :style="{
                top: profileMenuPosition.top + 'px',
                left: profileMenuPosition.left + 'px',
              }"
            >
              <button type="button" @click="goToProfile">
                <Icon name="user" :size="16" />
                <span>Profil Saya</span>
              </button>
              <button type="button" class="logout" @click="logout">
                <Icon name="log-out" :size="16" />
                <span>Keluar</span>
              </button>
            </div>
          </transition>
        </Teleport>
      </div>
    </div>
  </header>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import Icon from "../ui/Icon.vue";
import {
  getStoredUser,
  getCurrentUser,
  logout as authLogout,
} from "@/services/auth.js";
import { useTransactionStore } from "@/store/transactions";
import { eventBus } from "@/utils/eventBus";
import { TRANSACTION_STATUS } from "@shared/constants";
import { useStockAlerts } from "@/composables/useStockAlerts";
import { formatDateRelative } from "@/utils/dateUtils";
import { useCurrency } from "@/composables/useCurrency";

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
const stockAlerts = useStockAlerts();
const stockAlertsActive = ref(false);
const { formatCurrency } = useCurrency();
const formatDate = formatDateRelative;
let stockAlertsStarting = false;
let storageListener = null;
let searchTimeout = null;
let profileUpdateHandler = null;
const profileMenuOpen = ref(false);
const profileMenuRef = ref(null);
const profileMenuDropdownRef = ref(null);
const profileButtonRef = ref(null);
const profileMenuPosition = ref({ top: 0, left: 0 });
let dropdownListenersAttached = false;

const notificationMenuOpen = ref(false);
const notificationMenuRef = ref(null);
const notificationMenuDropdownRef = ref(null);
const notificationButtonRef = ref(null);
const notificationMenuPosition = ref({ top: 0, left: 0 });
let notificationListenersAttached = false;


const pendingTransactions = computed(() => {
  return (transactionStore.transactions || []).filter(
    (t) => t.status !== TRANSACTION_STATUS.COMPLETED && t.status !== TRANSACTION_STATUS.CANCELLED,
  ).length;
});

const pendingTransactionsList = computed(() => {
  return (transactionStore.transactions || [])
    .filter((t) => t.status !== TRANSACTION_STATUS.COMPLETED && t.status !== TRANSACTION_STATUS.CANCELLED)
    .slice(0, 10)
    .sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.created_at || 0);
      const dateB = new Date(b.transactionDate || b.created_at || 0);
      return dateB - dateA;
    });
});

const awaitingPayments = computed(() => {
  return (transactionStore.transactions || []).filter((t) => {
    // Exclude cancelled transactions
    if (t.status === TRANSACTION_STATUS.CANCELLED) return false;
    const pay = (t.payment_status || t.status || "").toString().toLowerCase();
    return ["pending", "unpaid"].includes(pay);
  }).length;
});

const awaitingPaymentsList = computed(() => {
  return (transactionStore.transactions || [])
    .filter((t) => {
      // Exclude cancelled transactions
      if (t.status === TRANSACTION_STATUS.CANCELLED) return false;
      const pay = (t.payment_status || t.status || "").toString().toLowerCase();
      return ["pending", "unpaid"].includes(pay);
    })
    .slice(0, 10)
    .sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.created_at || 0);
      const dateB = new Date(b.transactionDate || b.created_at || 0);
      return dateB - dateA;
    });
});

const totalNotifications = computed(() => {
  return (
    pendingTransactions.value +
    awaitingPayments.value +
    stockAlerts.criticalCount.value
  );
});

const allNotificationsList = computed(() => {
  const list = [];
  
  // Add stock alerts (highest priority)
  stockAlerts.criticalItems.value.slice(0, 5).forEach(item => {
    list.push({
      id: `stock-${item.id}`,
      notificationType: 'stock',
      type: 'stock',
      code: item.code,
      name: item.name,
      category_name: item.category_name,
      stock_quantity: item.stock_quantity,
      min_stock_alert: item.min_stock_alert,
      shortage: item.shortage,
      product_type: item.product_type,
    });
  });
  
  // Add pending transactions
  pendingTransactionsList.value.forEach(transaction => {
    list.push({
      ...transaction,
      notificationType: 'transaction',
      type: 'transaction'
    });
  });
  
  // Add awaiting payments
  awaitingPaymentsList.value.forEach(transaction => {
    list.push({
      ...transaction,
      notificationType: 'payment',
      type: 'payment'
    });
  });
  
  // Sort by priority: stock alerts first, then payments, then transactions
  list.sort((a, b) => {
    const priority = { stock: 0, payment: 1, transaction: 2 };
    return priority[a.type] - priority[b.type];
  });
  
  return list.slice(0, 15); // Limit to 15 items
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
  if (!searchQuery.value.trim()) return;
  eventBus.emit("global-search", searchQuery.value.trim());
  searchBusy.value = true;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchBusy.value = false;
  }, 500);
};

const clearSearch = () => {
  searchQuery.value = "";
  searchBusy.value = false;
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
};

const refreshTransactions = () => {
  if (!transactionStore.loading) {
    transactionStore.fetchTransactions().catch(() => {});
  }
};

const refreshAllNotifications = async () => {
  refreshTransactions();
  await stockAlerts.checkStockAlerts(false);
};

const startStockAlertMonitor = async () => {
  if (
    !currentUser.value ||
    stockAlertsActive.value ||
    stockAlertsStarting
  ) {
    return;
  }

  stockAlertsStarting = true;
  try {
    await stockAlerts.initialize();
    stockAlerts.startPeriodicCheck(60000);
    stockAlertsActive.value = true;
  } catch (error) {
    console.error("Gagal memulai pemeriksaan stok:", error);
  } finally {
    stockAlertsStarting = false;
  }
};

const stopStockAlertMonitor = () => {
  stockAlerts.stopPeriodicCheck();
  stockAlertsActive.value = false;
};

const handleNotificationItemClick = (notification) => {
  closeNotificationMenu();
  
  if (notification.type === 'stock') {
    router.push('/stock/alerts');
  } else if (notification.type === 'payment' || notification.type === 'transaction') {
    if (notification.transactionType === "RENTAL") {
      router.push("/transactions/rentals");
    } else {
      router.push("/transactions/sales");
    }
  }
};

const getNotificationIcon = (notification) => {
  if (notification.type === 'stock') {
    return notification.available_quantity === 0 ? 'x-circle' : 'alert-circle';
  } else if (notification.type === 'payment') {
    return 'credit-card';
  } else {
    return notification.transactionType === 'RENTAL' ? 'package' : 'shopping-cart';
  }
};

const getNotificationTypeLabel = (type) => {
  const labels = {
    stock: 'Peringatan Stok',
    payment: 'Tagihan',
    transaction: 'Transaksi'
  };
  return labels[type] || 'Notifikasi';
};

const getNotificationTitle = (notification) => {
  if (notification.type === 'stock') {
    return notification.name;
  } else {
    return notification.transactionType === "RENTAL"
      ? "Transaksi Rental"
      : "Transaksi Penjualan";
  }
};

const getNotificationMessage = (notification) => {
  if (notification.type === 'stock') {
    return `${notification.code} • ${notification.category_name || 'Tidak ada kategori'}`;
  } else {
    return `${notification.customerName || "Tanpa nama"} - ${notification.transaction_code}`;
  }
};

const getNotificationMeta = (notification) => {
  if (notification.type === 'stock') {
    const parts = [];
    parts.push(`Stok: ${notification.stock_quantity || 0}`);
    if (notification.min_stock_alert > 0) {
      parts.push(`Batas: ${notification.min_stock_alert}`);
    }
    if (notification.available_quantity === 0) {
      parts.push('HABIS');
    } else if (notification.min_stock_alert > 0 && notification.available_quantity <= notification.min_stock_alert) {
      parts.push('RENDAH');
    }
    return parts.join(' • ');
  } else if (notification.type === 'payment') {
    const parts = [];
    parts.push(`Total: ${formatCurrency(notification.totalAmount)}`);
    if (notification.paid_amount) {
      parts.push(`Dibayar: ${formatCurrency(notification.paid_amount)}`);
    }
    if (notification.totalAmount && notification.paid_amount && notification.totalAmount > notification.paid_amount) {
      parts.push(`Sisa: ${formatCurrency(notification.totalAmount - notification.paid_amount)}`);
    }
    parts.push(formatDate(notification.transactionDate));
    return parts.join(' • ');
  } else {
    return `${formatDate(notification.transactionDate)} • ${formatCurrency(notification.totalAmount)}`;
  }
};



const updateProfileMenuPosition = () => {
  const anchor = profileButtonRef.value;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const dropdownWidth =
    profileMenuDropdownRef.value?.offsetWidth || Math.max(rect.width, 220);
  const padding = 16;
  const desiredLeft = rect.right - dropdownWidth;
  const maxLeft = window.innerWidth - dropdownWidth - padding;
  const left = Math.max(padding, Math.min(desiredLeft, maxLeft));
  const top = rect.bottom + 8;
  profileMenuPosition.value = { top, left };
};

const updateNotificationMenuPosition = () => {
  const anchor = notificationButtonRef.value;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const dropdownWidth = notificationMenuDropdownRef.value?.offsetWidth || 380;
  const padding = 16;
  const desiredLeft = rect.right - dropdownWidth;
  const maxLeft = window.innerWidth - dropdownWidth - padding;
  const left = Math.max(padding, Math.min(desiredLeft, maxLeft));
  const top = rect.bottom + 8;
  notificationMenuPosition.value = { top, left };
};


const attachDropdownListeners = () => {
  if (dropdownListenersAttached) return;
  dropdownListenersAttached = true;
  window.addEventListener("resize", updateProfileMenuPosition);
  window.addEventListener("scroll", updateProfileMenuPosition, true);
};

const detachDropdownListeners = () => {
  if (!dropdownListenersAttached) return;
  dropdownListenersAttached = false;
  window.removeEventListener("resize", updateProfileMenuPosition);
  window.removeEventListener("scroll", updateProfileMenuPosition, true);
};

const attachNotificationListeners = () => {
  if (notificationListenersAttached) return;
  notificationListenersAttached = true;
  window.addEventListener("resize", updateNotificationMenuPosition);
  window.addEventListener("scroll", updateNotificationMenuPosition, true);
};

const detachNotificationListeners = () => {
  if (!notificationListenersAttached) return;
  notificationListenersAttached = false;
  window.removeEventListener("resize", updateNotificationMenuPosition);
  window.removeEventListener("scroll", updateNotificationMenuPosition, true);
};


const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value;
  if (profileMenuOpen.value) {
    notificationMenuOpen.value = false;
  }
};

const closeProfileMenu = () => {
  profileMenuOpen.value = false;
};

const toggleNotificationMenu = () => {
  notificationMenuOpen.value = !notificationMenuOpen.value;
  if (notificationMenuOpen.value) {
    profileMenuOpen.value = false;
    refreshAllNotifications();
  }
};

const closeNotificationMenu = () => {
  notificationMenuOpen.value = false;
};

const goToProfile = () => {
  closeProfileMenu();
  router.push("/profile");
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
    stopStockAlertMonitor();
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
  const clickedProfileTrigger =
    profileMenuRef.value && profileMenuRef.value.contains(event.target);
  const clickedProfileDropdown =
    profileMenuDropdownRef.value &&
    profileMenuDropdownRef.value.contains(event.target);
  if (clickedProfileTrigger || clickedProfileDropdown) {
    return;
  }
  profileMenuOpen.value = false;

  const clickedNotificationTrigger =
    notificationMenuRef.value &&
    notificationMenuRef.value.contains(event.target);
  const clickedNotificationDropdown =
    notificationMenuDropdownRef.value &&
    notificationMenuDropdownRef.value.contains(event.target);
  if (clickedNotificationTrigger || clickedNotificationDropdown) {
    return;
  }
  notificationMenuOpen.value = false;
};

onMounted(async () => {
  refreshUser(true);
  storageListener = (event) => handleStorage(event);
  window.addEventListener("storage", storageListener);
  
  // Listen for profile update events
  profileUpdateHandler = () => {
    refreshUser(true);
  };
  eventBus.on("user:profileUpdated", profileUpdateHandler);
  
  if (!transactionStore.transactions.length) {
    transactionStore.fetchTransactions().catch(() => {});
  }
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  stopStockAlertMonitor();
  if (storageListener) {
    window.removeEventListener("storage", storageListener);
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  document.removeEventListener("click", handleClickOutside);
  detachDropdownListeners();
  detachNotificationListeners();
  
  // Remove event bus listener
  if (profileUpdateHandler) {
    eventBus.off("user:profileUpdated", profileUpdateHandler);
  }
});

watch(
  currentUser,
  (user) => {
    if (user) {
      startStockAlertMonitor();
    } else {
      stopStockAlertMonitor();
    }
  },
  { immediate: true },
);

watch(profileMenuOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    updateProfileMenuPosition();
    attachDropdownListeners();
  } else {
    detachDropdownListeners();
  }
});

watch(notificationMenuOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    updateNotificationMenuPosition();
    attachNotificationListeners();
  } else {
    detachNotificationListeners();
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
  padding: 4px 4px 4px 40px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #f8fafc;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  flex: 1 1 320px;
  min-width: 220px;
  max-width: 480px;
}

/* Hide native search clear button */
.topbar__search input[type="search"]::-webkit-search-cancel-button {
  display: none;
}

.topbar__search input[type="search"]::-ms-clear {
  display: none;
}

.topbar__search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
  background: #ffffff;
}

.topbar__search:focus-within .search-icon {
  color: var(--primary);
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
  padding: 6px 8px 6px 0;
}

.topbar__search input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.topbar__search input:focus-visible {
  outline: none;
  box-shadow: none;
}

.topbar__search .search-btn {
  position: relative;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.topbar__search .search-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca, #5855eb);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.topbar__search .search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.topbar__search .clear-btn {
  position: relative;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}

.topbar__search .clear-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.topbar__search .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
  position: fixed;
  top: 0;
  left: 0;
  min-width: 200px;
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
  z-index: 1200;
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

.notification-shell {
  position: relative;
  flex-shrink: 0;
}

.notification-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 380px;
  max-height: 500px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow:
    0 20px 45px rgba(15, 23, 42, 0.15),
    0 2px 12px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 1200;
  overflow: hidden;
}

.notification-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.notification-menu-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.notification-refresh-btn {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.notification-refresh-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.notification-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notification-menu-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.notification-loading,
.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}

.notification-empty p {
  margin: 12px 0 0;
  font-size: 14px;
}

.notification-list {
  display: flex;
  flex-direction: column;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e0e7ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-item-content {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.notification-item-message {
  font-size: 13px;
  color: #475569;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-item-meta {
  font-size: 12px;
  color: #94a3b8;
}

.notification-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.notification-type-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.notification-type--stock {
  background: #fee2e2;
  color: #dc2626;
}

.notification-type--payment {
  background: #fef3c7;
  color: #d97706;
}

.notification-type--transaction {
  background: #dbeafe;
  color: #2563eb;
}

.notification-item--stock .notification-item-icon {
  background: #fee2e2;
  color: #dc2626;
}

.notification-item--payment .notification-item-icon {
  background: #fef3c7;
  color: #d97706;
}

.notification-item--transaction .notification-item-icon {
  background: #e0e7ff;
  color: #4f46e5;
}

.notification-menu-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
}

.notification-view-all {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-view-all:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Keep layout identical across window sizes; rely on horizontal scroll if space is tight. */
</style>
