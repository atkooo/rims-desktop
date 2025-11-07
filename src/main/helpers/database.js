const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const logger = require("./logger");
const dbConfig = require("../config/database");

const SCHEMA_PATH = path.join(__dirname, "..", "..", "database", "schema.sql");
const SEED_PATH = path.join(__dirname, "..", "..", "database", "seed.sql");

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

    const tableExists = await this.tableExists("users");
    if (tableExists) {
      this.initialized = true;
      return;
    }

    try {
      const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf-8");
      await this.execSqlScript(schemaSql, "schema");

      if (fs.existsSync(SEED_PATH)) {
        const seedSql = fs.readFileSync(SEED_PATH, "utf-8");
        await this.execSqlScript(seedSql, "seed");
      }

      this.initialized = true;
      logger.info("Database schema initialized");
    } catch (error) {
      logger.error("Error initializing database schema:", error);
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
