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

function collectSqlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSqlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".sql")) {
      files.push(entryPath);
    }
  }

  return files;
}

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

      // Split the seeder file into individual statements
      const statements = seeder
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

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
