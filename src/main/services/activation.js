const os = require("os");
const crypto = require("crypto");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { app } = require("electron");
const { createClient } = require("@supabase/supabase-js");
const logger = require("../helpers/logger");

/**
 * Resolve settings file path
 * In production (packaged app), use userData directory
 * In development, use project data folder
 */
function resolveSettingsPath() {
  try {
    // If app is packaged, use userData directory (same as database and logs)
    if (app && typeof app.getPath === "function" && app.isPackaged) {
      const userDataPath = app.getPath("userData");
      const settingsPath = path.join(userDataPath, "settings.json");
      // Ensure directory exists
      fsSync.mkdirSync(userDataPath, { recursive: true });
      return settingsPath;
    }
  } catch (error) {
    logger.warn(
      "Error resolving userData path for settings, using project path:",
      error,
    );
  }

  // Development: use project data folder
  const projectDataPath = path.join(__dirname, "../../../data");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  return path.join(projectDataPath, "settings.json");
}

let cachedSettingsPath = null;

function getSettingsFile() {
  if (!cachedSettingsPath) {
    cachedSettingsPath = resolveSettingsPath();
  }
  return cachedSettingsPath;
}
const DEFAULT_CHECK_INTERVAL = 3600000; // 1 hour in milliseconds
const CACHE_EXPIRY = 300000; // 5 minutes cache

let cachedStatus = null;
let cacheTimestamp = 0;
let periodicCheckInterval = null;

/**
 * Generate a unique machine ID based on hardware fingerprint
 */
function generateMachineId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  // Get MAC address from first network interface
  let macAddress = "";
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
        macAddress = iface.mac;
        break;
      }
    }
    if (macAddress) break;
  }

  // Create a unique fingerprint
  const fingerprint = `${hostname}-${platform}-${arch}-${macAddress}-${
    cpus[0]?.model || ""
  }`;

  // Hash the fingerprint to create a stable machine ID
  const machineId = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .substring(0, 32);

  return machineId;
}

/**
 * Load settings from file
 */
async function loadSettings() {
  try {
    const settingsFile = getSettingsFile();
    const data = await fs.readFile(settingsFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        printer: "Microsoft Print to PDF",
        paperWidth: 80,
        autoPrint: true,
        taxPercentage: 12,
      };
    }
    throw error;
  }
}

/**
 * Save settings to file
 */
async function saveSettings(settings) {
  const settingsFile = getSettingsFile();
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
}

/**
 * Get or generate machine ID
 */
async function getOrGenerateMachineId() {
  const settings = await loadSettings();

  if (!settings.activation) {
    settings.activation = {};
  }

  if (!settings.activation.machine_id) {
    settings.activation.machine_id = generateMachineId();
    await saveSettings(settings);
    logger.info(`Generated new machine ID: ${settings.activation.machine_id}`);
  }

  return settings.activation.machine_id.trim();
}

/**
 * Get Supabase configuration
 */
async function getSupabaseConfig() {
  const settings = await loadSettings();

  if (!settings.activation) {
    settings.activation = {};
  }

  // Check environment variables first, then settings
  // Priority: SUPABASE_URL (main process) > VITE_SUPABASE_URL (backward compat) > settings
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    settings.activation.supabase_url;

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    settings.activation.supabase_anon_key;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL atau API key belum dikonfigurasi. Silakan atur SUPABASE_URL dan SUPABASE_ANON_KEY (atau VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY) di file .env",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Create Supabase client
 */
async function createSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Parse is_active value from various data types
 * Handles boolean, integer (1/0), and string ("true"/"false"/"1"/"0")
 */
function parseIsActive(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

/**
 * Check activation status from Supabase
 */
async function checkActivationStatus(forceRefresh = false) {
  const now = Date.now();

  // Check cache first
  if (
    !forceRefresh &&
    cachedStatus !== null &&
    now - cacheTimestamp < CACHE_EXPIRY
  ) {
    return cachedStatus;
  }

  try {
    const machineId = await getOrGenerateMachineId();
    const supabase = await createSupabaseClient();
    const trimmedMachineId = machineId.trim();

    const { data, error } = await supabase
      .from("activations")
      .select("is_active")
      .eq("machine_id", trimmedMachineId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        logger.warn(`Activation not found: ${trimmedMachineId}`);
        cachedStatus = {
          isActive: false,
          machineId: trimmedMachineId,
          error: "activation_not_found",
        };
        cacheTimestamp = now;
        return cachedStatus;
      }
      throw error;
    }

    const isActive = parseIsActive(data.is_active);
    cachedStatus = { isActive, machineId: trimmedMachineId };
    cacheTimestamp = now;
    logger.info(
      `Activation: ${isActive ? "ACTIVE" : "INACTIVE"} (${trimmedMachineId})`,
    );
    return cachedStatus;
  } catch (error) {
    logger.error("Error checking activation status:", error);

    const machineId = await getOrGenerateMachineId().catch(() => null);
    const isConfigError =
      error.message?.includes("belum dikonfigurasi") ||
      error.message?.includes("Supabase URL") ||
      error.message?.includes("API key");

    if (isConfigError) {
      logger.warn("Supabase configuration missing");
      return {
        isActive: false,
        machineId,
        error: error.message,
        offline: true,
      };
    }

    if (cachedStatus?.isActive) {
      logger.warn("Using cached active status");
      return { ...cachedStatus, offline: true, error: error.message };
    }

    return {
      isActive: false,
      machineId,
      error: error.message,
      offline: true,
    };
  }
}

/**
 * Verify activation
 */
async function verifyActivation() {
  try {
    const machineId = (await getOrGenerateMachineId()).trim();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("activations")
      .select("is_active")
      .eq("machine_id", machineId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "activation_not_found",
          message: "Aktivasi tidak ditemukan",
        };
      }
      throw error;
    }

    const isActive = parseIsActive(data.is_active);
    if (!isActive) {
      return {
        success: false,
        error: "activation_inactive",
        message: "Aktivasi tidak aktif",
      };
    }

    clearCache();
    return { success: true, message: "Aktivasi berhasil diverifikasi" };
  } catch (error) {
    logger.error("Error verifying activation:", error);
    return {
      success: false,
      error: "verification_failed",
      message: error.message,
    };
  }
}

/**
 * Start periodic activation check
 */
function startPeriodicCheck(callback = null) {
  if (periodicCheckInterval) clearInterval(periodicCheckInterval);
  const interval = DEFAULT_CHECK_INTERVAL;
  periodicCheckInterval = setInterval(async () => {
    try {
      const status = await checkActivationStatus(true);
      if (callback) callback(status);
    } catch (error) {
      logger.error("Error in periodic activation check:", error);
    }
  }, interval);
  logger.info(`Started periodic activation check every ${interval / 1000}s`);
  return periodicCheckInterval;
}

/**
 * Stop periodic activation check
 */
function stopPeriodicCheck() {
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval);
    periodicCheckInterval = null;
    logger.info("Stopped periodic activation check");
  }
}

/**
 * Clear activation cache
 */
function clearCache() {
  cachedStatus = null;
  cacheTimestamp = 0;
  logger.info("Activation cache cleared");
}

module.exports = {
  getOrGenerateMachineId,
  checkActivationStatus,
  verifyActivation,
  startPeriodicCheck,
  stopPeriodicCheck,
  generateMachineId,
  getSupabaseConfig,
  clearCache,
};

