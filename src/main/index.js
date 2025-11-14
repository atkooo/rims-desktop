// Load environment variables from .env file first
const path = require("path");
const fs = require("fs");
// Try multiple paths: development (from src/main) and production (from app root)
const envPaths = [
  path.join(__dirname, "../../.env"), // Development: src/main -> root
  path.join(__dirname, "../.env"), // Production: might be in app folder
  path.join(process.cwd(), ".env"), // Current working directory
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log(`Loaded .env from: ${envPath}`);
    break;
  }
}

const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const database = require("./helpers/database");
const logger = require("./helpers/logger");
const setupItemHandlers = require("./handlers/itemHandlers");
const setupAccessoryHandlers = require("./handlers/accessoryHandlers");
const setupBundleHandlers = require("./handlers/bundleHandlers");
const setupCustomerHandlers = require("./handlers/customerHandlers");
const {
  setupTransactionHandlers,
  setupPaymentHandlers,
  setupStockMovementHandlers,
} = require("./handlers/transactionHandlers");
const setupSettingsHandlers = require("./handlers/settingsHandlers");
const setupCategoryHandlers = require("./handlers/categoryHandlers");
const setupItemSizeHandlers = require("./handlers/itemSizeHandlers");
const setupReportHandlers = require("./handlers/reportHandlers");
const setupMasterDataViewHandlers = require("./handlers/masterDataViewHandlers");
const setupTransactionViewHandlers = require("./handlers/transactionViewHandlers");
const setupCashierHandlers = require("./handlers/cashierHandlers");
const setupDiscountGroupHandlers = require("./handlers/discountGroupHandlers");
const setupReceiptHandlers = require("./handlers/receiptHandlers");
const setupRoleHandlers = require("./handlers/roleHandlers");
const setupUserHandlers = require("./handlers/userHandlers");
const setupAutoBackup = require("./handlers/autoBackup");
const setupActivationHandlers = require("./handlers/activationHandlers");
const { registerAuthIpc } = require("./auth");
const { registerDataIpc } = require("./data-ipc");
const activationService = require("./services/activation");

let mainWindow = null;

function createWindow() {
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
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      plugins: true, // Enable plugins for PDF support
    },
  });

  mainWindow.webContents.on("console-message", (event) => {
    const message = typeof event?.message === "string" ? event.message : "";

    if (message.includes("Autofill")) {
      event.preventDefault();
    }
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.once("dom-ready", () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
    });
  } else {
    // In production, load from dist/renderer (relative to project root)
    const indexPath = path.join(__dirname, "..", "..", "dist", "renderer", "index.html");
    mainWindow.loadFile(indexPath);
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

    // Start periodic activation check
    activationService.startPeriodicCheck((status) => {
      // If status changed to inactive and not offline, can send event to renderer
      if (!status.isActive && !status.offline && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("activation:statusChanged", status);
      }
    });
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
  setupSettingsHandlers();
  setupReportHandlers();
  setupMasterDataViewHandlers();
  setupTransactionViewHandlers();
  setupCashierHandlers();
  setupDiscountGroupHandlers();
  setupReceiptHandlers();
  setupRoleHandlers();
  setupUserHandlers();
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
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("will-quit", () => {
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
  // Stop periodic activation check
  try {
    activationService.stopPeriodicCheck();
  } catch (error) {
    logger.error("Error stopping periodic activation check:", error);
  }
});
