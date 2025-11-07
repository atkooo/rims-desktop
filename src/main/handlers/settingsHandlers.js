const { ipcMain } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const database = require("../helpers/database");
const dbConfig = require("../config/database");
const logger = require("../helpers/logger");

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
        };
      }
      logger.error("Error reading settings:", error);
      throw error;
    }
  });

  // Save settings
  ipcMain.handle("settings:save", async (event, settings) => {
    try {
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
      logger.info("Settings saved successfully");
      return true;
    } catch (error) {
      logger.error("Error saving settings:", error);
      throw error;
    }
  });

  // Get printer list
  ipcMain.handle("printer:list", (event) => {
    // In real implementation, this would get the list of system printers
    // For now, return dummy data
    return ["Default Printer", "PDF Printer", "Receipt Printer"];
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

  // Get last backup date
  ipcMain.handle("backup:getLastDate", async () => {
    try {
      const files = await fs.readdir(BACKUPS_DIR);
      const backups = files.filter((file) => file.endsWith(".sqlite"));

      if (backups.length === 0) return null;

      const stats = await Promise.all(
        backups.map((file) => fs.stat(path.join(BACKUPS_DIR, file)))
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

      // Close current database connection
      database.close();

      // Copy database file
      await fs.copyFile(DATABASE_FILE, backupFile);

      // Reconnect to database
      await database.connect();

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

      // Close current database connection
      database.close();

      // Copy backup file to database location
      await fs.copyFile(backupPath, DATABASE_FILE);

      // Reconnect to database
      await database.connect();

      logger.info("Backup restored successfully from:", backupFile);
      return true;
    } catch (error) {
      logger.error("Error restoring backup:", error);
      throw error;
    }
  });
}

module.exports = setupSettingsHandlers;
