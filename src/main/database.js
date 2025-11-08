const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dbConfig = require("./config/database");

// Ensure data directory exists
const dataDir = path.dirname(dbConfig.path);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Shared connection for modules that use this file
const db = new sqlite3.Database(dbConfig.path);

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
  // Run incremental migrations (no-op if already up to date)
  const { runMigrations } = require("../database/migrate");
  await runMigrations();

  // Seed only when database is empty (no users yet)
  const exists = await tableExists("users");
  if (!exists) throw new Error("Users table missing after migrations");

  const userCountRow = await getAsync("SELECT COUNT(1) AS count FROM users");
  if (!userCountRow || Number(userCountRow.count) === 0) {
    const { runSeeders } = require("../database/seed");
    await runSeeders();
  }
}

// Note: migrations/seeders are orchestrated by helpers/database.connect()

module.exports = {
  getDb: () => db,
  runAsync,
  getAsync,
  allAsync,
};
