const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Main function
async function main() {
  try {
    // Setup paths
    const dataDir =
      process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Path database
    const dbPath = path.join(dataDir, "rims.db");
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const db = new sqlite3.Database(dbPath);
    console.log(`Created new database at: ${dbPath}`);

    // Read schema
    const schemaPath = path.join(
      __dirname,
      "..",
      "src",
      "database",
      "schema.sql"
    );
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log("Creating database schema...");
    await new Promise((resolve, reject) => {
      db.exec(schemaSql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log("Schema created successfully");

    // Read seed
    const seedPath = path.join(__dirname, "..", "src", "database", "seed.sql");
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, "utf-8");
      console.log("Seeding database...");
      await new Promise((resolve, reject) => {
        db.exec(seedSql, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log("Database seeded successfully");
    }

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
