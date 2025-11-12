const { ipcMain } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const database = require("../helpers/database");
const dbConfig = require("../config/database");
const logger = require("../helpers/logger");
const { cleanupTempFiles } = require("../helpers/cleanup");

const BACKUPS_DIR = path.join(__dirname, "../../../data/backups");
const DATABASE_FILE = dbConfig.path;
const MAX_BACKUPS = 10; // Simpan maksimal 10 backup terakhir

function setupAutoBackup() {
  // Jalankan backup otomatis setiap hari jam 00:00
  scheduleBackup();

  // Handle manual backup request
  ipcMain.handle("backup:createAuto", async () => {
    return await createBackup();
  });
}

function scheduleBackup() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // besok
    0, // jam 00
    0, // menit 00
    0, // detik 00
  );

  const msUntilMidnight = night.getTime() - now.getTime();

  // Schedule first backup
  setTimeout(async () => {
    await createBackup();
    // Set interval untuk backup selanjutnya (setiap 24 jam)
    setInterval(createBackup, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(
      BACKUPS_DIR,
      `auto-backup-${timestamp}.sqlite`,
    );

    // Ensure backup directory exists
    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    // Use VACUUM INTO to create backup without closing database
    // This is safer than closing and copying, as it doesn't interrupt other operations
    // Escape single quotes and backslashes in the path for SQL
    const escapedPath = backupFile.replace(/\\/g, '/').replace(/'/g, "''");
    try {
      await database.execSqlScript(
        `VACUUM INTO '${escapedPath}'`,
        "auto-backup"
      );
    } catch (vacuumError) {
      // If VACUUM INTO fails (not supported in older SQLite versions),
      // fall back to closing and copying
      logger.warn("VACUUM INTO not supported, using file copy method:", vacuumError.message);
      
      // Close current database connection and wait for it to fully close
      await database.close();

      // Small delay to ensure database file is fully released by SQLite
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Copy database file
      await fs.copyFile(DATABASE_FILE, backupFile);

      // Reconnect to database
      await database.connect();
    }

    // Clean up old backups
    await cleanOldBackups();

    // Clean up old temp files (non-blocking)
    cleanupTempFiles().catch((err) => {
      logger.warn("Error cleaning temp files during backup:", err);
    });

    // Record backup history (auto) and activity log
    try {
      const stat = await fs.stat(backupFile);
      await database.execute(
        `INSERT INTO backup_history (backup_file, backup_path, file_size, backup_type, status, user_id)
         VALUES (?, ?, ?, 'auto', 'success', NULL)`,
        [path.basename(backupFile), backupFile, stat.size],
      );
      await database.execute(
        `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
         VALUES (NULL, 'AUTO_BACKUP_CREATE', 'backup', ?, NULL)`,
        [`Auto backup created: ${path.basename(backupFile)}`],
      );
    } catch (logErr) {
      logger.warn("Failed to record auto-backup history/activity log:", logErr);
    }

    logger.info("Auto backup created successfully:", backupFile);
    return true;
  } catch (error) {
    logger.error("Error creating auto backup:", error);

    // Ensure database is connected (in case it was closed during fallback)
    try {
      await database.connect();
    } catch (reconnectError) {
      logger.error("Error reconnecting to database:", reconnectError);
    }

    // Log failed backup into backup_history (only if database is connected)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        BACKUPS_DIR,
        `auto-backup-${timestamp}.sqlite`,
      );
      await database.execute(
        `INSERT INTO backup_history (backup_file, backup_path, file_size, backup_type, status, user_id)
         VALUES (?, ?, ?, 'auto', 'failed', NULL)`,
        [path.basename(backupFile), backupFile, 0],
      );
      await database.execute(
        `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
         VALUES (NULL, 'AUTO_BACKUP_FAILED', 'backup', ?, NULL)`,
        [String(error?.message || error)],
      );
    } catch (logErr) {
      logger.warn("Failed to record failed auto-backup log:", logErr);
    }

    throw error;
  }
}

async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUPS_DIR);
    const autoBackups = files
      .filter((file) => file.startsWith("auto-backup-"))
      .map((file) => ({
        name: file,
        path: path.join(BACKUPS_DIR, file),
        time: fs
          .stat(path.join(BACKUPS_DIR, file))
          .then((stat) => stat.mtime.getTime()),
      }));

    // Get file stats
    const backupsWithTime = await Promise.all(
      autoBackups.map(async (backup) => ({
        ...backup,
        time: await backup.time,
      })),
    );

    // Sort by time (newest first) and remove old backups
    const sortedBackups = backupsWithTime.sort((a, b) => b.time - a.time);

    // Keep only MAX_BACKUPS newest backups
    for (let i = MAX_BACKUPS; i < sortedBackups.length; i++) {
      await fs.unlink(sortedBackups[i].path);
      logger.info("Removed old backup:", sortedBackups[i].name);
    }
  } catch (error) {
    logger.error("Error cleaning old backups:", error);
    // Don't throw error here to avoid interrupting the backup process
  }
}

module.exports = setupAutoBackup;
