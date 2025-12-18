const fs = require("fs");
const path = require("path");
const {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
  executeSqlFile,
} = require("./utils/db-utils");

// Setup database connection pakai shared config
const db = createDatabaseConnection();
const dbPromisified = promisifyDb(db);

// Alias buat backward compatibility
const runAsync = dbPromisified.runAsync.bind(dbPromisified);

async function runSeeders() {
  const seedersPath = path.join(__dirname, "seeders");

  try {
    // Mulai transaction
    await runAsync("BEGIN TRANSACTION");

    // Ambil semua file seeder (support nested structure)
    const files = collectSqlFiles(seedersPath)
      .map((fullPath) => ({
        name: path.basename(fullPath),
        fullPath,
        displayName: path.relative(seedersPath, fullPath),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      console.log(`Running seeder: ${file.displayName}`);
      
      // Execute file SQL pakai shared helper
      await executeSqlFile(
        dbPromisified,
        file.fullPath,
        {
          maxRetries: 3,
          skipEmpty: true,
          allowDuplicateColumn: false, // Seeders harus fail kalau duplicate
          allowMissingTable: false, // Seeders harus fail kalau tabelnya gak ada
        },
      );

      console.log(`Completed seeder: ${file.displayName}`);
    }

    // Commit transaction
    await runAsync("COMMIT");
    console.log(`All seeders completed successfully`);
  } catch (error) {
    // Rollback kalau ada error
    await runAsync("ROLLBACK");
    console.error("Error running seeders:", error);
    throw error;
  } finally {
    // Tutup database connection
    db.close();
  }
}

// Tambah main execution kalau script di-run langsung
if (require.main === module) {
  runSeeders()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  runSeeders,
};
