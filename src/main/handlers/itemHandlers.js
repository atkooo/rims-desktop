const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");

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
      // Validasi input
      if (!validator.isNotEmpty(itemData.name)) {
        throw new Error("Nama item harus diisi");
      }
      if (!validator.isPositiveNumber(itemData.price)) {
        throw new Error("Harga harus berupa angka positif");
      }

      const result = await database.execute(
        "INSERT INTO items (name, description, price, type, status) VALUES (?, ?, ?, ?, ?)",
        [
          itemData.name,
          itemData.description,
          itemData.price,
          itemData.type,
          "AVAILABLE",
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

      const fields = Object.keys(updates);
      const values = Object.values(updates);
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
