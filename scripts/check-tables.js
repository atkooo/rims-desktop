const sqlite3 = require('sqlite3').verbose();
const dbConfig = require('../src/main/config/database');
const db = new sqlite3.Database(dbConfig.path);

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name in ('stock_movements','payments')", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(rows);
  db.close();
});

