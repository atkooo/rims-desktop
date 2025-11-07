<template>
  <div v-if="$route.path === '/login'" class="auth">
    <router-view :key="$route.fullPath" />
  </div>
  <div v-else class="app">
    <Sidebar />
    <main class="content">
      <Topbar />
      <section class="content-wrapper">
        <Breadcrumbs />
        <router-view />
      </section>
    </main>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue';
import Topbar from './components/Topbar.vue';
import Breadcrumbs from './components/Breadcrumbs.vue';
export default { components: { Sidebar, Topbar, Breadcrumbs } };
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
