const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Main function
async function main() {
  try {
    // Setup paths
    const dataDir =
      process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create a new database with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dbPath = path.join(dataDir, `rims-${timestamp}.db`);

    // Create new database
    const db = new Database(dbPath, { verbose: console.log });
    console.log(`Created new database at: ${dbPath}`);

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

    // Create symlink to the new database
    const finalPath = path.join(dataDir, "rims.db");
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    fs.renameSync(dbPath, finalPath);
    console.log(`Database has been reset and seeded at: ${finalPath}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
