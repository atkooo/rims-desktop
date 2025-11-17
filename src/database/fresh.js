const fs = require("fs");
const path = require("path");
const { runMigrations } = require("./migrate");
const { runSeeders } = require("./seed");
const dbConfig = require("../main/config/database");

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteDatabaseFile(dbPath, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(dbPath)) {
        // Try to close any open connections by attempting to access the file
        // Wait a bit to allow any pending operations to complete
        if (i > 0) {
          console.log(`⏳ Waiting for database to be released (attempt ${i + 1}/${maxRetries})...`);
          await sleep(1000 * i); // Exponential backoff
        }
        
        fs.unlinkSync(dbPath);
        return true;
      }
      return false; // File doesn't exist
    } catch (error) {
      if (error.code === 'EBUSY' && i < maxRetries - 1) {
        // File is locked, wait and retry
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed to delete database file after ${maxRetries} attempts. Please close any applications using the database.`);
}

async function freshDatabase() {
  const dbPath = dbConfig.path;
  
  console.log("🔄 Resetting database...");
  
  // Close any existing connections and delete database file
  try {
    // Check if database file exists
    if (fs.existsSync(dbPath)) {
      console.log(`📁 Deleting existing database: ${dbPath}`);
      await deleteDatabaseFile(dbPath);
      console.log("✅ Database file deleted");
    } else {
      console.log("ℹ️  Database file does not exist, creating new one");
    }
  } catch (error) {
    console.error("❌ Error deleting database file:", error.message);
    console.error("💡 Tip: Make sure no applications are using the database file.");
    throw error;
  }

  try {
    // Run migrations (will create its own connection)
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

