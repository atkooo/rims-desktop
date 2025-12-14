const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const {
  executeTransaction,
  getStockBefore,
  restoreStockWithMovement,
  updateStock,
  createStockMovement,
} = require("./transactionHelpers");
const { generateStockReceiptCode } = require("../helpers/codeUtils");

function setupStockReceiptHandlers() {
  ipcMain.handle("stockReceipts:create", async (event, payload) => {
    try {
      if (!payload || !Array.isArray(payload.lines) || payload.lines.length === 0) {
        throw new Error("Data tidak valid");
      }

      const receiptCode = generateStockReceiptCode();
      const lines = payload.lines;

      return await executeTransaction(async () => {
        const result = await database.execute(
          `INSERT INTO stock_receipts (receipt_code, user_id, notes)
           VALUES (?, ?, ?)`,
          [receiptCode, payload.userId || null, payload.notes || null],
        );

        const receiptId = result.id;

        for (const line of lines) {
          const quantity = Math.max(1, Number(line.quantity) || 0);
          if (!quantity) {
            throw new Error("Jumlah harus minimal 1");
          }

          let itemId = null;
          let bundleId = null;
          let accessoryId = null;
          let noteDetail = "";

          if (line.type === "item") {
            itemId = line.referenceId;
            if (!itemId) throw new Error("Item tidak boleh kosong");
            noteDetail = `Penerimaan item (Receipt ${receiptCode})`;
            await restoreStockWithMovement({
              entityId: itemId,
              quantity,
              tableName: "items",
              increaseStockQuantity: true,
              referenceType: "stock_receipt",
              referenceId: receiptId,
              userId: payload.userId || null,
              notes: noteDetail,
            });
          } else if (line.type === "accessory") {
            accessoryId = line.referenceId;
            if (!accessoryId) throw new Error("Aksesoris tidak boleh kosong");
            noteDetail = `Penerimaan aksesoris (Receipt ${receiptCode})`;
            await restoreStockWithMovement({
              entityId: accessoryId,
              quantity,
              tableName: "accessories",
              increaseStockQuantity: true,
              referenceType: "stock_receipt",
              referenceId: receiptId,
              userId: payload.userId || null,
              notes: noteDetail,
            });
          } else if (line.type === "bundle") {
            bundleId = line.referenceId;
            if (!bundleId) throw new Error("Bundle tidak boleh kosong");
            noteDetail = `Penerimaan bundle (Receipt ${receiptCode})`;

            const bundleDetails = await database.query(
              `SELECT item_id, accessory_id, quantity AS detail_quantity 
               FROM bundle_details 
               WHERE bundle_id = ?`,
              [bundleId],
            );

            if (!bundleDetails || bundleDetails.length === 0) {
              throw new Error("Bundle belum memiliki komposisi");
            }

            for (const detail of bundleDetails) {
              const requiredQty = (detail.detail_quantity || 0) * quantity;
              if (requiredQty <= 0) continue;

              const tableName = detail.item_id ? "items" : "accessories";
              const entityId = detail.item_id || detail.accessory_id;
              if (!entityId) continue;

              const entityStockBefore = await getStockBefore(
                entityId,
                tableName,
              );
              const entityRecord = await database.queryOne(
                `SELECT available_quantity FROM ${tableName} WHERE id = ?`,
                [entityId],
              );
              const availableQty = entityRecord?.available_quantity || 0;
              if (availableQty < requiredQty) {
                throw new Error(
                  `Stok ${tableName === "items" ? "item" : "aksesoris"} tidak mencukupi untuk membuat bundle`,
                );
              }

              await updateStock(entityId, requiredQty, tableName, true);

              const entityStockAfter = entityStockBefore - requiredQty;
              await createStockMovement({
                itemId: detail.item_id || null,
                accessoryId: detail.accessory_id || null,
                bundleId,
                movementType: "OUT",
                referenceType: "bundle_assembly",
                referenceId: receiptId,
                quantity: requiredQty,
                stockBefore: entityStockBefore,
                stockAfter: entityStockAfter,
                userId: payload.userId || null,
                notes: `Digunakan untuk menyusun ${quantity} paket (Receipt ${receiptCode})`,
              });
            }

            await restoreStockWithMovement({
              entityId: bundleId,
              quantity,
              tableName: "bundles",
              increaseStockQuantity: true,
              referenceType: "stock_receipt",
              referenceId: receiptId,
              userId: payload.userId || null,
              notes: noteDetail,
            });
          } else {
            throw new Error("Tipe mutasi tidak dikenal");
          }

          await database.execute(
            `INSERT INTO stock_receipt_lines (
              stock_receipt_id, item_id, bundle_id, accessory_id, quantity
            ) VALUES (?, ?, ?, ?, ?)`,
            [receiptId, itemId, bundleId, accessoryId, quantity],
          );
        }

        return {
          id: receiptId,
          receiptCode,
        };
      });
    } catch (error) {
      logger.error("Error creating stock receipt:", error);
      throw error;
    }
  });
}

module.exports = {
  setupStockReceiptHandlers,
};
