import { ipcRenderer } from "@/services/ipc";

/**
 * Get low stock items with detailed status
 * @returns {Promise<Array>} Array of low stock items
 */
export async function getLowStockItems() {
  return await ipcRenderer.invoke("stock-alerts:getLowStock");
}

/**
 * Get stock status summary
 * @returns {Promise<Object>} Summary with counts by status
 */
export async function getStockStatusSummary() {
  return await ipcRenderer.invoke("stock-alerts:getStatusSummary");
}

/**
 * Get critical stock items only (for notifications)
 * @returns {Promise<Array>} Array of critical stock items
 */
export async function getCriticalStockItems() {
  return await ipcRenderer.invoke("stock-alerts:getCriticalStock");
}

/**
 * Update min_stock_alert for an item or accessory
 * @param {Object} params
 * @param {number} params.id - Item or accessory ID
 * @param {string} params.type - 'item' or 'accessory'
 * @param {number} params.minStockAlert - New min stock alert value
 * @returns {Promise<Object>} Updated item/accessory
 */
export async function updateMinStockAlert({ id, type, minStockAlert }) {
  return await ipcRenderer.invoke("stock-alerts:updateMinStock", {
    id,
    type,
    minStockAlert,
  });
}

