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
  if (!username || !password) throw new Error("Username dan password wajib diisi");
  if (!isIpcAvailable()) throw new Error("IPC Electron tidak tersedia");

  const user = await invoke("auth:login", { username, password });
  writeStoredUser(user);
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
    if (user) writeStoredUser(user);
    else writeStoredUser(null);
    return user;
  } catch (error) {
    console.warn("Gagal mengambil data pengguna saat ini", error);
    return stored;
  }
}

export function getStoredUser() {
  return readStoredUser();
}

