const winston = require("winston");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

function resolveLogDir() {
  try {
    if (app && typeof app.getPath === "function") {
      return path.join(app.getPath("userData"), "logs");
    }
  } catch (error) {
    // Ignore and fall back to project data folder
  }
  return path.join(__dirname, "../../../data/logs");
}

const logDir = resolveLogDir();
fs.mkdirSync(logDir, { recursive: true });

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
