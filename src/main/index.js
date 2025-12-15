// Load environment variables from .env file first
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

/**
 * Get environment mode (development or production)
 */
function getEnvironment() {
  // Check NODE_ENV first (set by scripts) - this is the primary method
  const nodeEnv = process.env.NODE_ENV;
  
  // If NODE_ENV is explicitly set, use it (most reliable)
  if (nodeEnv === "development" || nodeEnv === "production") {
    return nodeEnv;
  }
  
  // Fallback: if app is available and packaged, assume production
  // Otherwise, assume development
  if (app && typeof app.isPackaged === "boolean") {
    return app.isPackaged ? "production" : "development";
  }
  
  // Default to development for safety (prevents accidental production data access)
  return "development";
}

// Get environment early
const environment = getEnvironment();
if (!process.env.NODE_ENV) {
  // Ensure packaged apps report production so activation gating runs
  process.env.NODE_ENV = environment;
}
console.log(`=== ENVIRONMENT: ${environment.toUpperCase()} ===`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);

// Load environment-specific .env file
const envPaths = [];
if (environment === "development") {
  // Development: try .env.development, then .env
  envPaths.push(
    path.join(__dirname, "../../.env.development"),
    path.join(__dirname, "../../.env"),
    path.join(process.cwd(), ".env.development"),
    path.join(process.cwd(), ".env"),
  );
} else {
  // Production: try .env.production, then .env
  // First try userData directory (for packaged apps)
  if (app && typeof app.getPath === "function") {
    envPaths.push(
      path.join(app.getPath("userData"), ".env.production"),
      path.join(app.getPath("userData"), ".env"),
    );
  }
  // Then try app directory
  if (app && typeof app.getAppPath === "function") {
    envPaths.push(
      path.join(path.dirname(app.getAppPath()), ".env.production"),
      path.join(path.dirname(app.getAppPath()), ".env"),
    );
  }
  // Fallback to project root
  envPaths.push(
    path.join(__dirname, "../.env.production"),
    path.join(__dirname, "../.env"),
    path.join(process.cwd(), ".env.production"),
    path.join(process.cwd(), ".env"),
  );
}

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log(`Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log(`No .env file found for ${environment} environment. Using environment variables from system or defaults.`);
  console.log(`Tried paths: ${envPaths.join(", ")}`);
}

const { BrowserWindow, ipcMain, globalShortcut, dialog } = require("electron");
const database = require("./helpers/database");
const logger = require("./helpers/logger");

// Log startup info immediately
logger.info("=== RIMS Desktop Starting ===");
logger.info(`App version: ${app.getVersion()}`);
logger.info(`Electron version: ${process.versions.electron}`);
logger.info(`Node version: ${process.versions.node}`);
logger.info(`Platform: ${process.platform}`);
logger.info(`Architecture: ${process.arch}`);
logger.info(`Is packaged: ${app.isPackaged}`);
if (app.isPackaged) {
  logger.info(`App path: ${app.getAppPath()}`);
  logger.info(`User data path: ${app.getPath("userData")}`);
  logger.info(`Log directory: ${require("path").join(app.getPath("userData"), "logs")}`);
}
const setupItemHandlers = require("./handlers/itemHandlers");
const setupAccessoryHandlers = require("./handlers/accessoryHandlers");
const setupBundleHandlers = require("./handlers/bundleHandlers");
const setupCustomerHandlers = require("./handlers/customerHandlers");
const { setupTransactionHandlers } = require("./handlers/transactionHandlers");
const { setupPaymentHandlers } = require("./handlers/paymentHandlers");
const { setupStockMovementHandlers } = require("./handlers/stockMovementHandlers");
const { setupStockReceiptHandlers } = require("./handlers/stockReceiptHandlers");
const { setupStockRepairHandlers } = require("./handlers/stockRepairHandlers");
const { setupStockAdjustmentHandlers } = require("./handlers/stockAdjustmentHandlers");
const setupSettingsHandlers = require("./handlers/settingsHandlers");
const setupCategoryHandlers = require("./handlers/categoryHandlers");
const setupItemSizeHandlers = require("./handlers/itemSizeHandlers");
const setupMasterDataViewHandlers = require("./handlers/masterDataViewHandlers");
const setupTransactionViewHandlers = require("./handlers/transactionViewHandlers");
const setupReportViewHandlers = require("./handlers/reportViewHandlers");
const setupReportExportHandlers = require("./handlers/reportExportHandlers");
const setupStockAlertHandlers = require("./handlers/stockAlertHandlers");
const setupCashierHandlers = require("./handlers/cashierHandlers");
const setupDiscountGroupHandlers = require("./handlers/discountGroupHandlers");
const setupReceiptHandlers = require("./handlers/receiptHandlers");
const setupUserHandlers = require("./handlers/userHandlers");
const setupAutoBackup = require("./handlers/autoBackup");
const setupActivationHandlers = require("./handlers/activationHandlers");
const { setupSyncHandlers } = require("./handlers/syncHandlers");
const { registerAuthIpc } = require("./auth");
const { registerDataIpc } = require("./data-ipc");
const activationService = require("./services/activation");

let mainWindow = null;

function createWindow() {
  // Resolve preload path - use app.getAppPath() in production for correct path
  let preloadPath = path.join(__dirname, "preload.js");
  if (app.isPackaged) {
    const appPath = app.getAppPath();
    const altPreloadPath = path.join(appPath, "src", "main", "preload.js");
    if (fs.existsSync(altPreloadPath)) {
      preloadPath = altPreloadPath;
      logger.info(`Using preload from: ${preloadPath}`);
    } else if (!fs.existsSync(preloadPath)) {
      logger.warn(`Preload not found at: ${preloadPath}, trying: ${altPreloadPath}`);
      preloadPath = altPreloadPath;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 800,
    // Window is not resizable. Default/min stays.
    minWidth: 1440,
    minHeight: 800,
    resizable: false,
    maximizable: false,
    fullscreenable: true,
    fullscreen: false,
    show: false, // Don't show until ready
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      plugins: true, // Enable plugins for PDF support
    },
  });

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      logger.info("Window shown");
    }
  });

  // Error handling for window
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    logger.error(`Failed to load: ${errorCode} - ${errorDescription}`);
    logger.error(`URL: ${validatedURL}`);
    // Show error message to user
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show(); // Show window even if load failed
    }
  });

  mainWindow.webContents.on("crashed", (event, killed) => {
    logger.error(`Renderer process crashed. Killed: ${killed}`);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("console-message", (event) => {
    const message = typeof event?.message === "string" ? event.message : "";

    if (message.includes("Autofill")) {
      event.preventDefault();
    }
  });

  // Use app.isPackaged to detect production (more reliable than NODE_ENV)
  const isDevelopment = process.env.NODE_ENV === "development" && !app.isPackaged;
  
  if (isDevelopment) {
    // Development mode: load from Vite dev server
    logger.info("Development mode - Loading from http://localhost:5173");
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.once("dom-ready", () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
    });
  } else {
    // Production mode: load from dist/renderer
    // app.getAppPath() returns the correct path in both dev and packaged app
    // In packaged app with asar, it points to app.asar directory
    const appPath = app.getAppPath();
    
    // Log for debugging
    logger.info("Production mode - Loading index.html");
    logger.info(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
    logger.info(`Is packaged: ${app.isPackaged}`);
    logger.info(`App path: ${appPath}`);
    logger.info(`__dirname: ${__dirname}`);
    logger.info(`process.resourcesPath: ${process.resourcesPath}`);
    
    // Try multiple path strategies for different packaging scenarios
    const pathStrategies = [
      // Strategy 1: Relative to app path (standard for asar)
      // app.getAppPath() in packaged app returns path to app.asar
      path.join(appPath, "dist", "renderer", "index.html"),
      // Strategy 2: Relative to __dirname (if main is in src/main within asar)
      path.join(__dirname, "..", "..", "dist", "renderer", "index.html"),
      // Strategy 3: Using resourcesPath (for some packaging scenarios)
      process.resourcesPath ? path.join(process.resourcesPath, "app.asar", "dist", "renderer", "index.html") : null,
    ].filter(Boolean); // Remove null values
    
    logger.info(`Trying paths: ${pathStrategies.join(", ")}`);
    
    // Check if any of the paths exist before attempting to load
    const existingPath = pathStrategies.find((tryPath) => fs.existsSync(tryPath));
    
    if (!existingPath && !app.isPackaged) {
      // If not packaged and dist/renderer doesn't exist, show helpful error
      logger.error("================================================");
      logger.error("ERROR: dist/renderer/index.html not found!");
      logger.error("Please run 'npm run build' first before using 'npm start'");
      logger.error("Or use 'npm run dev' for development mode");
      logger.error("================================================");
    }
    
    // Try to load using async function to handle multiple attempts
    async function tryLoadIndex() {
      for (let i = 0; i < pathStrategies.length; i++) {
        const tryPath = pathStrategies[i];
        logger.info(`Attempt ${i + 1}/${pathStrategies.length}: Loading from ${tryPath}`);
        
        // Check if file exists before attempting to load
        if (!fs.existsSync(tryPath)) {
          logger.warn(`Path does not exist: ${tryPath}`);
          if (i === pathStrategies.length - 1) {
            // Last attempt - all paths don't exist
            logger.error("All path attempts failed - dist/renderer/index.html not found");
            if (!app.isPackaged) {
              logger.error("For development, use: npm run dev");
              logger.error("For production, first run: npm run build");
            }
            // Show window even if loading failed so user can see something
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
            }
          }
          continue;
        }
        
        try {
          await mainWindow.loadFile(tryPath);
          logger.info(`Successfully loaded index.html from: ${tryPath}`);
          return; // Success, exit function
        } catch (err) {
          logger.error(`Failed to load from: ${tryPath}`, err.message);
          if (i === pathStrategies.length - 1) {
            // Last attempt failed
            logger.error("All path attempts failed. Window will be shown anyway.");
            // Show window even if loading failed so user can see something
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
            }
          }
        }
      }
    }
    
    // Start loading
    tryLoadIndex().catch((err) => {
      logger.error("Unexpected error during load attempts:", err);
      // Ensure window is shown
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    });
  }

  return mainWindow;
}

ipcMain.handle("window:focus", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return true;
  }
  return false;
});

// Handler to get log directory path
ipcMain.handle("app:getLogPath", () => {
  try {
    const logDir = require("path").join(app.getPath("userData"), "logs");
    return { success: true, path: logDir };
  } catch (error) {
    logger.error("Error getting log path:", error);
    return { success: false, error: error.message };
  }
});

// Handler to open log directory in file explorer
ipcMain.handle("app:openLogDirectory", () => {
  try {
    const { shell } = require("electron");
    const logDir = require("path").join(app.getPath("userData"), "logs");
    shell.openPath(logDir);
    logger.info(`Opened log directory: ${logDir}`);
    return { success: true, path: logDir };
  } catch (error) {
    logger.error("Error opening log directory:", error);
    return { success: false, error: error.message };
  }
});

// Handler for file dialog
ipcMain.handle("dialog:showOpenDialog", async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  } catch (error) {
    logger.error("Error showing open dialog:", error);
    throw error;
  }
});

app.whenReady().then(async () => {
  if (process.env.NODE_ENV === "development") {
    try {
      const {
        default: installExtension,
        VUEJS3_DEVTOOLS,
      } = require("electron-devtools-installer");
      await installExtension(VUEJS3_DEVTOOLS);
    } catch (error) {
      app.emit("devtools-install-failed", error);
    }
  }

  try {
    await database.connect();
  } catch (err) {
    logger.error("Failed to connect to database", err);
    app.quit();
    return;
  }

  // Setup activation handlers first
  setupActivationHandlers();

  // Check activation status before proceeding
  try {
    // Check if sync/activation is enabled
    const enableSyncAndActivation = process.env.ENABLE_SYNC_AND_ACTIVATION;
    const isEnabled = process.env.NODE_ENV === "production" || 
                     enableSyncAndActivation === "true" || 
                     enableSyncAndActivation === "1";
    
    if (!isEnabled && process.env.NODE_ENV === "development") {
      logger.info("Sync/Activation disabled in development - skipping activation check");
    } else {
      const activationStatus = await activationService.checkActivationStatus();
      
      // If not active and not offline, don't create window
      // The activation screen will handle this in the router guard
      if (!activationStatus.isActive && !activationStatus.offline) {
        logger.warn(
          `Application not activated for machine: ${activationStatus.machineId}`,
        );
        // Still create window - router guard will redirect to activation screen
      } else if (activationStatus.offline) {
        logger.warn(
          "Cannot connect to activation server. Running in offline mode.",
        );
      } else {
        logger.info("Application activated successfully");
      }

      // Start periodic activation check only if enabled
      if (isEnabled) {
        activationService.startPeriodicCheck((status) => {
          // If status changed to inactive and not offline, can send event to renderer
          if (!status.isActive && !status.offline && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("activation:statusChanged", status);
          }
        });
      }
    }
  } catch (error) {
    logger.error("Error during activation check:", error);
    // Continue anyway - graceful degradation
    // Router guard will handle the activation check
  }

  registerAuthIpc();
  registerDataIpc();
  setupAutoBackup();
  setupCategoryHandlers();
  setupItemSizeHandlers();
  setupItemHandlers();
  setupAccessoryHandlers();
  setupBundleHandlers();
  setupCustomerHandlers();
  setupTransactionHandlers();
  setupPaymentHandlers();
  setupStockMovementHandlers();
  setupStockReceiptHandlers();
  setupStockRepairHandlers();
  setupStockAdjustmentHandlers();
  setupSettingsHandlers();
  setupMasterDataViewHandlers();
  setupTransactionViewHandlers();
  setupReportViewHandlers();
  setupReportExportHandlers();
  setupStockAlertHandlers();
  setupCashierHandlers();
  setupDiscountGroupHandlers();
  setupReceiptHandlers();
  setupUserHandlers();
  setupSyncHandlers();
  
  // Sync service must be started manually through rims-sync-service application
  // RIMS-Desktop will only check status and communicate with the service if it's running
  logger.info('Sync service must be started manually through rims-sync-service application');
  
  // Setup auto sync
  const autoSyncService = require('./services/autoSyncService');
  autoSyncService.startAutoSync().catch((error) => {
    logger.error('Error starting auto sync:', error);
  });
  
  createWindow();

  // Global shortcuts to toggle/exit fullscreen
  try {
    globalShortcut.register("F11", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const isFS = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFS);
    });
    // Allow Esc to exit fullscreen
    globalShortcut.register("Esc", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    });
  } catch (_) {
    // ignore registration errors
  }
});

app.on("window-all-closed", () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  // Stop sync service when app is closing
  try {
    const syncServiceManager = require('./services/syncServiceManager');
    const status = syncServiceManager.getSyncServiceStatus();
    if (status.running) {
      logger.info('Stopping sync service before app quit...');
      const result = await syncServiceManager.stopSyncService();
      if (result.success) {
        logger.info('Sync service stopped successfully');
      } else {
        logger.warn('Failed to stop sync service:', result.error);
      }
    }
  } catch (error) {
    logger.error('Error stopping sync service on quit:', error);
    // Don't block app quit, but try to kill the process anyway
    try {
      const syncServiceManager = require('./services/syncServiceManager');
      await syncServiceManager.stopSyncService();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("will-quit", async (event) => {
  try {
    // Unregister global shortcuts
    globalShortcut.unregisterAll();
  } catch (_) {}
  
  // Stop periodic activation check
  try {
    activationService.stopPeriodicCheck();
  } catch (error) {
    logger.error("Error stopping periodic activation check:", error);
  }
  
  // Close database connection
  try {
    if (database) {
      await database.close();
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
  
  // Force exit in development to ensure all processes stop
  if (process.env.NODE_ENV === "development") {
    process.exit(0);
  }
});
