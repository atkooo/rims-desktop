<template>
  <div class="cashier-layout">
    <!-- Header with Navigation -->
    <header class="cashier-header">
      <div class="cashier-header-top">
        <div class="cashier-header-left">
          <h1 class="cashier-title">Kasir</h1>
          <div v-if="cashierStatus" class="cashier-session-info">
            <span class="session-status" :class="cashierStatus.status === 'open' ? 'active' : 'inactive'">
              {{ cashierStatus.status === 'open' ? 'Sesi Aktif' : 'Sesi Tidak Aktif' }}
            </span>
            <span v-if="cashierStatus.status === 'open'" class="session-code">
              Kode: {{ cashierStatus.session_code }}
            </span>
          </div>
        </div>
        <div class="cashier-header-right">
          <button class="cashier-btn-secondary" @click="handleLogout">
            Logout
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="cashier-nav">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path"
          :class="['nav-item', { active: isActive(item) }]">
          <Icon :name="item.icon" :size="18" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="cashier-content">
      <router-view />
    </main>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getCurrentUser, logout } from "@/services/auth";
import { getCurrentSession } from "@/services/cashier";
import Icon from "@/components/ui/Icon.vue";
import { eventBus } from "@/utils/eventBus";

export default {
  name: "CashierLayout",
  components: {
    Icon,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const cashierStatus = ref(null);

    const navItems = [
      { path: "/cashier", icon: "dashboard", label: "Beranda", exact: true },
      { path: "/cashier/transaction", icon: "credit-card", label: "Transaksi" },
      { path: "/cashier/transactions", icon: "clipboard", label: "Riwayat Transaksi" },
      { path: "/cashier/customers", icon: "users", label: "Pelanggan" },
      { path: "/cashier/session", icon: "credit-card", label: "Sesi Kasir" },
    ];

    // Check if a nav item should be active
    const isActive = (item) => {
      const currentPath = route.path;

      // For exact match items (like /cashier), only match exact path
      if (item.exact) {
        return currentPath === item.path || currentPath === item.path + "/";
      }

      // Exact match first
      if (currentPath === item.path) {
        return true;
      }

      // For /cashier/* routes, match if current path starts with the item path
      // but not if it's a parent route (e.g., /cashier should not be active when on /cashier/sale)
      if (item.path.startsWith("/cashier/")) {
        // Match exact or if current path is a sub-route
        return currentPath === item.path || currentPath.startsWith(item.path + "/");
      }

      return false;
    };

    const loadCashierStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          const session = await getCurrentSession(user.id, user.role);
          cashierStatus.value = session
            ? { status: "open", ...session }
            : { status: "closed" };
        } else {
          cashierStatus.value = { status: "closed" };
        }
      } catch (error) {
        console.error("Error loading cashier status:", error);
        cashierStatus.value = { status: "closed" };
      }
    };

    const handleLogout = async () => {
      try {
        await logout();
        router.push("/login");
      } catch (error) {
        console.error("Logout error:", error);
        router.push("/login");
      }
    };

    // Listen for cashier session events
    const handleCashierSessionUpdate = () => {
      loadCashierStatus();
    };

    onMounted(() => {
      loadCashierStatus();
      // Listen for cashier session open/close events
      eventBus.on("cashier:sessionOpened", handleCashierSessionUpdate);
      eventBus.on("cashier:sessionClosed", handleCashierSessionUpdate);
    });

    onBeforeUnmount(() => {
      eventBus.off("cashier:sessionOpened", handleCashierSessionUpdate);
      eventBus.off("cashier:sessionClosed", handleCashierSessionUpdate);
    });

    return {
      cashierStatus,
      navItems,
      handleLogout,
      isActive,
    };
  },
};
</script>

<style scoped>
.cashier-layout {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.cashier-header {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.cashier-header-top {
  border-bottom: 2px solid #e5e7eb;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cashier-header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.cashier-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.cashier-session-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.session-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.75rem;
}

.session-status.active {
  background: #dcfce7;
  color: #166534;
}

.session-status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.session-code {
  color: #6b7280;
}

.cashier-header-right {
  display: flex;
  gap: 0.75rem;
}

.cashier-btn-secondary {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.cashier-btn-secondary:hover {
  background: #e5e7eb;
}

/* Navigation Tabs - Like Microsoft Word */
.cashier-nav {
  background: white;
  padding: 0 2rem;
  display: flex;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  cursor: pointer;
}

.nav-item:hover {
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.05);
}

.nav-item.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  background: rgba(79, 70, 229, 0.05);
  font-weight: 600;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  font-weight: 500;
}

.cashier-content {
  flex: 1;
  overflow-y: auto;
}
</style>
