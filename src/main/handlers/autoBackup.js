const { ipcMain } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

const BACKUPS_DIR = path.join(__dirname, "../../../data/backups");
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
    0 // detik 00
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
      `auto-backup-${timestamp}.sqlite`
    );

    // Ensure backup directory exists
    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    // Close current database connection
    database.close();

    // Copy database file
    await fs.copyFile(
      path.join(__dirname, "../../../data/database.sqlite"),
      backupFile
    );

    // Reconnect to database
    await database.connect();

    // Clean up old backups
    await cleanOldBackups();

    logger.info("Auto backup created successfully:", backupFile);
    return true;
  } catch (error) {
    logger.error("Error creating auto backup:", error);

    // Try to reconnect to database if backup failed
    try {
      await database.connect();
    } catch (connError) {
      logger.error("Error reconnecting to database:", connError);
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
      }))
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
