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
      // Safety check: never execute empty SQL statements
      const trimmedSql = sql ? String(sql).trim() : '';
      if (!trimmedSql || trimmedSql.length === 0) {
        return Promise.resolve({ lastID: 0, changes: 0 });
      }
      
      return new Promise((resolve, reject) => {
        db.run(trimmedSql, params, function (err) {
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

/**
 * Execute SQL file with retry logic and error handling
 * @param {Object} dbOps - Database operations object with runAsync, allAsync, getAsync
 * @param {string} filePath - Path to SQL file
 * @param {Object} options - Options for execution
 * @param {number} options.maxRetries - Maximum retries for SQLITE_BUSY errors (default: 5)
 * @param {boolean} options.skipEmpty - Skip empty statements (default: true)
 * @param {boolean} options.allowDuplicateColumn - Allow duplicate column errors (default: true)
 * @param {boolean} options.allowMissingTable - Allow missing table errors (default: false)
 * @returns {Promise<void>}
 */
async function executeSqlFile(dbOps, filePath, options = {}) {
  const {
    maxRetries = 5,
    skipEmpty = true,
    allowDuplicateColumn = true,
    allowMissingTable = false,
  } = options;

  const sqlContent = fs.readFileSync(filePath, "utf8");
  const statements = parseSqlStatements(sqlContent);

  for (const statement of statements) {
    // Trim and validate statement - more robust check
    const trimmed = statement ? statement.trim() : '';
    
    // Skip empty statements - check after trimming
    if (skipEmpty && (!trimmed || trimmed.length === 0)) {
      continue;
    }

    // Additional safety check: skip statements that are only whitespace or comments
    // A valid SQL statement should start with a SQL keyword, not a comment
    const withoutComments = trimmed.replace(/^--.*$/gm, '').trim();
    if (!withoutComments || withoutComments.length === 0) {
      continue;
    }

    // Retry logic for SQLITE_BUSY errors
    let retries = maxRetries;
    let executed = false;

    while (retries > 0 && !executed) {
      try {
        // Final safety check before executing
        if (!trimmed || trimmed.length === 0) {
          executed = true;
          continue;
        }
        
        // Check if this is an ALTER TABLE ADD COLUMN statement
        // If so, check if the column already exists before executing
        const alterTableMatch = trimmed.match(/ALTER\s+TABLE\s+([`"\[\]?\w]+)\s+ADD\s+COLUMN\s+([`"\[\]?\w]+)/i);
        if (alterTableMatch && allowDuplicateColumn) {
          let tableName = alterTableMatch[1].replace(/[`"\[\]]/g, '');
          let columnName = alterTableMatch[2].replace(/[`"\[\]]/g, '');
          
          // Check if column already exists using PRAGMA table_info
          try {
            // Use parameterized query for table name to prevent SQL injection
            // Note: PRAGMA doesn't support parameters, but table name should be safe from migration files
            const columns = await dbOps.allAsync(`PRAGMA table_info("${tableName}")`);
            const columnExists = columns.some(col => col.name.toLowerCase() === columnName.toLowerCase());
            
            if (columnExists) {
              console.log(
                `Info: Column '${columnName}' already exists in table '${tableName}'. Skipping ALTER TABLE statement.`,
              );
              executed = true;
              break;
            }
          } catch (pragmaError) {
            // If PRAGMA fails (e.g., table doesn't exist), continue with original statement
            // The original error handling will catch it
          }
        }
        
        // Use trimmed statement to avoid any whitespace issues
        await dbOps.runAsync(trimmed);
        executed = true;
      } catch (error) {
        const errorMsg = error.message || String(error);

        // Retry for SQLITE_BUSY errors
        if (errorMsg.includes("SQLITE_BUSY") && retries > 1) {
          retries--;
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (maxRetries + 1 - retries)),
          );
          continue;
        }

        // Handle duplicate column errors (acceptable for ALTER TABLE ADD COLUMN)
        if (
          allowDuplicateColumn &&
          (errorMsg.includes("duplicate column") ||
            errorMsg.includes("already exists"))
        ) {
          console.log(
            `Warning: Column/object already exists. Skipping statement: ${trimmed.substring(0, 50)}...`,
          );
          executed = true;
          break;
        }

        // Handle missing table errors (acceptable for migrations on existing databases)
        if (allowMissingTable && errorMsg.includes("no such table")) {
          console.log(
            `Info: Table doesn't exist yet (fresh install). Skipping statement: ${trimmed.substring(0, 50)}...`,
          );
          executed = true;
          break;
        }

        // Re-throw other errors if no more retries
        if (retries === 1) {
          throw error;
        }

        retries--;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}

module.exports = {
  createDatabaseConnection,
  promisifyDb,
  collectSqlFiles,
  parseSqlStatements,
  executeStatements,
  executeSqlFile,
};
