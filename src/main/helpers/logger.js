const winston = require("winston");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

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

function resolveLogDir() {
  const environment = getEnvironment();
  
  if (environment === "production") {
    try {
      // Production: use userData/logs (separate from dev)
      if (app && typeof app.getPath === "function") {
        return path.join(app.getPath("userData"), "logs");
      }
    } catch (error) {
      console.error("Error resolving userData path for logs:", error);
      throw new Error("Cannot resolve production log directory");
    }
  }
  
  // Development: use project data/dev/logs folder (separate from production)
  return path.join(__dirname, "../../../data/dev/logs");
}

const logDir = resolveLogDir();
fs.mkdirSync(logDir, { recursive: true });

// Log directory location to console for debugging
console.log("=== LOG DIRECTORY ===");
console.log(`Log files location: ${logDir}`);
console.log(`Error log: ${path.join(logDir, "error.log")}`);
console.log(`Combined log: ${path.join(logDir, "combined.log")}`);
console.log("====================");

// Konfigurasi logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    // Log error ke file
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    // Log info ke file
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
  ],
});

// Jika bukan production, log juga ke console
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

module.exports = logger;
