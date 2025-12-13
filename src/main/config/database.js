const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let cachedDbPath = null;

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
 * Resolve database path (lazy evaluation)
 * Development: uses data/dev/ folder in project
 * Production: uses userData directory (separate from dev)
 */
function resolveDbPath() {
  // Return cached path if already resolved
  if (cachedDbPath) {
    return cachedDbPath;
  }

  const environment = getEnvironment();
  
  if (environment === "production") {
    try {
      // Production: use userData directory (separate from dev)
      if (app && typeof app.getPath === "function") {
        const userDataPath = app.getPath("userData");
        const dbPath = path.join(userDataPath, "rims.db");
        // Ensure directory exists
        fs.mkdirSync(userDataPath, { recursive: true });
        cachedDbPath = dbPath;
        console.log("=== DATABASE PATH (Production) ===");
        console.log(`Environment: ${environment}`);
        console.log(`Database file: ${cachedDbPath}`);
        console.log("==================================");
        return cachedDbPath;
      }
    } catch (error) {
      console.error("Error resolving userData path:", error);
      throw new Error("Cannot resolve production database path");
    }
  }
  
  // Development: use project data/dev folder (separate from production)
  const projectDataPath = path.join(__dirname, "../../../data/dev");
  fs.mkdirSync(projectDataPath, { recursive: true });
  cachedDbPath = path.join(projectDataPath, "rims.db");
  console.log("=== DATABASE PATH (Development) ===");
  console.log(`Environment: ${environment}`);
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
  get environment() {
    return getEnvironment();
  },
  options: {
    // Mengaktifkan foreign keys
    pragma: {
      foreign_keys: "ON",
    },
  },
};

module.exports = dbConfig;
