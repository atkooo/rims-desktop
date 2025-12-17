<template>
  <div v-if="$route.path === '/login' || $route.path === '/activation'" class="auth">
    <router-view :key="$route.fullPath" />
  </div>
  <div v-else-if="$route.path.startsWith('/cashier')" class="cashier-layout">
    <router-view :key="$route.fullPath" />
  </div>
  <div v-else :class="['app', { 'app--sidebar-collapsed': sidebarCollapsed }]">
    <Sidebar :collapsed="sidebarCollapsed" />
    <main class="content">
      <Topbar :collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />
      <section class="content-wrapper">
        <Breadcrumbs />
        <router-view />
      </section>
    </main>
  </div>
  
  <!-- Global Notification -->
  <AppNotification
    v-model="notification.visible"
    :type="notification.type"
    :title="notification.title"
    :message="notification.message"
    :duration="notification.duration"
    :closable="notification.closable"
    :show-progress="notification.showProgress"
    @close="hideNotification"
  />
</template>

<script>
import { onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useNotification } from "./composables/useNotification";
import Sidebar from "./components/layout/Sidebar.vue";
import Topbar from "./components/layout/Topbar.vue";
import Breadcrumbs from "./components/layout/Breadcrumbs.vue";
import AppNotification from "./components/ui/AppNotification.vue";
import { eventBus } from "./utils/eventBus";
import { loadTimezoneFromSettings } from "./utils/dateUtils";

export default {
  components: { Sidebar, Topbar, Breadcrumbs, AppNotification },
  setup() {
    const router = useRouter();
    const { notification, hideNotification } = useNotification();

    const handleGlobalSearch = (query) => {
      if (query && query.trim()) {
        router.push({
          name: "search-results",
          query: { q: query.trim() },
        });
      }
    };

    const handleFullscreenShortcut = (event) => {
      if (event.key === "F11") {
        event.preventDefault();
        if (typeof window !== "undefined") {
          window.api?.invoke?.("window:toggleFullscreen");
        }
      }
    };

    onMounted(async () => {
      // Load timezone from settings on app start
      try {
        await loadTimezoneFromSettings();
      } catch (error) {
        console.error("Error loading timezone from settings:", error);
      }
      
      eventBus.on("global-search", handleGlobalSearch);
      if (typeof window !== "undefined") {
        window.addEventListener("keydown", handleFullscreenShortcut);
      }
    });

    onBeforeUnmount(() => {
      eventBus.off("global-search", handleGlobalSearch);
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", handleFullscreenShortcut);
      }
    });

    return {
      notification,
      hideNotification,
    };
  },
  data() {
    return {
      sidebarCollapsed: false,
    };
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  },
};
</script>

<style>
.app {
  display: flex;
  min-height: 100vh;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: margin-left 0.25s ease;
}

.content-wrapper {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.cashier-layout {
  min-height: 100vh;
  width: 100%;
}
</style>
