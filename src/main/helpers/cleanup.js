const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");

const TEMP_DIR = path.join(__dirname, "../../data/temp");
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up old temporary files
 * @param {number} maxAgeMs - Maximum age of files to keep in milliseconds
 * @returns {Promise<number>} Number of files deleted
 */
async function cleanupTempFiles(maxAgeMs = MAX_AGE_MS) {
  try {
    // Check if temp directory exists
    try {
      await fs.access(TEMP_DIR);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(TEMP_DIR, { recursive: true });
      return 0;
    }

    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old temp file: ${file}`);
        }
      } catch (error) {
        logger.warn(`Error processing temp file ${file}:`, error);
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} temporary file(s)`);
    }

    return deletedCount;
  } catch (error) {
    logger.error("Error cleaning up temp files:", error);
    return 0;
  }
}

/**
 * Clean up all temporary files (regardless of age)
 * @returns {Promise<number>} Number of files deleted
 */
async function cleanupAllTempFiles() {
  try {
    try {
      await fs.access(TEMP_DIR);
    } catch {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      return 0;
    }

    const files = await fs.readdir(TEMP_DIR);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        await fs.unlink(filePath);
        deletedCount++;
      } catch (error) {
        logger.warn(`Error deleting temp file ${file}:`, error);
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} temporary file(s)`);
    }

    return deletedCount;
  } catch (error) {
    logger.error("Error cleaning up all temp files:", error);
    return 0;
  }
}

module.exports = {
  cleanupTempFiles,
  cleanupAllTempFiles,
};

