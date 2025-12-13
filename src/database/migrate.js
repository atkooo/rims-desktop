const fs = require("fs");
const path = require("path");
const {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
  executeSqlFile,
} = require("./utils/db-utils");

// Create a function to get fresh database connection and promisified methods
// This ensures we always use a fresh connection, especially after restore
function getDbConnection() {
  const db = createDatabaseConnection();
  const dbPromisified = promisifyDb(db);
  return {
    db,
    runAsync: dbPromisified.runAsync.bind(dbPromisified),
    allAsync: dbPromisified.allAsync.bind(dbPromisified),
    getAsync: dbPromisified.getAsync.bind(dbPromisified),
  };
}

async function ensureMigrationsTable(dbOps) {
  try {
    await dbOps.runAsync(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration VARCHAR(255) NOT NULL,
                batch INTEGER NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
  } catch (error) {
    console.error("Error creating migrations table:", error);
    throw error;
  }
}

async function getExecutedMigrations(dbOps) {
  try {
    return await dbOps.allAsync("SELECT migration FROM migrations");
  } catch (error) {
    console.error("Error getting executed migrations:", error);
    throw error;
  }
}

async function getCurrentBatch(dbOps) {
  try {
    const result = await dbOps.getAsync(
      "SELECT COALESCE(MAX(batch), 0) as batch FROM migrations",
    );
    return result.batch;
  } catch (error) {
    console.error("Error getting current batch:", error);
    throw error;
  }
}

// collectSqlFiles is now imported from utils/db-utils

async function runMigrations(providedDb = null) {
  const migrationsPath = path.join(__dirname, "migrations");
  
  // Use provided database connection if available, otherwise create a new one
  // If called from database.js, it should provide its own connection
  let db, runAsync, allAsync, getAsync;
  let shouldClose = true;
  
  if (providedDb) {
    // Use provided connection (from database.js)
    db = providedDb;
    const dbPromisified = promisifyDb(db);
    runAsync = dbPromisified.runAsync.bind(dbPromisified);
    allAsync = dbPromisified.allAsync.bind(dbPromisified);
    getAsync = dbPromisified.getAsync.bind(dbPromisified);
    shouldClose = false; // Don't close connection provided by caller
  } else {
    // Create fresh database connection for each migration run
    // This is important after restore, as the old connection may be invalid
    const connection = getDbConnection();
    db = connection.db;
    runAsync = connection.runAsync;
    allAsync = connection.allAsync;
    getAsync = connection.getAsync;
    shouldClose = true; // Close our own connection
  }
  
  const dbOps = { runAsync, allAsync, getAsync };

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(dbOps);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(dbOps);
    const executedFiles = new Set(executedMigrations.map((m) => m.migration));

    // Get all migration files that haven't been executed (nested folders supported)
    const pendingFiles = collectSqlFiles(migrationsPath)
      .map((fullPath) => ({
        name: path.basename(fullPath),
        fullPath,
        displayName: path.relative(migrationsPath, fullPath),
      }))
      .filter((file) => !executedFiles.has(file.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (pendingFiles.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    // Get current batch number
    const currentBatch = await getCurrentBatch(dbOps);
    const newBatch = currentBatch + 1;

    // Begin transaction
    await runAsync("BEGIN TRANSACTION");

    for (const file of pendingFiles) {
      console.log(`Running migration: ${file.displayName}`);
      
      // Execute SQL file with proper error handling
      // allowDuplicateColumn: true allows ALTER TABLE ADD COLUMN to skip if column already exists
      // allowMissingTable: false ensures tables must exist (for ALTER TABLE migrations)
      await executeSqlFile(
        dbOps,
        file.fullPath,
        {
          maxRetries: 5,
          skipEmpty: true,
          allowDuplicateColumn: true, // Allow skipping if column already exists (for ALTER TABLE migrations)
          allowMissingTable: false, // Tables must exist (for ALTER TABLE migrations)
        },
      );

      // Record the migration
      await runAsync(
        "INSERT INTO migrations (migration, batch) VALUES (?, ?)",
        [file.name, newBatch],
      );

      console.log(`Completed migration: ${file.displayName}`);
    }

    // Commit transaction
    await runAsync("COMMIT");
    console.log(
      `Batch ${newBatch}: ${pendingFiles.length} migrations completed successfully`,
    );
  } catch (error) {
    // Rollback on error
    try {
      await runAsync("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    console.error("Error running migrations:", error);
    throw error;
  } finally {
    // Only close connection if we created it (not when called from database.js)
    // database.js manages its own connection lifecycle
    if (shouldClose) {
      try {
        // Close connection and wait for it to complete
        await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) {
            console.error("Error closing database connection:", err);
              reject(err);
            } else {
              resolve();
          }
          });
        });
      } catch (closeError) {
        console.error("Error closing database:", closeError);
      }
    }
  }
}

// Add main execution if script is run directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  getCurrentBatch,
  getExecutedMigrations,
};
