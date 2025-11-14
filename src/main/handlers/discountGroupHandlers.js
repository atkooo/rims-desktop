const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");

/**
 * Parse is_active value from various data types
 */
function parseIsActive(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

function mapDiscountGroupRow(row) {
  if (!row) return row;
  return {
    ...row,
    is_active: parseIsActive(row.is_active),
    discount_percentage: Number(row.discount_percentage) || 0,
    discount_amount: Number(row.discount_amount) || 0,
  };
}

/**
 * Convert number to Excel-style column name (A, B, C, ..., Z, AA, AB, ...)
 */
function numberToLetterCode(num) {
  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result || "A";
}

/**
 * Convert letter code to number (A=1, B=2, ..., Z=26, AA=27, ...)
 */
function letterCodeToNumber(code) {
  if (!code || typeof code !== "string") return 0;
  code = code.toUpperCase().trim();
  let result = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i) - 64; // A=1, B=2, etc.
    if (char < 1 || char > 26) return 0; // Invalid character
    result = result * 26 + char;
  }
  return result;
}

/**
 * Generate discount group code automatically using letters
 * Format: A, B, C, ..., Z, AA, AB, AC, ...
 */
async function generateDiscountGroupCode() {
  try {
    // Get all discount group codes
    const discountGroups = await database.query(
      `SELECT code FROM discount_groups ORDER BY code ASC`,
    );

    if (discountGroups && discountGroups.length > 0) {
      // Find the highest letter code
      let maxNumber = 0;
      for (const group of discountGroups) {
        const code = (group.code || "").toString().trim().toUpperCase();
        // Only process codes that are pure letters (A-Z, AA-ZZ, etc.)
        if (/^[A-Z]+$/.test(code)) {
          const number = letterCodeToNumber(code);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }

      if (maxNumber > 0) {
        const nextNumber = maxNumber + 1;
        return numberToLetterCode(nextNumber);
      }
    }

    // If no existing code found, start from A
    return "A";
  } catch (error) {
    logger.error("Error generating discount group code:", error);
    // Fallback: use timestamp-based code
    const timestamp = Date.now().toString().slice(-4);
    return `DG${timestamp}`;
  }
}

/**
 * Normalize and validate discount group code
 * @param {string} code - Code to normalize
 * @param {number|null} excludeId - ID to exclude from uniqueness check
 * @returns {Promise<string>} Normalized and validated code
 */
async function normalizeAndValidateCode(code, excludeId = null) {
  const originalCode = code;
  code = (code ?? "").toString().trim();

  // Auto-generate code if not provided
  if (!validator.isNotEmpty(code)) {
    code = await generateDiscountGroupCode();
  } else {
    // Normalize code to uppercase and remove non-letter characters
    code = code.toUpperCase().replace(/[^A-Z]/g, "");
    if (!code) {
      // If after cleaning there's no letters, generate one
      code = await generateDiscountGroupCode();
    }
  }

  // Check for uniqueness
  const wasManuallyProvided = validator.isNotEmpty(originalCode);
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const existing = await database.queryOne(
      excludeId
        ? "SELECT id FROM discount_groups WHERE code = ? AND id != ?"
        : "SELECT id FROM discount_groups WHERE code = ?",
      excludeId ? [code, excludeId] : [code],
    );

    if (!existing) {
      // Code is unique
      return code;
    }

    // Code exists
    if (wasManuallyProvided && attempts === 0) {
      // First attempt with manually provided code
      throw new Error("Kode grup diskon sudah digunakan");
    }

    // Generate next code
    const currentNumber = letterCodeToNumber(code);
    if (currentNumber > 0) {
      code = numberToLetterCode(currentNumber + 1);
    } else {
      // Fallback: regenerate completely
      code = await generateDiscountGroupCode();
    }
    attempts++;
  }

  // Final fallback: use timestamp-based code
  return `DG${Date.now().toString().slice(-4)}`;
}

function setupDiscountGroupHandlers() {
  // Get all discount groups
  ipcMain.handle("discountGroups:getAll", async () => {
    try {
      const sql = `
        SELECT 
          id,
          code,
          name,
          discount_percentage,
          discount_amount,
          description,
          is_active,
          created_at,
          updated_at
        FROM discount_groups 
        ORDER BY name ASC
      `;
      const discountGroups = await database.query(sql);
      return discountGroups.map(mapDiscountGroupRow);
    } catch (error) {
      logger.error("Error fetching discount groups:", error);
      throw error;
    }
  });

  // Get discount group by ID
  ipcMain.handle("discountGroups:getById", async (_event, id) => {
    try {
      const sql = `
        SELECT 
          id,
          code,
          name,
          discount_percentage,
          discount_amount,
          description,
          is_active,
          created_at,
          updated_at
        FROM discount_groups 
        WHERE id = ?
      `;
      const discountGroup = await database.queryOne(sql, [id]);
      return mapDiscountGroupRow(discountGroup);
    } catch (error) {
      logger.error(`Error fetching discount group ${id}:`, error);
      throw error;
    }
  });

  // Create new discount group
  ipcMain.handle("discountGroups:create", async (_event, payload = {}) => {
    try {
      const now = new Date().toISOString();
      let code = (payload.code ?? "").toString().trim();
      const name = (payload.name ?? "").toString().trim();
      const description = (payload.description ?? "").toString().trim();
      const discountPercentage = Number(payload.discount_percentage) || 0;
      const discountAmount = Number(payload.discount_amount) || 0;

      // Normalize and validate code
      code = await normalizeAndValidateCode(code, null);

      // Validate input
      if (!validator.isNotEmpty(name)) {
        throw new Error("Nama grup diskon wajib diisi");
      }
      if (discountPercentage < 0 || discountPercentage > 100) {
        throw new Error("Persentase diskon harus antara 0 dan 100");
      }
      if (discountAmount < 0) {
        throw new Error("Jumlah diskon tidak boleh negatif");
      }
      if (discountPercentage > 0 && discountAmount > 0) {
        throw new Error(
          "Pilih salah satu: persentase diskon atau jumlah diskon, tidak keduanya",
        );
      }

      // Handle is_active: false, 0, '0', null as false; everything else as true
      const isActive = parseIsActive(payload.is_active) ? 1 : 0;

      const insertSql = `
        INSERT INTO discount_groups (
          code,
          name,
          discount_percentage,
          discount_amount,
          description,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await database.execute(insertSql, [
        code,
        name,
        discountPercentage,
        discountAmount,
        description || null,
        isActive,
        now,
        now,
      ]);

      const created = await database.queryOne(
        "SELECT * FROM discount_groups WHERE id = ?",
        [result.id],
      );

      return mapDiscountGroupRow(created);
    } catch (error) {
      logger.error("Error creating discount group:", error);
      throw error;
    }
  });

  // Update discount group
  ipcMain.handle("discountGroups:update", async (_event, id, payload = {}) => {
    try {
      if (!id) {
        throw new Error("ID grup diskon tidak ditemukan");
      }

      const existing = await database.queryOne(
        "SELECT * FROM discount_groups WHERE id = ?",
        [id],
      );

      if (!existing) {
        throw new Error("Data grup diskon tidak ditemukan");
      }

      const updates = {};
      const fields = [];
      const values = [];

      if (payload.code !== undefined) {
        const code = (payload.code ?? "").toString().trim();
        updates.code = await normalizeAndValidateCode(code, id);
      }

      if (payload.name !== undefined) {
        const name = (payload.name ?? "").toString().trim();
        if (!validator.isNotEmpty(name)) {
          throw new Error("Nama grup diskon wajib diisi");
        }
        updates.name = name;
      }

      if (payload.discount_percentage !== undefined) {
        const discountPercentage = Number(payload.discount_percentage) || 0;
        if (discountPercentage < 0 || discountPercentage > 100) {
          throw new Error("Persentase diskon harus antara 0 dan 100");
        }
        updates.discount_percentage = discountPercentage;
      }

      if (payload.discount_amount !== undefined) {
        const discountAmount = Number(payload.discount_amount) || 0;
        if (discountAmount < 0) {
          throw new Error("Jumlah diskon tidak boleh negatif");
        }
        updates.discount_amount = discountAmount;
      }

      // Validate that only one discount type is set
      const finalDiscountPercentage =
        updates.discount_percentage !== undefined
          ? updates.discount_percentage
          : existing.discount_percentage;
      const finalDiscountAmount =
        updates.discount_amount !== undefined
          ? updates.discount_amount
          : existing.discount_amount;

      if (finalDiscountPercentage > 0 && finalDiscountAmount > 0) {
        throw new Error(
          "Pilih salah satu: persentase diskon atau jumlah diskon, tidak keduanya",
        );
      }

      const optionalStringFields = ["description"];
      optionalStringFields.forEach((field) => {
        if (payload[field] !== undefined) {
          updates[field] = (payload[field] ?? "").toString().trim() || null;
        }
      });

      if (payload.is_active !== undefined) {
        updates.is_active = parseIsActive(payload.is_active) ? 1 : 0;
      }

      updates.updated_at = new Date().toISOString();

      Object.entries(updates).forEach(([field, value]) => {
        fields.push(`${field} = ?`);
        values.push(value);
      });

      if (!fields.length) {
        return mapDiscountGroupRow(existing);
      }

      await database.execute(
        `UPDATE discount_groups SET ${fields.join(", ")} WHERE id = ?`,
        [...values, id],
      );

      const updated = await database.queryOne(
        "SELECT * FROM discount_groups WHERE id = ?",
        [id],
      );

      return mapDiscountGroupRow(updated);
    } catch (error) {
      logger.error(`Error updating discount group ${id}:`, error);
      throw error;
    }
  });

  // Delete discount group
  ipcMain.handle("discountGroups:delete", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID grup diskon tidak ditemukan");
      }

      const existing = await database.queryOne(
        "SELECT * FROM discount_groups WHERE id = ?",
        [id],
      );

      if (!existing) {
        throw new Error("Data grup diskon tidak ditemukan");
      }

      // Check if discount group is used by customers
      const usage = await database.queryOne(
        `SELECT COUNT(1) as count FROM customers WHERE discount_group_id = ?`,
        [id],
      );

      if ((usage?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus grup diskon yang sedang digunakan oleh pelanggan",
        );
      }

      await database.execute("DELETE FROM discount_groups WHERE id = ?", [id]);

      return true;
    } catch (error) {
      logger.error(`Error deleting discount group ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupDiscountGroupHandlers;
