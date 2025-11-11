const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");

const normalizeCode = (value, fallbackName = "") => {
  let code = (value ?? "").toString().trim();
  if (code) return code.toUpperCase();
  if (!fallbackName) return `ITM-${Date.now()}`;
  const sanitized = fallbackName
    .toUpperCase()
    .replace(/[^0-9A-Z]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 20);
  return `ITM-${sanitized || Date.now()}`;
};

// Setup item handlers
function setupItemHandlers() {
  // Get all items
  ipcMain.handle("items:getAll", async () => {
    try {
      const items = await database.query(`
        SELECT
          i.*,
          s.name AS size_name,
          s.code AS size_code
        FROM items i
        LEFT JOIN item_sizes s ON i.size_id = s.id
        ORDER BY i.id DESC
      `);
      return items;
    } catch (error) {
      logger.error("Error fetching items:", error);
      throw error;
    }
  });

  // Add new item
  ipcMain.handle("items:add", async (event, itemData) => {
    try {
      const code = normalizeCode(itemData.code, itemData.name);
      itemData.code = code;

      // Validasi input
      if (!validator.isNotEmpty(itemData.name)) {
        throw new Error("Nama item harus diisi");
      }
      if (!validator.isPositiveNumber(itemData.price)) {
        throw new Error("Harga harus berupa angka positif");
      }
      if (!itemData.category_id) {
        throw new Error("Kategori harus dipilih");
      }

      const result = await database.execute(
        `INSERT INTO items (
            code,
            name,
            description,
            price,
            type,
            status,
            size_id,
            category_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          itemData.name,
          itemData.description ?? null,
          itemData.price,
          itemData.type ?? "RENTAL",
          itemData.status ?? "AVAILABLE",
          itemData.size_id ?? null,
          itemData.category_id,
        ],
      );

      // Return item yang baru dibuat
      const newItem = await database.queryOne(
        "SELECT * FROM items WHERE id = ?",
        [result.id],
      );
      return newItem;
    } catch (error) {
      logger.error("Error adding item:", error);
      throw error;
    }
  });

  // Get item by ID
  ipcMain.handle("items:getById", async (event, id) => {
    try {
      if (!id) {
        throw new Error("ID item tidak ditemukan");
      }

      const item = await database.queryOne(
        `
        SELECT
          i.*,
          s.name AS size_name,
          s.code AS size_code,
          c.name AS category_name
        FROM items i
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.id = ?
      `,
        [id],
      );

      if (!item) {
        throw new Error("Item tidak ditemukan");
      }

      return item;
    } catch (error) {
      logger.error(`Error getting item ${id}:`, error);
      throw error;
    }
  });

  // Update item
  ipcMain.handle("items:update", async (event, id, updates) => {
    try {
      // Validasi input
      if (updates.name && !validator.isNotEmpty(updates.name)) {
        throw new Error("Nama item harus diisi");
      }
      if (updates.price && !validator.isPositiveNumber(updates.price)) {
        throw new Error("Harga harus berupa angka positif");
      }
      if (updates.code !== undefined && !validator.isNotEmpty(updates.code)) {
        throw new Error("Kode item harus diisi");
      }
      if (updates.category_id !== undefined && !updates.category_id) {
        throw new Error("Kategori harus dipilih");
      }

      const normalizedUpdates = { ...updates };
      if (updates.code !== undefined) {
        normalizedUpdates.code = normalizeCode(updates.code);
      }
      const fields = Object.keys(normalizedUpdates);
      const values = Object.values(normalizedUpdates);
      const sql = `UPDATE items SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`;

      await database.execute(sql, [...values, id]);

      // Return updated item
      const updatedItem = await database.queryOne(
        "SELECT * FROM items WHERE id = ?",
        [id],
      );
      return updatedItem;
    } catch (error) {
      logger.error("Error updating item:", error);
      throw error;
    }
  });

  // Delete item
  ipcMain.handle("items:delete", async (event, id) => {
    try {
      await database.execute("DELETE FROM items WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error("Error deleting item:", error);
      throw error;
    }
  });
}

module.exports = setupItemHandlers;
