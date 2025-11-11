const fs = require("fs");
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

async function runSeeders() {
  const seedersPath = path.join(__dirname, "seeders");

  try {
    // Begin transaction
    await runAsync("BEGIN TRANSACTION");

    // Get all seeder files (nested structure supported)
    const files = collectSqlFiles(seedersPath)
      .map((fullPath) => ({
        name: path.basename(fullPath),
        fullPath,
        displayName: path.relative(seedersPath, fullPath),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      console.log(`Running seeder: ${file.displayName}`);
      const seeder = fs.readFileSync(file.fullPath, "utf8");

      // Parse SQL file into individual statements
      const statements = parseSqlStatements(seeder);

      // Execute each statement
      for (const statement of statements) {
        await runAsync(statement);
      }

      console.log(`Completed seeder: ${file.displayName}`);
    }

    // Commit transaction
    await runAsync("COMMIT");
    console.log(`All seeders completed successfully`);
  } catch (error) {
    // Rollback on error
    await runAsync("ROLLBACK");
    console.error("Error running seeders:", error);
    throw error;
  } finally {
    // Close database connection
    db.close();
  }
}

// Add main execution if script is run directly
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
