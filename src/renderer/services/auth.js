import { invoke, isIpcAvailable } from "./ipc";

const STORAGE_KEY = "currentUser";

function readStoredUser() {
  const raw = window.localStorage?.getItem(STORAGE_KEY) || null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredUser(user) {
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export async function login(username, password) {
  if (!username || !password)
    throw new Error("Username dan password wajib diisi");
  if (!isIpcAvailable()) throw new Error("IPC Electron tidak tersedia");

  const user = await invoke("auth:login", { username, password });

  // Ensure permissions are loaded
  if (user && isIpcAvailable()) {
    try {
      // Load permissions from IPC
      const permissions = (await invoke("auth:getUserPermissions")) || [];
      user.permissions = permissions;
    } catch (error) {
      console.error("Error loading permissions:", error);
      // If admin, allow empty permissions (will be handled in router)
      if (user.role !== "admin") {
        user.permissions = [];
      } else {
        // Admin should have all permissions, but if loading fails, allow access anyway
        user.permissions = [];
      }
    }
  }

  // Store user with permissions
  writeStoredUser(user);

  // Initialize permissions in composable
  try {
    const { initPermissions } = await import("@/composables/usePermissions");
    await initPermissions();
  } catch (error) {
    console.error("Error initializing permissions in composable:", error);
    // Continue anyway
  }

  return user;
}

export async function logout() {
  if (isIpcAvailable()) {
    await invoke("auth:logout");
  }
  writeStoredUser(null);
}

export async function getCurrentUser(forceRefresh = false) {
  const stored = readStoredUser();
  if (!forceRefresh && stored && !isIpcAvailable()) return stored;

  if (!isIpcAvailable()) return stored;

  try {
    const user = await invoke("auth:getCurrentUser");
    if (user) {
      // Ensure permissions are loaded
      if (!user.permissions && isIpcAvailable()) {
        try {
          user.permissions = (await invoke("auth:getUserPermissions")) || [];
        } catch (error) {
          console.error("Error loading permissions:", error);
          user.permissions = [];
        }
      }
      writeStoredUser(user);
      // Initialize permissions in composable if available
      try {
        const { initPermissions } = await import(
          "@/composables/usePermissions"
        );
        await initPermissions();
      } catch (error) {
        // Composable may not be available yet
      }
    } else {
      writeStoredUser(null);
    }
    return user;
  } catch (error) {
    console.warn("Gagal mengambil data pengguna saat ini", error);
    return stored;
  }
}

export function getStoredUser() {
  return readStoredUser();
}
