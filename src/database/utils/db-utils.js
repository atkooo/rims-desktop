const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dbConfig = require("../../main/config/database");

/**
 * Shared database utilities for migrations and seeders
 */

// Promisify database operations
function createDatabaseConnection(dbPath = null) {
  const targetPath = dbPath || dbConfig.path;
  const dataDir = path.dirname(targetPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return new sqlite3.Database(targetPath);
}

function promisifyDb(db) {
  return {
    runAsync(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
    },
    
    allAsync(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    },
    
    getAsync(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
  };
}

/**
 * Recursively collect all SQL files from a directory
 * @param {string} dir - Directory path to search
 * @returns {Array<string>} Array of full file paths
 */
function collectSqlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
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

/**
 * Parse SQL file into individual statements
 * @param {string} sqlContent - SQL file content
 * @returns {Array<string>} Array of SQL statements
 */
function parseSqlStatements(sqlContent) {
  return sqlContent
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/**
 * Execute SQL statements in a transaction
 * @param {Object} dbPromisified - Promisified database object
 * @param {Array<string>} statements - Array of SQL statements
 * @param {Function} onStatement - Optional callback for each statement
 */
async function executeStatements(dbPromisified, statements, onStatement = null) {
  for (const statement of statements) {
    if (onStatement) {
      onStatement(statement);
    }
    await dbPromisified.runAsync(statement);
  }
}

module.exports = {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
  executeStatements,
};

