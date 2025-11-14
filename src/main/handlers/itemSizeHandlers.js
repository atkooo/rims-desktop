const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const { normalizeCode } = require("../helpers/codeUtils");

// Simple code normalizer for item sizes (no prefix, just uppercase)
function normalizeItemSizeCode(code = "", fallbackName = "") {
  const normalized = normalizeCode(code, fallbackName, "");
  return normalized.replace(/^[A-Z]+-/, ""); // Remove prefix if present
}

function setupItemSizeHandlers() {
  ipcMain.handle("itemSizes:getAll", async () => {
    try {
      const sql = `
        SELECT
          id,
          code,
          name,
          description,
          notes,
          sort_order,
          is_active,
          created_at,
          updated_at
        FROM item_sizes
        ORDER BY sort_order ASC, name ASC
      `;
      return await database.query(sql);
    } catch (error) {
      logger.error("Error fetching item sizes:", error);
      throw error;
    }
  });

  ipcMain.handle("itemSizes:create", async (event, payload) => {
    try {
      const { code, name, description, notes, sort_order, is_active } =
        payload || {};

      if (!name || !name.trim()) {
        throw new Error("Nama ukuran wajib diisi");
      }

      const normalizedCode = normalizeItemSizeCode(code || name, name);
      const now = new Date().toISOString();
      const sortOrder = Number(sort_order) || 0;
      const isActive = is_active ? 1 : 0;

      const sql = `
        INSERT INTO item_sizes
          (code, name, description, notes, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await database.execute(sql, [
        normalizedCode,
        name.trim(),
        description || null,
        notes || null,
        sortOrder,
        isActive,
        now,
        now,
      ]);

      return {
        id: result.id,
        code: normalizedCode,
        name: name.trim(),
        description: description || null,
        notes: notes || null,
        sort_order: sortOrder,
        is_active: isActive,
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      logger.error("Error creating item size:", error);
      throw error;
    }
  });

  ipcMain.handle("itemSizes:update", async (event, payload) => {
    try {
      const { id, code, name, description, notes, sort_order, is_active } =
        payload || {};

      if (!id) {
        throw new Error("ID ukuran tidak ditemukan");
      }
      if (!name || !name.trim()) {
        throw new Error("Nama ukuran wajib diisi");
      }

      const normalizedCode = normalizeItemSizeCode(code || name, name);
      const now = new Date().toISOString();
      const sortOrder = Number(sort_order) || 0;
      const isActive = is_active ? 1 : 0;

      const sql = `
        UPDATE item_sizes
        SET
          code = ?,
          name = ?,
          description = ?,
          notes = ?,
          sort_order = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
      `;

      await database.execute(sql, [
        normalizedCode,
        name.trim(),
        description || null,
        notes || null,
        sortOrder,
        isActive,
        now,
        id,
      ]);

      return {
        id,
        code: normalizedCode,
        name: name.trim(),
        description: description || null,
        notes: notes || null,
        sort_order: sortOrder,
        is_active: isActive,
        updated_at: now,
      };
    } catch (error) {
      logger.error(`Error updating item size ${payload?.id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("itemSizes:delete", async (event, id) => {
    try {
      if (!id) {
        throw new Error("ID ukuran tidak ditemukan");
      }

      const usage = await database.queryOne(
        `SELECT COUNT(1) AS total
         FROM items
         WHERE size_id = ?`,
        [id],
      );

      if ((usage?.total || 0) > 0) {
        throw new Error(
          "Ukuran masih digunakan oleh item dan tidak bisa dihapus",
        );
      }

      await database.execute("DELETE FROM item_sizes WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting item size ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupItemSizeHandlers;
