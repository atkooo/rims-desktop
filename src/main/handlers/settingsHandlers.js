const { ipcMain, app } = require("electron");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const database = require("../helpers/database");
const dbConfig = require("../config/database");
const logger = require("../helpers/logger");
const { cleanupTempFiles, cleanupAllTempFiles } = require("../helpers/cleanup");

/**
 * Resolve settings file path
 * In production (packaged app), use userData directory
 * In development, use project data folder
 */
function resolveSettingsPath() {
  try {
    // If app is packaged, use userData directory (same as database and logs)
    if (app && typeof app.getPath === "function" && app.isPackaged) {
      const userDataPath = app.getPath("userData");
      const settingsPath = path.join(userDataPath, "settings.json");
      // Ensure directory exists
      fsSync.mkdirSync(userDataPath, { recursive: true });
      return settingsPath;
    }
  } catch (error) {
    // Fall back to project data folder if app.getPath fails
    logger.warn("Error resolving userData path for settings, using project path:", error);
  }
  
  // Development: use project data folder
  const projectDataPath = path.join(__dirname, "../../../data");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  return path.join(projectDataPath, "settings.json");
}

/**
 * Resolve backups directory path
 */
function resolveBackupsPath() {
  try {
    if (app && typeof app.getPath === "function" && app.isPackaged) {
      const userDataPath = app.getPath("userData");
      const backupsPath = path.join(userDataPath, "backups");
      fsSync.mkdirSync(backupsPath, { recursive: true });
      return backupsPath;
    }
  } catch (error) {
    logger.warn("Error resolving userData path for backups, using project path:", error);
  }
  
  const projectDataPath = path.join(__dirname, "../../../data");
  fsSync.mkdirSync(projectDataPath, { recursive: true });
  return path.join(projectDataPath, "backups");
}

// File paths (lazy resolution with caching)
let cachedSettingsPath = null;
let cachedBackupsPath = null;

function getSettingsFile() {
  if (!cachedSettingsPath) {
    cachedSettingsPath = resolveSettingsPath();
    logger.info(`Settings file resolved: ${cachedSettingsPath}`);
  }
  return cachedSettingsPath;
}

function getBackupsDir() {
  if (!cachedBackupsPath) {
    cachedBackupsPath = resolveBackupsPath();
    logger.info(`Backups directory resolved: ${cachedBackupsPath}`);
  }
  return cachedBackupsPath;
}

const DATABASE_FILE = dbConfig.path;

function setupSettingsHandlers() {
  // Get settings
  ipcMain.handle("settings:get", async () => {
    try {
      const settingsFile = getSettingsFile();
      const data = await fs.readFile(settingsFile, "utf8");
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
      const settingsFile = getSettingsFile();
      try {
        const data = await fs.readFile(settingsFile, "utf8");
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
        settingsFile,
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
      const backupsDir = getBackupsDir();
      const files = await fs.readdir(backupsDir);
      return files.filter((file) => file.endsWith(".sqlite"));
    } catch (error) {
      if (error.code === "ENOENT") {
        const backupsDir = getBackupsDir();
        await fs.mkdir(backupsDir, { recursive: true });
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
      const backupsDir = getBackupsDir();
      const files = await fs.readdir(backupsDir);
      const backups = files.filter((file) => file.endsWith(".sqlite"));

      if (backups.length === 0) return null;

      const stats = await Promise.all(
        backups.map((file) => fs.stat(path.join(backupsDir, file))),
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
      const backupsDir = getBackupsDir();
      const backupFile = path.join(backupsDir, `backup-${timestamp}.sqlite`);

      // Ensure backup directory exists
      await fs.mkdir(backupsDir, { recursive: true });

      // Use VACUUM INTO to create backup without closing database
      // This is safer than closing and copying, as it doesn't interrupt other operations
      // Escape single quotes and backslashes in the path for SQL
      const escapedPath = backupFile.replace(/\\/g, '/').replace(/'/g, "''");
      try {
        await database.execSqlScript(
          `VACUUM INTO '${escapedPath}'`,
          "backup"
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
      
      // Ensure database is connected (in case it was closed during fallback)
      try {
        await database.connect();
      } catch (reconnectError) {
        logger.error("Failed to reconnect database after backup error:", reconnectError);
      }
      
      throw error;
    }
  });

  // Restore backup
  ipcMain.handle("backup:restore", async (event, backupFile) => {
    let databaseWasClosed = false;
    try {
      const backupsDir = getBackupsDir();
      const backupPath = path.join(backupsDir, backupFile);

      // Verify backup file exists
      await fs.access(backupPath);

      logger.info("Starting backup restore from:", backupFile);

      // Close current database connection and wait for it to fully close
      await database.close();
      databaseWasClosed = true;
      logger.info("Database connection closed for restore");

      // Longer delay to ensure database file is fully released by SQLite
      // Windows may need more time to release file handles
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to copy backup file with retry mechanism
      // Windows may hold file locks for a short time after close
      let copySuccess = false;
      let copyRetries = 5;
      let lastError = null;
      
      while (!copySuccess && copyRetries > 0) {
        try {
          // Copy backup file to database location
          logger.info(`Copying backup file to database location... (${copyRetries} retries left)`);
          await fs.copyFile(backupPath, DATABASE_FILE);
          logger.info("Backup file copied successfully");
          copySuccess = true;
        } catch (copyError) {
          lastError = copyError;
          copyRetries--;
          
          // Get error message for checking and reporting
          const errorMessage = copyError?.message || copyError?.toString() || String(copyError) || "Unknown error";
          
          if (copyRetries > 0) {
            // Check if error is related to file lock
            const isLockError = errorMessage.includes("locked") || 
                               errorMessage.includes("EBUSY") || 
                               errorMessage.includes("EACCES") ||
                               errorMessage.includes("EPERM") ||
                               errorMessage.includes("ENOENT");
            
            if (isLockError) {
              logger.warn(`Database file still locked, waiting 300ms before retry... (${copyRetries} retries left)`);
              await new Promise((resolve) => setTimeout(resolve, 300));
            } else {
              // Different error, don't retry
              logger.error("Copy error (not lock-related):", errorMessage);
              throw copyError;
            }
          } else {
            // All retries exhausted
            logger.error("Failed to copy backup file after all retries:", errorMessage);
            throw new Error(`Failed to copy backup file after multiple attempts: ${errorMessage}. Please ensure no other application is using the database file.`);
          }
        }
      }

      // Additional delay after copy to ensure file system has written the file
      // Windows may need more time to flush file changes
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reset initialized flag so ensureSchema will run with fresh connection
      // This is important after restore as the database file has been replaced
      database.resetInitialized();
      logger.info("Database initialized flag reset after restore");

      // Reconnect to database
      logger.info("Reconnecting to database...");
      await database.connect();
      databaseWasClosed = false;
      logger.info("Database reconnected successfully");

      // Verify database connection is ready by running a test query
      // Wait a bit before verification to ensure connection is stable
      await new Promise((resolve) => setTimeout(resolve, 200));
      try {
        await database.queryOne("SELECT 1 AS test");
        logger.info("Database connection verified and ready");
      } catch (verifyError) {
        logger.warn("Database connection verification failed, retrying:", verifyError.message);
        // Wait a bit more and try to reconnect
        await new Promise((resolve) => setTimeout(resolve, 500));
        await database.connect();
        logger.info("Database reconnected after verification failure");
        
        // Verify again
        try {
          await database.queryOne("SELECT 1 AS test");
          logger.info("Database connection verified after retry");
        } catch (secondVerifyError) {
          logger.error("Database connection verification failed on retry:", secondVerifyError.message);
          throw new Error("Failed to establish valid database connection after restore");
        }
      }

      // Log activity for restore
      try {
        await database.execute(
          `INSERT INTO activity_logs (user_id, action, module, description, ip_address)
           VALUES (NULL, 'BACKUP_RESTORE', 'backup', ?, NULL)`,
          [`Restore from: ${backupFile}`],
        );
        logger.info("Restore activity logged successfully");
      } catch (logErr) {
        logger.warn("Failed to record restore activity (non-critical):", logErr.message);
        // Don't fail the restore if logging fails
      }

      logger.info("Backup restored successfully from:", backupFile);
      return true;
    } catch (error) {
      logger.error("Error restoring backup:", error);
      
      // Always ensure database is reconnected if it was closed
      if (databaseWasClosed) {
        try {
          // Wait a bit before reconnecting to ensure cleanup
          await new Promise((resolve) => setTimeout(resolve, 300));
          await database.connect();
          logger.info("Database reconnected after restore error");
        } catch (reconnectError) {
          logger.error("Failed to reconnect database after restore error:", reconnectError);
          // Try one more time after a longer delay
          try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await database.connect();
            logger.info("Database reconnected on second attempt");
          } catch (secondReconnectError) {
            logger.error("Failed to reconnect database on second attempt:", secondReconnectError);
          }
        }
      }
      
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
