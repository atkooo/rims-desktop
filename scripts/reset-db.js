const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

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

    // Create new database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const db = new sqlite3.Database(dbPath);
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
    db.exec(schemaSql, (err) => {
      if (err) {
        console.error("Error creating schema:", err.message);
        process.exit(1);
      }
      console.log("Schema created successfully");

      // Read and execute seed
      const seedPath = path.join(
        __dirname,
        "..",
        "src",
        "database",
        "seed.sql"
      );
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, "utf-8");
        console.log("Seeding database...");
        db.exec(seedSql, (err) => {
          if (err) {
            console.error("Error seeding database:", err.message);
            process.exit(1);
          }
          console.log("Database seeded successfully");
          db.close();
          console.log(`Database has been reset and seeded at: ${dbPath}`);
        });
      } else {
        db.close();
        console.log(
          `Database has been reset at: ${dbPath} (no seed file found)`
        );
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
