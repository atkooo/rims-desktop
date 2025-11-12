const path = require("path");
const fs = require("fs");

// Set test environment variables
process.env.NODE_ENV = "test";

// Create test data directory
const testDataDir = path.join(__dirname, "..", "data", "test");
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Create test database path
const testDbPath = path.join(testDataDir, "test.db");

// Mock Electron ipcMain for handlers
const mockIpcMain = {
  handlers: new Map(),
  handle: jest.fn((channel, handler) => {
    mockIpcMain.handlers.set(channel, handler);
  }),
  invoke: jest.fn(async (channel, ...args) => {
    const handler = mockIpcMain.handlers.get(channel);
    if (handler) {
      return await handler({}, ...args);
    }
    throw new Error(`No handler found for channel: ${channel}`);
  }),
};

// Mock Electron module
jest.mock("electron", () => {
  const path = require("path");
  return {
    ipcMain: mockIpcMain,
    app: {
      getPath: jest.fn((name) => {
        if (name === "userData") {
          return path.join(__dirname, "..", "data", "test");
        }
        return path.join(__dirname, "..", "data", "test", name);
      }),
    },
  };
});

// Mock logger to prevent log file creation during tests
jest.mock("../src/main/helpers/logger", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return mockLogger;
});

// Global test utilities
global.testDbPath = testDbPath;
global.mockIpcMain = mockIpcMain;

// Cleanup function
afterAll(async () => {
  // Close all database connections
  const database = require("../src/main/helpers/database");
  try {
    await database.close();
  } catch (error) {
    // Ignore errors during cleanup
  }
  
  // Clean up test database if needed with retry logic
  if (fs.existsSync(testDbPath)) {
    let retries = 3;
    while (retries > 0) {
      try {
        fs.unlinkSync(testDbPath);
        break;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'ENOENT') {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } else {
          // For other errors, just break
          break;
        }
      }
    }
  }
});

