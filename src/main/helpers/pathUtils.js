/**
 * Utility functions for path resolution
 */
const path = require("path");
const fsSync = require("fs");
const { app } = require("electron");
const logger = require("./logger");

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
    // Fall back to project data folder if app.getPath fails
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

/**
 * Resolve backups directory path
 */
function resolveBackupsPath() {
  try {
    if (app && typeof app.getPath === "function" && app.isPackaged) {
      const userDataPath = app.getPath("userData");
      const backupsPath = path.join(userDataPath, "backups");
      fsSync.mkdirSync(backupsPath, { recursive: true });
      return backupsPath;
    }
  } catch (error) {
    logger.warn(
      "Error resolving userData path for backups, using project path:",
      error,
    );
  }

  const projectDataPath = path.join(__dirname, "../../../data");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  return path.join(projectDataPath, "backups");
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
 * In production (packaged app), use userData directory
 * In development, use project data folder
 */
function resolveDataDir() {
  try {
    // If app is packaged, use userData directory (same as database and logs)
    if (app && typeof app.getPath === "function" && app.isPackaged) {
      const userDataPath = app.getPath("userData");
      // Ensure directory exists
      fsSync.mkdirSync(userDataPath, { recursive: true });
      return userDataPath;
    }
  } catch (error) {
    // Fall back to project data folder if app.getPath fails
    logger.warn(
      "Error resolving userData path for data directory, using project path:",
      error,
    );
  }

  // Development: use project data folder
  const projectDataPath = path.join(__dirname, "../../../data");
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






