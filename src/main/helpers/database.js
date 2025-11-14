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
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    
    // If already connected, return the connection
    if (this.db) return this.db;
    
    // If already connecting, wait for that connection
    if (this.connectingPromise) return this.connectingPromise;

    // Log database path before connecting
    logger.info(`Attempting to connect to database at: ${dbConfig.path}`);
    
    // Ensure directory exists
    const dbDir = path.dirname(dbConfig.path);
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Database directory ensured: ${dbDir}`);
    } catch (dirErr) {
      logger.error(`Failed to create database directory: ${dbDir}`, dirErr);
    }

    this.connectingPromise = new Promise((resolve, reject) => {
      const sqliteDb = new sqlite3.Database(dbConfig.path, (err) => {
        if (err) {
          logger.error("Error connecting to database:", err);
          logger.error(`Database path attempted: ${dbConfig.path}`);
          logger.error(`Directory exists: ${fs.existsSync(dbDir)}`);
          logger.error(`File exists: ${fs.existsSync(dbConfig.path)}`);
          reject(err);
          return;
        }

        logger.info(`Successfully connected to database at: ${dbConfig.path}`);
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
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database connection is not available"));
        return;
      }
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
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database connection is not available"));
        return;
      }
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
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database connection is not available"));
        return;
      }
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
    if (!this.db) {
      // If already closed or closing, wait for close to complete
      if (this.closingPromise) {
        return this.closingPromise;
      }
      return;
    }
    
    // If already closing, wait for it
    if (this.closingPromise) {
      return this.closingPromise;
    }

    const dbToClose = this.db;
    
    // Don't set this.db to null yet - wait until close completes
    // This prevents race conditions where other operations might try to use the db
    
    this.closingPromise = new Promise((resolve) => {
      dbToClose.close((err) => {
        if (err) {
          logger.error("Error closing database:", err);
        } else {
          logger.info("Database connection closed");
        }
        // Now we can safely set db to null
        this.db = null;
        this.initialized = false;
        this.closingPromise = null;
        resolve();
      });
    });

    return this.closingPromise;
  }

  async ensureSchema() {
    if (this.initialized) return;

    try {
      // Ensure we have a database connection before running migrations
      if (!this.db) {
        throw new Error("Database connection is not available for migrations");
      }
      
      const { runMigrations } = require("../../database/migrate");
      // Pass our database connection to runMigrations so it uses the same connection
      // This prevents issues with multiple connections and ensures consistency
      await runMigrations(this.db);

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

  // Reset initialized flag (useful after restore)
  resetInitialized() {
    this.initialized = false;
    logger.info("Database initialized flag reset");
  }

  async tableExists(tableName) {
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database connection is not available"));
        return;
      }
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

  async execSqlScript(sql, label) {
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database connection is not available"));
        return;
      }
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
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return this.execute("BEGIN TRANSACTION");
  }

  async commit() {
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
    if (!this.db) {
      await this.connect();
    }
    return this.execute("COMMIT");
  }

  async rollback() {
    // Wait for any closing operation to complete first
    if (this.closingPromise) {
      await this.closingPromise;
    }
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
