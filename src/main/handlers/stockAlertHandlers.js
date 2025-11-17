const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

function setupStockAlertHandlers() {
  // Get low stock items with detailed status
  ipcMain.handle("stock-alerts:getLowStock", async () => {
    try {
      const query = `
        SELECT
          id,
          code,
          name,
          category_name,
          product_type,
          stock_quantity,
          available_quantity,
          COALESCE(min_stock_alert, 0) AS min_stock_alert,
          CASE
            WHEN COALESCE(min_stock_alert, 0) = 0 THEN 0
            ELSE (COALESCE(min_stock_alert, 0) - stock_quantity)
          END AS shortage,
          CASE
            WHEN stock_quantity <= 0 THEN 'out_of_stock'
            WHEN COALESCE(min_stock_alert, 0) = 0 THEN 'not_set'
            WHEN stock_quantity < min_stock_alert THEN 'critical'
            WHEN stock_quantity <= (min_stock_alert * 1.2) THEN 'warning'
            ELSE 'sufficient'
          END AS status,
          CASE
            WHEN stock_quantity <= 0 THEN 'Stok Habis'
            WHEN COALESCE(min_stock_alert, 0) = 0 THEN 'Belum Diset Batas Minimal'
            WHEN stock_quantity < min_stock_alert THEN 'Kritis - Perlu Restock Segera'
            WHEN stock_quantity <= (min_stock_alert * 1.2) THEN 'Mendekati Batas Minimal'
            ELSE 'Stok Cukup'
          END AS status_label,
          is_active
        FROM (
          SELECT
            i.id,
            i.code,
            i.name,
            c.name AS category_name,
            'item' AS product_type,
            i.stock_quantity,
            i.available_quantity,
            i.min_stock_alert,
            i.is_active
          FROM items i
          LEFT JOIN categories c ON i.category_id = c.id
          WHERE i.is_active = 1
        
          UNION ALL
          
          SELECT
            a.id,
            a.code,
            a.name,
            'Aksesoris' AS category_name,
            'accessory' AS product_type,
            a.stock_quantity,
            a.available_quantity,
            a.min_stock_alert,
            a.is_active
          FROM accessories a
          WHERE a.is_active = 1
        )
        ORDER BY 
          CASE status
            WHEN 'out_of_stock' THEN 1
            WHEN 'critical' THEN 2
            WHEN 'warning' THEN 3
            WHEN 'not_set' THEN 4
            ELSE 5
          END,
          shortage DESC,
          name ASC
      `;
      
      const results = await database.query(query);
      return results;
    } catch (error) {
      logger.error("Error fetching low stock items:", error);
      throw error;
    }
  });

  // Get stock status summary
  ipcMain.handle("stock-alerts:getStatusSummary", async () => {
    try {
      const query = `
        SELECT
          COUNT(*) AS total_items,
          SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
          SUM(CASE WHEN stock_quantity > 0 AND stock_quantity < COALESCE(min_stock_alert, 0) AND COALESCE(min_stock_alert, 0) > 0 THEN 1 ELSE 0 END) AS critical,
          SUM(CASE WHEN stock_quantity >= COALESCE(min_stock_alert, 0) AND stock_quantity <= (COALESCE(min_stock_alert, 0) * 1.2) AND COALESCE(min_stock_alert, 0) > 0 THEN 1 ELSE 0 END) AS warning,
          SUM(CASE WHEN stock_quantity > (COALESCE(min_stock_alert, 0) * 1.2) AND COALESCE(min_stock_alert, 0) > 0 THEN 1 ELSE 0 END) AS sufficient,
          SUM(CASE WHEN COALESCE(min_stock_alert, 0) = 0 THEN 1 ELSE 0 END) AS not_set
        FROM (
          SELECT
            i.stock_quantity,
            i.min_stock_alert
          FROM items i
          WHERE i.is_active = 1
          
          UNION ALL
          
          SELECT
            a.stock_quantity,
            a.min_stock_alert
          FROM accessories a
          WHERE a.is_active = 1
        )
      `;
      
      const result = await database.queryOne(query);
      return result;
    } catch (error) {
      logger.error("Error fetching stock status summary:", error);
      throw error;
    }
  });

  // Get critical stock items only (for notifications)
  ipcMain.handle("stock-alerts:getCriticalStock", async () => {
    try {
      const query = `
        SELECT
          id,
          code,
          name,
          category_name,
          product_type,
          stock_quantity,
          min_stock_alert,
          (min_stock_alert - stock_quantity) AS shortage
        FROM (
          SELECT
            i.id,
            i.code,
            i.name,
            c.name AS category_name,
            'item' AS product_type,
            i.stock_quantity,
            i.min_stock_alert
          FROM items i
          LEFT JOIN categories c ON i.category_id = c.id
          WHERE i.is_active = 1
            AND i.min_stock_alert > 0
            AND i.stock_quantity <= i.min_stock_alert
        
          UNION ALL
          
          SELECT
            a.id,
            a.code,
            a.name,
            'Aksesoris' AS category_name,
            'accessory' AS product_type,
            a.stock_quantity,
            a.min_stock_alert
          FROM accessories a
          WHERE a.is_active = 1
            AND a.min_stock_alert > 0
            AND a.stock_quantity <= a.min_stock_alert
        )
        ORDER BY shortage DESC, name ASC
      `;
      
      const results = await database.query(query);
      return results;
    } catch (error) {
      logger.error("Error fetching critical stock items:", error);
      throw error;
    }
  });

  // Update min_stock_alert for item or accessory
  ipcMain.handle("stock-alerts:updateMinStock", async (_event, { id, type, minStockAlert }) => {
    try {
      if (!id || !type) {
        throw new Error("ID dan tipe produk diperlukan");
      }

      const minStock = Math.max(0, parseInt(minStockAlert) || 0);
      const table = type === "item" ? "items" : "accessories";
      
      await database.execute(
        `UPDATE ${table} SET min_stock_alert = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [minStock, id]
      );

      const updated = await database.queryOne(
        `SELECT id, code, name, stock_quantity, min_stock_alert FROM ${table} WHERE id = ?`,
        [id]
      );

      logger.info(`Updated min_stock_alert for ${type} ${id} to ${minStock}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating min stock alert for ${type} ${id}:`, error);
      throw error;
    }
  });
}

module.exports = setupStockAlertHandlers;

