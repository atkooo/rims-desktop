const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let cachedDbPath = null;

/**
 * Resolve database path (lazy evaluation)
 * In production (packaged app), use userData directory
 * In development, use project data folder
 */
function resolveDbPath() {
  // Return cached path if already resolved
  if (cachedDbPath) {
    return cachedDbPath;
  }

  try {
    // If app is packaged, use userData directory (same as logs)
    if (app && typeof app.getPath === "function" && app.isPackaged) {
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "rims.db");
      // Ensure directory exists
      fs.mkdirSync(userDataPath, { recursive: true });
      cachedDbPath = dbPath;
      console.log("=== DATABASE PATH (Production) ===");
      console.log(`Database file: ${cachedDbPath}`);
      console.log("==================================");
      return cachedDbPath;
    }
  } catch (error) {
    // Fall back to project data folder if app.getPath fails
    console.error("Error resolving userData path, using project path:", error);
  }
  
  // Development: use project data folder
  const projectDataPath = path.join(__dirname, "../../../data");
  fs.mkdirSync(projectDataPath, { recursive: true });
  cachedDbPath = path.join(projectDataPath, "rims.db");
  console.log("=== DATABASE PATH (Development) ===");
  console.log(`Database file: ${cachedDbPath}`);
  console.log("====================================");
  return cachedDbPath;
}

/**
 * Get database path (lazy getter)
 */
function getDbPath() {
  return resolveDbPath();
}

/**
 * Konfigurasi database SQLite
 */
const dbConfig = {
  get path() {
    return getDbPath();
  },
  options: {
    // Mengaktifkan foreign keys
    pragma: {
      foreign_keys: "ON",
    },
  },
};

module.exports = dbConfig;
