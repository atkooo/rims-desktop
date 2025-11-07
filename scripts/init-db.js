const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Helper function: Execute SQL content
async function execSql(db, sql, label) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        console.error(`❌ Error executing ${label}:`, err.message);
        reject(err);
      } else {
        console.log(`✅ Executed ${label}`);
        resolve();
      }
    });
  });
}

// Main function
async function main() {
  try {
    // Setup paths
    const dataDir =
      process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Create / reset database
    const dbPath = path.join(dataDir, "rims.db");
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const db = new sqlite3.Database(dbPath);
    console.log(`🆕 Created new database at: ${dbPath}`);

    // === Apply Migrations ===
    const migrationsDir = path.join(
      __dirname,
      "..",
      "src",
      "database",
      "migrations"
    );
    if (fs.existsSync(migrationsDir)) {
      console.log("\n📦 Applying migrations...");
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        await execSql(db, sql, `migration ${file}`);
      }
      console.log("✅ All migrations applied successfully.");
    } else {
      console.warn("⚠️ No migrations folder found.");
    }

    // === Apply Seeders ===
    const seedersDir = path.join(__dirname, "..", "src", "database", "seeders");
    if (fs.existsSync(seedersDir)) {
      console.log("\n🌱 Seeding initial data...");
      const seederFiles = fs
        .readdirSync(seedersDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of seederFiles) {
        const sql = fs.readFileSync(path.join(seedersDir, file), "utf-8");
        await execSql(db, sql, `seeder ${file}`);
      }
      console.log("✅ All seeders executed successfully.");
    } else {
      console.warn("⚠️ No seeders folder found.");
    }

    // Close database
    db.close();
    console.log(`\n🎉 Database successfully initialized at: ${dbPath}`);
  } catch (error) {
    console.error("💥 Error initializing database:", error.message);
    process.exit(1);
  }
}

// Run script
main();
