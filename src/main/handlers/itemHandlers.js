const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { normalizeCode } = require("../helpers/codeUtils");

// Helper function untuk memastikan available_quantity tidak melebihi stock_quantity
function sanitizeAvailable(stock, available) {
  const toInteger = (val) => {
    const num = Number(val);
    return Number.isNaN(num) ? 0 : Math.max(0, Math.floor(num));
  };
  const stockQty = Math.max(0, toInteger(stock));
  const availableQty = Math.max(0, toInteger(available));
  return Math.min(stockQty, availableQty);
}

// Setup item handlers
function setupItemHandlers() {
  // Get all items
  ipcMain.handle("items:getAll", async () => {
    try {
      const items = await database.query(`
        SELECT
          i.*,
          c.name AS category_name,
          s.name AS size_name,
          s.code AS size_code,
          dg.name AS discount_group_name,
          dg.discount_percentage,
          dg.discount_amount
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
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

      // Map dailyRate to rental_price_per_day
      const rentalPricePerDay =
        itemData.dailyRate ?? itemData.rental_price_per_day ?? 0;
      
      // Get sale_price from itemData
      const salePrice = itemData.sale_price ?? 0;

      // Auto-set is_available_for_rent dan is_available_for_sale berdasarkan tipe item
      const itemType = itemData.type ?? "RENTAL";
      const getAvailabilityByType = (type) => {
        if (type === "RENTAL") {
          return { is_available_for_rent: true, is_available_for_sale: false };
        } else if (type === "SALE") {
          return { is_available_for_rent: false, is_available_for_sale: true };
        } else if (type === "BOTH") {
          return { is_available_for_rent: true, is_available_for_sale: true };
        }
        return { is_available_for_rent: true, is_available_for_sale: false };
      };
      
      const availability = getAvailabilityByType(itemType);
      const isAvailableForRent = availability.is_available_for_rent;
      const isAvailableForSale = availability.is_available_for_sale;

      // Validate discount_group_id if provided
      let discountGroupId = null;
      if (
        itemData.discount_group_id !== undefined &&
        itemData.discount_group_id !== null &&
        itemData.discount_group_id !== ""
      ) {
        discountGroupId = Number(itemData.discount_group_id);
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

      // Handle stock_quantity and available_quantity with validation
      const stockQuantity = Math.max(0, Number(itemData.stock_quantity) || 0);
      const requestedAvailable = itemData.available_quantity !== undefined 
        ? Number(itemData.available_quantity) || 0
        : stockQuantity; // Default to stock_quantity if not provided
      
      // Sanitize available_quantity to not exceed stock_quantity
      const availableQuantity = sanitizeAvailable(stockQuantity, requestedAvailable);

      const result = await database.execute(
        `INSERT INTO items (
            code,
            name,
            description,
            price,
            sale_price,
            type,
            status,
            size_id,
            category_id,
            rental_price_per_day,
            discount_group_id,
            stock_quantity,
            available_quantity,
            is_available_for_rent,
            is_available_for_sale,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          itemData.name,
          itemData.description ?? null,
          itemData.price,
          salePrice,
          itemType,
          itemData.status ?? "AVAILABLE",
          itemData.size_id ?? null,
          itemData.category_id,
          rentalPricePerDay,
          discountGroupId,
          stockQuantity,
          availableQuantity,
          isAvailableForRent ? 1 : 0,
          isAvailableForSale ? 1 : 0,
          (itemData.is_active ?? true) ? 1 : 0,
        ],
      );

      // Return item yang baru dibuat dengan JOIN untuk category_name dan size_name
      const newItem = await database.queryOne(
        `
        SELECT
          i.*,
          c.name AS category_name,
          s.name AS size_name,
          s.code AS size_code,
          dg.name AS discount_group_name,
          dg.discount_percentage,
          dg.discount_amount
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        WHERE i.id = ?
        `,
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
          c.name AS category_name,
          dg.name AS discount_group_name,
          dg.discount_percentage,
          dg.discount_amount
        FROM items i
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
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
      if (updates.name !== undefined && !validator.isNotEmpty(updates.name)) {
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

      // Map form fields to database columns and filter out invalid fields
      const validColumns = [
        "code",
        "name",
        "description",
        "price",
        "type",
        "status",
        "size_id",
        "category_id",
        "purchase_price",
        "rental_price_per_day",
        "sale_price",
        "stock_quantity",
        "available_quantity",
        "min_stock_alert",
        "image_path",
        "is_available_for_rent",
        "is_available_for_sale",
        "is_active",
        "discount_group_id",
      ];

      const normalizedUpdates = {};

      // Auto-set is_available_for_rent dan is_available_for_sale berdasarkan tipe item jika type di-update
      if (updates.type !== undefined) {
        const getAvailabilityByType = (type) => {
          if (type === "RENTAL") {
            return { is_available_for_rent: 1, is_available_for_sale: 0 };
          } else if (type === "SALE") {
            return { is_available_for_rent: 0, is_available_for_sale: 1 };
          } else if (type === "BOTH") {
            return { is_available_for_rent: 1, is_available_for_sale: 1 };
          }
          return { is_available_for_rent: 1, is_available_for_sale: 0 };
        };
        
        const availability = getAvailabilityByType(updates.type);
        normalizedUpdates.is_available_for_rent = availability.is_available_for_rent;
        normalizedUpdates.is_available_for_sale = availability.is_available_for_sale;
      }

      // Map dailyRate or rental_price_per_day to rental_price_per_day
      // Priority: rental_price_per_day > dailyRate
      if (updates.rental_price_per_day !== undefined) {
        normalizedUpdates.rental_price_per_day = updates.rental_price_per_day;
      } else if (updates.dailyRate !== undefined) {
        normalizedUpdates.rental_price_per_day = updates.dailyRate;
      }

      // Validate discount_group_id if provided
      if (updates.discount_group_id !== undefined) {
        if (
          updates.discount_group_id === null ||
          updates.discount_group_id === ""
        ) {
          normalizedUpdates.discount_group_id = null;
        } else {
          const discountGroupId = Number(updates.discount_group_id);
          if (discountGroupId) {
            const discountGroup = await database.queryOne(
              "SELECT id FROM discount_groups WHERE id = ?",
              [discountGroupId],
            );
            if (!discountGroup) {
              throw new Error("Grup diskon tidak ditemukan");
            }
            normalizedUpdates.discount_group_id = discountGroupId;
          } else {
            normalizedUpdates.discount_group_id = null;
          }
        }
      }

      // Handle stock_quantity and available_quantity with validation
      if (updates.stock_quantity !== undefined) {
        normalizedUpdates.stock_quantity = Math.max(0, Number(updates.stock_quantity) || 0);
      }

      if (updates.available_quantity !== undefined) {
        // Get current stock_quantity (from updates or database)
        let currentStock = normalizedUpdates.stock_quantity;
        if (currentStock === undefined) {
          const currentItem = await database.queryOne(
            "SELECT stock_quantity FROM items WHERE id = ?",
            [id],
          );
          currentStock = currentItem?.stock_quantity ?? 0;
        }
        
        // Sanitize available_quantity to not exceed stock_quantity
        normalizedUpdates.available_quantity = sanitizeAvailable(
          currentStock,
          updates.available_quantity
        );
      } else if (normalizedUpdates.stock_quantity !== undefined) {
        // If stock_quantity is updated but available_quantity is not,
        // clamp existing available_quantity to new stock value
        const currentItem = await database.queryOne(
          "SELECT available_quantity FROM items WHERE id = ?",
          [id],
        );
        const currentAvailable = currentItem?.available_quantity ?? 0;
        normalizedUpdates.available_quantity = sanitizeAvailable(
          normalizedUpdates.stock_quantity,
          currentAvailable
        );
      }

      // Copy other valid fields
      for (const [key, value] of Object.entries(updates)) {
        // Skip fields that don't exist in database or already handled
        if (
          key === "dailyRate" ||
          key === "weeklyRate" ||
          key === "deposit" ||
          key === "discount_group_id" ||
          key === "stock_quantity" ||
          key === "available_quantity"
        ) {
          continue;
        }
        if (validColumns.includes(key)) {
          normalizedUpdates[key] = value;
        }
      }

      // Normalize code if provided
      if (normalizedUpdates.code !== undefined) {
        normalizedUpdates.code = normalizeCode(normalizedUpdates.code);
      }

      if (Object.keys(normalizedUpdates).length === 0) {
        throw new Error("Tidak ada field yang valid untuk diupdate");
      }

      const fields = Object.keys(normalizedUpdates);
      const values = Object.values(normalizedUpdates);
      const sql = `UPDATE items SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`;

      await database.execute(sql, [...values, id]);

      // Return updated item dengan JOIN untuk category_name dan size_name
      const updatedItem = await database.queryOne(
        `
        SELECT
          i.*,
          c.name AS category_name,
          s.name AS size_name,
          s.code AS size_code,
          dg.name AS discount_group_name,
          dg.discount_percentage,
          dg.discount_amount
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        WHERE i.id = ?
        `,
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
      // Check if item is used in rental transactions
      const rentalCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM rental_transaction_details WHERE item_id = ?",
        [id],
      );
      if (rentalCheck && rentalCheck.count > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang digunakan dalam transaksi sewa",
        );
      }

      // Check if item is used in sales transactions
      const salesCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM sales_transaction_details WHERE item_id = ?",
        [id],
      );
      if (salesCheck && salesCheck.count > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang digunakan dalam transaksi penjualan",
        );
      }


      // Check if item is used in stock movements
      const stockMovementCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM stock_movements WHERE item_id = ?",
        [id],
      );
      if (stockMovementCheck && stockMovementCheck.count > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang memiliki riwayat pergerakan stok",
        );
      }

      await database.execute("DELETE FROM items WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error("Error deleting item:", error);
      throw error;
    }
  });
}

module.exports = setupItemHandlers;
