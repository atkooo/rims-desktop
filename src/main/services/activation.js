const os = require("os");
const crypto = require("crypto");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { app } = require("electron");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const logger = require("../helpers/logger");
const settingsUtils = require("../helpers/settingsUtils");

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
 * Get sync service URL from settings or environment
 */
async function getSyncServiceUrl() {
  const settings = await settingsUtils.loadSettings();
  
  // Check environment variable first, then settings
  const syncServiceUrl = 
    process.env.SYNC_SERVICE_URL || 
    settings.sync?.service_url || 
    'http://localhost:3001';
  
  return syncServiceUrl;
}

/**
 * Make HTTP request to sync service
 * @param {string} url - Request URL
 * @param {string} method - HTTP method (default: 'GET')
 * @param {object|null} data - Request body data (default: null)
 * @param {number} timeout - Request timeout in milliseconds (default: 10000)
 */
function makeRequest(url, method = 'GET', data = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: timeout,
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            // Extract error message from response
            const errorMsg = parsed.error || parsed.message || `HTTP ${res.statusCode}: ${responseData}`;
            logger.error(`HTTP Error ${res.statusCode}: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        } catch (error) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            const errorMsg = `HTTP ${res.statusCode}: ${responseData}`;
            logger.error(`HTTP Error ${res.statusCode}: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        }
      });
    });

    req.on('error', (error) => {
      logger.error(`Request error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Check if sync/activation is enabled in development
 */
function isSyncAndActivationEnabled() {
  // In production, always enable
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  
  // In development, check env variable
  // Default to false (skip sync/activation) for easier development
  const enabled = process.env.ENABLE_SYNC_AND_ACTIVATION;
  if (enabled === undefined || enabled === null) {
    return false; // Default: disabled in development
  }
  
  // Parse string to boolean
  return enabled === "true" || enabled === "1" || enabled === true;
}

/**
 * Check activation status from sync service
 */
async function checkActivationStatus(forceRefresh = false) {
  // If sync/activation is disabled in development, return active status
  if (!isSyncAndActivationEnabled()) {
    const machineId = await getOrGenerateMachineId().catch(() => "dev-machine-id");
    logger.info("Sync/Activation disabled in development - assuming active");
    return {
      isActive: true,
      machineId: machineId.trim(),
      offline: false,
      error: null,
    };
  }

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
    const trimmedMachineId = machineId.trim();
    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/activation/check`;

    // Use shorter timeout for activation check (5 seconds)
    const result = await makeRequest(url, 'POST', {
      machineId: trimmedMachineId
    }, 5000);

    if (result.success) {
      cachedStatus = {
        isActive: result.isActive || false,
        machineId: result.machineId || trimmedMachineId,
        error: result.error || null,
      };
      cacheTimestamp = now;
      logger.info(
        `Activation: ${cachedStatus.isActive ? "ACTIVE" : "INACTIVE"} (${trimmedMachineId})`,
      );
      return cachedStatus;
    } else {
      cachedStatus = {
        isActive: false,
        machineId: trimmedMachineId,
        error: result.error || "activation_check_failed",
      };
      cacheTimestamp = now;
      return cachedStatus;
    }
  } catch (error) {
    logger.error("Error checking activation status:", error);

    const machineId = await getOrGenerateMachineId().catch(() => null);
    const trimmedMachineId = machineId?.trim() || null;

    // Check if it's a connection error (sync service not available)
    const isConnectionError =
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("ENOTFOUND") ||
      error.message?.includes("timeout");

    if (isConnectionError) {
      logger.warn("Sync service not available, using cached status if available");
      if (cachedStatus?.isActive) {
        logger.warn("Using cached active status");
        return { ...cachedStatus, offline: true, error: error.message };
      }
    }

    return {
      isActive: false,
      machineId: trimmedMachineId,
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
    const syncServiceUrl = await getSyncServiceUrl();
    const url = `${syncServiceUrl}/api/sync/activation/verify`;

    // Use timeout for activation verify (10 seconds)
    const result = await makeRequest(url, 'POST', {
      machineId: machineId
    }, 10000);

    if (result.success) {
      clearCache();
    }

    return result;
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
  clearCache,
};

