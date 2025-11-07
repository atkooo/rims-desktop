const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = process.env.DATABASE_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "rims.db");

// Backup existing database if it exists
if (fs.existsSync(dbPath)) {
  const backupDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `rims-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Existing database backed up to: ${backupPath}`);
}

const db = new Database(dbPath);

// Drop existing tables if they exist
console.log("Dropping existing tables...");
try {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    )
    .all();
  for (const table of tables) {
    db.prepare(`DROP TABLE IF EXISTS "${table.name}"`).run();
  }
} catch (err) {
  // If no tables exist, that's fine
  console.log("No existing tables found");
}

// Read and execute schema
const schemaPath = path.join(__dirname, "..", "src", "database", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");
console.log("Creating database schema...");
try {
  db.exec(schemaSql);
} catch (err) {
  console.error("Error executing schema:", err.message);
  process.exit(1);
}

// Read and execute seed
const seedPath = path.join(__dirname, "..", "src", "database", "seed.sql");
const seedSql = fs.readFileSync(seedPath, "utf-8");
console.log("Seeding database...");
db.exec(seedSql);

console.log("Database seeded successfully!");
console.log(`Database location: ${dbPath}`);

// Close the database connection
db.close();
