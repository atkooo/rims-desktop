const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../helpers/logger');

let syncServiceProcess = null;
let syncServiceStatus = {
  running: false,
  port: 3001,
  pid: null,
  startTime: null,
  lastError: null
};

/**
 * Get sync service directory path
 */
function getSyncServicePath() {
  // In development: from RIMS-Desktop/src/main -> ../../rims-sync-service
  // In production: from app root -> ../rims-sync-service or same directory
  const possiblePaths = [
    path.join(__dirname, '../../../rims-sync-service'),
    path.join(process.cwd(), 'rims-sync-service'),
    path.join(path.dirname(process.execPath), 'rims-sync-service'),
  ];

  for (const servicePath of possiblePaths) {
    if (fs.existsSync(servicePath) && fs.existsSync(path.join(servicePath, 'package.json'))) {
      return servicePath;
    }
  }

  return null;
}

/**
 * Start sync service
 * NOTE: This function is disabled. Sync service must be started manually through rims-sync-service application.
 */
async function startSyncService() {
  const error = 'Sync service must be started manually through rims-sync-service application. Please run the rims-sync-service app and start the service from there.';
  logger.warn(error);
  syncServiceStatus.lastError = error;
  return { success: false, error };
  
  // Disabled code - service must be started manually
  /*
  if (syncServiceStatus.running) {
    logger.warn('Sync service is already running');
    return { success: true, message: 'Service already running', status: syncServiceStatus };
  }

  const servicePath = getSyncServicePath();
  if (!servicePath) {
    const error = 'Sync service directory not found. Please ensure rims-sync-service is available.';
    logger.error(error);
    syncServiceStatus.lastError = error;
    return { success: false, error };
  }
  */

  // Check if .env file exists
  const envPath = path.join(servicePath, '.env');
  if (!fs.existsSync(envPath)) {
    const error = 'Sync service .env file not found. Please configure Supabase credentials.';
    logger.error(error);
    syncServiceStatus.lastError = error;
    return { success: false, error };
  }

  try {
    // Start the service
    const isWindows = process.platform === 'win32';
    
    // Try to find node executable
    // In packaged Electron, node might be in the same directory
    let nodeCommand = 'node';
    const possibleNodePaths = [
      process.execPath.replace(/electron\.exe$/i, 'node.exe').replace(/Electron\.app\/Contents\/MacOS\/Electron$/, 'node'),
      path.join(path.dirname(process.execPath), 'node'),
      path.join(path.dirname(process.execPath), 'node.exe'),
    ];
    
    for (const nodePath of possibleNodePaths) {
      if (fs.existsSync(nodePath)) {
        nodeCommand = nodePath;
        break;
      }
    }
    
    // Fallback to 'node' from PATH if not found
    
    // Try to use Electron in headless mode first (better integration)
    // If electron is not available, fall back to node src/index.js
    let electronCommand = null;
    const possibleElectronPaths = [
      path.join(servicePath, 'node_modules', '.bin', isWindows ? 'electron.cmd' : 'electron'),
      path.join(servicePath, 'node_modules', 'electron', 'dist', isWindows ? 'electron.exe' : 'Electron'),
      path.join(__dirname, '../../../rims-sync-service/node_modules/.bin', isWindows ? 'electron.cmd' : 'electron'),
    ];
    
    for (const electronPath of possibleElectronPaths) {
      if (fs.existsSync(electronPath)) {
        electronCommand = electronPath;
        break;
      }
    }
    
    // Use Electron in headless mode if available, otherwise use node
    const command = electronCommand || nodeCommand;
    const args = electronCommand 
      ? ['electron-main.js', '--headless']
      : ['src/index.js'];
    
    syncServiceProcess = spawn(command, args, {
      cwd: servicePath,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        HEADLESS: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
    });

    syncServiceProcess.stdout.on('data', (data) => {
      const output = data.toString();
      logger.info(`[Sync Service] ${output.trim()}`);
    });

    syncServiceProcess.stderr.on('data', (data) => {
      const output = data.toString();
      logger.error(`[Sync Service Error] ${output.trim()}`);
      syncServiceStatus.lastError = output.trim();
    });

    syncServiceProcess.on('error', (error) => {
      logger.error('Failed to start sync service:', error);
      syncServiceStatus.running = false;
      syncServiceStatus.lastError = error.message;
      syncServiceProcess = null;
    });

    syncServiceProcess.on('exit', (code, signal) => {
      logger.info(`Sync service exited with code ${code} and signal ${signal}`);
      syncServiceStatus.running = false;
      syncServiceStatus.pid = null;
      syncServiceProcess = null;
      
      if (code !== 0 && code !== null) {
        syncServiceStatus.lastError = `Service exited with code ${code}`;
      }
    });

    // Wait a bit to see if process starts successfully
    // Check multiple times to ensure process is stable
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
      
      if (syncServiceProcess && !syncServiceProcess.killed && syncServiceProcess.pid) {
        // Process is running, verify it's still alive
        try {
          process.kill(syncServiceProcess.pid, 0); // Signal 0 checks if process exists
          syncServiceStatus.running = true;
          syncServiceStatus.pid = syncServiceProcess.pid;
          syncServiceStatus.startTime = new Date().toISOString();
          syncServiceStatus.lastError = null;
          
          logger.info(`Sync service started successfully (PID: ${syncServiceProcess.pid})`);
          return { 
            success: true, 
            message: 'Sync service started successfully',
            status: { ...syncServiceStatus }
          };
        } catch (e) {
          // Process doesn't exist, continue waiting
          if (attempts >= maxAttempts) {
            break;
          }
        }
      } else {
        // Process not started yet, continue waiting
        if (attempts >= maxAttempts) {
          break;
        }
      }
    }
    
    // If we get here, process didn't start successfully
    const error = syncServiceStatus.lastError || 'Failed to start sync service - process terminated immediately';
    logger.error(error);
    syncServiceStatus.lastError = error;
    syncServiceProcess = null;
    return { success: false, error };
  } catch (error) {
    logger.error('Error starting sync service:', error);
    syncServiceStatus.lastError = error.message;
    return { success: false, error: error.message };
  }
}

/**
 * Stop sync service
 * NOTE: This function is disabled. Sync service must be stopped manually through rims-sync-service application.
 */
async function stopSyncService() {
  const error = 'Sync service must be stopped manually through rims-sync-service application. Please use the rims-sync-service app to stop the service.';
  logger.warn(error);
  return { success: false, error };
  
  // Disabled code - service must be stopped manually
  /*
  if (!syncServiceStatus.running || !syncServiceProcess) {
    logger.warn('Sync service is not running');
    return { success: true, message: 'Service not running', status: syncServiceStatus };
  }
  */

  try {
    // Try graceful shutdown first
    if (process.platform === 'win32') {
      // On Windows, try SIGTERM first, then force kill
      try {
        syncServiceProcess.kill('SIGTERM');
      } catch (e) {
        syncServiceProcess.kill();
      }
    } else {
      syncServiceProcess.kill('SIGTERM');
    }

    // Wait for process to exit
    await new Promise((resolve) => {
      if (!syncServiceProcess) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        // Force kill if still running after 5 seconds
        if (syncServiceProcess && !syncServiceProcess.killed) {
          logger.warn('Force killing sync service');
          try {
            if (process.platform === 'win32') {
              syncServiceProcess.kill();
            } else {
              syncServiceProcess.kill('SIGKILL');
            }
          } catch (e) {
            logger.error('Error force killing sync service:', e);
          }
        }
        resolve();
      }, 5000);

      syncServiceProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    syncServiceStatus.running = false;
    syncServiceStatus.pid = null;
    syncServiceStatus.startTime = null;
    syncServiceProcess = null;

    logger.info('Sync service stopped successfully');
    return { 
      success: true, 
      message: 'Sync service stopped successfully',
      status: { ...syncServiceStatus }
    };
  } catch (error) {
    logger.error('Error stopping sync service:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get sync service status
 */
function getSyncServiceStatus() {
  // Check if process is still alive
  if (syncServiceProcess && syncServiceStatus.running) {
    try {
      // On Windows, check if process exists
      if (process.platform === 'win32') {
        // Try to send signal 0 to check if process exists
        process.kill(syncServiceProcess.pid, 0);
      } else {
        process.kill(syncServiceProcess.pid, 0);
      }
    } catch (error) {
      // Process doesn't exist anymore
      syncServiceStatus.running = false;
      syncServiceStatus.pid = null;
      syncServiceProcess = null;
    }
  }

  return { ...syncServiceStatus };
}

/**
 * Restart sync service
 */
async function restartSyncService() {
  logger.info('Restarting sync service...');
  await stopSyncService();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return await startSyncService();
}

module.exports = {
  startSyncService,
  stopSyncService,
  getSyncServiceStatus,
  restartSyncService,
};

