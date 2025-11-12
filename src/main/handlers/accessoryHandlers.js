const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { toInteger } = require("../helpers/codeUtils");

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  value === "true" ||
  value === "TRUE";

function sanitizeAvailable(stock, available) {
  const stockQty = Math.max(0, toInteger(stock));
  const availableQty = Math.max(0, toInteger(available));
  return Math.min(stockQty, availableQty);
}

function setupAccessoryHandlers() {
  ipcMain.handle("accessories:create", async (_event, payload = {}) => {
    try {
      // Auto-generate code if empty
      const { normalizeCode } = require("../helpers/codeUtils");
      const code = normalizeCode(payload.code, payload.name, "ACC");
      const name = (payload.name ?? "").toString().trim();
      const description = (payload.description ?? "").toString().trim();

      if (!validator.isNotEmpty(name)) {
        throw new Error("Nama aksesoris wajib diisi");
      }

      const stockQuantity = Math.max(0, toInteger(payload.stock_quantity));
      const availableQuantity = sanitizeAvailable(
        stockQuantity,
        payload.available_quantity ?? stockQuantity,
      );

      const now = new Date().toISOString();

      // Validate discount_group_id if provided
      let discountGroupId = null;
      if (
        payload.discount_group_id !== undefined &&
        payload.discount_group_id !== null &&
        payload.discount_group_id !== ""
      ) {
        discountGroupId = Number(payload.discount_group_id);
        if (discountGroupId) {
          const discountGroup = await database.queryOne(
            "SELECT id FROM discount_groups WHERE id = ?",
            [discountGroupId],
          );
          if (!discountGroup) {
            throw new Error("Grup diskon tidak ditemukan");
          }
        } else {
          discountGroupId = null;
        }
      }

      const insertSql = `
        INSERT INTO accessories (
          code,
          name,
          description,
          purchase_price,
          rental_price_per_day,
          sale_price,
          stock_quantity,
          available_quantity,
          min_stock_alert,
          is_available_for_rent,
          is_available_for_sale,
          is_active,
          discount_group_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await database.execute(insertSql, [
        code,
        name,
        description,
        toNumber(payload.purchase_price),
        toNumber(payload.rental_price_per_day),
        toNumber(payload.sale_price),
        stockQuantity,
        availableQuantity,
        Math.max(0, toInteger(payload.min_stock_alert)),
        toBoolean(payload.is_available_for_rent) ? 1 : 0,
        toBoolean(payload.is_available_for_sale) ? 1 : 0,
        toBoolean(payload.is_active) ? 1 : 0,
        discountGroupId,
        now,
        now,
      ]);

      const created = await database.queryOne(
        "SELECT * FROM accessories WHERE id = ?",
        [result.id],
      );

      return created;
    } catch (error) {
      logger.error("Error creating accessory:", error);
      throw error;
    }
  });

  ipcMain.handle("accessories:update", async (_event, id, payload = {}) => {
    try {
      if (!id) {
        throw new Error("ID aksesoris tidak ditemukan");
      }

      const updates = {};

      if (payload.code !== undefined) {
        // Auto-generate code if empty
        const { normalizeCode } = require("../helpers/codeUtils");
        const code = normalizeCode(payload.code, payload.name || "", "ACC");
        updates.code = code;
      }

      if (payload.name !== undefined) {
        const name = (payload.name ?? "").toString().trim();
        if (!validator.isNotEmpty(name)) {
          throw new Error("Nama aksesoris wajib diisi");
        }
        updates.name = name;
      }

      if (payload.description !== undefined) {
        updates.description = (payload.description ?? "").toString().trim();
      }

      const numericFields = [
        "purchase_price",
        "rental_price_per_day",
        "sale_price",
      ];
      numericFields.forEach((field) => {
        if (payload[field] !== undefined) {
          updates[field] = toNumber(payload[field]);
        }
      });

      if (payload.stock_quantity !== undefined) {
        updates.stock_quantity = Math.max(0, toInteger(payload.stock_quantity));
      }

      if (payload.available_quantity !== undefined) {
        const stock =
          updates.stock_quantity !== undefined
            ? updates.stock_quantity
            : undefined;
        let currentStock = stock;

        if (currentStock === undefined) {
          const row = await database.queryOne(
            "SELECT stock_quantity FROM accessories WHERE id = ?",
            [id],
          );
          currentStock = row?.stock_quantity ?? 0;
        }

        updates.available_quantity = sanitizeAvailable(
          currentStock,
          payload.available_quantity,
        );
      } else if (updates.stock_quantity !== undefined) {
        // Clamp existing available quantity to new stock value
        const row = await database.queryOne(
          "SELECT available_quantity FROM accessories WHERE id = ?",
          [id],
        );
        const currentAvailable = row?.available_quantity ?? 0;
        updates.available_quantity = sanitizeAvailable(
          updates.stock_quantity,
          currentAvailable,
        );
      }

      if (payload.min_stock_alert !== undefined) {
        updates.min_stock_alert = Math.max(
          0,
          toInteger(payload.min_stock_alert),
        );
      }

      // Validate discount_group_id if provided
      if (payload.discount_group_id !== undefined) {
        if (
          payload.discount_group_id === null ||
          payload.discount_group_id === ""
        ) {
          updates.discount_group_id = null;
        } else {
          const discountGroupId = Number(payload.discount_group_id);
          if (discountGroupId) {
            const discountGroup = await database.queryOne(
              "SELECT id FROM discount_groups WHERE id = ?",
              [discountGroupId],
            );
            if (!discountGroup) {
              throw new Error("Grup diskon tidak ditemukan");
            }
            updates.discount_group_id = discountGroupId;
          } else {
            updates.discount_group_id = null;
          }
        }
      }

      const booleanFields = [
        "is_available_for_rent",
        "is_available_for_sale",
        "is_active",
      ];
      booleanFields.forEach((field) => {
        if (payload[field] !== undefined) {
          updates[field] = toBoolean(payload[field]) ? 1 : 0;
        }
      });

      if (!Object.keys(updates).length) {
        return database.queryOne("SELECT * FROM accessories WHERE id = ?", [
          id,
        ]);
      }

      updates.updated_at = new Date().toISOString();

      const fields = Object.keys(updates);
      const sql = `UPDATE accessories SET ${fields
        .map((field) => `${field} = ?`)
        .join(", ")} WHERE id = ?`;
      const values = fields.map((field) => updates[field]);
      await database.execute(sql, [...values, id]);

      const updated = await database.queryOne(
        "SELECT * FROM accessories WHERE id = ?",
        [id],
      );
      return updated;
    } catch (error) {
      logger.error(`Error updating accessory ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("accessories:delete", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID aksesoris tidak ditemukan");
      }

      const usage = await database.queryOne(
        "SELECT COUNT(*) AS count FROM bundle_details WHERE accessory_id = ?",
        [id],
      );

      if ((usage?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus aksesoris yang sudah digunakan pada paket.",
        );
      }

      await database.execute("DELETE FROM accessories WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting accessory ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("accessories:getById", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID aksesoris tidak ditemukan");
      }

      const accessory = await database.queryOne(
        "SELECT * FROM accessories WHERE id = ?",
        [id],
      );

      if (!accessory) {
        throw new Error("Aksesoris tidak ditemukan");
      }

      return accessory;
    } catch (error) {
      logger.error(`Error getting accessory ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("accessories:getByCode", async (_event, code) => {
    try {
      if (!code) {
        throw new Error("Kode aksesoris tidak ditemukan");
      }

      const accessory = await database.queryOne(
        "SELECT * FROM accessories WHERE code = ?",
        [code],
      );

      if (!accessory) {
        throw new Error("Aksesoris tidak ditemukan");
      }

      return accessory;
    } catch (error) {
      logger.error(`Error getting accessory by code ${code}:`, error);
      throw error;
    }
  });
}

module.exports = setupAccessoryHandlers;
