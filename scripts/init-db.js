const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

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

async function execSql(db, sql, label) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        console.error(`Error executing ${label}:`, err.message);
        reject(err);
      } else {
        console.log(`[done] Executed ${label}`);
        resolve();
      }
    });
  });
}

async function main() {
  try {
    const dataDir =
      process.env.DATABASE_DIR || path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const dbPath = path.join(dataDir, "rims.db");
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const db = new sqlite3.Database(dbPath);
    console.log(`Created new database at: ${dbPath}`);

    const migrationsDir = path.join(
      __dirname,
      "..",
      "src",
      "database",
      "migrations",
    );
    if (fs.existsSync(migrationsDir)) {
      console.log("\nApplying migrations...");
      const migrationFiles = collectSqlFiles(migrationsDir)
        .map((fullPath) => ({
          name: path.basename(fullPath),
          fullPath,
          displayName: path.relative(migrationsDir, fullPath),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const file of migrationFiles) {
        const sql = fs.readFileSync(file.fullPath, "utf-8");
        await execSql(db, sql, `migration ${file.displayName}`);
      }
      console.log("All migrations applied successfully.");
    } else {
      console.warn("No migrations folder found.");
    }

    const seedersDir = path.join(
      __dirname,
      "..",
      "src",
      "database",
      "seeders",
    );
    if (fs.existsSync(seedersDir)) {
      console.log("\nSeeding initial data...");
      const seederFiles = collectSqlFiles(seedersDir)
        .map((fullPath) => ({
          name: path.basename(fullPath),
          fullPath,
          displayName: path.relative(seedersDir, fullPath),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const file of seederFiles) {
        const sql = fs.readFileSync(file.fullPath, "utf-8");
        await execSql(db, sql, `seeder ${file.displayName}`);
      }
      console.log("All seeders executed successfully.");
    } else {
      console.warn("No seeders folder found.");
    }

    db.close();
    console.log(`\nDatabase successfully initialized at: ${dbPath}`);
  } catch (error) {
    console.error("Error initializing database:", error.message);
    process.exit(1);
  }
}

main();
