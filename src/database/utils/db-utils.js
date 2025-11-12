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
 * Handles BEGIN...END blocks in triggers and procedures
 * @param {string} sqlContent - SQL file content
 * @returns {Array<string>} Array of SQL statements
 */
function parseSqlStatements(sqlContent) {
  const statements = [];
  let currentStatement = "";
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let inCase = false;
  let i = 0;

  while (i < sqlContent.length) {
    const char = sqlContent[i];
    const prevChar = i > 0 ? sqlContent[i - 1] : null;

    // Handle string literals (single and double quotes)
    if ((char === "'" || char === '"') && prevChar !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
      currentStatement += char;
      i++;
      continue;
    }

    // If we're inside a string, just add the character
    if (inString) {
      currentStatement += char;
      i++;
      continue;
    }

    // Track BEGIN/END blocks and CASE/END statements (case-insensitive)
    const remaining = sqlContent.substring(i).toUpperCase();

    // Check for CASE statement
    if (remaining.startsWith("CASE") && !/\w/.test(sqlContent[i + 4] || "")) {
      inCase = true;
      currentStatement += sqlContent.substring(i, i + 4);
      i += 4;
      continue;
    }

    // Check for BEGIN block
    if (remaining.startsWith("BEGIN") && !/\w/.test(sqlContent[i + 5] || "")) {
      depth++;
      currentStatement += sqlContent.substring(i, i + 5);
      i += 5;
      continue;
    }

    // Check for END
    if (remaining.startsWith("END") && !/\w/.test(sqlContent[i + 3] || "")) {
      // If we're inside a CASE statement, close it
      if (inCase) {
        inCase = false;
        currentStatement += sqlContent.substring(i, i + 3);
        i += 3;
        // Check if END is followed by semicolon
        if (sqlContent[i] === ";") {
          currentStatement += ";";
          i++;
        }
        continue;
      }

      // Otherwise, it's closing a BEGIN block
      depth--;
      currentStatement += sqlContent.substring(i, i + 3);
      i += 3;
      // Check if END is followed by semicolon
      if (sqlContent[i] === ";") {
        currentStatement += ";";
        i++;
        // If depth is 0 after closing the block, this semicolon terminates the statement
        if (depth === 0) {
          const trimmed = currentStatement.trim();
          if (trimmed.length > 0) {
            statements.push(trimmed);
          }
          currentStatement = "";
          continue;
        }
      }
      continue;
    }

    // If we encounter a semicolon and we're not in a block, it's a statement terminator
    if (char === ";" && depth === 0) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      currentStatement = "";
      i++;
      continue;
    }

    // Add character to current statement
    currentStatement += char;
    i++;
  }

  // Add any remaining statement
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Execute SQL statements in a transaction
 * @param {Object} dbPromisified - Promisified database object
 * @param {Array<string>} statements - Array of SQL statements
 * @param {Function} onStatement - Optional callback for each statement
 */
async function executeStatements(
  dbPromisified,
  statements,
  onStatement = null,
) {
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
