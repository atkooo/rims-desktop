const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dataDir = process.env.DATABASE_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "rims.db");
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function tableExists(tableName) {
  return getAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName],
  );
}

async function initializeIfNeeded() {
  const exists = await tableExists("users");
  if (exists) return;

  const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
  const seedPath = path.join(__dirname, "..", "database", "seed.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  const seedSql = fs.readFileSync(seedPath, "utf-8");

  await new Promise((resolve, reject) => {
    db.exec(schemaSql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.exec(seedSql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

initializeIfNeeded().catch((error) => {
  throw error;
});

module.exports = {
  getDb: () => db,
  runAsync,
  getAsync,
  allAsync,
};
