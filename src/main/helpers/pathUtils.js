/**
 * Utility functions for path resolution
 */
const path = require("path");
const fsSync = require("fs");
const { app } = require("electron");
const logger = require("./logger");

/**
 * Get environment mode (development or production)
 */
function getEnvironment() {
  // Check NODE_ENV first (set by scripts)
  const nodeEnv = process.env.NODE_ENV;
  
  // If NODE_ENV is explicitly set, use it
  if (nodeEnv === "development" || nodeEnv === "production") {
    return nodeEnv;
  }
  
  // Fallback: if app is packaged, assume production
  // Otherwise, assume development
  if (app && typeof app.isPackaged === "boolean") {
    return app.isPackaged ? "production" : "development";
  }
  
  // Default to development for safety
  return "development";
}

/**
 * Resolve settings file path
 * Development: uses data/dev/settings.json
 * Production: uses userData/settings.json
 */
function resolveSettingsPath() {
  const environment = getEnvironment();
  
  if (environment === "production") {
    try {
      // Production: use userData directory (separate from dev)
      if (app && typeof app.getPath === "function") {
        const userDataPath = app.getPath("userData");
        const settingsPath = path.join(userDataPath, "settings.json");
        // Ensure directory exists
        fsSync.mkdirSync(userDataPath, { recursive: true });
        return settingsPath;
      }
    } catch (error) {
      logger.error("Error resolving userData path for settings:", error);
      throw new Error("Cannot resolve production settings path");
    }
  }

  // Development: use project data/dev folder (separate from production)
  const projectDataPath = path.join(__dirname, "../../../data/dev");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  return path.join(projectDataPath, "settings.json");
}

/**
 * Resolve backups directory path
 * Development: uses data/dev/backups
 * Production: uses userData/backups
 */
function resolveBackupsPath() {
  const environment = getEnvironment();
  
  if (environment === "production") {
    try {
      // Production: use userData directory (separate from dev)
      if (app && typeof app.getPath === "function") {
        const userDataPath = app.getPath("userData");
        const backupsPath = path.join(userDataPath, "backups");
        fsSync.mkdirSync(backupsPath, { recursive: true });
        return backupsPath;
      }
    } catch (error) {
      logger.error("Error resolving userData path for backups:", error);
      throw new Error("Cannot resolve production backups path");
    }
  }

  // Development: use project data/dev/backups folder (separate from production)
  const projectDataPath = path.join(__dirname, "../../../data/dev");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  const backupsPath = path.join(projectDataPath, "backups");
  fsSync.mkdirSync(backupsPath, { recursive: true });
  return backupsPath;
}

// File paths (lazy resolution with caching)
let cachedSettingsPath = null;
let cachedBackupsPath = null;

function getSettingsFile() {
  if (!cachedSettingsPath) {
    cachedSettingsPath = resolveSettingsPath();
    logger.info(`Settings file resolved: ${cachedSettingsPath}`);
  }
  return cachedSettingsPath;
}

function getBackupsDir() {
  if (!cachedBackupsPath) {
    cachedBackupsPath = resolveBackupsPath();
    logger.info(`Backups directory resolved: ${cachedBackupsPath}`);
  }
  return cachedBackupsPath;
}

/**
 * Resolve data directory path
 * Development: uses data/dev
 * Production: uses userData
 */
function resolveDataDir() {
  const environment = getEnvironment();
  
  if (environment === "production") {
    try {
      // Production: use userData directory (separate from dev)
      if (app && typeof app.getPath === "function") {
        const userDataPath = app.getPath("userData");
        // Ensure directory exists
        fsSync.mkdirSync(userDataPath, { recursive: true });
        return userDataPath;
      }
    } catch (error) {
      logger.error("Error resolving userData path for data directory:", error);
      throw new Error("Cannot resolve production data directory");
    }
  }

  // Development: use project data/dev folder (separate from production)
  const projectDataPath = path.join(__dirname, "../../../data/dev");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  return projectDataPath;
}

// Cache for data directory path
let cachedDataDir = null;

function getDataDir() {
  if (!cachedDataDir) {
    cachedDataDir = resolveDataDir();
    logger.info(`Data directory resolved: ${cachedDataDir}`);
  }
  return cachedDataDir;
}

module.exports = {
  resolveSettingsPath,
  resolveBackupsPath,
  resolveDataDir,
  getSettingsFile,
  getBackupsDir,
  getDataDir,
};






