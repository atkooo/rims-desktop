const fs = require("fs");
const path = require("path");
const { runMigrations } = require("./migrate");
const { runSeeders } = require("./seed");
const dbConfig = require("../main/config/database");
const {
  createDatabaseConnection,
  promisifyDb,
} = require("./utils/db-utils");

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Drop all tables from database (alternative to deleting file)
 * This is safer when file is locked
 */
async function dropAllTables(dbPath) {
  const db = createDatabaseConnection(dbPath);
  const dbPromisified = promisifyDb(db);
  
  try {
    // Wait a bit to ensure connection is ready
    await sleep(200);
    
    // Get all table names (including migrations table)
    let tables = [];
    try {
      tables = await dbPromisified.allAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
    } catch (error) {
      console.warn("⚠️  Could not query tables:", error.message);
      // If query fails, database might be empty or corrupted - that's okay
      return;
    }
    
    // Also get views
    let views = [];
    try {
      views = await dbPromisified.allAsync(
        "SELECT name FROM sqlite_master WHERE type='view'"
      );
    } catch (error) {
      // Ignore view query errors
    }
    
    if (tables.length === 0 && views.length === 0) {
      console.log("ℹ️  Database is empty (no tables or views to drop)");
      return;
    }
    
    console.log(`🗑️  Dropping ${tables.length} table(s) and ${views.length} view(s)...`);
    
    // Disable foreign keys temporarily
    await dbPromisified.runAsync("PRAGMA foreign_keys = OFF");
    
    // Drop all views first (they may depend on tables)
    for (const view of views) {
      try {
        await dbPromisified.runAsync(`DROP VIEW IF EXISTS "${view.name}"`);
        console.log(`   ✓ Dropped view: ${view.name}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not drop view ${view.name}:`, error.message);
      }
    }
    
    // Drop all tables (including migrations to allow re-running)
    for (const table of tables) {
      try {
        await dbPromisified.runAsync(`DROP TABLE IF EXISTS "${table.name}"`);
        console.log(`   ✓ Dropped table: ${table.name}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not drop table ${table.name}:`, error.message);
      }
    }
    
    // Re-enable foreign keys
    await dbPromisified.runAsync("PRAGMA foreign_keys = ON");
    
    console.log("✅ All tables and views dropped successfully");
  } catch (error) {
    console.error("❌ Error dropping tables:", error.message);
    throw error;
  } finally {
    // Close connection properly
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.warn("⚠️  Error closing database connection:", err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    // Wait a bit after closing
    await sleep(200);
  }
}

async function freshDatabase() {
  // Get database path FIRST (this creates directory but NOT the file)
  const dbPath = dbConfig.path;
  
  console.log("🔄 Resetting database...");
  console.log(`📁 Database path: ${dbPath}`);
  
  // Use drop tables method (more reliable than deleting file on Windows)
  if (fs.existsSync(dbPath)) {
    console.log("🔄 Dropping all tables and views...");
    try {
      await dropAllTables(dbPath);
      await sleep(500);
    } catch (error) {
      console.error("❌ Error dropping tables:", error.message);
      console.error("💡 Please manually delete the database file or close all applications");
      throw error;
    }
  } else {
    console.log("ℹ️  Database file does not exist (will be created by migrations)");
  }

  try {
    // Run migrations (will create its own connection and CREATE the database file)
    console.log("\n📦 Running migrations...");
    await runMigrations();
    console.log("✅ Migrations completed");

    // Run seeders (will create its own connection)
    console.log("\n🌱 Running seeders...");
    await runSeeders();
    console.log("✅ Seeders completed");

    console.log("\n🎉 Database reset completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during database reset:", error);
    throw error;
  }
}

// Add main execution if script is run directly
if (require.main === module) {
  freshDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  freshDatabase,
};

