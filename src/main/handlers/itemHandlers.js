const { ipcMain, dialog } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const fs = require("fs").promises;
const path = require("path");
const { printPDF, openPDF } = require("../helpers/printUtils");
const { formatCurrency } = require("../helpers/formatUtils");
const ExcelJS = require("exceljs");
const {
  normalizeCode,
  sanitizeAvailable,
  toInteger,
  generateItemCode,
} = require("../helpers/codeUtils");

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
      const discountGroupId = await validator.validateDiscountGroupId(
        itemData.discount_group_id,
      );

      // Stok selalu 0 saat create, diatur melalui manajemen stok
      // Force stock_quantity dan available_quantity = 0
      const stockQuantity = 0;
      const availableQuantity = 0;
      
      // Get min_stock_alert from itemData, default to 1 agar tidak nol saat awal
      const minStockAlert = Math.max(
        0,
        toInteger(
          itemData.min_stock_alert === undefined || itemData.min_stock_alert === null
            ? 1
            : itemData.min_stock_alert,
        ),
      );

      // Get deposit from itemData, default to 0
      const deposit = Math.max(0, Number(itemData.deposit ?? 0));

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
            deposit,
            discount_group_id,
            stock_quantity,
            available_quantity,
            min_stock_alert,
            is_available_for_rent,
            is_available_for_sale,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          deposit,
          discountGroupId,
          stockQuantity,
          availableQuantity,
          minStockAlert,
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
        normalizedUpdates.discount_group_id = await validator.validateDiscountGroupId(
          updates.discount_group_id,
        );
      }

      // Handle min_stock_alert if provided
      if (updates.min_stock_alert !== undefined) {
        normalizedUpdates.min_stock_alert = Math.max(
          0,
          toInteger(updates.min_stock_alert),
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
        logger.warn(`Ignoring stock_quantity update for item ${id} - stok hanya bisa diubah melalui manajemen stok`);
      }
      if (updates.available_quantity !== undefined) {
        logger.warn(`Ignoring available_quantity update for item ${id} - stok hanya bisa diubah melalui manajemen stok`);
      }

      // Copy other valid fields
      for (const [key, value] of Object.entries(updates)) {
        // Skip fields that don't exist in database or already handled
        if (
          key === "dailyRate" ||
          key === "weeklyRate" ||
          key === "discount_group_id" ||
          key === "min_stock_alert" ||
          key === "deposit" ||
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
      if ((rentalCheck?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang digunakan dalam transaksi sewa",
        );
      }

      // Check if item is used in sales transactions
      const salesCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM sales_transaction_details WHERE item_id = ?",
        [id],
      );
      if ((salesCheck?.count ?? 0) > 0) {
        throw new Error(
          "Tidak dapat menghapus item yang digunakan dalam transaksi penjualan",
        );
      }

      // Check if item is used in stock movements
      const stockMovementCheck = await database.queryOne(
        "SELECT COUNT(*) as count FROM stock_movements WHERE item_id = ?",
        [id],
      );
      if ((stockMovementCheck?.count ?? 0) > 0) {
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

  // Generate barcode label PDF for item
  async function generateBarcodeLabel(itemId, options = {}) {
    try {
      // Import jsPDF
      const jsPDFModule = require("jspdf");
      const jsPDF = jsPDFModule.jsPDF;

      if (!jsPDF || typeof jsPDF !== "function") {
        throw new Error(
          "jsPDF constructor not found. Please check jsPDF installation.",
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
        [itemId],
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
        while (doc.getTextWidth(truncated + ellipsis) > maxNameWidth && truncated.length > 0) {
          truncated = truncated.substring(0, truncated.length - 1);
        }
        itemNameText = truncated + ellipsis;
      }
      const nameHeight = 13; // Single line height
      doc.text(itemNameText, labelWidth / 2, nameY, { align: "center", maxWidth: maxNameWidth });

      // Price - positioned after item name with proper spacing
      const priceY = nameY + nameHeight + 6; // Spacing after name
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 0);
      const priceText = formatCurrency(item.price || 0);
      const priceHeight = 10; // Height for price line
      doc.text(priceText, labelWidth / 2, priceY, { align: "center" });

      // Barcode image - fixed size, consistent, within border
      const borderTop = 5;
      const borderBottom = labelHeight - 5;
      const borderLeft = 5;
      const borderRight = labelWidth - 5;
      const barcodeSpacing = 6; // Spacing after price
      const marginBottom = 5; // Margin from bottom border
      
      // Calculate available space for barcode
      const codeY = priceY + priceHeight + barcodeSpacing;
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
        doc.addImage(barcodeDataUrl, "PNG", barcodeX, adjustedCodeY, barcodeWidth, barcodeHeight);
      } else {
        // Add barcode at calculated position
        doc.addImage(barcodeDataUrl, "PNG", barcodeX, codeY, barcodeWidth, barcodeHeight);
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
    },
  );

  // Helper function to generate bulk labels in one PDF
  async function generateBulkLabelsPDF(itemIds) {
    try {
      // Import dependencies
      const jsPDFModule = require("jspdf");
      const jsPDF = jsPDFModule.jsPDF;
      const JsBarcode = require("jsbarcode");
      const { createCanvas } = require("canvas");

      if (!jsPDF || typeof jsPDF !== "function") {
        throw new Error(
          "jsPDF constructor not found. Please check jsPDF installation.",
        );
      }

      // Get all items data
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
        itemIds,
      );

      if (items.length === 0) {
        throw new Error("Tidak ada item yang ditemukan");
      }

      // Label dimensions (50mm x 30mm in points) - smaller for 4x5 layout (20 labels per page)
      const labelWidth = 50 * 2.83465; // ~142 points
      const labelHeight = 30 * 2.83465; // ~85 points

      // A4 page dimensions in landscape (842 x 595 points)
      const pageWidth = 842;
      const pageHeight = 595;

      // Calculate grid layout: 4 labels per row, 5 labels per column on A4 (20 labels per page)
      const labelsPerRow = 4;
      const labelsPerCol = 5;
      const labelsPerPage = labelsPerRow * labelsPerCol;

      // Spacing between labels (reduced for more labels per page)
      const spacingX = 8;
      const spacingY = 8;

      // Calculate start position to center labels
      const totalWidth = labelsPerRow * labelWidth + (labelsPerRow - 1) * spacingX;
      const totalHeight = labelsPerCol * labelHeight + (labelsPerCol - 1) * spacingY;
      const startX = (pageWidth - totalWidth) / 2;
      const startY = (pageHeight - totalHeight) / 2;

      // Create PDF
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      // Process each item
      let itemIndex = 0;
      let currentPage = 0;
      let rowIndex = 0;
      let colIndex = 0;

      for (const item of items) {
        // Add new page if needed
        if (itemIndex > 0 && itemIndex % labelsPerPage === 0) {
          doc.addPage();
          currentPage++;
          rowIndex = 0;
          colIndex = 0;
        }

        // Calculate position for current label
        const x = startX + colIndex * (labelWidth + spacingX);
        const y = startY + rowIndex * (labelHeight + spacingY);

        // Generate barcode
        const canvas = createCanvas(200, 100);
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
          logger.error(`Error generating barcode for item ${item.id}:`, barcodeError);
          // Continue with next item
          itemIndex++;
          colIndex++;
          if (colIndex >= labelsPerRow) {
            colIndex = 0;
            rowIndex++;
          }
          continue;
        }

        // Convert canvas to data URL
        const buffer = canvas.toBuffer("image/png");
        const barcodeDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

        // Background color for label
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y, labelWidth, labelHeight, "F");

        // Border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(x + 5, y + 5, labelWidth - 10, labelHeight - 10, "S");

        // Title - Item Name (forced to single line)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        const nameY = y + 20;
        const maxNameWidth = labelWidth - 20;
        
        // Force single line - truncate if too long
        let itemNameText = item.name || "N/A";
        const itemNameLines = doc.splitTextToSize(itemNameText, maxNameWidth);
        if (itemNameLines.length > 1) {
          // If name is too long, truncate to fit one line
          // Use getTextWidth to find exact truncation point
          let truncated = itemNameText;
          const ellipsis = "...";
          while (doc.getTextWidth(truncated + ellipsis) > maxNameWidth && truncated.length > 0) {
            truncated = truncated.substring(0, truncated.length - 1);
          }
          itemNameText = truncated + ellipsis;
        }
        const nameHeight = 12; // Single line height
        doc.text(itemNameText, x + labelWidth / 2, nameY, { align: "center", maxWidth: maxNameWidth });

        // Price - positioned after item name with proper spacing
        const priceY = nameY + nameHeight + 5; // Spacing after name
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 100, 0);
        const priceText = formatCurrency(item.price || 0);
        const priceHeight = 9; // Height for price line
        doc.text(priceText, x + labelWidth / 2, priceY, { align: "center" });

        // Barcode image - fixed size, consistent, within border
        const borderTop = y + 5;
        const borderBottom = y + labelHeight - 5;
        const borderLeft = x + 5;
        const borderRight = x + labelWidth - 5;
        const barcodeSpacing = 5; // Spacing after price
        const marginBottom = 5; // Margin from bottom border
        
        // Calculate available space for barcode
        const codeY = priceY + priceHeight + barcodeSpacing;
        
        // Fixed barcode size (consistent) but ensure it fits within border
        let barcodeImgHeight = 30; // Preferred height for bulk labels
        let barcodeImgWidth = (barcodeImgHeight / 50) * 150; // Maintain aspect ratio
        
        // Check if barcode fits vertically
        if (codeY + barcodeImgHeight > borderBottom - marginBottom) {
          // Adjust height to fit
          barcodeImgHeight = Math.max(20, borderBottom - codeY - marginBottom);
          barcodeImgWidth = (barcodeImgHeight / 50) * 150;
        }
        
        // Check if barcode fits horizontally
        let barcodeX = x + (labelWidth - barcodeImgWidth) / 2;
        if (barcodeX < borderLeft) {
          barcodeX = borderLeft;
          // If still too wide, reduce size
          if (barcodeX + barcodeImgWidth > borderRight) {
            barcodeImgWidth = borderRight - borderLeft;
            barcodeImgHeight = (barcodeImgWidth / 150) * 50;
          }
        } else if (barcodeX + barcodeImgWidth > borderRight) {
          barcodeX = borderRight - barcodeImgWidth;
          // If still too wide, reduce size
          if (barcodeX < borderLeft) {
            barcodeX = borderLeft;
            barcodeImgWidth = borderRight - borderLeft;
            barcodeImgHeight = (barcodeImgWidth / 150) * 50;
          }
        }
        
        // Ensure barcode doesn't exceed bottom border
        if (codeY + barcodeImgHeight > borderBottom - marginBottom) {
          // Adjust Y position to fit
          const adjustedCodeY = borderBottom - marginBottom - barcodeImgHeight;
          doc.addImage(barcodeDataUrl, "PNG", barcodeX, adjustedCodeY, barcodeImgWidth, barcodeImgHeight);
        } else {
          // Add barcode at calculated position
          doc.addImage(barcodeDataUrl, "PNG", barcodeX, codeY, barcodeImgWidth, barcodeImgHeight);
        }

        // Move to next position
        itemIndex++;
        colIndex++;
        if (colIndex >= labelsPerRow) {
          colIndex = 0;
          rowIndex++;
        }
      }

      // Save PDF
      const { app } = require("electron");
      const userDataPath = app.getPath("userData");
      const labelsDir = path.join(userDataPath, "labels");
      await fs.mkdir(labelsDir, { recursive: true });

      const fileName = `bulk_labels_${Date.now()}.pdf`;
      const filePath = path.join(labelsDir, fileName);

      doc.save(filePath);

      logger.info(`Generated bulk labels PDF with ${items.length} labels: ${filePath}`);

      return {
        success: true,
        filePath,
        fileName,
        labelCount: items.length,
      };
    } catch (error) {
      logger.error("Error generating bulk labels PDF:", error);
      throw error;
    }
  }

  // Generate bulk labels (multiple items)
  ipcMain.handle(
    "items:generateBulkLabels",
    async (event, { itemIds }) => {
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
    },
  );

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

        // Print the single PDF
        try {
          if (printerName) {
            await printPDF(result.filePath, printerName, silent);
          } else {
            await openPDF(result.filePath);
          }

          logger.info(`Printed bulk labels PDF with ${result.labelCount} labels`);

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
    },
  );

  // Download bulk labels
  ipcMain.handle(
    "items:downloadBulkLabels",
    async (event, { itemIds }) => {
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
    },
  );

  // Download template Excel for bulk import
  ipcMain.handle("items:downloadTemplate", async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Items Template");

      // Get categories, sizes, and discount groups for reference
      const categories = await database.query("SELECT id, name FROM categories WHERE is_active = 1 ORDER BY name");
      const sizes = await database.query("SELECT id, code, name FROM item_sizes WHERE is_active = 1 ORDER BY name");
      const discountGroups = await database.query("SELECT id, name FROM discount_groups WHERE is_active = 1 ORDER BY name");

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
        "Status",
        "Min Stok Alert",
        "Tersedia untuk Sewa",
        "Tersedia untuk Jual",
        "Aktif",
        "Grup Diskon",
      ];

      // Set headers
      worksheet.addRow(headers);

      // Style header row - hanya kolom yang digunakan
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      
      // Set warna background hanya untuk sel yang digunakan (kolom A sampai O = 15 kolom)
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
        { width: 15 }, // Status
        { width: 15 }, // Min Stok Alert
        { width: 20 }, // Tersedia untuk Sewa
        { width: 20 }, // Tersedia untuk Jual
        { width: 15 }, // Aktif
        { width: 20 }, // Grup Diskon
      ];

      // Add data validation for categories
      worksheet.dataValidations.add("B2:B1000", {
        type: "list",
        allowBlank: true,
        formulae: [`"${categories.map(c => c.name).join(",")}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Category",
        error: "Pilih kategori dari daftar yang tersedia",
      });

      // Add data validation for sizes
      worksheet.dataValidations.add("C2:C1000", {
        type: "list",
        allowBlank: true,
        formulae: [`"${sizes.map(s => s.name).join(",")}"`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Size",
        error: "Pilih ukuran dari daftar yang tersedia",
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

      // Add data validation for status
      worksheet.dataValidations.add("J2:J1000", {
        type: "list",
        allowBlank: true,
        formulae: ['"AVAILABLE,NOT_AVAILABLE"'],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Status",
        error: "Pilih AVAILABLE atau NOT_AVAILABLE",
      });

      // Add data validation for boolean fields
      ["L2:L1000", "M2:M1000", "N2:N1000"].forEach(range => {
        worksheet.dataValidations.add(range, {
          type: "list",
          allowBlank: true,
          formulae: ['"Ya,Tidak"'],
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "Invalid Value",
          error: "Pilih Ya atau Tidak",
        });
      });

      // Add data validation for discount groups
      if (discountGroups.length > 0) {
        worksheet.dataValidations.add("O2:O1000", {
          type: "list",
          allowBlank: true,
          formulae: [`"${discountGroups.map(dg => dg.name).join(",")}"`],
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
        "AVAILABLE",
        "1",
        "Ya",
        "Tidak",
        "Ya",
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
      noteSheet.addRow(["Ukuran: Pilih dari dropdown (opsional)"]);
      noteSheet.addRow(["Tipe: RENTAL, SALE, atau BOTH (wajib)"]);
      noteSheet.addRow(["Status: AVAILABLE atau NOT_AVAILABLE (default: AVAILABLE)"]);
      noteSheet.addRow(["Tersedia untuk Sewa/Jual: Ya atau Tidak (default: Ya)"]);
      noteSheet.addRow(["Aktif: Ya atau Tidak (default: Ya)"]);
      noteSheet.addRow([]);
      noteSheet.addRow(["CATATAN:"]);
      noteSheet.addRow(["1. Hapus baris contoh sebelum mengisi data"]);
      noteSheet.addRow(["2. Stok akan diatur ke 0 saat import (atur melalui manajemen stok)"]);
      noteSheet.addRow(["3. Kode akan dibuat otomatis oleh sistem"]);
      noteSheet.addRow(["4. Pastikan format angka untuk harga menggunakan titik (.) sebagai desimal"]);

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

      const worksheet = workbook.getWorksheet("Items Template") || workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("Worksheet tidak ditemukan");
      }

      // Get reference data
      const categories = await database.query("SELECT id, name FROM categories WHERE is_active = 1");
      const sizes = await database.query("SELECT id, code, name FROM item_sizes WHERE is_active = 1");
      const discountGroups = await database.query("SELECT id, name FROM discount_groups WHERE is_active = 1");

      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
      const sizeMap = new Map(sizes.map(s => [s.name.toLowerCase(), s.id]));
      const discountGroupMap = new Map(discountGroups.map(dg => [dg.name.toLowerCase(), dg.id]));

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
          if (!row.getCell(1).value || !row.getCell(1).value.toString().trim()) {
            continue;
          }

          try {
            const name = (row.getCell(1).value || "").toString().trim();
            const categoryName = (row.getCell(2).value || "").toString().trim();
            const sizeName = (row.getCell(3).value || "").toString().trim() || null;
            const description = (row.getCell(4).value || "").toString().trim() || null;
            const purchasePrice = parseFloat(row.getCell(5).value || 0) || 0;
            const rentalPricePerDay = parseFloat(row.getCell(6).value || 0) || 0;
            const salePrice = parseFloat(row.getCell(7).value || 0) || 0;
            const deposit = parseFloat(row.getCell(8).value || 0) || 0;
            const type = (row.getCell(9).value || "RENTAL").toString().trim().toUpperCase();
            const status = (row.getCell(10).value || "AVAILABLE").toString().trim().toUpperCase();
            const minStockAlert = parseInt(row.getCell(11).value || 1) || 1;
            const isAvailableForRent = (row.getCell(12).value || "Ya").toString().trim().toLowerCase() === "ya";
            const isAvailableForSale = (row.getCell(13).value || "Ya").toString().trim().toLowerCase() === "ya";
            const isActive = (row.getCell(14).value || "Ya").toString().trim().toLowerCase() === "ya";
            const discountGroupName = (row.getCell(15).value || "").toString().trim() || null;

            // Validation
            if (!name) {
              throw new Error("Nama wajib diisi");
            }

            if (!categoryName) {
              throw new Error("Kategori wajib diisi");
            }

            const categoryId = categoryMap.get(categoryName.toLowerCase());
            if (!categoryId) {
              throw new Error(`Kategori "${categoryName}" tidak ditemukan`);
            }

            let sizeId = null;
            if (sizeName) {
              sizeId = sizeMap.get(sizeName.toLowerCase());
              if (!sizeId) {
                throw new Error(`Ukuran "${sizeName}" tidak ditemukan`);
              }
            }

            let discountGroupId = null;
            if (discountGroupName) {
              discountGroupId = discountGroupMap.get(discountGroupName.toLowerCase());
              if (!discountGroupId) {
                throw new Error(`Grup diskon "${discountGroupName}" tidak ditemukan`);
              }
            }

            // Generate code automatically
            const finalCode = await generateItemCode(database, type);

            // Determine price based on type
            let price = 0;
            if (type === "RENTAL" || type === "BOTH") {
              price = rentalPricePerDay;
            } else if (type === "SALE") {
              price = salePrice;
            }

            // Insert item
            await database.execute(
              `INSERT INTO items (
                code, name, description, price, sale_price, type, status,
                size_id, category_id, rental_price_per_day, deposit,
                discount_group_id, stock_quantity, available_quantity,
                min_stock_alert, is_available_for_rent, is_available_for_sale,
                is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                finalCode,
                name,
                description,
                price,
                salePrice,
                type,
                status,
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
