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
    this.closingPromise = null;
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
  async query(sql, params = []) {
    if (!this.db) {
      await this.connect();
    }
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
  async queryOne(sql, params = []) {
    if (!this.db) {
      await this.connect();
    }
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
  async execute(sql, params = []) {
    if (!this.db) {
      await this.connect();
    }
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
  async close() {
    if (!this.db) return;
    if (this.closingPromise) return this.closingPromise;

    const dbToClose = this.db;
    this.db = null;
    this.initialized = false;

    this.closingPromise = new Promise((resolve) => {
      dbToClose.close((err) => {
        if (err) {
          logger.error("Error closing database:", err);
        }
        logger.info("Database connection closed");
        this.closingPromise = null;
        resolve();
      });
    });

    return this.closingPromise;
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

  async tableExists(tableName) {
    if (!this.db) {
      await this.connect();
    }
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
        }
      );
    });
  }

  async execSqlScript(sql, label) {
    if (!this.db) {
      await this.connect();
    }
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

  // Transaction helpers
  async beginTransaction() {
    if (!this.db) {
      await this.connect();
    }
    return this.execute("BEGIN TRANSACTION");
  }

  async commit() {
    if (!this.db) {
      await this.connect();
    }
    return this.execute("COMMIT");
  }

  async rollback() {
    if (!this.db) {
      await this.connect();
    }
    return this.execute("ROLLBACK");
  }

  // Execute a function within a transaction
  async transaction(callback) {
    await this.beginTransaction();
    try {
      const result = await callback();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new Database();
