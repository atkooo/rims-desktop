const { app, BrowserWindow, ipcMain } = require('electron');
const { registerAuthIpc } = require('./auth');
const { registerDataIpc } = require('./data-ipc');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }
  
  return mainWindow;
}

// IPC handler untuk focus window
ipcMain.handle('window:focus', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return true;
  }
  return false;
});

app.whenReady().then(() => { registerAuthIpc(); registerDataIpc(); createWindow(); });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
