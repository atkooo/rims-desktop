const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

function normalizeCode(code = "") {
  return code.trim().toUpperCase();
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
      if (!name) throw new Error("Nama ukuran wajib diisi");

      const normalizedCode = normalizeCode(code || name);
      const now = new Date().toISOString();

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
        Number(sort_order) || 0,
        is_active ? 1 : 0,
        now,
        now,
      ]);

      return {
        id: result.id,
        code: normalizedCode,
        name,
        description,
        notes,
        sort_order: Number(sort_order) || 0,
        is_active: is_active ? 1 : 0,
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
      if (!id) throw new Error("ID ukuran tidak ditemukan");
      if (!name) throw new Error("Nama ukuran wajib diisi");

      const normalizedCode = normalizeCode(code || name);
      const now = new Date().toISOString();

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
        Number(sort_order) || 0,
        is_active ? 1 : 0,
        now,
        id,
      ]);

      return {
        id,
        code: normalizedCode,
        name,
        description,
        notes,
        sort_order: Number(sort_order) || 0,
        is_active: is_active ? 1 : 0,
        updated_at: now,
      };
    } catch (error) {
      logger.error(`Error updating item size ${payload?.id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("itemSizes:delete", async (event, id) => {
    try {
      if (!id) throw new Error("ID ukuran tidak ditemukan");

      const usage = await database.queryOne(
        `
          SELECT COUNT(1) AS total
          FROM items
          WHERE size_id = ?
        `,
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
