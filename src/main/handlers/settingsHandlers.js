const { ipcMain } = require("electron");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const { cleanupTempFiles, cleanupAllTempFiles } = require("../helpers/cleanup");
const { getSettingsFile, getBackupsDir, getDataDir } = require("../helpers/pathUtils");
const { loadSettings } = require("../helpers/settingsUtils");
const { createBackup } = require("../helpers/backupUtils");
const dbConfig = require("../config/database");

// Use getDataDir() for consistent path resolution (will be set after require)
let DATA_DIR = null;
let LOGO_DIR = null;

function getDataDirectory() {
  if (!DATA_DIR) {
    DATA_DIR = getDataDir();
    LOGO_DIR = path.join(DATA_DIR, "uploads", "company");
  }
  return DATA_DIR;
}

function getLogoDirectory() {
  if (!LOGO_DIR) {
    getDataDirectory();
  }
  return LOGO_DIR;
}
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

const mimeExtensions = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function ensureLogoDir() {
  const logoDir = getLogoDirectory();
  if (!fsSync.existsSync(logoDir)) {
    fsSync.mkdirSync(logoDir, { recursive: true });
  }
}

function normalizeExtension(originalName, mimeType) {
  const ext = (path.extname(originalName) || "").toLowerCase();
  if (ext) return ext;
  if (mimeType && mimeExtensions[mimeType]) {
    return mimeExtensions[mimeType];
  }
  return ".png";
}

function decodeFilePayload(filePayload) {
  if (!filePayload || !filePayload.data) {
    return null;
  }

  const encoding = filePayload.encoding || "base64";

  try {
    if (encoding === "base64") {
      return Buffer.from(filePayload.data, "base64");
    }
  } catch (error) {
    logger.error("Failed to decode logo payload:", error);
    throw new Error("Logo tidak dapat diproses");
  }

  throw new Error(`Encoding logo tidak didukung: ${encoding}`);
}

function setupSettingsHandlers() {
  // Get settings
  ipcMain.handle("settings:get", async () => {
    try {
      return await loadSettings();
    } catch (error) {
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
      await createBackup("manual", null);
      return true;
    } catch (error) {
      logger.error("Error creating backup:", error);
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
          await fs.copyFile(backupPath, dbConfig.path);
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

  // Upload company logo
  ipcMain.handle("settings:uploadLogo", async (event, filePayload) => {
    try {
      if (!filePayload || !filePayload.data) {
        throw new Error("File logo tidak ditemukan");
      }

      // Validate file type
      if (!mimeExtensions[filePayload.mimeType]) {
        throw new Error("Format logo harus JPG, PNG, atau WebP");
      }

      // Decode and validate file size
      const buffer = decodeFilePayload(filePayload);
      if (!buffer) {
        throw new Error("Logo tidak dapat diproses");
      }

      if (buffer.length > MAX_LOGO_SIZE) {
        throw new Error("Ukuran logo melebihi batas 2MB");
      }

      ensureLogoDir();

      // Always use the same filename for logo (logo.png)
      // This way we can easily replace it
      const logoDir = getLogoDirectory();
      const filename = "logo" + normalizeExtension(filePayload.name || "logo.png", filePayload.mimeType);
      const logoPath = path.join(logoDir, filename);

      // Save the logo
      await fs.writeFile(logoPath, buffer);

      // Get relative path from data directory
      const dataDir = getDataDirectory();
      const relativePath = path
        .relative(dataDir, logoPath)
        .split(path.sep)
        .join("/");

      // Update settings with logo path
      const settingsFile = getSettingsFile();
      let existingSettings = {};
      try {
        const data = await fs.readFile(settingsFile, "utf8");
        existingSettings = JSON.parse(data);
      } catch (error) {
        if (error.code !== "ENOENT") {
          logger.warn("Could not read existing settings");
        }
      }

      existingSettings.logoPath = relativePath;

      await fs.writeFile(
        settingsFile,
        JSON.stringify(existingSettings, null, 2),
      );

      logger.info("Logo uploaded successfully:", relativePath);
      return { success: true, logoPath: relativePath };
    } catch (error) {
      logger.error("Error uploading logo:", error);
      throw error;
    }
  });

  // Get company logo
  ipcMain.handle("settings:getLogo", async (event, logoPath) => {
    try {
      if (!logoPath) return null;

      // Use getDataDir() to ensure consistent path resolution
      const DATA_DIR = getDataDir();
      const logoFilePath = path.join(DATA_DIR, logoPath);

      // Check if file exists
      try {
        await fs.access(logoFilePath);
      } catch {
        return null;
      }

      // Read file as base64
      const buffer = await fs.readFile(logoFilePath);
      const base64 = buffer.toString("base64");
      const mimeType = path.extname(logoPath).toLowerCase() === ".png" ? "image/png" : 
                      path.extname(logoPath).toLowerCase() === ".jpg" || path.extname(logoPath).toLowerCase() === ".jpeg" ? "image/jpeg" : 
                      "image/webp";
      
      return {
        dataUrl: `data:${mimeType};base64,${base64}`,
        path: logoPath,
      };
    } catch (error) {
      logger.error("Error getting logo:", error);
      return null;
    }
  });

  // Delete company logo
  ipcMain.handle("settings:deleteLogo", async () => {
    try {
      const settingsFile = getSettingsFile();
      let existingSettings = {};
      try {
        const data = await fs.readFile(settingsFile, "utf8");
        existingSettings = JSON.parse(data);
      } catch (error) {
        if (error.code !== "ENOENT") {
          logger.warn("Could not read existing settings");
        }
      }

      // Delete logo file if exists
      if (existingSettings.logoPath) {
        const logoPath = path.join(DATA_DIR, existingSettings.logoPath);
        try {
          await fs.unlink(logoPath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            logger.warn("Could not delete logo file:", error);
          }
        }
      }

      // Remove logo path from settings
      delete existingSettings.logoPath;

      await fs.writeFile(
        settingsFile,
        JSON.stringify(existingSettings, null, 2),
      );

      logger.info("Logo deleted successfully");
      return { success: true };
    } catch (error) {
      logger.error("Error deleting logo:", error);
      throw error;
    }
  });
}

module.exports = setupSettingsHandlers;
