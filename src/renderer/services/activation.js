import { invoke, isIpcAvailable } from "./ipc";

/**
 * Get machine ID
 */
export async function getMachineId() {
  if (!isIpcAvailable()) {
    throw new Error("IPC tidak tersedia");
  }

  try {
    const result = await invoke("activation:getMachineId");
    if (!result.success) {
      throw new Error(result.error || "Gagal mendapatkan machine ID");
    }
    return result.machineId;
  } catch (error) {
    console.error("Error getting machine ID:", error);
    throw error;
  }
}

/**
 * Check activation status
 */
export async function checkActivationStatus(forceRefresh = false) {
  if (!isIpcAvailable()) {
    // If IPC not available, assume not active to be safe
    return {
      success: false,
      isActive: false,
      error: "IPC tidak tersedia",
    };
  }

  try {
    const result = await invoke("activation:checkStatus", forceRefresh);
    return result;
  } catch (error) {
    console.error("Error checking activation status:", error);
    return {
      success: false,
      isActive: false,
      error: error.message || "Gagal memeriksa status aktivasi",
    };
  }
}

/**
 * Verify activation
 */
export async function verifyActivation() {
  if (!isIpcAvailable()) throw new Error("IPC tidak tersedia");
  try {
    return await invoke("activation:verify");
  } catch (error) {
    return { success: false, error: "verification_failed", message: error.message };
  }
}

/**
 * Check if activation is required
 */
export async function isActivationRequired() {
  const status = await checkActivationStatus();
  return !status.isActive && !status.offline;
}

/**
 * Format machine ID for display
 */
export function formatMachineId(machineId) {
  if (!machineId) return "";
  // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return machineId.match(/.{1,4}/g)?.join("-") || machineId;
}

