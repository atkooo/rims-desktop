const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const database = require("./helpers/database");
const logger = require("./helpers/logger");
const setupItemHandlers = require("./handlers/itemHandlers");
const setupTransactionHandlers = require("./handlers/transactionHandlers");
const setupSettingsHandlers = require("./handlers/settingsHandlers");
const setupCategoryHandlers = require("./handlers/categoryHandlers");
const setupAutoBackup = require("./handlers/autoBackup");
const { registerAuthIpc } = require("./auth");
const { registerDataIpc } = require("./data-ipc");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
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
    mainWindow.loadFile(
      path.join(__dirname, "..", "renderer", "dist", "index.html")
    );
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

  const database = require("./helpers/database");
  try {
    await database.connect();
  } catch (err) {
    console.error("Failed to connect to database", err);
    app.quit();
    return;
  }

  registerAuthIpc();
  registerDataIpc();
  setupAutoBackup();
  setupCategoryHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
