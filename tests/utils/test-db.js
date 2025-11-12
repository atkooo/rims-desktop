const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { promisifyDb } = require("../../src/database/utils/db-utils");

/**
 * Create a test database instance
 */
async function createTestDb(dbPath = null) {
  const testDbPath = dbPath || path.join(__dirname, "../../data/test/test.db");
  const testDataDir = path.dirname(testDbPath);

  // Ensure test data directory exists
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Remove existing test database with retry logic
  // First, try to close any existing connections by attempting to open and close
  if (fs.existsSync(testDbPath)) {
    try {
      // Try to open and immediately close the database to release any locks
      const tempDb = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (!err) {
          tempDb.close();
        }
      });
      // Give it a moment to close
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Ignore errors here
    }

    let retries = 10;
    let deleted = false;
    while (retries > 0 && !deleted) {
      try {
        // Try to delete the file directly
        // On Windows, we need to ensure all handles are closed
        fs.unlinkSync(testDbPath);
        deleted = true;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'ENOENT') {
          retries--;
          if (retries > 0) {
            // Wait longer before retrying - Windows needs more time
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            // If we can't delete, try to continue anyway - the test might still work
            // This is common on Windows when tests run in parallel
            console.warn(`Warning: Could not delete existing test database at ${testDbPath}, continuing anyway`);
            deleted = true; // Mark as deleted to continue
          }
        } else {
          throw error;
        }
      }
    }
    if (!deleted && fs.existsSync(testDbPath)) {
      console.warn(`Warning: Could not delete test database at ${testDbPath}, it may be locked`);
    }
  }

  const db = new sqlite3.Database(testDbPath);
  const dbPromisified = promisifyDb(db);

  return {
    db,
    ...dbPromisified,
    path: testDbPath,
    close: () => {
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

/**
 * Create a fresh test database with migrations
 */
async function createFreshTestDb(dbPath = null) {
  const testDb = await createTestDb(dbPath);

  try {
    // Run migrations using the test database connection
    const { runMigrations } = require("../../src/database/migrate");
    await runMigrations(testDb.db);
    
    // Return the same connection - don't close it yet
    // The test will use this connection, and it should be closed in afterAll
    return testDb;
  } catch (error) {
    await testDb.close();
    throw error;
  }
}

/**
 * Clean up test database
 */
async function cleanupTestDb(testDb) {
  if (testDb && testDb.close) {
    try {
      await testDb.close();
      // Give database time to fully close - Windows needs more time
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Ignore close errors
    }
  }

  // Also ensure the main database helper is closed
  try {
    const database = require("../../src/main/helpers/database");
    if (database && database.close) {
      await database.close();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    // Ignore errors
  }

  if (testDb && testDb.path && fs.existsSync(testDb.path)) {
    let retries = 10;
    while (retries > 0) {
      try {
        fs.unlinkSync(testDb.path);
        break;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'ENOENT') {
          retries--;
          if (retries > 0) {
            // Wait longer on Windows
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            // Last attempt failed, log warning but don't throw
            // This is acceptable on Windows when tests run in parallel
            console.warn(`Warning: Could not delete test database at ${testDb.path} after retries`);
          }
        } else {
          // For other errors, just log and continue
          console.warn(`Warning: Error deleting test database: ${error.message}`);
          break;
        }
      }
    }
  }
}

/**
 * Execute SQL script on test database
 */
async function executeSqlScript(testDb, sql) {
  return new Promise((resolve, reject) => {
    testDb.db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  createTestDb,
  createFreshTestDb,
  cleanupTestDb,
  executeSqlScript,
};

