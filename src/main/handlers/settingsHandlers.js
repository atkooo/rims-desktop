const { ipcMain } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const database = require("../helpers/database");
const dbConfig = require("../config/database");
const logger = require("../helpers/logger");
const { cleanupTempFiles, cleanupAllTempFiles } = require("../helpers/cleanup");

// File paths
const SETTINGS_FILE = path.join(__dirname, "../../../data/settings.json");
const BACKUPS_DIR = path.join(__dirname, "../../../data/backups");
const DATABASE_FILE = dbConfig.path;

function setupSettingsHandlers() {
  // Get settings
  ipcMain.handle("settings:get", async () => {
    try {
      const data = await fs.readFile(SETTINGS_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        // If file doesn't exist, return default settings
        return {
          companyName: "",
          address: "",
          phone: "",
          printer: "",
          paperWidth: 80,
          autoPrint: true,
          taxPercentage: 0,
        };
      }
      logger.error("Error reading settings:", error);
      throw error;
    }
  });

  // Save settings
  ipcMain.handle("settings:save", async (event, newSettings) => {
    try {
      // Read existing settings first
      let existingSettings = {};
      try {
        const data = await fs.readFile(SETTINGS_FILE, "utf8");
        existingSettings = JSON.parse(data);
      } catch (error) {
        // If file doesn't exist or can't be read, start with empty object
        if (error.code !== "ENOENT") {
          logger.warn("Could not read existing settings, starting fresh");
        }
      }

      // Merge new settings with existing settings
      const mergedSettings = { ...existingSettings, ...newSettings };

      // If receiptSettings is being updated, merge it properly
      if (newSettings.receiptSettings && existingSettings.receiptSettings) {
        mergedSettings.receiptSettings = {
          ...existingSettings.receiptSettings,
          ...newSettings.receiptSettings,
        };
      }

      await fs.writeFile(
        SETTINGS_FILE,
        JSON.stringify(mergedSettings, null, 2),
      );
      logger.info("Settings saved successfully");
      return true;
    } catch (error) {
      logger.error("Error saving settings:", error);
      throw error;
    }
  });

  // Get printer list
  ipcMain.handle("printer:list", async (event) => {
    try {
      // Use event.sender to get webContents from the renderer process
      const webContents = event.sender;

      if (!webContents) {
        logger.warn("No webContents available to get printer list");
        return [];
      }

      // Get system printers using webContents.getPrintersAsync() (Electron 20+)
      try {
        // Try async method first (Electron 20+)
        if (typeof webContents.getPrintersAsync === "function") {
          const printers = await webContents.getPrintersAsync();
          return printers.map((printer) => ({
            name: printer.name,
            displayName: printer.displayName || printer.name,
            description: printer.description || "",
            status: printer.status || 0,
            isDefault: printer.isDefault || false,
          }));
        } else if (typeof webContents.getPrinters === "function") {
          // Fallback for older Electron versions
          const printers = webContents.getPrinters();
          return printers.map((printer) => ({
            name: printer.name,
            displayName: printer.displayName || printer.name,
            description: printer.description || "",
            status: printer.status || 0,
            isDefault: printer.isDefault || false,
          }));
        } else {
          // Fallback: return empty array
          logger.warn("getPrinters method not available");
          return [];
        }
      } catch (printerError) {
        logger.error("Error getting printer list:", printerError);
        return [];
      }
    } catch (error) {
      logger.error("Error in printer:list handler:", error);
      return [];
    }
  });

  // Get backup list
  ipcMain.handle("backup:list", async () => {
    try {
      const files = await fs.readdir(BACKUPS_DIR);
      return files.filter((file) => file.endsWith(".sqlite"));
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
        return [];
      }
      logger.error("Error listing backups:", error);
      throw error;
    }
  });

  // Get backup history (DB records)
  ipcMain.handle("backup:getHistory", async () => {
    try {
      const sql = `
        SELECT
          bh.id,
          bh.backup_file,
          bh.backup_path,
          bh.file_size,
          bh.backup_type,
          bh.status,
          bh.created_at,
          u.full_name AS user_name
        FROM backup_history bh
        LEFT JOIN users u ON bh.user_id = u.id
        ORDER BY bh.created_at DESC
      `;
      return await database.query(sql);
    } catch (error) {
      logger.error("Error fetching backup history:", error);
      throw error;
    }
  });

  // Get activity logs
  ipcMain.handle("activityLogs:get", async () => {
    try {
      const sql = `
        SELECT
          al.id,
          u.full_name AS user_name,
          al.action,
          al.module,
          al.description,
          al.ip_address,
          al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
      `;
      return await database.query(sql);
    } catch (error) {
      logger.error("Error fetching activity logs:", error);
      throw error;
    }
  });

  // Get last backup date
  ipcMain.handle("backup:getLastDate", async () => {
    try {
      const files = await fs.readdir(BACKUPS_DIR);
      const backups = files.filter((file) => file.endsWith(".sqlite"));

      if (backups.length === 0) return null;

      const stats = await Promise.all(
        backups.map((file) => fs.stat(path.join(BACKUPS_DIR, file))),
      );

      const latestStat = stats.reduce((latest, current) => {
        return latest.mtime > current.mtime ? latest : current;
      });

      return latestStat.mtime;
    } catch (error) {
      logger.error("Error getting last backup date:", error);
      throw error;
    }
  });

  // Create backup
  ipcMain.handle("backup:create", async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(BACKUPS_DIR, `backup-${timestamp}.sqlite`);

      // Ensure backup directory exists
      await fs.mkdir(BACKUPS_DIR, { recursive: true });

      // Close current database connection and wait for it to fully close
      await database.close();

      // Copy database file
      await fs.copyFile(DATABASE_FILE, backupFile);

      // Reconnect to database
      await database.connect();

      // Record backup history (manual)
      try {
        const stat = await fs.stat(backupFile);
        await database.execute(
          `INSERT INTO backup_history (backup_file, backup_path, file_size, backup_type, status, user_id)
           VALUES (?, ?, ?, 'manual', 'success', NULL)`,
          [path.basename(backupFile), backupFile, stat.size],
        );
        await database.execute(
          `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
           VALUES (NULL, 'BACKUP_CREATE', 'backup', ?, NULL)`,
          [`Manual backup created: ${path.basename(backupFile)}`],
        );
      } catch (logErr) {
        logger.warn("Failed to record backup history/activity log:", logErr);
      }

      logger.info("Backup created successfully:", backupFile);
      return true;
    } catch (error) {
      logger.error("Error creating backup:", error);
      throw error;
    }
  });

  // Restore backup
  ipcMain.handle("backup:restore", async (event, backupFile) => {
    try {
      const backupPath = path.join(BACKUPS_DIR, backupFile);

      // Verify backup file exists
      await fs.access(backupPath);

      // Close current database connection and wait for it to fully close
      await database.close();

      // Copy backup file to database location
      await fs.copyFile(backupPath, DATABASE_FILE);

      // Reconnect to database
      await database.connect();

      // Log activity for restore
      try {
        await database.execute(
          `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
           VALUES (NULL, 'BACKUP_RESTORE', 'backup', ?, NULL)`,
          [`Restore from: ${backupFile}`],
        );
      } catch (logErr) {
        logger.warn("Failed to record restore activity:", logErr);
      }

      logger.info("Backup restored successfully from:", backupFile);
      return true;
    } catch (error) {
      logger.error("Error restoring backup:", error);
      throw error;
    }
  });

  // Cleanup temp files
  ipcMain.handle("cleanup:tempFiles", async () => {
    try {
      const deletedCount = await cleanupTempFiles();
      return { success: true, deletedCount };
    } catch (error) {
      logger.error("Error cleaning up temp files:", error);
      throw error;
    }
  });

  // Cleanup all temp files
  ipcMain.handle("cleanup:allTempFiles", async () => {
    try {
      const deletedCount = await cleanupAllTempFiles();
      return { success: true, deletedCount };
    } catch (error) {
      logger.error("Error cleaning up all temp files:", error);
      throw error;
    }
  });
}

module.exports = setupSettingsHandlers;
