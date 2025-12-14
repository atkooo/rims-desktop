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

  ipcMain.handle("stock:getBundleAvailability", async (_event, bundleId) => {
    try {
      if (!bundleId) {
        throw new Error("Bundle tidak valid");
      }

      const bundle = await database.queryOne(
        "SELECT id, name, code, available_quantity FROM bundles WHERE id = ?",
        [bundleId],
      );
      if (!bundle) {
        throw new Error("Bundle tidak ditemukan");
      }

      const details = await database.query(
        `
        SELECT
          bd.id,
          bd.item_id,
          bd.accessory_id,
          bd.quantity AS detail_quantity,
          i.name AS item_name,
          i.code AS item_code,
          COALESCE(i.available_quantity, 0) AS item_available,
          a.name AS accessory_name,
          a.code AS accessory_code,
          COALESCE(a.available_quantity, 0) AS accessory_available
        FROM bundle_details bd
        LEFT JOIN items i ON bd.item_id = i.id
        LEFT JOIN accessories a ON bd.accessory_id = a.id
        WHERE bd.bundle_id = ?
      `,
        [bundleId],
      );

      const components = details.map((detail) => {
        const type = detail.item_id ? "item" : detail.accessory_id ? "accessory" : "unknown";
        const availableQuantity = detail.item_id
          ? detail.item_available
          : detail.accessory_id
            ? detail.accessory_available
            : 0;
        const detailQuantity = detail.detail_quantity || 0;
        const perComponentMax = detailQuantity > 0
          ? Math.floor(availableQuantity / detailQuantity)
          : Number.MAX_SAFE_INTEGER;
        return {
          id: detail.id,
          type,
          name: detail.item_name || detail.accessory_name || "Tidak Diketahui",
          code: detail.item_code || detail.accessory_code || "-",
          available_quantity: availableQuantity,
          detail_quantity: detailQuantity,
          maxBundles: Math.max(0, perComponentMax),
          maxBundlesForCalc: perComponentMax,
        };
      });

      const finiteLimits = components
        .map((component) => component.maxBundlesForCalc)
        .filter((value) => Number.isFinite(value));
      const maxAssemblable = finiteLimits.length
        ? Math.max(0, Math.min(...finiteLimits))
        : 0;

      return {
        bundleId: bundle.id,
        bundleName: bundle.name,
        bundleCode: bundle.code,
        bundleAvailable: bundle.available_quantity || 0,
        components,
        maxAssemblable,
      };
    } catch (error) {
      logger.error("Error fetching bundle availability:", error);
      throw error;
    }
  });
}

module.exports = {
  setupStockReceiptHandlers,
};
