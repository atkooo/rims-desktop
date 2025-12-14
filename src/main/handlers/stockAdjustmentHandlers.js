/**
 * Handler for manual stock adjustments triggered from Stock Opname
 */

const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const {
  executeTransaction,
  createStockMovement,
} = require("./transactionHelpers");

const TABLE_MAP = {
  item: "items",
  bundle: "bundles",
  accessory: "accessories",
};

const ENTITY_LABEL = {
  item: "Item",
  bundle: "Bundle",
  accessory: "Aksesoris",
};

async function adjustStock({
  entityId,
  entityType,
  movementType,
  quantity,
  userId,
  notes,
  referenceId,
}) {
  const tableName = TABLE_MAP[entityType];
  if (!tableName) {
    throw new Error("Tipe entitas tidak dikenal");
  }

  return await executeTransaction(async () => {
    const entity = await database.queryOne(
      `SELECT available_quantity, stock_quantity FROM ${tableName} WHERE id = ?`,
      [entityId],
    );
    if (!entity) {
      throw new Error(`${ENTITY_LABEL[entityType]} tidak ditemukan`);
    }

    const qty = Math.max(1, Number(quantity) || 0);
    if (!qty) {
      throw new Error("Jumlah penyesuaian harus lebih besar dari 0");
    }

    const availableBefore = entity.available_quantity || 0;
    const stockBefore = entity.stock_quantity || 0;
    let newAvailable = availableBefore;
    let newStock = stockBefore;

    if (movementType === "IN") {
      newAvailable += qty;
      newStock += qty;
    } else if (movementType === "OUT") {
      if (availableBefore < qty || stockBefore < qty) {
        throw new Error("Stok tidak cukup untuk melakukan penyesuaian OUT");
      }
      newAvailable -= qty;
      newStock -= qty;
    } else {
      throw new Error("Tipe penyesuaian tidak valid");
    }

    await database.execute(
      `UPDATE ${tableName} SET available_quantity = ?, stock_quantity = ? WHERE id = ?`,
      [newAvailable, newStock, entityId],
    );

    await createStockMovement({
      itemId: entityType === "item" ? entityId : null,
      accessoryId: entityType === "accessory" ? entityId : null,
      bundleId: entityType === "bundle" ? entityId : null,
      movementType,
      referenceType: "stock_adjustment",
      referenceId: referenceId || null,
      quantity: qty,
      stockBefore: availableBefore,
      stockAfter: newAvailable,
      userId: userId || null,
      notes: notes || "Penyesuaian Stock Opname",
    });

    logger.info(
      `Stock adjustment (${movementType}) ${ENTITY_LABEL[entityType]} ${entityId}: available ${availableBefore} -> ${newAvailable}`,
    );

    return {
      entityId,
      entityType,
      available_quantity: newAvailable,
      stock_quantity: newStock,
    };
  });
}

function setupStockAdjustmentHandlers() {
  ipcMain.handle("stockAdjustments:create", async (event, payload) => {
    try {
      return await adjustStock(payload);
    } catch (error) {
      logger.error("Error creating stock adjustment:", error);
      throw error;
    }
  });
}

module.exports = { setupStockAdjustmentHandlers };
