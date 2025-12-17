const { ipcMain, dialog } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const { generateItemCode } = require("../helpers/codeUtils");
const { printPDF, openPDF } = require("../helpers/printUtils");
const { loadSettings } = require("../helpers/settingsUtils");
const fs = require("fs").promises;

// Import helper modules
const {
  buildItemSelectQuery,
  prepareItemForCreation,
  validateItemDeletion,
  prepareItemForUpdate,
} = require("../helpers/itemHelpers");
const {
  generateBarcodeLabel,
  generateBulkLabelsPDF,
} = require("../helpers/itemLabelHelpers");
const {
  downloadItemTemplate,
  importItemsFromExcel,
} = require("../helpers/itemExcelHelpers");

// Setup item handlers
function setupItemHandlers() {
  // Get all items
  ipcMain.handle("items:getAll", async () => {
    try {
      const items = await database.query(buildItemSelectQuery());
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

      const { normalizeCode } = require("../helpers/codeUtils");
      const normalizedCode = normalizeCode(code.trim());
      const item = await database.queryOne(
        buildItemSelectQuery(
          "WHERE i.code = ? OR UPPER(i.code) = UPPER(?)",
          "ORDER BY i.id DESC LIMIT 1"
        ),
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
      const preparedData = await prepareItemForCreation(itemData);

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
          preparedData.code,
          preparedData.name,
          preparedData.description,
          preparedData.purchasePrice,
          preparedData.salePrice,
          preparedData.itemType,
          preparedData.sizeId,
          preparedData.categoryId,
          preparedData.rentalPricePerDay,
          preparedData.deposit,
          preparedData.discountGroupId,
          preparedData.stockQuantity,
          preparedData.availableQuantity,
          preparedData.minStockAlert,
          preparedData.isAvailableForRent ? 1 : 0,
          preparedData.isAvailableForSale ? 1 : 0,
          preparedData.isActive,
        ]
      );

      // Return item yang baru dibuat dengan JOIN untuk category_name dan size_name
      const newItem = await database.queryOne(
        buildItemSelectQuery("WHERE i.id = ?", "ORDER BY i.id DESC"),
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
        buildItemSelectQuery("WHERE i.id = ?", "ORDER BY i.id DESC"),
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
      const normalizedUpdates = await prepareItemForUpdate(id, updates);

      // Stok tidak bisa diubah dari form edit
      // Hapus stock_quantity dan available_quantity jika ada di updates
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

      const fields = Object.keys(normalizedUpdates);
      const values = Object.values(normalizedUpdates);
      const sql = `UPDATE items SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`;

      await database.execute(sql, [...values, id]);

      // Return updated item dengan JOIN untuk category_name dan size_name
      const updatedItem = await database.queryOne(
        buildItemSelectQuery("WHERE i.id = ?", "ORDER BY i.id DESC"),
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
      await validateItemDeletion(id);
      await database.execute("DELETE FROM items WHERE id = ?", [id]);
      return true;
    } catch (error) {
      logger.error("Error deleting item:", error);
      throw error;
    }
  });

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

  // Generate bulk labels (multiple items)
  ipcMain.handle("items:generateBulkLabels", async (event, { itemIds, items }) => {
    try {
      // Support both old format (itemIds) and new format (items with quantity)
      const itemsData = items || (itemIds ? itemIds.map((id) => ({ itemId: id, quantity: 1 })) : []);
      
      if (!Array.isArray(itemsData) || itemsData.length === 0) {
        throw new Error("Item IDs atau items harus berupa array yang tidak kosong");
      }

      const result = await generateBulkLabelsPDF(itemsData);

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

  // Preview bulk labels
  ipcMain.handle("items:previewBulkLabels", async (event, params) => {
    try {
      // Support multiple formats:
      // 1. Old format: itemIds (array of IDs) - defaults to items
      // 2. Format: items with {itemId, quantity} - defaults to items
      // 3. New format: items with {productType, id, quantity}
      const { itemIds, items } = params || {};
      let itemsData = [];
      
      if (items && Array.isArray(items) && items.length > 0) {
        // New format with productType
        if (items[0].productType && items[0].id) {
          itemsData = items;
        } else if (items[0].itemId) {
          // Format with itemId - convert to new format
          itemsData = items.map(item => ({ productType: 'item', id: item.itemId, quantity: item.quantity || 1 }));
        } else {
          throw new Error("Format items tidak valid");
        }
      } else if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
        // Old format - default to items
        itemsData = itemIds.map((id) => ({ productType: 'item', id, quantity: 1 }));
      } else {
        throw new Error("Item IDs atau items harus berupa array yang tidak kosong");
      }

      const preview = await generateBulkLabelsPDF(itemsData, {
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
    async (event, params) => {
      try {
        const { itemIds, items, printerName, silent = false } = params || {};
        // Support multiple formats (same as preview)
        let itemsData = [];
        
        if (items && Array.isArray(items) && items.length > 0) {
          if (items[0].productType && items[0].id) {
            itemsData = items;
          } else if (items[0].itemId) {
            itemsData = items.map(item => ({ productType: 'item', id: item.itemId, quantity: item.quantity || 1 }));
          } else {
            throw new Error("Format items tidak valid");
          }
        } else if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
          itemsData = itemIds.map((id) => ({ productType: 'item', id, quantity: 1 }));
        } else {
          throw new Error("Item IDs atau items harus berupa array yang tidak kosong");
        }

        // Generate single PDF with all labels
        const result = await generateBulkLabelsPDF(itemsData);
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
  ipcMain.handle("items:downloadBulkLabels", async (event, params) => {
    try {
      const { itemIds, items } = params || {};
      // Support multiple formats (same as preview)
      let itemsData = [];
      
      if (items && Array.isArray(items) && items.length > 0) {
        if (items[0].productType && items[0].id) {
          itemsData = items;
        } else if (items[0].itemId) {
          itemsData = items.map(item => ({ productType: 'item', id: item.itemId, quantity: item.quantity || 1 }));
        } else {
          throw new Error("Format items tidak valid");
        }
      } else if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
        itemsData = itemIds.map((id) => ({ productType: 'item', id, quantity: 1 }));
      } else {
        throw new Error("Item IDs atau items harus berupa array yang tidak kosong");
      }

      // Generate single PDF with all labels
      const result = await generateBulkLabelsPDF(itemsData);

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
      return await downloadItemTemplate();
    } catch (error) {
      logger.error("Error downloading items template:", error);
      throw error;
    }
  });

  // Import items from Excel
  ipcMain.handle("items:importExcel", async (event, filePath) => {
    try {
      return await importItemsFromExcel(filePath);
    } catch (error) {
      logger.error("Error importing items from Excel:", error);
      throw error;
    }
  });
}

module.exports = setupItemHandlers;
