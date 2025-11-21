const { ipcMain, shell } = require("electron");
const database = require("./helpers/database");

function registerDataIpc() {
  ipcMain.handle("db:getBundles", async () => {
    const sql = `
      SELECT id, code, name, bundle_type, price, rental_price_per_day, stock_quantity, available_quantity
      FROM bundles
      WHERE is_active = 1
      ORDER BY name
    `;
    return await database.query(sql);
  });

  ipcMain.handle("db:getBundleDetails", async (event, bundleId) => {
    const sql = `
      SELECT bd.id, bd.bundle_id, bd.item_id, bd.accessory_id, bd.quantity, bd.notes,
             i.name AS item_name, a.name AS accessory_name
      FROM bundle_details bd
      LEFT JOIN items i ON bd.item_id = i.id
      LEFT JOIN accessories a ON bd.accessory_id = a.id
      WHERE bd.bundle_id = ?
    `;
    return await database.query(sql, [bundleId]);
  });

  // Open file path in default application
  ipcMain.handle("file:openPath", async (event, filePath) => {
    try {
      await shell.openPath(filePath);
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDataIpc };
