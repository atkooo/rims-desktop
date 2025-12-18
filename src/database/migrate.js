const fs = require("fs");
const path = require("path");
const {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
  executeSqlFile,
} = require("./utils/db-utils");

// Buat fungsi buat dapetin database connection yang fresh sama method yang di-promisify
// Ini memastikan kita selalu pakai connection yang fresh, terutama setelah restore
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

// collectSqlFiles sekarang di-import dari utils/db-utils

async function runMigrations(providedDb = null) {
  const migrationsPath = path.join(__dirname, "migrations");
  
  // Pakai database connection yang disediakan kalau ada, kalau gak bikin yang baru
  // Kalau dipanggil dari database.js, harus provide connection sendiri
  let db, runAsync, allAsync, getAsync;
  let shouldClose = true;
  
  if (providedDb) {
    // Pakai connection yang disediakan (dari database.js)
    db = providedDb;
    const dbPromisified = promisifyDb(db);
    runAsync = dbPromisified.runAsync.bind(dbPromisified);
    allAsync = dbPromisified.allAsync.bind(dbPromisified);
    getAsync = dbPromisified.getAsync.bind(dbPromisified);
    shouldClose = false; // Jangan tutup connection yang disediakan caller
  } else {
    // Bikin database connection yang fresh buat setiap migration run
    // Ini penting setelah restore, karena connection lama mungkin udah invalid
    const connection = getDbConnection();
    db = connection.db;
    runAsync = connection.runAsync;
    allAsync = connection.allAsync;
    getAsync = connection.getAsync;
    shouldClose = true; // Tutup connection kita sendiri
  }
  
  const dbOps = { runAsync, allAsync, getAsync };

  try {
    // Pastikan tabel migrations ada
    await ensureMigrationsTable(dbOps);

    // Ambil migrations yang udah di-execute
    const executedMigrations = await getExecutedMigrations(dbOps);
    const executedFiles = new Set(executedMigrations.map((m) => m.migration));

    // Ambil semua file migration yang belum di-execute (support nested folders)
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

    // Ambil nomor batch sekarang
    const currentBatch = await getCurrentBatch(dbOps);
    const newBatch = currentBatch + 1;

    // Mulai transaction
    await runAsync("BEGIN TRANSACTION");

    for (const file of pendingFiles) {
      console.log(`Running migration: ${file.displayName}`);
      
      // Execute file SQL dengan error handling yang proper
      // allowDuplicateColumn: true allow ALTER TABLE ADD COLUMN buat skip kalau kolomnya udah ada
      // allowMissingTable: false memastikan tabel harus ada (buat ALTER TABLE migrations)
      await executeSqlFile(
        dbOps,
        file.fullPath,
        {
          maxRetries: 5,
          skipEmpty: true,
          allowDuplicateColumn: true, // Allow skip kalau kolomnya udah ada (buat ALTER TABLE migrations)
          allowMissingTable: false, // Tabel harus ada (buat ALTER TABLE migrations)
        },
      );

      // Record migration-nya
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
    // Rollback kalau ada error
    try {
      await runAsync("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    console.error("Error running migrations:", error);
    throw error;
  } finally {
    // Cuma tutup connection kalau kita yang bikin (bukan kalau dipanggil dari database.js)
    // database.js manage lifecycle connection sendiri
    if (shouldClose) {
      try {
        // Tutup connection sama tunggu sampai selesai
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

// Tambah main execution kalau script di-run langsung
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
