/**
 * Handlers for stock repair and validation
 */

const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const {
  repairStockFromMovements,
  repairBundleStockFromMovements,
  repairAccessoryStockFromMovements,
  validateStockConsistency,
} = require("../helpers/stockUtils");

function setupStockRepairHandlers() {
  // Repair stock for an item
  ipcMain.handle("stock:repairItem", async (event, itemId) => {
    try {
      if (!itemId) {
        throw new Error("ID item tidak ditemukan");
      }

      const result = await repairStockFromMovements(itemId);
      return {
        success: true,
        itemId,
        stock_quantity: result.stock_qty,
        available_quantity: result.available_qty,
      };
    } catch (error) {
      logger.error(`Error repairing stock for item ${itemId}:`, error);
      throw error;
    }
  });

  // Repair stock for a bundle
  ipcMain.handle("stock:repairBundle", async (event, bundleId) => {
    try {
      if (!bundleId) {
        throw new Error("ID bundle tidak ditemukan");
      }

      const result = await repairBundleStockFromMovements(bundleId);
      return {
        success: true,
        bundleId,
        stock_quantity: result.stock_qty,
        available_quantity: result.available_qty,
      };
    } catch (error) {
      logger.error(`Error repairing stock for bundle ${bundleId}:`, error);
      throw error;
    }
  });

  // Repair stock for an accessory
  ipcMain.handle("stock:repairAccessory", async (event, accessoryId) => {
    try {
      if (!accessoryId) {
        throw new Error("ID accessory tidak ditemukan");
      }

      const result = await repairAccessoryStockFromMovements(accessoryId);
      return {
        success: true,
        accessoryId,
        stock_quantity: result.stock_qty,
        available_quantity: result.available_qty,
      };
    } catch (error) {
      logger.error(`Error repairing stock for accessory ${accessoryId}:`, error);
      throw error;
    }
  });

  // Validate stock consistency for an item
  ipcMain.handle("stock:validateItem", async (event, itemId) => {
    try {
      if (!itemId) {
        throw new Error("ID item tidak ditemukan");
      }

      const result = await validateStockConsistency(itemId);
      return result;
    } catch (error) {
      logger.error(`Error validating stock for item ${itemId}:`, error);
      throw error;
    }
  });

  // Get all items with stock mismatch
  ipcMain.handle("stock:getMismatchedItems", async () => {
    try {
      const items = await database.query(`
        SELECT 
          id,
          code,
          name,
          current_stock_quantity,
          current_available_quantity,
          calculated_stock_quantity,
          calculated_available_quantity,
          stock_qty_mismatch,
          available_qty_mismatch,
          product_type
        FROM v_stock_opname_comparison
        WHERE stock_qty_mismatch = 1 OR available_qty_mismatch = 1
        ORDER BY name
      `);
      return items;
    } catch (error) {
      logger.error("Error getting mismatched items:", error);
      throw error;
    }
  });

  ipcMain.handle("stock:getComparisonItems", async () => {
    try {
      const items = await database.query(`
        SELECT 
          id,
          code,
          name,
          current_stock_quantity,
          current_available_quantity,
          calculated_stock_quantity,
          calculated_available_quantity,
          stock_qty_mismatch,
          available_qty_mismatch,
          product_type
        FROM v_stock_opname_comparison
        ORDER BY name
      `);
      return items;
    } catch (error) {
      logger.error("Error getting comparison items:", error);
      throw error;
    }
  });

  // Repair all mismatched items
  ipcMain.handle("stock:repairAllMismatched", async () => {
    try {
      const mismatched = await database.query(`
        SELECT id, product_type FROM v_stock_opname_comparison
        WHERE stock_qty_mismatch = 1 OR available_qty_mismatch = 1
      `);

      const repairHandlers = {
        item: repairStockFromMovements,
        accessory: repairAccessoryStockFromMovements,
        bundle: repairBundleStockFromMovements,
      };

      const results = [];
      for (const item of mismatched) {
        const handler = repairHandlers[item.product_type] || repairStockFromMovements;
        try {
          const result = await handler(item.id);
          results.push({
            itemId: item.id,
            productType: item.product_type || "item",
            success: true,
            stock_quantity: result.stock_qty,
            available_quantity: result.available_qty,
          });
        } catch (error) {
          results.push({
            itemId: item.id,
            productType: item.product_type || "item",
            success: false,
            error: error.message,
          });
        }
      }

      return {
        total: mismatched.length,
        repaired: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      logger.error("Error repairing all mismatched items:", error);
      throw error;
    }
  });
}

module.exports = { setupStockRepairHandlers };
