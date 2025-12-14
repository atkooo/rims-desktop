const database = require("../helpers/database");
const { toInteger } = require("../helpers/codeUtils");

/**
 * Fetch bundle item details for sale or rental
 */
async function fetchBundleItemDetails(bundleId, isRental = false) {
  const priceField = isRental 
    ? 'COALESCE(i.rental_price_per_day, 0) AS rental_price'
    : 'COALESCE(i.sale_price, 0) AS sale_price';
  const bundleType = isRental 
    ? "(b.bundle_type = 'rental' OR b.bundle_type = 'both')"
    : "(b.bundle_type = 'sale' OR b.bundle_type = 'both')";
  
  return database.query(`
    SELECT
      bd.bundle_id,
      bd.quantity,
      bd.item_id,
      ${priceField},
      b.name AS bundle_name
    FROM bundle_details bd
    JOIN bundles b ON bd.bundle_id = b.id AND ${bundleType}
    JOIN items i ON bd.item_id = i.id
    WHERE bd.bundle_id = ?
  `, [bundleId]);
}

/**
 * Generic stock validation function
 */
async function validateStockGeneric(entityId, requiredQuantity, tableName, entityLabel) {
  const entity = await database.queryOne(
    `SELECT available_quantity, stock_quantity, name, code FROM ${tableName} WHERE id = ?`,
    [entityId],
  );

  if (!entity) {
    throw new Error(`${entityLabel} tidak ditemukan`);
  }

  const availableStock = entity.available_quantity || 0;
  if (availableStock < requiredQuantity) {
    throw new Error(`Stok ${entityLabel.toLowerCase()} tidak cukup`);
  }

  return entity;
}

/**
 * Validate stock availability for an item
 */
async function validateStock(itemId, requiredQuantity) {
  return validateStockGeneric(itemId, requiredQuantity, "items", "Item");
}

/**
 * Validate stock availability for an accessory
 */
async function validateAccessoryStock(accessoryId, requiredQuantity) {
  return validateStockGeneric(accessoryId, requiredQuantity, "accessories", "Aksesoris");
}

/**
 * Create stock movement record
 */
async function createStockMovement({
  itemId,
  accessoryId,
  bundleId,
  movementType,
  referenceType,
  referenceId,
  quantity,
  stockBefore,
  stockAfter,
  userId,
  notes,
}) {
  await database.execute(
    `INSERT INTO stock_movements (
      item_id, accessory_id, bundle_id, movement_type, reference_type, reference_id,
      quantity, stock_before, stock_after, user_id, notes, is_sync
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      itemId || null,
      accessoryId || null,
      bundleId || null,
      movementType,
      referenceType,
      referenceId,
      quantity,
      stockBefore,
      stockAfter,
      userId,
      notes,
    ],
  );
}

/**
 * Execute database transaction with automatic rollback on error
 */
async function executeTransaction(callback) {
  await database.execute("BEGIN TRANSACTION");
  try {
    const result = await callback();
    await database.execute("COMMIT");
    return result;
  } catch (error) {
    await database.execute("ROLLBACK");
    throw error;
  }
}

/**
 * Get stock before update for item or accessory
 */
async function getStockBefore(entityId, tableName = "items") {
  const entity = await database.queryOne(
    `SELECT available_quantity, stock_quantity FROM ${tableName} WHERE id = ?`,
    [entityId],
  );
  return entity?.available_quantity || 0;
}

/**
 * Update stock for item or accessory
 */
async function updateStock(entityId, quantity, tableName = "items", decreaseStockQuantity = false) {
  if (decreaseStockQuantity) {
    await database.execute(
      `UPDATE ${tableName} SET available_quantity = available_quantity - ?, stock_quantity = stock_quantity - ? WHERE id = ?`,
      [quantity, quantity, entityId],
    );
  } else {
    await database.execute(
      `UPDATE ${tableName} SET available_quantity = available_quantity - ? WHERE id = ?`,
      [quantity, entityId],
    );
  }
}

/**
 * Restore stock for item or accessory
 */
async function restoreStock(entityId, quantity, tableName = "items", increaseStockQuantity = false) {
  if (increaseStockQuantity) {
    await database.execute(
      `UPDATE ${tableName} SET available_quantity = available_quantity + ?, stock_quantity = stock_quantity + ? WHERE id = ?`,
      [quantity, quantity, entityId],
    );
  } else {
    await database.execute(
      `UPDATE ${tableName} SET available_quantity = available_quantity + ? WHERE id = ?`,
      [quantity, entityId],
    );
  }
}

/**
 * Restore stock and create stock movement record
 */
async function restoreStockWithMovement({
  entityId,
  quantity,
  tableName = "items",
  increaseStockQuantity = false,
  movementType = "IN",
  referenceType,
  referenceId,
  userId,
  notes,
}) {
  const stockBefore = await getStockBefore(entityId, tableName);
  await restoreStock(entityId, quantity, tableName, increaseStockQuantity);
  const stockAfter = stockBefore + quantity;

  const isItem = tableName === "items";
  const isAccessory = tableName === "accessories";
  const isBundle = tableName === "bundles";

  await createStockMovement({
    itemId: isItem ? entityId : null,
    accessoryId: isAccessory ? entityId : null,
    bundleId: isBundle ? entityId : null,
    movementType,
    referenceType,
    referenceId,
    quantity,
    stockBefore,
    stockAfter,
    userId,
    notes,
  });
}

/**
 * Check payment status for a transaction
 */
async function getTransactionPaymentStatus(transactionType, transactionId) {
  const table =
    transactionType === "rental" ? "rental_transactions" : "sales_transactions";
  const paymentTable = transactionType === "rental" ? "rental_payments" : "sales_payments";

  const transaction = await database.queryOne(
    `SELECT t.*, 
     COALESCE(SUM(p.amount), 0) as total_paid,
     CASE 
       WHEN COALESCE(SUM(p.amount), 0) >= t.total_amount THEN 'paid'
       ELSE 'unpaid'
     END as calculated_payment_status
     FROM ${table} t
     LEFT JOIN ${paymentTable} p ON p.transaction_id = t.id
     WHERE t.id = ?
     GROUP BY t.id`,
    [transactionId],
  );

  return transaction;
}

/**
 * Validate cashier session for cash payments
 */
async function validateCashierSession(userId) {
  if (!userId) {
    throw new Error("Data tidak valid");
  }

  const cashierTableExists = await database.tableExists("cashier_sessions");
  if (!cashierTableExists) {
    return null;
  }

  // Cek apakah ada sesi kasir yang terbuka (siapa pun yang membuka)
  const anyOpenSession = await database.queryOne(
    `SELECT id, user_id, session_code FROM cashier_sessions 
     WHERE status = 'open' 
     ORDER BY opening_date DESC LIMIT 1`,
  );

  // Jika tidak ada sesi kasir yang terbuka sama sekali
  if (!anyOpenSession) {
    throw new Error("Sesi kasir belum dibuka");
  }

  // Jika ada sesi kasir terbuka, cek apakah user yang melakukan transaksi adalah user yang membuka sesi
  if (anyOpenSession.user_id !== userId) {
    throw new Error("Anda tidak memiliki otoritas untuk melakukan transaksi. Hanya kasir yang membuka sesi kasir yang berhak melakukan transaksi.");
  }

  return anyOpenSession.id;
}

/**
 * Expand bundle selections to individual items
 */
async function expandBundleSelections(selections = [], isRental = false) {
  const cache = new Map();
  const result = [];

  for (const selection of selections) {
    const bundleId = toInteger(selection.bundleId);
    if (!bundleId) {
      throw new Error("Data tidak valid");
    }
    const bundleQuantity = Math.max(1, toInteger(selection.quantity));

    if (!cache.has(bundleId)) {
      const details = await fetchBundleItemDetails(bundleId, isRental);
      if (!details.length) {
        throw new Error("Data tidak valid");
      }
      cache.set(bundleId, details);
    }

    const details = cache.get(bundleId);
    for (const detail of details) {
      const detailQuantity = Math.max(1, toInteger(detail.quantity)) * bundleQuantity;
      if (detailQuantity <= 0) continue;
      
      if (isRental) {
        const rentalPrice = Number(detail.rental_price) || 0;
        result.push({
          itemId: detail.item_id,
          quantity: detailQuantity,
          rentalPrice,
          subtotal: rentalPrice * detailQuantity,
        });
      } else {
        const salePrice = Number(detail.sale_price) || 0;
        result.push({
          itemId: detail.item_id,
          quantity: detailQuantity,
          salePrice,
          subtotal: salePrice * detailQuantity,
        });
      }
    }
  }
  return result;
}

module.exports = {
  validateStock,
  validateAccessoryStock,
  createStockMovement,
  executeTransaction,
  getStockBefore,
  updateStock,
  restoreStock,
  restoreStockWithMovement,
  getTransactionPaymentStatus,
  validateCashierSession,
  expandBundleSelections,
};
