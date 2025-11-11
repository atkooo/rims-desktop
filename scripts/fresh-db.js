const fs = require("fs");
const path = require("path");
const {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
} = require("../src/database/utils/db-utils");

// Main function
async function main() {
  try {
    console.log("Starting fresh database setup...\n");

    // Setup paths
    const dataDir = process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "rims.db");

    // Delete existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create new database connection
    const sqlite3 = require("sqlite3").verbose();
    const db = new sqlite3.Database(dbPath);
    const dbPromisified = promisifyDb(db);
    const runAsync = dbPromisified.runAsync.bind(dbPromisified);
    const getAsync = dbPromisified.getAsync.bind(dbPromisified);

    // Enable foreign keys
    await runAsync("PRAGMA foreign_keys = ON");

    // Run migrations
    const migrationsDir = path.join(__dirname, "..", "src", "database", "migrations");
    if (fs.existsSync(migrationsDir)) {
      console.log("Applying migrations...\n");
      const migrationFiles = collectSqlFiles(migrationsDir)
        .map((fullPath) => ({
          name: path.basename(fullPath),
          fullPath,
          displayName: path.relative(migrationsDir, fullPath),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const file of migrationFiles) {
        console.log(`Running: ${file.displayName}`);
        const sql = fs.readFileSync(file.fullPath, "utf-8");
        const statements = parseSqlStatements(sql);
        
        for (const statement of statements) {
          if (statement.trim()) {
            await runAsync(statement);
          }
        }
      }
      console.log("\nAll migrations applied successfully.");
    } else {
      console.warn("No migrations folder found.");
    }

    // Verify database
    try {
      const result = await getAsync("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
      console.log(`\nDatabase created: ${result.count} tables`);
    } catch (err) {
      console.error("Error verifying database:", err);
    }

    db.close();
    console.log(`\nDatabase location: ${dbPath}`);
    console.log("Fresh database setup completed!");
  } catch (error) {
    console.error("Error setting up fresh database:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

