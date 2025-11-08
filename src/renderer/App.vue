<template>
  <div v-if="$route.path === '/login'" class="auth">
    <router-view :key="$route.fullPath" />
  </div>
  <div v-else :class="['app', { 'app--sidebar-collapsed': sidebarCollapsed }]">
    <Sidebar :collapsed="sidebarCollapsed" />
    <main class="content">
      <Topbar
        :collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
      />
      <section class="content-wrapper">
        <Breadcrumbs />
        <router-view />
      </section>
    </main>
  </div>
</template>

<script>
import Sidebar from "./components/Sidebar.vue";
import Topbar from "./components/Topbar.vue";
import Breadcrumbs from "./components/Breadcrumbs.vue";
export default {
  components: { Sidebar, Topbar, Breadcrumbs },
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
</style>
