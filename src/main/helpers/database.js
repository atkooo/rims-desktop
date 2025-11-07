const sqlite3 = require("sqlite3");
const logger = require("./logger");
const dbConfig = require("../config/database");

class Database {
  constructor() {
    this.db = null;
  }

  // Koneksi ke database
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbConfig.path, (err) => {
        if (err) {
          logger.error("Error connecting to database:", err);
          reject(err);
          return;
        }
        logger.info("Connected to database");
        resolve(this.db);
      });

      // Set pragma foreign keys
      this.db.run("PRAGMA foreign_keys = ON");
    });
  }

  // Query dengan Promise
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error("Error executing query:", { sql, error: err });
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  // Single result query
  queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error("Error executing query:", { sql, error: err });
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  // Execute query (insert, update, delete)
  execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error("Error executing statement:", { sql, error: err });
          reject(err);
          return;
        }
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // Close connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error("Error closing database:", err);
        }
        logger.info("Database connection closed");
      });
    }
  }
}

// Export singleton instance
module.exports = new Database();
