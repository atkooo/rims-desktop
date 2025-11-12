<template>
  <aside :class="['sidebar', { 'sidebar--collapsed': collapsed }]">
    <div class="sidebar__brand">
      <div class="sidebar__logo">R</div>
      <div class="sidebar__brand-text" v-if="!collapsed">
        <h3>RIMS Desktop</h3>
        <span>Rental & Sales</span>
      </div>
    </div>
    <nav>
      <router-link
        to="/"
        active-class="active"
        :title="collapsed ? 'Dashboard' : null"
      >
        <Icon name="dashboard" class="icon" />
        <span v-if="!collapsed">Dashboard</span>
      </router-link>
      <template v-for="group in filteredGroups" :key="group.title">
        <div v-if="group && group.items && group.items.length > 0" class="group">
          <div class="group-title" v-if="!collapsed">{{ group.title }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            active-class="active"
            :title="collapsed ? item.label : null"
          >
            <Icon :name="item.icon" class="icon" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </router-link>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import Icon from "../ui/Icon.vue";
import { menuGroups } from "@/constants/menu-groups";
import { usePermissions, initPermissions } from "@/composables/usePermissions";

const props = defineProps({
  collapsed: { type: Boolean, default: false },
});

const { hasPermissionSync } = usePermissions();
const permissionsInitialized = ref(false);

// Filter menu groups based on permissions
const filteredGroups = computed(() => {
  // If permissions not initialized yet, return all menu groups (will be filtered once loaded)
  if (!permissionsInitialized.value) {
    return menuGroups;
  }
  
  try {
    return menuGroups
      .map((group) => {
        if (!group || !group.items) return null;
        return {
          ...group,
          items: group.items.filter((item) => {
            // If no permission required, show item
            if (!item || !item.permission) return true;
            // Check if user has permission
            try {
              return hasPermissionSync(item.permission);
            } catch (error) {
              console.error("Error checking permission:", error);
              return false;
            }
          }),
        };
      })
      .filter((group) => group && group.items && group.items.length > 0); // Remove empty groups
  } catch (error) {
    console.error("Error filtering menu groups:", error);
    return menuGroups; // Fallback to all groups
  }
});

onMounted(async () => {
  try {
    await initPermissions();
    permissionsInitialized.value = true;
  } catch (error) {
    console.error("Error initializing permissions in Sidebar:", error);
    // Even if there's an error, show menu (will show all items)
    permissionsInitialized.value = true;
  }
});
</script>

<style>
.sidebar {
  width: 240px;
  flex: 0 0 240px;
  flex-shrink: 0;
  background: #ffffff;
  color: #0f172a;
  padding: 20px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition:
    width 0.25s ease,
    padding 0.25s ease;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0 12px;
}

.sidebar__logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #4338ca, #6366f1);
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__brand-text h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.5px;
  color: #111827;
}

.sidebar__brand-text span {
  color: #94a3b8;
  font-size: 12px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar a {
  color: #334155;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
}

.sidebar a:hover {
  background: #f1f5f9;
  color: #111827;
}

.sidebar a.active {
  background: #e0e7ff;
  color: #111827;
  border: 1px solid #c7d2fe;
}

.sidebar a .icon {
  margin-right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.group {
  margin-top: 6px;
}

.group-title {
  color: #64748b;
  font-size: 12px;
  margin: 10px 6px 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar--collapsed {
  width: 76px;
  flex: 0 0 76px;
  padding: 20px 12px;
}

.sidebar--collapsed .sidebar__brand {
  justify-content: center;
}

.sidebar--collapsed .sidebar__brand-text {
  display: none;
}

.sidebar--collapsed nav {
  gap: 0;
}

.sidebar--collapsed a {
  justify-content: center;
  padding: 10px 0;
}

.sidebar--collapsed a span {
  display: none;
}

.sidebar--collapsed .group-title {
  height: 0;
  margin: 0;
  opacity: 0;
  overflow: hidden;
}
</style>
