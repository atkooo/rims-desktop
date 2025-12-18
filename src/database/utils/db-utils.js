const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dbConfig = require("../../main/config/database");

/**
 * Utility database yang dipake buat migrations sama seeders
 */

// Promisify operasi database
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
      // Safety check: jangan pernah execute SQL statement yang kosong
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
 * Kumpulin semua file SQL dari directory secara recursive
 * @param {string} dir - Path directory yang mau dicari
 * @returns {Array<string>} Array berisi full file paths
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
 * Parse file SQL jadi statement-statement individual
 * Handle block BEGIN...END di triggers sama procedures
 * @param {string} sqlContent - Isi file SQL
 * @returns {Array<string>} Array berisi SQL statements
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

    // Handle string literal (single quote sama double quote)
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

    // Kalau kita lagi di dalam string, tambahin karakter aja
    if (inString) {
      currentStatement += char;
      i++;
      continue;
    }

    // Track block BEGIN/END sama statement CASE/END (case-insensitive)
    const remaining = sqlContent.substring(i).toUpperCase();

    // Cek untuk statement CASE
    if (remaining.startsWith("CASE") && !/\w/.test(sqlContent[i + 4] || "")) {
      inCase = true;
      currentStatement += sqlContent.substring(i, i + 4);
      i += 4;
      continue;
    }

    // Cek untuk block BEGIN
    if (remaining.startsWith("BEGIN") && !/\w/.test(sqlContent[i + 5] || "")) {
      depth++;
      currentStatement += sqlContent.substring(i, i + 5);
      i += 5;
      continue;
    }

    // Cek untuk END
    if (remaining.startsWith("END") && !/\w/.test(sqlContent[i + 3] || "")) {
      // Kalau kita lagi di dalam statement CASE, tutup
      if (inCase) {
        inCase = false;
        currentStatement += sqlContent.substring(i, i + 3);
        i += 3;
        // Cek apakah END diikuti sama semicolon
        if (sqlContent[i] === ";") {
          currentStatement += ";";
          i++;
        }
        continue;
      }

      // Kalau gak, berarti lagi nutup block BEGIN
      depth--;
      currentStatement += sqlContent.substring(i, i + 3);
      i += 3;
      // Check if END is followed by semicolon
      if (sqlContent[i] === ";") {
        currentStatement += ";";
        i++;
        // Kalau depth 0 setelah nutup block, semicolon ini terminate statement-nya
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

    // Kalau ketemu semicolon dan kita gak di dalam block, itu statement terminator
    if (char === ";" && depth === 0) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      currentStatement = "";
      i++;
      continue;
    }

    // Tambahin karakter ke statement sekarang
    currentStatement += char;
    i++;
  }

  // Tambahin statement yang masih tersisa
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Execute SQL statements dalam transaction
 * @param {Object} dbPromisified - Object database yang sudah di-promisify
 * @param {Array<string>} statements - Array berisi SQL statements
 * @param {Function} onStatement - Optional callback buat setiap statement
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
 * Execute file SQL dengan retry logic sama error handling
 * @param {Object} dbOps - Object operasi database dengan runAsync, allAsync, getAsync
 * @param {string} filePath - Path ke file SQL
 * @param {Object} options - Opsi buat execution
 * @param {number} options.maxRetries - Maximum retry buat error SQLITE_BUSY (default: 5)
 * @param {boolean} options.skipEmpty - Skip statement yang kosong (default: true)
 * @param {boolean} options.allowDuplicateColumn - Allow error duplicate column (default: true)
 * @param {boolean} options.allowMissingTable - Allow error missing table (default: false)
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
    // Trim sama validasi statement - check yang lebih robust
    const trimmed = statement ? statement.trim() : '';
    
    // Skip statement yang kosong - check setelah trim
    if (skipEmpty && (!trimmed || trimmed.length === 0)) {
      continue;
    }

    // Safety check tambahan: skip statement yang cuma whitespace atau komentar
    // SQL statement yang valid harus mulai dengan SQL keyword, bukan komentar
    const withoutComments = trimmed.replace(/^--.*$/gm, '').trim();
    if (!withoutComments || withoutComments.length === 0) {
      continue;
    }

    // Retry logic buat error SQLITE_BUSY
    let retries = maxRetries;
    let executed = false;

    while (retries > 0 && !executed) {
      try {
        // Safety check terakhir sebelum execute
        if (!trimmed || trimmed.length === 0) {
          executed = true;
          continue;
        }
        
        // Cek apakah ini statement ALTER TABLE ADD COLUMN
        // Kalau iya, cek apakah kolomnya udah ada sebelum execute
        const alterTableMatch = trimmed.match(/ALTER\s+TABLE\s+([`"\[\]?\w]+)\s+ADD\s+COLUMN\s+([`"\[\]?\w]+)/i);
        if (alterTableMatch && allowDuplicateColumn) {
          let tableName = alterTableMatch[1].replace(/[`"\[\]]/g, '');
          let columnName = alterTableMatch[2].replace(/[`"\[\]]/g, '');
          
          // Cek apakah kolomnya udah ada pakai PRAGMA table_info
          try {
            // Pakai parameterized query buat nama tabel buat prevent SQL injection
            // Catatan: PRAGMA gak support parameter, tapi nama tabel harus aman dari migration files
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
            // Kalau PRAGMA gagal (misal tabel gak ada), lanjutin dengan statement original
            // Error handling original bakal catch
          }
        }
        
        // Pakai statement yang udah di-trim buat avoid masalah whitespace
        await dbOps.runAsync(trimmed);
        executed = true;
      } catch (error) {
        const errorMsg = error.message || String(error);

        // Retry buat error SQLITE_BUSY
        if (errorMsg.includes("SQLITE_BUSY") && retries > 1) {
          retries--;
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (maxRetries + 1 - retries)),
          );
          continue;
        }

        // Handle error duplicate column (acceptable buat ALTER TABLE ADD COLUMN)
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

        // Handle error missing table (acceptable buat migrations di database yang udah ada)
        if (allowMissingTable && errorMsg.includes("no such table")) {
          console.log(
            `Info: Table doesn't exist yet (fresh install). Skipping statement: ${trimmed.substring(0, 50)}...`,
          );
          executed = true;
          break;
        }

        // Re-throw error lain kalau gak ada retry lagi
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
