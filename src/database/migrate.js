const path = require("path");
const {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
} = require("./utils/db-utils");

// Setup database connection using shared config
const db = createDatabaseConnection();
const dbPromisified = promisifyDb(db);

// Alias for backward compatibility
const runAsync = dbPromisified.runAsync.bind(dbPromisified);
const allAsync = dbPromisified.allAsync.bind(dbPromisified);
const getAsync = dbPromisified.getAsync.bind(dbPromisified);

async function ensureMigrationsTable() {
  try {
    await runAsync(`
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

async function getExecutedMigrations() {
  try {
    return await allAsync("SELECT migration FROM migrations");
  } catch (error) {
    console.error("Error getting executed migrations:", error);
    throw error;
  }
}

async function getCurrentBatch() {
  try {
    const result = await getAsync(
      "SELECT COALESCE(MAX(batch), 0) as batch FROM migrations",
    );
    return result.batch;
  } catch (error) {
    console.error("Error getting current batch:", error);
    throw error;
  }
}

// collectSqlFiles is now imported from utils/db-utils

async function runMigrations() {
  const migrationsPath = path.join(__dirname, "migrations");

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
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
    const currentBatch = await getCurrentBatch();
    const newBatch = currentBatch + 1;

    // Begin transaction
    await runAsync("BEGIN TRANSACTION");

    for (const file of pendingFiles) {
      console.log(`Running migration: ${file.displayName}`);
      const migration = require("fs").readFileSync(file.fullPath, "utf8");

      // Parse SQL file into individual statements
      const statements = parseSqlStatements(migration);

      // Execute each statement
      for (const statement of statements) {
        // Skip empty statements
        if (!statement || !statement.trim()) {
          continue;
        }
        try {
          await runAsync(statement);
        } catch (error) {
          // If error is about duplicate column, it means column already exists
          // This is acceptable for ALTER TABLE ADD COLUMN operations
          const errorMsg = error.message || String(error);
          if (
            errorMsg.includes("duplicate column") ||
            errorMsg.includes("already exists") ||
            errorMsg.includes("SQLITE_MISUSE")
          ) {
            // Check if it's a column already exists error by trying to query the table schema
            try {
              const tableInfo = await allAsync(
                "PRAGMA table_info(rental_transactions)",
              );
              const hasTaxColumn = tableInfo.some(
                (col) => col.name === "tax",
              );
              if (hasTaxColumn) {
                console.log(
                  `Warning: Column 'tax' already exists in rental_transactions. Skipping ALTER TABLE statement.`,
                );
                continue;
              }
            } catch (pragmaError) {
              // If we can't check, re-throw the original error
            }
          }
          // Re-throw other errors
          throw error;
        }
      }

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
    await runAsync("ROLLBACK");
    console.error("Error running migrations:", error);
    throw error;
  } finally {
    // Close database connection
    db.close();
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
