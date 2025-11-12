import { ref, computed } from "vue";
import { invoke, isIpcAvailable } from "@/services/ipc";
import { getCurrentUser, getStoredUser } from "@/services/auth";

// Shared state across all instances
const permissions = ref([]);
const loading = ref(false);

/**
 * Load user permissions
 */
export async function loadPermissions() {
  if (!isIpcAvailable()) {
    console.warn("IPC tidak tersedia");
    return [];
  }

  try {
    loading.value = true;
    const userPerms = await invoke("auth:getUserPermissions");
    permissions.value = userPerms || [];
    return permissions.value;
  } catch (error) {
    console.error("Error loading permissions:", error);
    permissions.value = [];
    return [];
  } finally {
    loading.value = false;
  }
}

/**
 * Initialize permissions from current user
 */
export async function initPermissions() {
  try {
    // First try to get permissions from stored user (faster)
    const storedUser = getStoredUser();
    if (
      storedUser &&
      storedUser.permissions &&
      Array.isArray(storedUser.permissions)
    ) {
      permissions.value = storedUser.permissions;
      return;
    }

    // If not in stored user, get from current user (which should load from IPC)
    const user = await getCurrentUser(true); // Force refresh to ensure permissions are loaded
    if (user && user.permissions && Array.isArray(user.permissions)) {
      permissions.value = user.permissions;
    } else {
      // Fallback: load permissions via IPC
      await loadPermissions();
    }
  } catch (error) {
    console.error("Error initializing permissions:", error);
    permissions.value = [];
  }
}

/**
 * Check if user has a specific permission
 * @param {string} permissionSlug - Permission slug to check
 * @returns {Promise<boolean>}
 */
export async function hasPermission(permissionSlug) {
  if (!permissionSlug) return true;

  // Check cached permissions first
  if (permissions.value.includes(permissionSlug)) {
    return true;
  }

  // If not in cache, check via IPC
  if (isIpcAvailable()) {
    try {
      return await invoke("auth:hasPermission", permissionSlug);
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  return false;
}

/**
 * Check if user has any of the specified permissions
 * @param {Array<string>} permissionSlugs - Array of permission slugs
 * @returns {Promise<boolean>}
 */
export async function hasAnyPermission(permissionSlugs) {
  if (!permissionSlugs || permissionSlugs.length === 0) return true;

  // Check cached permissions first
  const hasAny = permissionSlugs.some((slug) =>
    permissions.value.includes(slug),
  );
  if (hasAny) return true;

  // If not in cache, check via IPC
  if (isIpcAvailable()) {
    try {
      return await invoke("auth:hasAnyPermission", permissionSlugs);
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }

  return false;
}

/**
 * Check if user has all of the specified permissions
 * @param {Array<string>} permissionSlugs - Array of permission slugs
 * @returns {Promise<boolean>}
 */
export async function hasAllPermissions(permissionSlugs) {
  if (!permissionSlugs || permissionSlugs.length === 0) return true;

  // Check cached permissions
  const hasAll = permissionSlugs.every((slug) =>
    permissions.value.includes(slug),
  );
  if (hasAll) return true;

  // If not all in cache, check each via IPC
  if (isIpcAvailable()) {
    try {
      for (const slug of permissionSlugs) {
        const has = await invoke("auth:hasPermission", slug);
        if (!has) return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }

  return false;
}

/**
 * Check permission synchronously (using cached permissions)
 * @param {string} permissionSlug - Permission slug to check
 * @returns {boolean}
 */
export function hasPermissionSync(permissionSlug) {
  if (!permissionSlug) return true;
  return permissions.value.includes(permissionSlug);
}

/**
 * Check if user has any of the specified permissions synchronously
 * @param {Array<string>} permissionSlugs - Array of permission slugs
 * @returns {boolean}
 */
export function hasAnyPermissionSync(permissionSlugs) {
  if (!permissionSlugs || permissionSlugs.length === 0) return true;
  return permissionSlugs.some((slug) => permissions.value.includes(slug));
}

/**
 * Check if user has all of the specified permissions synchronously
 * @param {Array<string>} permissionSlugs - Array of permission slugs
 * @returns {boolean}
 */
export function hasAllPermissionsSync(permissionSlugs) {
  if (!permissionSlugs || permissionSlugs.length === 0) return true;
  return permissionSlugs.every((slug) => permissions.value.includes(slug));
}

/**
 * Composable for using permissions in components
 */
export function usePermissions() {
  const checkPermission = async (permissionSlug) => {
    return await hasPermission(permissionSlug);
  };

  const checkAnyPermission = async (permissionSlugs) => {
    return await hasAnyPermission(permissionSlugs);
  };

  const checkAllPermissions = async (permissionSlugs) => {
    return await hasAllPermissions(permissionSlugs);
  };

  return {
    permissions: computed(() => permissions.value),
    loading: computed(() => loading.value),
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasPermissionSync,
    hasAnyPermissionSync,
    hasAllPermissionsSync,
    loadPermissions,
    initPermissions,
  };
}
