const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dbConfig = require("../main/config/database");

// Setup database connection using shared config
const dataDir = path.dirname(dbConfig.path);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new sqlite3.Database(dbConfig.path);

// Promisify database operations
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

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

async function runMigrations() {
  const migrationsPath = path.join(__dirname, "migrations");

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    const executedFiles = new Set(executedMigrations.map((m) => m.migration));

    // Get all migration files that haven't been executed
    const pendingFiles = fs
      .readdirSync(migrationsPath)
      .filter((file) => file.endsWith(".sql"))
      .filter((file) => !executedFiles.has(file))
      .sort();

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
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsPath, file);
      const migration = fs.readFileSync(filePath, "utf8");

      // Split the migration file into individual statements
      const statements = migration
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

      // Execute each statement
      for (const statement of statements) {
        await runAsync(statement);
      }

      // Record the migration
      await runAsync(
        "INSERT INTO migrations (migration, batch) VALUES (?, ?)",
        [file, newBatch],
      );

      console.log(`Completed migration: ${file}`);
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
