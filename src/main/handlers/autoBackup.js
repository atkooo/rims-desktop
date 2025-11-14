const { ipcMain } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../helpers/logger");
const { cleanupTempFiles } = require("../helpers/cleanup");
const { getBackupsDir } = require("../helpers/pathUtils");
const { createBackup } = require("../helpers/backupUtils");

const MAX_BACKUPS = 10; // Simpan maksimal 10 backup terakhir

function setupAutoBackup() {
  // Jalankan backup otomatis setiap hari jam 00:00
  scheduleBackup();

  // Handle manual backup request
  ipcMain.handle("backup:createAuto", async () => {
    return await createAutoBackup();
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
    await createAutoBackup();
    // Set interval untuk backup selanjutnya (setiap 24 jam)
    setInterval(createAutoBackup, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

async function createAutoBackup() {
  try {
    await createBackup("auto", null);

    // Clean up old backups
    await cleanOldBackups();

    // Clean up old temp files (non-blocking)
    cleanupTempFiles().catch((err) => {
      logger.warn("Error cleaning temp files during backup:", err);
    });

    return true;
  } catch (error) {
    logger.error("Error creating auto backup:", error);
    throw error;
  }
}

async function cleanOldBackups() {
  try {
    const backupsDir = getBackupsDir();
    const files = await fs.readdir(backupsDir);
    const autoBackups = files
      .filter((file) => file.startsWith("auto-backup-"))
      .map((file) => ({
        name: file,
        path: path.join(backupsDir, file),
        time: fs
          .stat(path.join(backupsDir, file))
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
