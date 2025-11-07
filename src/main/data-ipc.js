const { ipcMain } = require("electron");
const { getDb } = require("./database");

function registerDataIpc() {
  const db = getDb();

  // Kembalikan daftar bundles aktif
  ipcMain.handle("db:getBundles", () => {
    const stmt = db.prepare(`
      SELECT id, code, name, bundle_type, price, rental_price_per_day, stock_quantity, available_quantity
      FROM bundles
      WHERE is_active = 1
      ORDER BY name
    `);
    return stmt.all();
  });

  // Kembalikan detail isi bundle (items dan accessories)
  ipcMain.handle("db:getBundleDetails", (event, bundleId) => {
    const stmt = db.prepare(`
      SELECT bd.id, bd.bundle_id, bd.item_id, bd.accessory_id, bd.quantity, bd.notes,
             i.name AS item_name, a.name AS accessory_name
      FROM bundle_details bd
      LEFT JOIN items i ON bd.item_id = i.id
      LEFT JOIN accessories a ON bd.accessory_id = a.id
      WHERE bd.bundle_id = ?
    `);
    return stmt.all(bundleId);
  });
}

module.exports = { registerDataIpc };
