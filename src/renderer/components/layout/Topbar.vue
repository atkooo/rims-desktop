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
          type="search"
          placeholder="Cari transaksi, pelanggan, atau kode transaksi"
        />
        <button type="submit" :disabled="searchBusy">
          {{ searchBusy ? "Mencari..." : "Cari" }}
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
          <span v-if="pendingTransactions" class="icon-badge">
            {{ pendingTransactions }}
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
                  @click="refreshTransactions"
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
                  v-else-if="pendingTransactionsList.length === 0"
                  class="notification-empty"
                >
                  <Icon name="check-circle" :size="24" />
                  <p>Tidak ada notifikasi</p>
                </div>
                <div v-else class="notification-list">
                  <button
                    v-for="transaction in pendingTransactionsList"
                    :key="transaction.id"
                    type="button"
                    class="notification-item"
                    @click="handleNotificationClick(transaction)"
                  >
                    <div class="notification-item-icon">
                      <Icon
                        :name="
                          transaction.transactionType === 'RENTAL'
                            ? 'package'
                            : 'shopping-cart'
                        "
                        :size="16"
                      />
                    </div>
                    <div class="notification-item-content">
                      <div class="notification-item-title">
                        {{
                          transaction.transactionType === "RENTAL"
                            ? "Transaksi Rental"
                            : "Transaksi Penjualan"
                        }}
                      </div>
                      <div class="notification-item-message">
                        {{ transaction.customerName || "Tanpa nama" }} -
                        {{ transaction.transaction_code }}
                      </div>
                      <div class="notification-item-meta">
                        {{ formatDate(transaction.transactionDate) }} •
                        {{ formatCurrency(transaction.totalAmount) }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </Teleport>
      </div>
      <div class="payment-notification-shell" ref="paymentMenuRef">
        <button
          class="icon-btn"
          type="button"
          aria-label="Tagihan menunggu"
          :aria-expanded="paymentMenuOpen"
          @click="togglePaymentMenu"
          ref="paymentButtonRef"
        >
          <Icon name="message" :size="20" />
          <span v-if="awaitingPayments" class="icon-badge">
            {{ awaitingPayments }}
          </span>
        </button>
        <Teleport to="body">
          <transition name="fade-scale">
            <div
              v-if="paymentMenuOpen"
              class="payment-notification-menu"
              ref="paymentMenuDropdownRef"
              :style="{
                top: paymentMenuPosition.top + 'px',
                left: paymentMenuPosition.left + 'px',
              }"
            >
              <div class="payment-notification-menu-header">
                <h3>Tagihan Menunggu</h3>
                <button
                  type="button"
                  class="payment-refresh-btn"
                  @click="refreshTransactions"
                  :disabled="transactionStore.loading"
                  aria-label="Refresh"
                >
                  <Icon name="refresh-cw" :size="16" />
                </button>
              </div>
              <div class="payment-notification-menu-content">
                <div v-if="transactionStore.loading" class="payment-loading">
                  Memuat...
                </div>
                <div
                  v-else-if="awaitingPaymentsList.length === 0"
                  class="payment-empty"
                >
                  <Icon name="check-circle" :size="24" />
                  <p>Tidak ada tagihan menunggu</p>
                </div>
                <div v-else class="payment-list">
                  <button
                    v-for="transaction in awaitingPaymentsList"
                    :key="transaction.id"
                    type="button"
                    class="payment-item"
                    @click="handlePaymentClick(transaction)"
                  >
                    <div class="payment-item-icon">
                      <Icon name="credit-card" :size="16" />
                    </div>
                    <div class="payment-item-content">
                      <div class="payment-item-title">
                        {{
                          transaction.transactionType === "RENTAL"
                            ? "Transaksi Rental"
                            : "Transaksi Penjualan"
                        }}
                      </div>
                      <div class="payment-item-message">
                        {{ transaction.customerName || "Tanpa nama" }} -
                        {{ transaction.transaction_code }}
                      </div>
                      <div class="payment-item-meta">
                        <span class="payment-amount">
                          Total: {{ formatCurrency(transaction.totalAmount) }}
                        </span>
                        <span
                          v-if="transaction.paid_amount"
                          class="payment-paid"
                        >
                          Dibayar: {{ formatCurrency(transaction.paid_amount) }}
                        </span>
                        <span
                          v-if="
                            transaction.totalAmount &&
                            transaction.paid_amount &&
                            transaction.totalAmount > transaction.paid_amount
                          "
                          class="payment-remaining"
                        >
                          Sisa:
                          {{
                            formatCurrency(
                              transaction.totalAmount - transaction.paid_amount,
                            )
                          }}
                        </span>
                      </div>
                      <div class="payment-item-status">
                        <span
                          :class="[
                            'payment-status-badge',
                            `payment-status--${getPaymentStatusClass(
                              transaction.payment_status,
                            )}`,
                          ]"
                        >
                          {{
                            getPaymentStatusLabel(transaction.payment_status)
                          }}
                        </span>
                        <span class="payment-date">
                          {{ formatDate(transaction.transactionDate) }}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
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

const paymentMenuOpen = ref(false);
const paymentMenuRef = ref(null);
const paymentMenuDropdownRef = ref(null);
const paymentButtonRef = ref(null);
const paymentMenuPosition = ref({ top: 0, left: 0 });
let paymentListenersAttached = false;

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

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Hari ini";
  } else if (diffDays === 1) {
    return "Kemarin";
  } else if (diffDays < 7) {
    return `${diffDays} hari lalu`;
  } else {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const handleNotificationClick = (transaction) => {
  closeNotificationMenu();
  if (transaction.transactionType === "RENTAL") {
    router.push("/transactions/rentals");
  } else {
    router.push("/transactions/sales");
  }
};

const handlePaymentClick = (transaction) => {
  closePaymentMenu();
  if (transaction.transactionType === "RENTAL") {
    router.push("/transactions/rentals");
  } else {
    router.push("/transactions/sales");
  }
};

const getPaymentStatusLabel = (status) => {
  const statusLower = (status || "").toString().toLowerCase();
  if (statusLower === "unpaid") return "Belum Dibayar";
  if (statusLower === "pending") return "Menunggu";
  return "Belum Dibayar";
};

const getPaymentStatusClass = (status) => {
  const statusLower = (status || "").toString().toLowerCase();
  if (statusLower === "unpaid") return "unpaid";
  if (statusLower === "pending") return "pending";
  return "unpaid";
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

const updatePaymentMenuPosition = () => {
  const anchor = paymentButtonRef.value;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const dropdownWidth = paymentMenuDropdownRef.value?.offsetWidth || 400;
  const padding = 16;
  const desiredLeft = rect.right - dropdownWidth;
  const maxLeft = window.innerWidth - dropdownWidth - padding;
  const left = Math.max(padding, Math.min(desiredLeft, maxLeft));
  const top = rect.bottom + 8;
  paymentMenuPosition.value = { top, left };
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

const attachPaymentListeners = () => {
  if (paymentListenersAttached) return;
  paymentListenersAttached = true;
  window.addEventListener("resize", updatePaymentMenuPosition);
  window.addEventListener("scroll", updatePaymentMenuPosition, true);
};

const detachPaymentListeners = () => {
  if (!paymentListenersAttached) return;
  paymentListenersAttached = false;
  window.removeEventListener("resize", updatePaymentMenuPosition);
  window.removeEventListener("scroll", updatePaymentMenuPosition, true);
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
    paymentMenuOpen.value = false;
    refreshTransactions();
  }
};

const closeNotificationMenu = () => {
  notificationMenuOpen.value = false;
};

const togglePaymentMenu = () => {
  paymentMenuOpen.value = !paymentMenuOpen.value;
  if (paymentMenuOpen.value) {
    profileMenuOpen.value = false;
    notificationMenuOpen.value = false;
    refreshTransactions();
  }
};

const closePaymentMenu = () => {
  paymentMenuOpen.value = false;
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

  const clickedPaymentTrigger =
    paymentMenuRef.value && paymentMenuRef.value.contains(event.target);
  const clickedPaymentDropdown =
    paymentMenuDropdownRef.value &&
    paymentMenuDropdownRef.value.contains(event.target);
  if (clickedPaymentTrigger || clickedPaymentDropdown) {
    return;
  }
  paymentMenuOpen.value = false;
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
  detachDropdownListeners();
  detachNotificationListeners();
  detachPaymentListeners();
});

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

watch(paymentMenuOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    updatePaymentMenuPosition();
    attachPaymentListeners();
  } else {
    detachPaymentListeners();
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
  padding: 4px 56px 4px 40px;
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
  padding: 6px 0;
}

.topbar__search input:focus-visible {
  outline: none;
  box-shadow: none;
}

.topbar__search button:focus-visible {
  outline: none;
  box-shadow: none;
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

.payment-notification-shell {
  position: relative;
  flex-shrink: 0;
}

.payment-notification-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 400px;
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

.payment-notification-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.payment-notification-menu-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.payment-refresh-btn {
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

.payment-refresh-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.payment-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.payment-notification-menu-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.payment-loading,
.payment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}

.payment-empty p {
  margin: 12px 0 0;
  font-size: 14px;
}

.payment-list {
  display: flex;
  flex-direction: column;
}

.payment-item {
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

.payment-item:last-child {
  border-bottom: none;
}

.payment-item:hover {
  background: #f8fafc;
}

.payment-item-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #fef3c7;
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-item-content {
  flex: 1;
  min-width: 0;
}

.payment-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.payment-item-message {
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-item-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 12px;
}

.payment-amount {
  color: #0f172a;
  font-weight: 500;
}

.payment-paid {
  color: #059669;
}

.payment-remaining {
  color: #dc2626;
  font-weight: 500;
}

.payment-item-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.payment-status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.payment-status--unpaid {
  background: #fee2e2;
  color: #dc2626;
}

.payment-status--pending {
  background: #dbeafe;
  color: #2563eb;
}

.payment-date {
  font-size: 11px;
  color: #94a3b8;
}

/* Keep layout identical across window sizes; rely on horizontal scroll if space is tight. */
</style>
