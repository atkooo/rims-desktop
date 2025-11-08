const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dbConfig = require("../main/config/database");

// Setup database connection using shared config
const dataDir = path.dirname(dbConfig.path);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new sqlite3.Database(dbConfig.path);

// Promisify database operations
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function runSeeders() {
  const seedersPath = path.join(__dirname, "seeders");

  try {
    // Begin transaction
    await runAsync("BEGIN TRANSACTION");

    // Get all seeder files
    const files = fs
      .readdirSync(seedersPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      console.log(`Running seeder: ${file}`);
      const filePath = path.join(seedersPath, file);
      const seeder = fs.readFileSync(filePath, "utf8");

      // Split the seeder file into individual statements
      const statements = seeder
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

      // Execute each statement
      for (const statement of statements) {
        await runAsync(statement);
      }

      console.log(`Completed seeder: ${file}`);
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
