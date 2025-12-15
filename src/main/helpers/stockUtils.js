/**
 * Helper functions for stock management and repair
 */

const database = require("./database");
const logger = require("./logger");

/**
 * Repair stock for an item from stock_movements
 * @param {number} itemId - Item ID
 * @returns {Promise<{stock_qty: number, available_qty: number}>}
 */
async function repairStockFromMovements(itemId) {
  try {
    const calculated = await database.queryOne(
      `
      SELECT 
        COALESCE(SUM(
          CASE
            WHEN movement_type = 'IN' THEN quantity
            WHEN movement_type = 'OUT' AND (
              reference_type IS NULL
              OR reference_type NOT LIKE 'rental_transaction%'
            )
            THEN -quantity
            ELSE 0
          END
        ), 0) AS stock_qty,
        COALESCE(SUM(CASE 
        WHEN movement_type = 'IN' AND (
          reference_type IS NULL
          OR reference_type NOT LIKE '%rental%'
          OR reference_type IN ('rental_return', 'rental_cancellation')
        )
        THEN quantity 
        WHEN movement_type = 'OUT' 
        THEN -quantity 
        ELSE 0 
        END), 0) AS available_qty
      FROM stock_movements
      WHERE item_id = ?
    `,
      [itemId],
    );

    await database.execute(
      `
      UPDATE items 
      SET stock_quantity = ?, available_quantity = ?
      WHERE id = ?
    `,
      [calculated.stock_qty, calculated.available_qty, itemId],
    );

    logger.info(`Repaired stock for item ${itemId}: stock=${calculated.stock_qty}, available=${calculated.available_qty}`);
    return calculated;
  } catch (error) {
    logger.error(`Error repairing stock for item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Repair stock for a bundle from stock_movements
 * @param {number} bundleId - Bundle ID
 * @returns {Promise<{stock_qty: number, available_qty: number}>}
 */
async function repairBundleStockFromMovements(bundleId) {
  try {
    const calculated = await database.queryOne(
      `
      SELECT 
        COALESCE(SUM(
          CASE
            WHEN movement_type = 'IN' THEN quantity
            WHEN movement_type = 'OUT' AND (
              reference_type IS NULL
              OR reference_type NOT LIKE 'rental_transaction%'
            )
            THEN -quantity
            ELSE 0
          END
        ), 0) AS stock_qty,
        COALESCE(SUM(CASE 
        WHEN movement_type = 'IN' AND (
          reference_type IS NULL
          OR reference_type NOT LIKE '%rental%'
          OR reference_type IN ('rental_return', 'rental_cancellation')
        )
        THEN quantity 
        WHEN movement_type = 'OUT' 
        THEN -quantity 
        ELSE 0 
        END), 0) AS available_qty
      FROM stock_movements
      WHERE bundle_id = ?
    `,
      [bundleId],
    );

    await database.execute(
      `
      UPDATE bundles 
      SET stock_quantity = ?, available_quantity = ?
      WHERE id = ?
    `,
      [calculated.stock_qty, calculated.available_qty, bundleId],
    );

    logger.info(`Repaired stock for bundle ${bundleId}: stock=${calculated.stock_qty}, available=${calculated.available_qty}`);
    return calculated;
  } catch (error) {
    logger.error(`Error repairing stock for bundle ${bundleId}:`, error);
    throw error;
  }
}

/**
 * Repair stock for an accessory from stock_movements
 * @param {number} accessoryId - Accessory ID
 * @returns {Promise<{stock_qty: number, available_qty: number}>}
 */
async function repairAccessoryStockFromMovements(accessoryId) {
  try {
    const calculated = await database.queryOne(
      `
      SELECT 
        COALESCE(SUM(
          CASE
            WHEN movement_type = 'IN' THEN quantity
            WHEN movement_type = 'OUT' AND (
              reference_type IS NULL
              OR reference_type NOT LIKE 'rental_transaction%'
            )
            THEN -quantity
            ELSE 0
          END
        ), 0) AS stock_qty,
        COALESCE(SUM(CASE 
        WHEN movement_type = 'IN' AND (
          reference_type IS NULL
          OR reference_type NOT LIKE '%rental%'
          OR reference_type IN ('rental_return', 'rental_cancellation')
        )
        THEN quantity 
        WHEN movement_type = 'OUT' 
        THEN -quantity 
        ELSE 0 
        END), 0) AS available_qty
      FROM stock_movements
      WHERE accessory_id = ?
    `,
      [accessoryId],
    );

    await database.execute(
      `
      UPDATE accessories 
      SET stock_quantity = ?, available_quantity = ?
      WHERE id = ?
    `,
      [calculated.stock_qty, calculated.available_qty, accessoryId],
    );

    logger.info(`Repaired stock for accessory ${accessoryId}: stock=${calculated.stock_qty}, available=${calculated.available_qty}`);
    return calculated;
  } catch (error) {
    logger.error(`Error repairing stock for accessory ${accessoryId}:`, error);
    throw error;
  }
}

/**
 * Validate stock consistency for an item
 * @param {number} itemId - Item ID
 * @returns {Promise<{isValid: boolean, stockMismatch: boolean, availableMismatch: boolean, details: object}>}
 */
async function validateStockConsistency(itemId) {
  try {
    const result = await database.queryOne(
      `
      SELECT 
        stock_qty_mismatch,
        available_qty_mismatch,
        current_stock_quantity,
        current_available_quantity,
        calculated_stock_quantity,
        calculated_available_quantity
      FROM v_items_stock_calculated
      WHERE id = ?
    `,
      [itemId],
    );

    if (!result) {
      return {
        isValid: false,
        stockMismatch: false,
        availableMismatch: false,
        details: { error: "Item not found" },
      };
    }

    const stockMismatch = result.stock_qty_mismatch === 1;
    const availableMismatch = result.available_qty_mismatch === 1;
    const isValid = !stockMismatch && !availableMismatch;

    return {
      isValid,
      stockMismatch,
      availableMismatch,
      details: {
        current_stock_quantity: result.current_stock_quantity,
        current_available_quantity: result.current_available_quantity,
        calculated_stock_quantity: result.calculated_stock_quantity,
        calculated_available_quantity: result.calculated_available_quantity,
      },
    };
  } catch (error) {
    logger.error(`Error validating stock for item ${itemId}:`, error);
    throw error;
  }
}

module.exports = {
  repairStockFromMovements,
  repairBundleStockFromMovements,
  repairAccessoryStockFromMovements,
  validateStockConsistency,
};
