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

// Main function
async function main() {
  try {
    // Setup paths
    const dataDir =
      process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "rims.db");

    // Backup existing database if exists
    backupDatabase(dbPath);

    // Delete existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create new empty database file
    const newDb = new sqlite3.Database(dbPath);
    newDb.close();

    console.log("Created new database file");
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
