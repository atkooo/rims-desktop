const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const {
  toInteger,
  sanitizeAvailable,
  generateBundleCode,
} = require("../helpers/codeUtils");

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const sanitizeBundleType = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  if (normalized === "sale") return "sale";
  if (normalized === "both") return "both";
  return "rental";
};

async function buildPayload(raw, isEdit = false) {
  // Validate discount_group_id if provided
  const discountGroupId = await validator.validateDiscountGroupId(
    raw.discount_group_id,
  );

  // Auto-generate code if empty
  let code = (raw.code || "").trim();
  if (!code) {
    code = await generateBundleCode(database);
  } else {
    // Normalize provided code
    const { normalizeCode } = require("../helpers/codeUtils");
    code = normalizeCode(code, raw.name);
  }

  const payload = {
    code: code,
    name: (raw.name ?? "").toString().trim(),
    description: (raw.description ?? "").toString().trim(),
    bundle_type: sanitizeBundleType(raw.bundle_type),
    price: toNumber(raw.price),
    rental_price_per_day: toNumber(raw.rental_price_per_day),
    discount_group_id: discountGroupId,
    is_active: raw.is_active ? 1 : 0,
  };

  // Stok selalu 0 saat create, tidak bisa diubah dari form
  // Stok hanya bisa diubah melalui manajemen stok
  if (!isEdit) {
    payload.stock_quantity = 0;
    payload.available_quantity = 0;
  }
  // Jika edit, jangan set stock_quantity dan available_quantity

  return payload;
}

function validatePayload(payload) {
  // Kode akan di-generate otomatis, tidak perlu validasi
  if (!validator.isNotEmpty(payload.name)) {
    throw new Error("Nama paket wajib diisi");
  }
  if (!["rental", "sale", "both"].includes(payload.bundle_type)) {
    throw new Error("Tipe paket tidak valid");
  }
  if (payload.price < 0) {
    throw new Error("Harga paket tidak boleh negatif");
  }
  if (payload.rental_price_per_day < 0) {
    throw new Error("Harga sewa per hari tidak boleh negatif");
  }
}

const detailSelectSql = `
  SELECT
    bd.id,
    bd.bundle_id,
    bd.item_id,
    bd.accessory_id,
    bd.quantity,
    bd.notes,
    bd.created_at,
    i.name AS item_name,
    a.name AS accessory_name
  FROM bundle_details bd
  LEFT JOIN items i ON bd.item_id = i.id
  LEFT JOIN accessories a ON bd.accessory_id = a.id
  WHERE bd.id = ?
`;

const detailListSql = `
  SELECT
    bd.id,
    bd.bundle_id,
    bd.item_id,
    bd.accessory_id,
    bd.quantity,
    bd.notes,
    bd.created_at,
    i.name AS item_name,
    i.code AS item_code,
    i.sale_price AS item_sale_price,
    i.rental_price_per_day AS item_rental_price,
    c.name AS category_name,
    a.name AS accessory_name,
    a.code AS accessory_code,
    a.sale_price AS accessory_sale_price,
    CASE 
      WHEN bd.item_id IS NOT NULL THEN 'item'
      WHEN bd.accessory_id IS NOT NULL THEN 'accessory'
      ELSE NULL
    END AS type,
    CASE 
      WHEN bd.item_id IS NOT NULL THEN 'Item'
      WHEN bd.accessory_id IS NOT NULL THEN 'Aksesoris'
      ELSE NULL
    END AS type_label
  FROM bundle_details bd
  LEFT JOIN items i ON bd.item_id = i.id
  LEFT JOIN accessories a ON bd.accessory_id = a.id
  LEFT JOIN categories c ON i.category_id = c.id
  WHERE bd.bundle_id = ?
  ORDER BY bd.id DESC
`;

const normalizeDetailPayload = (raw = {}, fallback = {}) => {
  const bundleId = raw.bundle_id ?? fallback.bundle_id;
  if (!bundleId) throw new Error("Bundle tidak valid");

  let itemId =
    raw.item_id !== undefined
      ? raw.item_id
        ? toInteger(raw.item_id)
        : null
      : (fallback.item_id ?? null);
  let accessoryId =
    raw.accessory_id !== undefined
      ? raw.accessory_id
        ? toInteger(raw.accessory_id)
        : null
      : (fallback.accessory_id ?? null);

  if (!itemId && !accessoryId) {
    throw new Error("Pilih item atau aksesoris untuk detail paket");
  }
  if (itemId && accessoryId) {
    throw new Error(
      "Detail paket hanya boleh berisi item atau aksesoris, bukan keduanya",
    );
  }

  const quantity =
    raw.quantity !== undefined
      ? Math.max(1, toInteger(raw.quantity))
      : Math.max(1, toInteger(fallback.quantity ?? 1));
  const notes =
    raw.notes !== undefined
      ? (raw.notes ?? "").toString().trim()
      : (fallback.notes ?? "");

  return {
    bundle_id: bundleId,
    item_id: itemId,
    accessory_id: accessoryId,
    quantity,
    notes,
  };
};

const fetchDetailRow = (id) => database.queryOne(detailSelectSql, [id]);

function setupBundleHandlers() {
  // Get next bundle code
  ipcMain.handle("bundles:getNextCode", async () => {
    try {
      const code = await generateBundleCode(database);
      return code;
    } catch (error) {
      logger.error("Error generating bundle code:", error);
      throw error;
    }
  });
  ipcMain.handle("bundles:create", async (_event, rawPayload = {}) => {
    try {
      const payload = await buildPayload(rawPayload, false); // Create: force stok = 0
      validatePayload(payload);

      const now = new Date().toISOString();
      const sql = `
        INSERT INTO bundles (
          code,
          name,
          description,
          bundle_type,
          price,
          rental_price_per_day,
          stock_quantity,
          available_quantity,
          discount_group_id,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await database.execute(sql, [
        payload.code,
        payload.name,
        payload.description,
        payload.bundle_type,
        payload.price,
        payload.rental_price_per_day,
        payload.stock_quantity,
        payload.available_quantity,
        payload.discount_group_id,
        payload.is_active,
        now,
        now,
      ]);

      return database.queryOne("SELECT * FROM bundles WHERE id = ?", [
        result.id,
      ]);
    } catch (error) {
      logger.error("Error creating bundle:", error);
      throw error;
    }
  });

  ipcMain.handle("bundles:update", async (_event, id, rawPayload = {}) => {
    try {
      if (!id) throw new Error("ID paket tidak ditemukan");

      const existing = await database.queryOne(
        "SELECT * FROM bundles WHERE id = ?",
        [id],
      );
      if (!existing) throw new Error("Paket tidak ditemukan");

      // Merge with existing data and build payload
      const payload = await buildPayload({ ...existing, ...rawPayload }, true); // Edit: jangan ubah stok

      // Only validate when fields provided
      validatePayload(payload);

      const fields = [];
      const values = [];

      // Stok tidak bisa diubah dari form edit
      // Hapus stock_quantity dan available_quantity jika ada di rawPayload
      if (rawPayload.stock_quantity !== undefined) {
        logger.warn(`Ignoring stock_quantity update for bundle ${id} - stok hanya bisa diubah melalui manajemen stok`);
      }
      if (rawPayload.available_quantity !== undefined) {
        logger.warn(`Ignoring available_quantity update for bundle ${id} - stok hanya bisa diubah melalui manajemen stok`);
      }

      // Process discount_group_id separately
      if (rawPayload.discount_group_id !== undefined) {
        const discountGroupId = await validator.validateDiscountGroupId(
          rawPayload.discount_group_id,
        );
        fields.push("discount_group_id = ?");
        values.push(discountGroupId);
      }

      // Process other fields (exclude stock fields)
      Object.entries(rawPayload).forEach(([key, value]) => {
        if (
          key !== "discount_group_id" &&
          key !== "stock_quantity" &&
          key !== "available_quantity" &&
          value !== undefined &&
          value !== null
        ) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (!fields.length) {
        return existing;
      }

      const now = new Date().toISOString();
      fields.push("updated_at = ?");
      values.push(now);
      values.push(id);

      await database.execute(
        `UPDATE bundles SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );

      return database.queryOne("SELECT * FROM bundles WHERE id = ?", [id]);
    } catch (error) {
      logger.error(`Error updating bundle ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("bundles:delete", async (_event, id) => {
    try {
      if (!id) throw new Error("ID paket tidak ditemukan");

      await database.execute("DELETE FROM bundles WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting bundle ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("bundles:getByCode", async (_event, code) => {
    try {
      if (!code || typeof code !== "string") {
        return null;
      }
      
      const { normalizeCode } = require("../helpers/codeUtils");
      const normalizedCode = normalizeCode(code.trim());
      
      const bundle = await database.queryOne(
        `SELECT * FROM bundles WHERE code = ? OR UPPER(code) = UPPER(?) LIMIT 1`,
        [normalizedCode, code.trim()],
      );
      
      return bundle || null;
    } catch (error) {
      logger.error(`Error getting bundle by code ${code}:`, error);
      throw error;
    }
  });

  ipcMain.handle("bundles:getById", async (_event, id) => {
    try {
      if (!id) {
        throw new Error("ID paket tidak ditemukan");
      }

      const bundle = await database.queryOne(
        "SELECT * FROM bundles WHERE id = ?",
        [id],
      );

      if (!bundle) {
        throw new Error("Paket tidak ditemukan");
      }

      return bundle;
    } catch (error) {
      logger.error(`Error getting bundle ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("bundleDetails:getByBundle", async (_event, bundleId) => {
    try {
      if (!bundleId) throw new Error("Bundle tidak valid");
      return database.query(detailListSql, [bundleId]);
    } catch (error) {
      logger.error(`Error fetching bundle details for ${bundleId}:`, error);
      throw error;
    }
  });

  ipcMain.handle("bundleDetails:create", async (_event, rawPayload = {}) => {
    try {
      const payload = normalizeDetailPayload(rawPayload);
      
      // Validate: minimal salah satu item_id atau accessory_id harus ada
      if (!payload.item_id && !payload.accessory_id) {
        throw new Error("Pilih minimal salah satu: Item atau Accessory");
      }
      
      const sql = `
        INSERT INTO bundle_details (
          bundle_id,
          item_id,
          accessory_id,
          quantity,
          notes
        ) VALUES (?, ?, ?, ?, ?)
      `;
      const result = await database.execute(sql, [
        payload.bundle_id,
        payload.item_id,
        payload.accessory_id,
        payload.quantity,
        payload.notes,
      ]);
      return fetchDetailRow(result.id);
    } catch (error) {
      logger.error("Error creating bundle detail:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "bundleDetails:update",
    async (_event, id, rawPayload = {}) => {
      try {
        if (!id) throw new Error("ID detail tidak ditemukan");
        const existing = await database.queryOne(
          "SELECT * FROM bundle_details WHERE id = ?",
          [id],
        );
        if (!existing) throw new Error("Detail paket tidak ditemukan");

        const payload = normalizeDetailPayload(rawPayload, existing);
        
        // Validate: minimal salah satu item_id atau accessory_id harus ada
        if (!payload.item_id && !payload.accessory_id) {
          throw new Error("Pilih minimal salah satu: Item atau Accessory");
        }
        
        const sql = `
          UPDATE bundle_details
          SET bundle_id = ?, item_id = ?, accessory_id = ?, quantity = ?, notes = ?
          WHERE id = ?
        `;
        await database.execute(sql, [
          payload.bundle_id,
          payload.item_id,
          payload.accessory_id,
          payload.quantity,
          payload.notes,
          id,
        ]);
        return fetchDetailRow(id);
      } catch (error) {
        logger.error(`Error updating bundle detail ${id}:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle("bundleDetails:delete", async (_event, id) => {
    try {
      if (!id) throw new Error("ID detail tidak ditemukan");
      await database.execute("DELETE FROM bundle_details WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error(`Error deleting bundle detail ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupBundleHandlers;
