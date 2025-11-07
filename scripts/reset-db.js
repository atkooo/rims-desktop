const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Function to backup existing database
function backupDatabase(dbPath) {
  if (fs.existsSync(dbPath)) {
    const backupDir = path.join(process.cwd(), "data", "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `rims-${timestamp}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Existing database backed up to: ${backupPath}`);
    return true;
  }
  return false;
}

// Function to drop all tables
function dropAllTables(db) {
  const tables = db
    .prepare(
      `
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
    `
    )
    .all();

  for (const table of tables) {
    console.log(`Dropping table: ${table.name}`);
    db.prepare(`DROP TABLE IF EXISTS "${table.name}"`).run();
  }
}

// Main function
function main() {
  try {
    // Setup paths
    const dataDir =
      process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "rims.db");

    // Backup existing database
    const hadExistingDb = backupDatabase(dbPath);

    // Create new database with a temporary name first
    const tempDbPath = `${dbPath}.temp`;
    const db = new Database(tempDbPath);

    // If we succeed in creating the schema and seed, we'll replace the old file
    process.on("exit", () => {
      try {
        if (fs.existsSync(tempDbPath)) {
          if (fs.existsSync(dbPath)) {
            try {
              fs.unlinkSync(dbPath);
            } catch (e) {
              // If we can't delete the old file, try to rename it
              fs.renameSync(dbPath, `${dbPath}.old`);
            }
          }
          fs.renameSync(tempDbPath, dbPath);
        }
      } catch (e) {
        console.error("Error cleaning up:", e.message);
      }
    });
    console.log("Created new database file");

    // Read and execute schema
    const schemaPath = path.join(
      __dirname,
      "..",
      "src",
      "database",
      "schema.sql"
    );
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log("Creating database schema...");
    db.exec(schemaSql);
    console.log("Schema created successfully");

    // Read and execute seed
    const seedPath = path.join(__dirname, "..", "src", "database", "seed.sql");
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    console.log("Seeding database...");
    db.exec(seedSql);
    console.log("Database seeded successfully");

    // Close database connection
    db.close();
    console.log(`Database has been reset and seeded at: ${dbPath}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
