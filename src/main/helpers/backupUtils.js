/**
 * Utility functions for backup operations
 */
const fs = require("fs").promises;
const path = require("path");
const database = require("./database");
const dbConfig = require("../config/database");
const logger = require("./logger");
const { getBackupsDir } = require("./pathUtils");

const DATABASE_FILE = dbConfig.path;

/**
 * Create backup of database
 * @param {string} backupType - 'manual' or 'auto'
 * @param {number|null} userId - User ID for manual backup
 * @returns {Promise<{success: boolean, backupFile?: string}>}
 */
async function createBackup(backupType = "manual", userId = null) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupsDir = getBackupsDir();
    const backupFileName =
      backupType === "auto"
        ? `auto-backup-${timestamp}.sqlite`
        : `backup-${timestamp}.sqlite`;
    const backupFile = path.join(backupsDir, backupFileName);

    // Ensure backup directory exists
    await fs.mkdir(backupsDir, { recursive: true });

    // Use VACUUM INTO to create backup without closing database
    // This is safer than closing and copying, as it doesn't interrupt other operations
    // Escape single quotes and backslashes in the path for SQL
    const escapedPath = backupFile.replace(/\\/g, "/").replace(/'/g, "''");
    try {
      await database.execSqlScript(`VACUUM INTO '${escapedPath}'`, backupType);
    } catch (vacuumError) {
      // If VACUUM INTO fails (not supported in older SQLite versions),
      // fall back to closing and copying
      logger.warn(
        "VACUUM INTO not supported, using file copy method:",
        vacuumError.message,
      );

      // Close current database connection and wait for it to fully close
      await database.close();

      // Small delay to ensure database file is fully released by SQLite
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Copy database file
      await fs.copyFile(DATABASE_FILE, backupFile);

      // Reconnect to database
      await database.connect();
    }

    // Record backup history
    try {
      const stat = await fs.stat(backupFile);
      await database.execute(
        `INSERT INTO backup_history (backup_file, backup_path, file_size, backup_type, status, user_id)
         VALUES (?, ?, ?, ?, 'success', ?)`,
        [
          path.basename(backupFile),
          backupFile,
          stat.size,
          backupType,
          userId,
        ],
      );

      const action =
        backupType === "auto" ? "AUTO_BACKUP_CREATE" : "BACKUP_CREATE";
      await database.execute(
        `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
         VALUES (?, ?, 'backup', ?, NULL)`,
        [
          userId,
          action,
          `${backupType === "auto" ? "Auto" : "Manual"} backup created: ${path.basename(backupFile)}`,
        ],
      );
    } catch (logErr) {
      logger.warn("Failed to record backup history/activity log:", logErr);
    }

    logger.info("Backup created successfully:", backupFile);
    return { success: true, backupFile };
  } catch (error) {
    logger.error("Error creating backup:", error);

    // Ensure database is connected (in case it was closed during fallback)
    try {
      await database.connect();
    } catch (reconnectError) {
      logger.error("Failed to reconnect database after backup error:", reconnectError);
    }

    // Log failed backup into backup_history (only if database is connected)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupsDir = getBackupsDir();
      const backupFileName =
        backupType === "auto"
          ? `auto-backup-${timestamp}.sqlite`
          : `backup-${timestamp}.sqlite`;
      const backupFile = path.join(backupsDir, backupFileName);
      await database.execute(
        `INSERT INTO backup_history (backup_file, backup_path, file_size, backup_type, status, user_id)
         VALUES (?, ?, ?, ?, 'failed', ?)`,
        [
          path.basename(backupFile),
          backupFile,
          0,
          backupType,
          userId,
        ],
      );
      const action =
        backupType === "auto" ? "AUTO_BACKUP_FAILED" : "BACKUP_FAILED";
      await database.execute(
        `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
         VALUES (?, ?, 'backup', ?, NULL)`,
        [userId, action, String(error?.message || error)],
      );
    } catch (logErr) {
      logger.warn("Failed to record failed backup log:", logErr);
    }

    throw error;
  }
}

module.exports = {
  createBackup,
};




