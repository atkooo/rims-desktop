<template>
  <div v-if="$route.path === '/login'" class="auth">
    <router-view :key="$route.fullPath" />
  </div>
  <div v-else class="app">
    <Sidebar />
    <main class="content">
      <Topbar />
      <div class="content-wrapper">
        <div class="card pad">
          <Breadcrumbs />
          <ToastProvider>
            <router-view />
          </ToastProvider>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue';
import Topbar from './components/Topbar.vue';
import Breadcrumbs from './components/Breadcrumbs.vue';
import ToastProvider from './components/ui/ToastProvider.vue';
export default { components: { Sidebar, Topbar, Breadcrumbs, ToastProvider } };
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
}

.content-wrapper {
  flex: 1;
  padding: 18px;
  padding-top: 12px;
}

.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
</style>
