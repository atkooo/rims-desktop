const { ipcMain, dialog } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const fs = require("fs").promises;
const path = require("path");
const { printPDF, openPDF } = require("../helpers/printUtils");
const { formatCurrency } = require("../helpers/formatUtils");
const { loadSettings } = require("../helpers/settingsUtils");
const ExcelJS = require("exceljs");
const {
  normalizeCode,
  sanitizeAvailable,
  toInteger,
  generateItemCode,
  getItemCodePrefix,
} = require("../helpers/codeUtils");

/**
 * Calculate item status based on stock quantities
 * @param {number} stockQuantity - Total stock quantity
 * @param {number} availableQuantity - Available quantity
 * @param {number} rentedQuantity - Currently rented quantity (from rental_transaction_details)
 * @returns {string} Status: 'OUT_OF_STOCK', 'AVAILABLE', 'RENTED', or 'MAINTENANCE'
 */
function calculateItemStatus(
  stockQuantity,
  availableQuantity,
  rentedQuantity = 0
) {
  // If no stock at all, item is out of stock
  if (stockQuantity === 0) {
    return "OUT_OF_STOCK";
  }

  // If has available items, status is available
  if (availableQuantity > 0) {
    return "AVAILABLE";
  }

  // If items are rented out, status is rented
  if (rentedQuantity > 0) {
    return "RENTED";
  }

  // If stock > 0 but available = 0 and not rented, assume maintenance
  if (stockQuantity > 0 && availableQuantity === 0) {
    return "MAINTENANCE";
  }

  // Default fallback
  return "OUT_OF_STOCK";
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
          dg.discount_amount,
          COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) AS rented_quantity,
          CASE
            WHEN i.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN i.available_quantity > 0 THEN 'AVAILABLE'
            WHEN COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) > 0 THEN 'RENTED'
            WHEN i.stock_quantity > 0 AND i.available_quantity = 0 THEN 'MAINTENANCE'
            ELSE 'OUT_OF_STOCK'
          END AS status
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        LEFT JOIN rental_transaction_details rtd ON rtd.item_id = i.id
        GROUP BY i.id
        ORDER BY i.id DESC
      `);
      return items;
    } catch (error) {
      logger.error("Error fetching items:", error);
      throw error;
    }
  });

  // Get item by code/barcode
  ipcMain.handle("items:getByCode", async (event, code) => {
    try {
      if (!code || typeof code !== "string") {
        return null;
      }

      const normalizedCode = normalizeCode(code.trim());
      const item = await database.queryOne(
        `
        SELECT
          i.*,
          c.name AS category_name,
          s.name AS size_name,
          s.code AS size_code,
          dg.name AS discount_group_name,
          dg.discount_percentage,
          dg.discount_amount,
          COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) AS rented_quantity,
          CASE
            WHEN i.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN i.available_quantity > 0 THEN 'AVAILABLE'
            WHEN COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) > 0 THEN 'RENTED'
            WHEN i.stock_quantity > 0 AND i.available_quantity = 0 THEN 'MAINTENANCE'
            ELSE 'OUT_OF_STOCK'
          END AS status
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        LEFT JOIN rental_transaction_details rtd ON rtd.item_id = i.id
        WHERE i.code = ? OR UPPER(i.code) = UPPER(?)
        GROUP BY i.id
        LIMIT 1
      `,
        [normalizedCode, code.trim()]
      );

      return item || null;
    } catch (error) {
      logger.error("Error fetching item by code:", error);
      throw error;
    }
  });

  // Get next item code based on type
  ipcMain.handle("items:getNextCode", async (event, type) => {
    try {
      const code = await generateItemCode(database, type || "RENTAL");
      return code;
    } catch (error) {
      logger.error("Error generating item code:", error);
      throw error;
    }
  });

  // Add new item
  ipcMain.handle("items:add", async (event, itemData) => {
    try {
      // Generate code based on type if not provided
      let code = (itemData.code || "").trim();
      if (!code) {
        const itemType = itemData.type || "RENTAL";
        code = await generateItemCode(database, itemType);
      } else {
        // Normalize provided code
        code = normalizeCode(code, itemData.name);
      }
      itemData.code = code;

      // Validasi input
      if (!validator.isNotEmpty(itemData.name)) {
        throw new Error("Nama item harus diisi");
      }
      if (!itemData.category_id) {
        throw new Error("Kategori harus dipilih");
      }

      // Map dailyRate to rental_price_per_day
      const rentalPricePerDay =
        itemData.dailyRate ?? itemData.rental_price_per_day ?? 0;

      // Get sale_price from itemData
      const salePrice = itemData.sale_price ?? 0;

      // Get purchase_price from itemData
      const purchasePrice = Math.max(0, Number(itemData.purchase_price ?? 0));

      // Validasi: harga beli tidak boleh lebih dari harga jual
      if (salePrice > 0 && purchasePrice > salePrice) {
        throw new Error("Harga beli tidak boleh lebih dari harga jual");
      }

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
      const discountGroupId = await validator.validateDiscountGroupId(
        itemData.discount_group_id
      );

      // Stok selalu 0 saat create, diatur melalui manajemen stok
      // Force stock_quantity dan available_quantity = 0
      const stockQuantity = 0;
      const availableQuantity = 0;

      // Get min_stock_alert from itemData, default to 1 agar tidak nol saat awal
      const minStockAlert = Math.max(
        0,
        toInteger(
          itemData.min_stock_alert === undefined ||
            itemData.min_stock_alert === null
            ? 1
            : itemData.min_stock_alert
        )
      );

      // Get deposit from itemData, default to 0
      const deposit = Math.max(0, Number(itemData.deposit ?? 0));

      const result = await database.execute(
        `INSERT INTO items (
            code,
            name,
            description,
            purchase_price,
            sale_price,
            type,
            size_id,
            category_id,
            rental_price_per_day,
            deposit,
            discount_group_id,
            stock_quantity,
            available_quantity,
            min_stock_alert,
            is_available_for_rent,
            is_available_for_sale,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          itemData.name,
          itemData.description ?? null,
          purchasePrice,
          salePrice,
          itemType,
          itemData.size_id ?? null,
          itemData.category_id,
          rentalPricePerDay,
          deposit,
          discountGroupId,
          stockQuantity,
          availableQuantity,
          minStockAlert,
          isAvailableForRent ? 1 : 0,
          isAvailableForSale ? 1 : 0,
          (itemData.is_active ?? true) ? 1 : 0,
        ]
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
          dg.discount_amount,
          COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) AS rented_quantity,
          CASE
            WHEN i.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN i.available_quantity > 0 THEN 'AVAILABLE'
            WHEN COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) > 0 THEN 'RENTED'
            WHEN i.stock_quantity > 0 AND i.available_quantity = 0 THEN 'MAINTENANCE'
            ELSE 'OUT_OF_STOCK'
          END AS status
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        LEFT JOIN rental_transaction_details rtd ON rtd.item_id = i.id
        WHERE i.id = ?
        GROUP BY i.id
        `,
        [result.id]
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
          dg.discount_amount,
          COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) AS rented_quantity,
          CASE
            WHEN i.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN i.available_quantity > 0 THEN 'AVAILABLE'
            WHEN COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) > 0 THEN 'RENTED'
            WHEN i.stock_quantity > 0 AND i.available_quantity = 0 THEN 'MAINTENANCE'
            ELSE 'OUT_OF_STOCK'
          END AS status
        FROM items i
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        LEFT JOIN rental_transaction_details rtd ON rtd.item_id = i.id
        WHERE i.id = ?
        GROUP BY i.id
      `,
        [id]
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
        "type",
        "size_id",
        "category_id",
        "purchase_price",
        "rental_price_per_day",
        "sale_price",
        "deposit",
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

      // Validasi: Type item tidak bisa diubah saat edit
      // Ambil item yang ada untuk mendapatkan type saat ini
      const existingItem = await database.queryOne(
        "SELECT type FROM items WHERE id = ?",
        [id]
      );

      if (!existingItem) {
        throw new Error("Item tidak ditemukan");
      }

      // Jika ada percobaan untuk mengubah type, tolak dengan error
      if (updates.type !== undefined && updates.type !== existingItem.type) {
        throw new Error(
          "Jenis item (type) tidak dapat diubah. Item yang sudah dibuat dengan jenis tertentu tidak dapat diubah jenisnya."
        );
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
        normalizedUpdates.discount_group_id =
          await validator.validateDiscountGroupId(updates.discount_group_id);
      }

      // Handle min_stock_alert if provided
      if (updates.min_stock_alert !== undefined) {
        normalizedUpdates.min_stock_alert = Math.max(
          0,
          toInteger(updates.min_stock_alert)
        );
      }

      // Handle deposit if provided
      if (updates.deposit !== undefined) {
        normalizedUpdates.deposit = Math.max(0, Number(updates.deposit ?? 0));
      }

      // Stok tidak bisa diubah dari form edit
      // Hapus stock_quantity dan available_quantity jika ada di updates
      // Stok hanya bisa diubah melalui manajemen stok
      if (updates.stock_quantity !== undefined) {
        logger.warn(
          `Ignoring stock_quantity update for item ${id} - stok hanya bisa diubah melalui manajemen stok`
        );
      }
      if (updates.available_quantity !== undefined) {
        logger.warn(
          `Ignoring available_quantity update for item ${id} - stok hanya bisa diubah melalui manajemen stok`
        );
      }

      // Status dihitung otomatis berdasarkan stok, tidak bisa diubah manual
      if (updates.status !== undefined) {
        logger.warn(
          `Ignoring status update for item ${id} - status dihitung otomatis berdasarkan stok`
        );
      }

      // Copy other valid fields
      for (const [key, value] of Object.entries(updates)) {
        // Skip fields that don't exist in database or already handled
        // Type tidak bisa diubah, jadi skip
        if (
          key === "dailyRate" ||
          key === "discount_group_id" ||
          key === "min_stock_alert" ||
          key === "deposit" ||
          key === "stock_quantity" ||
          key === "available_quantity" ||
          key === "type" || // Type tidak bisa diubah
          key === "status" // Status dihitung otomatis berdasarkan stok
        ) {
          continue;
        }
        if (validColumns.includes(key)) {
          normalizedUpdates[key] = value;
        }
      }

      // Validasi: harga beli tidak boleh lebih dari harga jual
      // Perlu mengambil nilai dari database jika salah satu tidak di-update
      if (
        normalizedUpdates.purchase_price !== undefined ||
        normalizedUpdates.sale_price !== undefined
      ) {
        // Ambil item yang ada untuk mendapatkan nilai yang tidak di-update
        const existingItem = await database.queryOne(
          "SELECT purchase_price, sale_price FROM items WHERE id = ?",
          [id]
        );

        const finalPurchasePrice =
          normalizedUpdates.purchase_price !== undefined
            ? Math.max(0, Number(normalizedUpdates.purchase_price))
            : (existingItem?.purchase_price ?? 0);

        const finalSalePrice =
          normalizedUpdates.sale_price !== undefined
            ? Math.max(0, Number(normalizedUpdates.sale_price))
            : (existingItem?.sale_price ?? 0);

        if (finalSalePrice > 0 && finalPurchasePrice > finalSalePrice) {
          throw new Error("Harga beli tidak boleh lebih dari harga jual");
        }

        // Set nilai yang sudah dinormalisasi
        if (normalizedUpdates.purchase_price !== undefined) {
          normalizedUpdates.purchase_price = finalPurchasePrice;
        }
        if (normalizedUpdates.sale_price !== undefined) {
          normalizedUpdates.sale_price = finalSalePrice;
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
          dg.discount_amount,
          COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) AS rented_quantity,
          CASE
            WHEN i.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN i.available_quantity > 0 THEN 'AVAILABLE'
            WHEN COALESCE(SUM(CASE WHEN rtd.is_returned = 0 THEN rtd.quantity ELSE 0 END), 0) > 0 THEN 'RENTED'
            WHEN i.stock_quantity > 0 AND i.available_quantity = 0 THEN 'MAINTENANCE'
            ELSE 'OUT_OF_STOCK'
          END AS status
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        LEFT JOIN discount_groups dg ON i.discount_group_id = dg.id
        LEFT JOIN rental_transaction_details rtd ON rtd.item_id = i.id
        WHERE i.id = ?
        GROUP BY i.id
        `,
        [id]
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
        [id]
      );
      if ((rentalCheck?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang digunakan dalam transaksi sewa"
        );
      }

      // Check if item is used in sales transactions
      const salesCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM sales_transaction_details WHERE item_id = ?",
        [id]
      );
      if ((salesCheck?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang digunakan dalam transaksi penjualan"
        );
      }

      // Check if item is used in stock movements
      const stockMovementCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM stock_movements WHERE item_id = ?",
        [id]
      );
      if ((stockMovementCheck?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang memiliki riwayat pergerakan stok"
        );
      }

      await database.execute("DELETE FROM items WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error("Error deleting item:", error);
      throw error;
    }
  });

  // Generate barcode label PDF for item
  async function generateBarcodeLabel(itemId, options = {}) {
    try {
      // Import jsPDF
      const jsPDFModule = require("jspdf");
      const jsPDF = jsPDFModule.jsPDF;

      if (!jsPDF || typeof jsPDF !== "function") {
        throw new Error(
          "jsPDF constructor not found. Please check jsPDF installation."
        );
      }

      // Get item data
      const item = await database.queryOne(
        `
        SELECT
          i.*,
          c.name AS category_name,
          s.name AS size_name,
          s.code AS size_code
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        WHERE i.id = ?
      `,
        [itemId]
      );

      if (!item) {
        throw new Error("Item tidak ditemukan");
      }

      // Import jsbarcode and canvas
      const JsBarcode = require("jsbarcode");
      const { createCanvas } = require("canvas");

      // Create canvas for barcode
      const canvas = createCanvas(200, 100);

      // Use JsBarcode - it works with node-canvas
      try {
        JsBarcode(canvas, item.code, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (barcodeError) {
        logger.error("Error generating barcode:", barcodeError);
        throw new Error("Gagal generate barcode: " + barcodeError.message);
      }

      // Convert canvas to buffer then to base64 data URL
      const buffer = canvas.toBuffer("image/png");
      const barcodeDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

      // Create PDF - Label size: 70mm x 40mm (standard label size)
      // Convert mm to points: 1mm = 2.83465 points
      const labelWidth = 70 * 2.83465; // ~198 points
      const labelHeight = 40 * 2.83465; // ~113 points
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [labelWidth, labelHeight],
      });

      // Set font
      doc.setFont("helvetica");

      // Background color (light gray)
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, labelWidth, labelHeight, "F");

      // Border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.rect(5, 5, labelWidth - 10, labelHeight - 10, "S");

      // Title - Item Name (forced to single line)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const nameY = 20;
      const maxNameWidth = labelWidth - 20;

      // Force single line - truncate if too long
      let itemNameText = item.name || "N/A";
      const itemNameLines = doc.splitTextToSize(itemNameText, maxNameWidth);
      if (itemNameLines.length > 1) {
        // If name is too long, truncate to fit one line
        // Use getTextWidth to find exact truncation point
        let truncated = itemNameText;
        const ellipsis = "...";
        while (
          doc.getTextWidth(truncated + ellipsis) > maxNameWidth &&
          truncated.length > 0
        ) {
          truncated = truncated.substring(0, truncated.length - 1);
        }
        itemNameText = truncated + ellipsis;
      }
      const nameHeight = 13; // Single line height
      doc.text(itemNameText, labelWidth / 2, nameY, {
        align: "center",
        maxWidth: maxNameWidth,
      });

      // Price - positioned after item name with proper spacing
      const priceY = nameY + nameHeight + 6; // Spacing after name
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 0);
      // Use sale_price if available, otherwise rental_price_per_day, or 0
      const displayPrice = item.sale_price || item.rental_price_per_day || 0;
      const priceText = formatCurrency(displayPrice);
      const priceHeight = 10; // Height for price line
      doc.text(priceText, labelWidth / 2, priceY, { align: "center" });

      const sizeLabel = (item.size_name || item.size_code || "").trim();
      const hasSizeLabel = sizeLabel.length > 0;
      const sizeLineHeight = hasSizeLabel ? 9 : 0;
      const sizeSpacing = hasSizeLabel ? 4 : 0;
      if (hasSizeLabel) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(
          `Ukuran: ${sizeLabel}`,
          labelWidth / 2,
          priceY + priceHeight + sizeSpacing,
          {
            align: "center",
            maxWidth: maxNameWidth,
          }
        );
      }

      // Barcode image - fixed size, consistent, within border
      const borderTop = 5;
      const borderBottom = labelHeight - 5;
      const borderLeft = 5;
      const borderRight = labelWidth - 5;
      const barcodeSpacing = 6; // Spacing after price/size
      const marginBottom = 5; // Margin from bottom border

      // Calculate available space for barcode
      const codeY =
        priceY + priceHeight + sizeSpacing + sizeLineHeight + barcodeSpacing;
      const availableHeight = borderBottom - codeY - marginBottom;

      // Fixed barcode size (consistent) but ensure it fits within border
      let barcodeHeight = 40; // Preferred height
      let barcodeWidth = (barcodeHeight / 50) * 150; // Maintain aspect ratio

      // Check if barcode fits vertically
      if (codeY + barcodeHeight > borderBottom - marginBottom) {
        // Adjust height to fit
        barcodeHeight = Math.max(25, borderBottom - codeY - marginBottom);
        barcodeWidth = (barcodeHeight / 50) * 150;
      }

      // Check if barcode fits horizontally
      let barcodeX = (labelWidth - barcodeWidth) / 2;
      if (barcodeX < borderLeft) {
        barcodeX = borderLeft;
        // If still too wide, reduce size
        if (barcodeX + barcodeWidth > borderRight) {
          barcodeWidth = borderRight - borderLeft;
          barcodeHeight = (barcodeWidth / 150) * 50;
        }
      } else if (barcodeX + barcodeWidth > borderRight) {
        barcodeX = borderRight - barcodeWidth;
        // If still too wide, reduce size
        if (barcodeX < borderLeft) {
          barcodeX = borderLeft;
          barcodeWidth = borderRight - borderLeft;
          barcodeHeight = (barcodeWidth / 150) * 50;
        }
      }

      // Ensure barcode doesn't exceed bottom border
      if (codeY + barcodeHeight > borderBottom - marginBottom) {
        // Adjust Y position to fit
        const adjustedCodeY = borderBottom - marginBottom - barcodeHeight;
        doc.addImage(
          barcodeDataUrl,
          "PNG",
          barcodeX,
          adjustedCodeY,
          barcodeWidth,
          barcodeHeight
        );
      } else {
        // Add barcode at calculated position
        doc.addImage(
          barcodeDataUrl,
          "PNG",
          barcodeX,
          codeY,
          barcodeWidth,
          barcodeHeight
        );
      }

      // Save PDF
      const { app } = require("electron");
      const userDataPath = app.getPath("userData");
      const labelsDir = path.join(userDataPath, "labels");
      await fs.mkdir(labelsDir, { recursive: true });

      const fileName = `label_${item.code}_${Date.now()}.pdf`;
      const filePath = path.join(labelsDir, fileName);

      // Save PDF
      doc.save(filePath);

      logger.info(`Barcode label generated: ${filePath}`);

      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error) {
      logger.error("Error generating barcode label:", error);
      throw error;
    }
  }

  // Generate barcode label
  ipcMain.handle("items:generateBarcodeLabel", async (event, itemId) => {
    try {
      return await generateBarcodeLabel(itemId);
    } catch (error) {
      logger.error("Error in generateBarcodeLabel handler:", error);
      throw error;
    }
  });

  // Print barcode label
  ipcMain.handle(
    "items:printBarcodeLabel",
    async (event, { itemId, printerName, silent = false }) => {
      try {
        // Generate label first
        const result = await generateBarcodeLabel(itemId);

        // If printer name is provided, print directly to that printer
        if (printerName) {
          return await printPDF(result.filePath, printerName, silent);
        } else {
          // No printer specified, open PDF in default viewer
          return await openPDF(result.filePath);
        }
      } catch (error) {
        logger.error("Error printing barcode label:", error);
        throw error;
      }
    }
  );

  // Helper function to generate bulk labels in one PDF
  async function generateBulkLabelsPDF(itemIds, options = {}) {
    try {
      const jsPDFModule = require("jspdf");
      const jsPDF = jsPDFModule.jsPDF;
      const JsBarcode = require("jsbarcode");
      const { createCanvas } = require("canvas");

      if (!jsPDF || typeof jsPDF !== "function") {
        throw new Error(
          "jsPDF constructor not found. Please check jsPDF installation."
        );
      }

      const resolvedOptions = {
        paperWidth: 58,
        labelHeight: 38,
        spacing: 1.5,
        margin: 3,
        saveFile: true,
        previewPadding: 0,
        ...options,
      };

      const placeholders = itemIds.map(() => "?").join(",");
      const items = await database.query(
        `
        SELECT
          i.*,
          c.name AS category_name,
          s.name AS size_name,
          s.code AS size_code
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_sizes s ON i.size_id = s.id
        WHERE i.id IN (${placeholders})
        ORDER BY i.code
      `,
        itemIds
      );

      if (items.length === 0) {
        throw new Error("Tidak ada item yang ditemukan");
      }

      const {
        paperWidth,
        labelHeight,
        spacing,
        margin,
        saveFile,
        previewPadding,
      } = resolvedOptions;

      const totalHeight =
        margin * 2 +
        items.length * labelHeight +
        Math.max(0, items.length - 1) * spacing +
        2 +
        previewPadding;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [
          paperWidth,
          Math.max(totalHeight, labelHeight + margin * 2 + 2),
        ],
      });

      // Draw labels vertically to mimic a thermal roll
      let currentY = margin;

      for (const item of items) {
        const labelTop = currentY;
        const labelBottom = labelTop + labelHeight;
        const effectiveMargin =
          items.length === 1 ? Math.min(margin, 2) : margin;
        const contentWidth = paperWidth - effectiveMargin * 2;
        const centerX = paperWidth / 2;

        // Background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, labelTop, paperWidth, labelHeight, "F");
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.rect(
          effectiveMargin / 2,
          labelTop + effectiveMargin / 2,
          paperWidth - effectiveMargin,
          labelHeight - effectiveMargin,
          "S"
        );

        let cursorY = labelTop + 4;
        const maxNameLines = 2;
        const nameText = (item.name || "N/A").trim();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);

        const nameLines = doc
          .splitTextToSize(nameText, contentWidth - 2)
          .slice(0, maxNameLines);
        for (const line of nameLines) {
          doc.text(line, centerX, cursorY, { align: "center" });
          cursorY += 3.5;
        }

        // Price
        const displayPrice = item.sale_price || item.rental_price_per_day || 0;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 100, 0);
        doc.text(formatCurrency(displayPrice), centerX, cursorY, {
          align: "center",
        });
        cursorY += 3.5;

        // Size info
        const sizeLabel = (item.size_name || item.size_code || "").trim();
        if (sizeLabel) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(75, 75, 75);
          doc.text(`Ukuran: ${sizeLabel}`, centerX, cursorY, {
            align: "center",
          });
          cursorY += 3;
        }

        // Barcode area
        const barcodeHeight = 20;
        const barcodeTop = Math.max(
          cursorY + 1,
          labelBottom - effectiveMargin - barcodeHeight - 1
        );
        const barcodeWidth = contentWidth;
        const barcodeCanvas = createCanvas(400, 120);
        try {
          JsBarcode(barcodeCanvas, item.code, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            margin: 10,
          });
        } catch (barcodeError) {
          logger.error(
            `Error generating barcode for item ${item.id}:`,
            barcodeError
          );
        }
        const barcodeBuffer = barcodeCanvas.toBuffer("image/png");
        const barcodeDataUrl = `data:image/png;base64,${barcodeBuffer.toString(
          "base64"
        )}`;
        const maxBarcodeWidth = Math.max(contentWidth - 4, 1);
        const barcodeDrawWidth = Math.min(barcodeWidth, maxBarcodeWidth);
        doc.addImage(
          barcodeDataUrl,
          "PNG",
          effectiveMargin + (contentWidth - barcodeDrawWidth) / 2,
          barcodeTop,
          barcodeDrawWidth,
          barcodeHeight
        );

        currentY += labelHeight + spacing;
      }

      const pdfBase64 = doc.output("datauristring");
      const pdfArrayBuffer = doc.output("arraybuffer");
      const pdfBuffer = Buffer.from(pdfArrayBuffer);

      let filePath = null;
      let fileName = null;
      if (saveFile) {
        const { app } = require("electron");
        const userDataPath = app.getPath("userData");
        const labelsDir = path.join(userDataPath, "labels");
        await fs.mkdir(labelsDir, { recursive: true });
        fileName = `bulk_labels_${Date.now()}.pdf`;
        filePath = path.join(labelsDir, fileName);
        await fs.writeFile(filePath, pdfBuffer);
        logger.info(
          `Generated bulk labels PDF with ${items.length} labels: ${filePath}`
        );
      } else {
        logger.info(
          `Generated bulk labels preview with ${items.length} labels`
        );
      }

      return {
        success: true,
        filePath,
        fileName,
        labelCount: items.length,
        pdfBase64,
        paperWidth,
        totalHeight: Math.max(totalHeight, labelHeight + margin * 2 + 2),
      };
    } catch (error) {
      logger.error("Error generating bulk labels PDF:", error);
      throw error;
    }
  }

  // Generate bulk labels (multiple items)
  ipcMain.handle("items:generateBulkLabels", async (event, { itemIds }) => {
    try {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error("Item IDs harus berupa array yang tidak kosong");
      }

      const result = await generateBulkLabelsPDF(itemIds);

      return {
        success: true,
        filePaths: [result.filePath],
        labelCount: result.labelCount,
      };
    } catch (error) {
      logger.error("Error in generateBulkLabels handler:", error);
      throw error;
    }
  });

  ipcMain.handle("items:previewBulkLabels", async (event, { itemIds }) => {
    try {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error("Item IDs harus berupa array yang tidak kosong");
      }

      const preview = await generateBulkLabelsPDF(itemIds, {
        saveFile: false,
        previewPadding: 60,
      });

      return {
        success: true,
        pdfBase64: preview.pdfBase64,
        paperWidth: preview.paperWidth,
        totalHeight: preview.totalHeight,
        labelCount: preview.labelCount,
      };
    } catch (error) {
      logger.error("Error in previewBulkLabels handler:", error);
      throw error;
    }
  });

  // Print bulk labels
  ipcMain.handle(
    "items:printBulkLabels",
    async (event, { itemIds, printerName, silent = false }) => {
      try {
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
          throw new Error("Item IDs harus berupa array yang tidak kosong");
        }

        // Generate single PDF with all labels
        const result = await generateBulkLabelsPDF(itemIds);
        if (!result.filePath) {
          throw new Error("Gagal membuat file label untuk dicetak");
        }

        const settings = await loadSettings();
        const useSharedPrinter =
          settings.useReceiptPrinterForLabels !== false &&
          typeof settings.printer === "string" &&
          settings.printer.trim().length > 0;
        const receiptPrinterName = useSharedPrinter ? settings.printer : null;
        const targetPrinter = printerName || receiptPrinterName;

        // Print the single PDF
        try {
          if (targetPrinter) {
            const thermalOptions = {
              paperSize: settings.thermalPaperSize || "58",
              autoCut: settings.thermalAutoCut || false,
              printDensity: settings.thermalPrintDensity || "normal",
            };
            await printPDF(
              result.filePath,
              targetPrinter,
              silent,
              thermalOptions
            );
          } else {
            await openPDF(result.filePath);
          }

          logger.info(
            `Printed bulk labels PDF with ${result.labelCount} labels`
          );

          return {
            success: true,
            printed: result.labelCount,
            filePath: result.filePath,
          };
        } catch (error) {
          logger.error(`Error printing bulk labels PDF:`, error);
          throw error;
        }
      } catch (error) {
        logger.error("Error in printBulkLabels handler:", error);
        throw error;
      }
    }
  );

  // Download bulk labels
  ipcMain.handle("items:downloadBulkLabels", async (event, { itemIds }) => {
    try {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error("Item IDs harus berupa array yang tidak kosong");
      }

      // Generate single PDF with all labels
      const result = await generateBulkLabelsPDF(itemIds);

      // Show save dialog
      const timestamp = new Date().toISOString().split("T")[0];
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        title: "Download Label PDF",
        defaultPath: `bulk_labels_${timestamp}.pdf`,
        filters: [
          { name: "PDF Files", extensions: ["pdf"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (canceled || !savePath) {
        return {
          success: false,
          error: "Download dibatalkan",
        };
      }

      // Copy generated PDF to user-selected location
      await fs.copyFile(result.filePath, savePath);

      logger.info(`Downloaded bulk labels PDF to: ${savePath}`);

      return {
        success: true,
        filePath: savePath,
        labelCount: result.labelCount,
      };
    } catch (error) {
      logger.error("Error in downloadBulkLabels handler:", error);
      throw error;
    }
  });

  // Download template Excel for bulk import
  ipcMain.handle("items:downloadTemplate", async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Items Template");

      // Get categories, sizes, and discount groups for reference
      const categories = await database.query(
        "SELECT id, name FROM categories WHERE is_active = 1 ORDER BY name"
      );
      const sizes = await database.query(
        "SELECT id, code, name FROM item_sizes WHERE is_active = 1 ORDER BY name"
      );
      const discountGroups = await database.query(
        "SELECT id, name FROM discount_groups WHERE is_active = 1 ORDER BY name"
      );

      // Define headers
      const headers = [
        "Nama*",
        "Kategori*",
        "Ukuran",
        "Deskripsi",
        "Harga Beli",
        "Harga Sewa/Hari",
        "Harga Jual",
        "Deposit",
        "Tipe*",
        "Min Stok Alert",
        "Grup Diskon",
      ];

      // Set headers
      worksheet.addRow(headers);

      // Style header row - hanya kolom yang digunakan
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      // Set warna background hanya untuk sel yang digunakan (kolom A sampai L = 12 kolom)
      for (let col = 1; col <= headers.length; col++) {
        const cell = headerRow.getCell(col);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Set column widths
      worksheet.columns = [
        { width: 30 }, // Nama
        { width: 20 }, // Kategori
        { width: 15 }, // Ukuran
        { width: 40 }, // Deskripsi
        { width: 15 }, // Harga Beli
        { width: 15 }, // Harga Sewa/Hari
        { width: 15 }, // Harga Jual
        { width: 15 }, // Deposit
        { width: 15 }, // Tipe
        { width: 15 }, // Min Stok Alert
        { width: 20 }, // Grup Diskon
      ];

      // Add data validation for categories
      worksheet.dataValidations.add("B2:B1000", {
        type: "list",
        allowBlank: true,
        formulae: [`"${categories.map((c) => c.name).join(",")}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Category",
        error: "Pilih kategori dari daftar yang tersedia",
      });

      // Add data validation for sizes (gunakan code, bukan name)
      worksheet.dataValidations.add("C2:C1000", {
        type: "list",
        allowBlank: true,
        formulae: [`"${sizes.map((s) => s.code).join(",")}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Size",
        error:
          "Pilih ukuran dari daftar yang tersedia (gunakan code: M, L, XXL, dll)",
      });

      // Add data validation for type
      worksheet.dataValidations.add("I2:I1000", {
        type: "list",
        allowBlank: false,
        formulae: ['"RENTAL,SALE,BOTH"'],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Type",
        error: "Pilih RENTAL, SALE, atau BOTH",
      });

      // Add data validation for discount groups
      if (discountGroups.length > 0) {
        worksheet.dataValidations.add("K2:K1000", {
          type: "list",
          allowBlank: true,
          formulae: [`"${discountGroups.map((dg) => dg.name).join(",")}"`],
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "Invalid Discount Group",
          error: "Pilih grup diskon dari daftar yang tersedia",
        });
      }

      // Add instruction row
      worksheet.insertRow(2, [
        "Contoh: Baju Pengantin",
        "Pilih dari dropdown",
        "Pilih dari dropdown (opsional)",
        "Deskripsi item",
        "0",
        "50000",
        "100000",
        "200000",
        "RENTAL",
        "1",
        "Nama grup diskon (opsional)",
      ]);

      // Style instruction row
      const instructionRow = worksheet.getRow(2);
      instructionRow.font = { italic: true, color: { argb: "FF6B7280" } };
      instructionRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };

      // Add note sheet
      const noteSheet = workbook.addWorksheet("Panduan");
      noteSheet.addRow(["PANDUAN PENGISIAN TEMPLATE ITEMS"]);
      noteSheet.addRow([]);
      noteSheet.addRow(["Kolom dengan tanda * wajib diisi"]);
      noteSheet.addRow([]);
      noteSheet.addRow(["Nama: Nama item (wajib)"]);
      noteSheet.addRow(["Kategori: Pilih dari dropdown (wajib)"]);
      noteSheet.addRow([
        "Ukuran: Pilih code ukuran dari dropdown (opsional) - contoh: M, L, XL, XXL",
      ]);
      noteSheet.addRow(["Tipe: RENTAL, SALE, atau BOTH (wajib)"]);
      noteSheet.addRow([
        "CATATAN: Status dihitung otomatis berdasarkan stok (AVAILABLE/RENTED/MAINTENANCE)",
      ]);
      noteSheet.addRow([
        "CATATAN: Tersedia untuk Sewa/Jual dan Aktif otomatis di-set berdasarkan Tipe",
      ]);
      noteSheet.addRow([]);
      noteSheet.addRow(["CATATAN:"]);
      noteSheet.addRow(["1. Hapus baris contoh sebelum mengisi data"]);
      noteSheet.addRow([
        "2. Stok akan diatur ke 0 saat import (atur melalui manajemen stok)",
      ]);
      noteSheet.addRow(["3. Kode akan dibuat otomatis oleh sistem"]);
      noteSheet.addRow([
        "4. Pastikan format angka untuk harga menggunakan titik (.) sebagai desimal",
      ]);

      // Save file
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Simpan Template Items",
        defaultPath: "Template_Items.xlsx",
        filters: [
          { name: "Excel Files", extensions: ["xlsx"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: "Download dibatalkan" };
      }

      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath };
    } catch (error) {
      logger.error("Error downloading items template:", error);
      throw error;
    }
  });

  // Import items from Excel
  ipcMain.handle("items:importExcel", async (event, filePath) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet =
        workbook.getWorksheet("Items Template") || workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("Worksheet tidak ditemukan");
      }

      // Get reference data
      const categories = await database.query(
        "SELECT id, name FROM categories WHERE is_active = 1"
      );
      const sizes = await database.query(
        "SELECT id, code, name FROM item_sizes WHERE is_active = 1"
      );
      const discountGroups = await database.query(
        "SELECT id, name FROM discount_groups WHERE is_active = 1"
      );

      const categoryMap = new Map(
        categories.map((c) => [c.name.toLowerCase(), c.id])
      );
      // Gunakan code untuk ukuran (M, L, XXL, dll), bukan name
      const sizeMap = new Map(sizes.map((s) => [s.code.toUpperCase(), s.id]));
      const discountGroupMap = new Map(
        discountGroups.map((dg) => [dg.name.toLowerCase(), dg.id])
      );

      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      await database.execute("BEGIN TRANSACTION");

      try {
        // Skip header and instruction rows (rows 1-2)
        for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);

          // Skip empty rows
          if (
            !row.getCell(1).value ||
            !row.getCell(1).value.toString().trim()
          ) {
            continue;
          }

          try {
            const name = (row.getCell(1).value || "").toString().trim();
            const categoryName = (row.getCell(2).value || "").toString().trim();
            const sizeCode =
              (row.getCell(3).value || "").toString().trim() || null;
            const description =
              (row.getCell(4).value || "").toString().trim() || null;
            const purchasePrice = parseFloat(row.getCell(5).value || 0) || 0;
            const rentalPricePerDay =
              parseFloat(row.getCell(6).value || 0) || 0;
            const salePrice = parseFloat(row.getCell(7).value || 0) || 0;
            const deposit = parseFloat(row.getCell(8).value || 0) || 0;
            const type = (row.getCell(9).value || "RENTAL")
              .toString()
              .trim()
              .toUpperCase();
            // Status dihitung otomatis berdasarkan stok, tidak perlu dari Excel
            const minStockAlert = parseInt(row.getCell(10).value || 1) || 1;
            const discountGroupName =
              (row.getCell(11).value || "").toString().trim() || null;

            // Auto-set is_available_for_rent dan is_available_for_sale berdasarkan tipe item
            const getAvailabilityByType = (type) => {
              if (type === "RENTAL") {
                return {
                  is_available_for_rent: true,
                  is_available_for_sale: false,
                };
              } else if (type === "SALE") {
                return {
                  is_available_for_rent: false,
                  is_available_for_sale: true,
                };
              } else if (type === "BOTH") {
                return {
                  is_available_for_rent: true,
                  is_available_for_sale: true,
                };
              }
              return {
                is_available_for_rent: true,
                is_available_for_sale: false,
              };
            };

            const availability = getAvailabilityByType(type);
            const isAvailableForRent = availability.is_available_for_rent;
            const isAvailableForSale = availability.is_available_for_sale;
            const isActive = true; // Default aktif

            // Validation
            if (!name) {
              throw new Error("Nama wajib diisi");
            }

            if (!categoryName) {
              throw new Error("Kategori wajib diisi");
            }

            // Validasi status
            // Status dihitung otomatis berdasarkan stok, tidak perlu validasi

            const categoryId = categoryMap.get(categoryName.toLowerCase());
            if (!categoryId) {
              throw new Error(`Kategori "${categoryName}" tidak ditemukan`);
            }

            let sizeId = null;
            if (sizeCode) {
              // Gunakan code (M, L, XXL, dll) untuk mencocokkan ukuran
              sizeId = sizeMap.get(sizeCode.toUpperCase());
              if (!sizeId) {
                throw new Error(
                  `Ukuran dengan code "${sizeCode}" tidak ditemukan`
                );
              }
            }

            let discountGroupId = null;
            if (discountGroupName) {
              discountGroupId = discountGroupMap.get(
                discountGroupName.toLowerCase()
              );
              if (!discountGroupId) {
                throw new Error(
                  `Grup diskon "${discountGroupName}" tidak ditemukan`
                );
              }
            }

            // Generate code automatically
            const finalCode = await generateItemCode(database, type);

            // Insert item
            // Status dihitung otomatis berdasarkan stok
            await database.execute(
              `INSERT INTO items (
                code, name, description, sale_price, type,
                size_id, category_id, rental_price_per_day, deposit,
                discount_group_id, stock_quantity, available_quantity,
                min_stock_alert, is_available_for_rent, is_available_for_sale,
                is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                finalCode,
                name,
                description,
                salePrice,
                type,
                sizeId,
                categoryId,
                rentalPricePerDay,
                deposit,
                discountGroupId,
                0, // stock_quantity
                0, // available_quantity
                minStockAlert,
                isAvailableForRent ? 1 : 0,
                isAvailableForSale ? 1 : 0,
                isActive ? 1 : 0,
              ]
            );

            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              error: error.message || "Error tidak diketahui",
            });
            logger.error(`Error importing row ${rowNum}:`, error);
          }
        }

        await database.execute("COMMIT");
        return results;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error importing items from Excel:", error);
      throw error;
    }
  });
}

module.exports = setupItemHandlers;
