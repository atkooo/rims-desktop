const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const logger = require("./logger");
const dbConfig = require("../config/database");

class Database {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.connectingPromise = null;
  }

  // Koneksi ke database
  async connect() {
    if (this.db) return this.db;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = new Promise((resolve, reject) => {
      const sqliteDb = new sqlite3.Database(dbConfig.path, (err) => {
        if (err) {
          logger.error("Error connecting to database:", err);
          reject(err);
          return;
        }

        logger.info("Connected to database");
        resolve(sqliteDb);
      });

      sqliteDb.run("PRAGMA foreign_keys = ON");
    })
      .then(async (db) => {
        this.db = db;
        await this.ensureSchema();
        return this.db;
      })
      .finally(() => {
        this.connectingPromise = null;
      });

    return this.connectingPromise;
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
      this.db = null;
      this.initialized = false;
    }
  }

  async ensureSchema() {
    if (this.initialized) return;

    try {
      const { runMigrations } = require("../../database/migrate");
      await runMigrations();

      // Seed only if database is empty (no users yet)
      const row = await this.queryOne("SELECT COUNT(1) AS count FROM users");
      if (!row || Number(row.count) === 0) {
        const { runSeeders } = require("../../database/seed");
        await runSeeders();
      }

      this.initialized = true;
      logger.info("Database initialized (migrations + seeders)");
    } catch (error) {
      logger.error("Error initializing database:", error);
      throw error;
    }
  }

  tableExists(tableName) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(Boolean(row));
        },
      );
    });
  }

  execSqlScript(sql, label) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          logger.error(`Error executing ${label} SQL script:`, err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

// Export singleton instance
module.exports = new Database();
