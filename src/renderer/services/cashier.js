import { ipcRenderer } from "@/services/ipc";

// Get current open session for user
export function getCurrentSession(userId) {
  return ipcRenderer.invoke("cashier:getCurrentSession", userId);
}

// Get all sessions with optional filters
export function getAllSessions(filters = {}) {
  return ipcRenderer.invoke("cashier:getAllSessions", filters);
}

// Open cashier session
export function openSession(sessionData) {
  return ipcRenderer.invoke("cashier:openSession", sessionData);
}

// Close cashier session
export function closeSession(sessionData) {
  return ipcRenderer.invoke("cashier:closeSession", sessionData);
}

// Get session by ID
export function getSessionById(sessionId) {
  return ipcRenderer.invoke("cashier:getSessionById", sessionId);
}

