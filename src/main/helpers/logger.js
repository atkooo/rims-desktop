const winston = require("winston");
const path = require("path");

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
      filename: path.join(__dirname, "../../../data/logs/error.log"),
      level: "error",
    }),
    // Log info ke file
    new winston.transports.File({
      filename: path.join(__dirname, "../../../data/logs/combined.log"),
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
