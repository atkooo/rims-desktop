const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const {
  executeTransaction,
  getStockBefore,
  updateStock,
  createStockMovement,
} = require("./transactionHelpers");

function setupStockMovementHandlers() {
  // Create stock movement
  ipcMain.handle("stockMovements:create", async (event, movementData) => {
    try {
      if (!validator.isPositiveNumber(movementData.quantity)) {
        throw new Error("Data tidak valid");
      }
      if (!["IN", "OUT"].includes(movementData.movementType)) {
        throw new Error("Data tidak valid");
      }

      // Validate that exactly one of itemId, bundleId, or accessoryId is provided
      const hasItemId = !!movementData.itemId;
      const hasBundleId = !!movementData.bundleId;
      const hasAccessoryId = !!movementData.accessoryId;
      const count = (hasItemId ? 1 : 0) + (hasBundleId ? 1 : 0) + (hasAccessoryId ? 1 : 0);
      
      if (count !== 1) {
        throw new Error("Pilih salah satu: Item, Bundle, atau Accessory");
      }

      let stockBefore = 0;
      let stockAfter = 0;
      let tableName = "";
      let idValue = null;

      // Get current stock based on type
      if (hasItemId) {
        const item = await database.queryOne(
          "SELECT available_quantity, stock_quantity FROM items WHERE id = ?",
          [movementData.itemId],
        );
        if (!item) {
          throw new Error("Item tidak ditemukan");
        }
        stockBefore = item.available_quantity || 0;
        tableName = "items";
        idValue = movementData.itemId;
      } else if (hasBundleId) {
        const bundle = await database.queryOne(
          "SELECT available_quantity, stock_quantity FROM bundles WHERE id = ?",
          [movementData.bundleId],
        );
        if (!bundle) {
          throw new Error("Bundle tidak ditemukan");
        }
        stockBefore = bundle.available_quantity || 0;
        tableName = "bundles";
        idValue = movementData.bundleId;

        // Validasi khusus untuk menambahkan stok bundle (IN)
        if (movementData.movementType === "IN") {
          // Cek apakah bundle sudah punya komposisi
          const bundleDetails = await database.query(
            `SELECT 
              bd.item_id, 
              bd.accessory_id, 
              bd.quantity AS detail_quantity
             FROM bundle_details bd
             WHERE bd.bundle_id = ?`,
            [movementData.bundleId],
          );

          if (!bundleDetails || bundleDetails.length === 0) {
            throw new Error("Paket harus memiliki komposisi terlebih dahulu sebelum bisa ditambahkan stok");
          }

          // Hitung kebutuhan item dan aksesoris untuk membuat bundle
          const requiredItems = new Map(); // item_id -> total quantity needed
          const requiredAccessories = new Map(); // accessory_id -> total quantity needed

          for (const detail of bundleDetails) {
            if (detail.item_id) {
              const current = requiredItems.get(detail.item_id) || 0;
              requiredItems.set(detail.item_id, current + detail.detail_quantity);
            } else if (detail.accessory_id) {
              const current = requiredAccessories.get(detail.accessory_id) || 0;
              requiredAccessories.set(detail.accessory_id, current + detail.detail_quantity);
            }
          }

          // Hitung maksimal bundle yang bisa dibuat berdasarkan stok item/aksesoris yang tersedia
          let maxBundlesCanCreate = Infinity;

          // Cek stok item yang tersedia
          for (const [itemId, requiredQtyPerBundle] of requiredItems) {
            const item = await database.queryOne(
              "SELECT available_quantity FROM items WHERE id = ?",
              [itemId],
            );
            if (!item) {
              throw new Error(`Item dengan ID ${itemId} tidak ditemukan`);
            }
            const availableStock = item.available_quantity || 0;
            const maxFromThisItem = Math.floor(availableStock / requiredQtyPerBundle);
            maxBundlesCanCreate = Math.min(maxBundlesCanCreate, maxFromThisItem);
          }

          // Cek stok aksesoris yang tersedia
          for (const [accessoryId, requiredQtyPerBundle] of requiredAccessories) {
            const accessory = await database.queryOne(
              "SELECT available_quantity FROM accessories WHERE id = ?",
              [accessoryId],
            );
            if (!accessory) {
              throw new Error(`Aksesoris dengan ID ${accessoryId} tidak ditemukan`);
            }
            const availableStock = accessory.available_quantity || 0;
            const maxFromThisAccessory = Math.floor(availableStock / requiredQtyPerBundle);
            maxBundlesCanCreate = Math.min(maxBundlesCanCreate, maxFromThisAccessory);
          }

          // Validasi quantity yang diminta tidak melebihi maksimal yang bisa dibuat
          if (movementData.quantity > maxBundlesCanCreate) {
            throw new Error(
              `Stok tidak mencukupi. Maksimal ${maxBundlesCanCreate} paket yang bisa dibuat berdasarkan stok item/aksesoris yang tersedia.`
            );
          }

          // Jika validasi berhasil, kurangi stok item dan aksesoris yang digunakan
          // Ini dilakukan di dalam transaction setelah validasi
        }
      } else if (hasAccessoryId) {
        const accessory = await database.queryOne(
          "SELECT available_quantity, stock_quantity FROM accessories WHERE id = ?",
          [movementData.accessoryId],
        );
        if (!accessory) {
          throw new Error("Accessory tidak ditemukan");
        }
        stockBefore = accessory.available_quantity || 0;
        tableName = "accessories";
        idValue = movementData.accessoryId;
      }

      stockAfter =
        movementData.movementType === "IN"
          ? stockBefore + movementData.quantity
          : stockBefore - movementData.quantity;

      if (stockAfter < 0) {
        throw new Error("Stok tidak cukup");
      }

      return await executeTransaction(async () => {
        // Insert stock movement
        const result = await database.execute(
          `INSERT INTO stock_movements (
            item_id, bundle_id, accessory_id, movement_type, reference_type, reference_id,
            quantity, stock_before, stock_after, user_id, notes, is_sync
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            movementData.itemId || null,
            movementData.bundleId || null,
            movementData.accessoryId || null,
            movementData.movementType,
            movementData.referenceType || null,
            movementData.referenceId || null,
            movementData.quantity,
            stockBefore,
            stockAfter,
            movementData.userId || null,
            movementData.notes || null,
          ],
        );

        // Update stock based on type
        // For IN: increase both stock_quantity and available_quantity
        // For OUT: only decrease available_quantity (stock_quantity stays the same as it represents total stock ever had)
        if (movementData.movementType === "IN") {
          await database.execute(
            `UPDATE ${tableName} SET available_quantity = ?, stock_quantity = stock_quantity + ? WHERE id = ?`,
            [stockAfter, movementData.quantity, idValue],
          );

          // Khusus untuk bundle: kurangi stok item dan aksesoris yang digunakan
          if (hasBundleId) {
            // Ambil komposisi bundle
            const bundleDetails = await database.query(
              `SELECT 
                bd.item_id, 
                bd.accessory_id, 
                bd.quantity AS detail_quantity
               FROM bundle_details bd
               WHERE bd.bundle_id = ?`,
              [movementData.bundleId],
            );

            // Kurangi stok item dan aksesoris sesuai komposisi
            for (const detail of bundleDetails) {
              const qtyNeeded = detail.detail_quantity * movementData.quantity;
              
              if (detail.item_id) {
                const itemStockBefore = await getStockBefore(detail.item_id);
                const itemStockAfter = itemStockBefore - qtyNeeded;

                if (itemStockAfter < 0) {
                  throw new Error(`Stok item tidak mencukupi untuk membuat paket`);
                }

                // Kurangi stok item
                await updateStock(detail.item_id, qtyNeeded, "items", true);

                // Buat stock movement record untuk item (OUT)
                await createStockMovement({
                  itemId: detail.item_id,
                  bundleId: movementData.bundleId,
                  movementType: "OUT",
                  referenceType: "bundle_assembly",
                  referenceId: result.id,
                  quantity: qtyNeeded,
                  stockBefore: itemStockBefore,
                  stockAfter: itemStockAfter,
                  userId: movementData.userId || null,
                  notes: `Digunakan untuk membuat ${movementData.quantity} paket (Bundle ID: ${movementData.bundleId})`,
                });
              } else if (detail.accessory_id) {
                const accessoryStockBefore = await getStockBefore(detail.accessory_id, "accessories");
                const accessoryStockAfter = accessoryStockBefore - qtyNeeded;

                if (accessoryStockAfter < 0) {
                  throw new Error(`Stok aksesoris tidak mencukupi untuk membuat paket`);
                }

                // Kurangi stok aksesoris
                await updateStock(detail.accessory_id, qtyNeeded, "accessories", true);

                // Buat stock movement record untuk aksesoris (OUT)
                await createStockMovement({
                  accessoryId: detail.accessory_id,
                  bundleId: movementData.bundleId,
                  movementType: "OUT",
                  referenceType: "bundle_assembly",
                  referenceId: result.id,
                  quantity: qtyNeeded,
                  stockBefore: accessoryStockBefore,
                  stockAfter: accessoryStockAfter,
                  userId: movementData.userId || null,
                  notes: `Digunakan untuk membuat ${movementData.quantity} paket (Bundle ID: ${movementData.bundleId})`,
                });
              }
            }
          }
        } else {
          await database.execute(
            `UPDATE ${tableName} SET available_quantity = ? WHERE id = ?`,
            [stockAfter, idValue],
          );
        }

        // Get the created movement with joins
        const newMovement = await database.queryOne(
          `SELECT sm.*, 
           i.name AS item_name, 
           b.name AS bundle_name,
           a.name AS accessory_name,
           u.full_name AS user_name
           FROM stock_movements sm
           LEFT JOIN items i ON sm.item_id = i.id
           LEFT JOIN bundles b ON sm.bundle_id = b.id
           LEFT JOIN accessories a ON sm.accessory_id = a.id
           LEFT JOIN users u ON sm.user_id = u.id
           WHERE sm.id = ?`,
          [result.id],
        );

        return newMovement;
      });
    } catch (error) {
      logger.error("Error creating stock movement:", error);
      throw error;
    }
  });

  // Delete stock movement (with stock reversal)
  ipcMain.handle("stockMovements:delete", async (event, id) => {
    try {
      return await executeTransaction(async () => {
        // Get movement data
        const movement = await database.queryOne(
          "SELECT * FROM stock_movements WHERE id = ?",
          [id],
        );

        if (!movement) {
          throw new Error("Data tidak ditemukan");
        }

        // Determine which table to update
        let tableName = "";
        let idValue = null;

        if (movement.item_id) {
          tableName = "items";
          idValue = movement.item_id;
        } else if (movement.bundle_id) {
          tableName = "bundles";
          idValue = movement.bundle_id;
        } else if (movement.accessory_id) {
          tableName = "accessories";
          idValue = movement.accessory_id;
        } else {
          throw new Error("Data pergerakan stok tidak valid");
        }

        // Reverse stock change
        const record = await database.queryOne(
          `SELECT available_quantity, stock_quantity FROM ${tableName} WHERE id = ?`,
          [idValue],
        );

        if (!record) {
          throw new Error(`${tableName} tidak ditemukan`);
        }

        const currentStock = record.available_quantity || 0;
        const reversedStock =
          movement.movement_type === "IN"
            ? currentStock - movement.quantity
            : currentStock + movement.quantity;

        // Update stock
        // For IN reversal: decrease both stock_quantity and available_quantity
        // For OUT reversal: only increase available_quantity
        if (movement.movement_type === "IN") {
          await database.execute(
            `UPDATE ${tableName} SET available_quantity = ?, stock_quantity = stock_quantity - ? WHERE id = ?`,
            [reversedStock, movement.quantity, idValue],
          );
        } else {
          await database.execute(
            `UPDATE ${tableName} SET available_quantity = ? WHERE id = ?`,
            [reversedStock, idValue],
          );
        }

        // Delete movement
        await database.execute("DELETE FROM stock_movements WHERE id = ?", [
          id,
        ]);

        return true;
      });
    } catch (error) {
      logger.error("Error deleting stock movement:", error);
      throw error;
    }
  });
}

module.exports = { setupStockMovementHandlers };

