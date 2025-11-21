const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { TRANSACTION_STATUS } = require("../../shared/constants");
const { generateTransactionCode, toInteger } = require("../helpers/codeUtils");

const bundleItemSql = `
  SELECT
    bd.bundle_id,
    bd.quantity,
    bd.item_id,
    COALESCE(i.sale_price, i.price, 0) AS sale_price,
    b.name AS bundle_name
  FROM bundle_details bd
  JOIN bundles b ON bd.bundle_id = b.id AND (b.bundle_type = 'sale' OR b.bundle_type = 'both')
  JOIN items i ON bd.item_id = i.id
  WHERE bd.bundle_id = ?
`;

const bundleItemRentalSql = `
  SELECT
    bd.bundle_id,
    bd.quantity,
    bd.item_id,
    COALESCE(i.rental_price_per_day, i.price, 0) AS rental_price,
    b.name AS bundle_name
  FROM bundle_details bd
  JOIN bundles b ON bd.bundle_id = b.id AND (b.bundle_type = 'rental' OR b.bundle_type = 'both')
  JOIN items i ON bd.item_id = i.id
  WHERE bd.bundle_id = ?
`;

async function fetchBundleItemDetails(bundleId) {
  return database.query(bundleItemSql, [bundleId]);
}

async function fetchBundleItemDetailsForRental(bundleId) {
  return database.query(bundleItemRentalSql, [bundleId]);
}

/**
 * Validate stock availability for an item
 */
async function validateStock(itemId, requiredQuantity) {
  const item = await database.queryOne(
    "SELECT available_quantity, stock_quantity, name, code FROM items WHERE id = ?",
    [itemId],
  );

  if (!item) {
    throw new Error("Item tidak ditemukan");
  }

  const availableStock = item.available_quantity || 0;
  if (availableStock < requiredQuantity) {
    throw new Error("Stok tidak cukup");
  }

  return item;
}

/**
 * Validate stock availability for an accessory
 */
async function validateAccessoryStock(accessoryId, requiredQuantity) {
  const accessory = await database.queryOne(
    "SELECT available_quantity, stock_quantity, name, code FROM accessories WHERE id = ?",
    [accessoryId],
  );

  if (!accessory) {
    throw new Error("Aksesoris tidak ditemukan");
  }

  const availableStock = accessory.available_quantity || 0;
  if (availableStock < requiredQuantity) {
    throw new Error("Stok aksesoris tidak cukup");
  }

  return accessory;
}

/**
 * Create stock movement record
 */
async function createStockMovement({
  itemId,
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
      item_id, movement_type, reference_type, reference_id,
      quantity, stock_before, stock_after, user_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      itemId,
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
 * Check payment status for a transaction
 */
async function getTransactionPaymentStatus(transactionType, transactionId) {
  const table =
    transactionType === "rental" ? "rental_transactions" : "sales_transactions";
  const type = transactionType === "rental" ? "rental" : "sale";

  const transaction = await database.queryOne(
    `SELECT t.*, 
     COALESCE(SUM(p.amount), 0) as total_paid,
     CASE 
       WHEN COALESCE(SUM(p.amount), 0) >= t.total_amount THEN 'paid'
       ELSE 'unpaid'
     END as calculated_payment_status
     FROM ${table} t
     LEFT JOIN payments p ON p.transaction_type = ? AND p.transaction_id = t.id
     WHERE t.id = ?
     GROUP BY t.id`,
    [type, transactionId],
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

async function expandBundleSelections(selections = []) {
  const cache = new Map();
  const result = [];

  for (const selection of selections) {
    const bundleId = toInteger(selection.bundleId);
    if (!bundleId) {
      throw new Error("Data tidak valid");
    }
    const bundleQuantity = Math.max(1, toInteger(selection.quantity));

    if (!cache.has(bundleId)) {
      const details = await fetchBundleItemDetails(bundleId);
      if (!details.length) {
        throw new Error("Data tidak valid");
      }
      cache.set(bundleId, details);
    }

    const details = cache.get(bundleId);
    for (const detail of details) {
      const detailQuantity =
        Math.max(1, toInteger(detail.quantity)) * bundleQuantity;
      const salePrice = Number(detail.sale_price) || 0;
      if (detailQuantity <= 0) continue;
      result.push({
        itemId: detail.item_id,
        quantity: detailQuantity,
        salePrice,
        subtotal: salePrice * detailQuantity,
      });
    }
  }
  return result;
}

async function expandBundleSelectionsForRental(selections = []) {
  const cache = new Map();
  const result = [];

  for (const selection of selections) {
    const bundleId = toInteger(selection.bundleId);
    if (!bundleId) {
      throw new Error("Data tidak valid");
    }
    const bundleQuantity = Math.max(1, toInteger(selection.quantity));

    if (!cache.has(bundleId)) {
      const details = await fetchBundleItemDetailsForRental(bundleId);
      if (!details.length) {
        throw new Error("Data tidak valid");
      }
      cache.set(bundleId, details);
    }

    const details = cache.get(bundleId);
    for (const detail of details) {
      const detailQuantity =
        Math.max(1, toInteger(detail.quantity)) * bundleQuantity;
      const rentalPrice = Number(detail.rental_price) || 0;
      if (detailQuantity <= 0) continue;
      result.push({
        itemId: detail.item_id,
        quantity: detailQuantity,
        rentalPrice,
        subtotal: rentalPrice * detailQuantity,
      });
    }
  }
  return result;
}

function setupTransactionHandlers() {
  // Get all transactions
  ipcMain.handle("transactions:getAll", async () => {
    try {
      // Get rental transactions with payment calculation from payments table
      const rentalTransactions = await database.query(`
                SELECT 
                    rt.*,
                    c.name AS customer_name,
                    GROUP_CONCAT(rtd.item_id) as item_ids,
                    GROUP_CONCAT(rtd.quantity) as quantities,
                    'rental' as transaction_type,
                    COALESCE(SUM(p.amount), 0) as actual_paid_amount,
                    CASE 
                      WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
                      ELSE 'unpaid'
                    END as calculated_payment_status
                FROM rental_transactions rt
                LEFT JOIN customers c ON rt.customer_id = c.id
                LEFT JOIN rental_transaction_details rtd ON rt.id = rtd.rental_transaction_id
                LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
                GROUP BY rt.id
            `);

      // Get sales transactions with payment calculation from payments table
      const salesTransactions = await database.query(`
                SELECT 
                    st.*,
                    c.name AS customer_name,
                    GROUP_CONCAT(std.item_id) as item_ids,
                    GROUP_CONCAT(std.quantity) as quantities,
                    'sale' as transaction_type,
                    COALESCE(SUM(p.amount), 0) as actual_paid_amount,
                    CASE 
                      WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
                      ELSE 'unpaid'
                    END as calculated_payment_status
                FROM sales_transactions st
                LEFT JOIN customers c ON st.customer_id = c.id
                LEFT JOIN sales_transaction_details std ON st.id = std.sales_transaction_id
                LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
                GROUP BY st.id
            `);

      // Process transactions to use actual payment data
      const processedRentalTransactions = rentalTransactions.map((t) => ({
        ...t,
        paid_amount: t.actual_paid_amount || 0,
        payment_status:
          t.calculated_payment_status || t.payment_status || "unpaid",
      }));

      const processedSalesTransactions = salesTransactions.map((t) => ({
        ...t,
        paid_amount: t.actual_paid_amount || 0,
        payment_status:
          t.calculated_payment_status || t.payment_status || "unpaid",
      }));

      // Combine and sort both types of transactions
      const transactions = [
        ...processedRentalTransactions,
        ...processedSalesTransactions,
      ].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
      return transactions;
    } catch (error) {
      logger.error("Error fetching transactions:", error);
      throw error;
    }
  });

  // Create new transaction
  ipcMain.handle("transactions:create", async (event, transactionData) => {
    try {
      // Validasi input
      if (!validator.isValidDate(transactionData.transactionDate)) {
        throw new Error("Data tidak valid");
      }
      if (!validator.isPositiveNumber(transactionData.totalAmount)) {
        throw new Error("Data tidak valid");
      }
      const saleItems = Array.isArray(transactionData.items)
        ? transactionData.items
        : [];
      const hasBundles =
        Array.isArray(transactionData.bundles) &&
        transactionData.bundles.length > 0;
      const hasAccessories =
        Array.isArray(transactionData.accessories) &&
        transactionData.accessories.length > 0;
      if (saleItems.length === 0 && !hasBundles && !hasAccessories) {
        throw new Error("Data tidak valid");
      }

      // Validate cashier session for cash payments
      let cashierSessionId = null;
      if (
        !transactionData.paymentMethod ||
        transactionData.paymentMethod === "cash"
      ) {
        cashierSessionId = await validateCashierSession(
          transactionData.userId,
        );
      }

      // Mulai transaction database
      await database.execute("BEGIN TRANSACTION");

      try {
        let result;
        const transactionCode = generateTransactionCode(transactionData.type);

        if (transactionData.type === "RENTAL") {
          // Insert rental transaction
          result = await database.execute(
            `INSERT INTO rental_transactions (
              transaction_code, customer_id, user_id, rental_date, 
              planned_return_date, total_days, subtotal, deposit, tax,
              total_amount, status, notes, cashier_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionCode,
              transactionData.customerId,
              transactionData.userId,
              transactionData.rentalDate,
              transactionData.plannedReturnDate,
              transactionData.totalDays,
              transactionData.subtotal,
              transactionData.deposit,
              transactionData.tax || 0,
              transactionData.totalAmount,
              "pending", // Status awal: pending (belum dibayar), akan diupdate ke 'active' setelah pembayaran
              transactionData.notes,
              cashierSessionId,
            ],
          );

          // Expand bundles to items for rental
          const rentalItems = Array.isArray(transactionData.items)
            ? transactionData.items
            : [];
          const hasBundles =
            Array.isArray(transactionData.bundles) &&
            transactionData.bundles.length > 0;
          const bundleLines = hasBundles
            ? await expandBundleSelectionsForRental(transactionData.bundles)
            : [];
          const rentalLines = [...rentalItems, ...bundleLines];
          
          // Validate that at least one item or bundle is selected
          if (rentalLines.length === 0) {
            throw new Error("Data tidak valid: Pilih minimal 1 item atau paket");
          }

          // Validate stock before processing rental transaction
          for (const line of rentalLines) {
            const quantity = Math.max(1, Number(line.quantity) || 0);
            await validateStock(line.itemId, quantity);
          }

          // Insert rental transaction items (from items and expanded bundles)
          for (const line of rentalLines) {
            const quantity = Math.max(1, Number(line.quantity) || 0);
            const rentalPrice = Number(line.rentalPrice) || 0;
            // Subtotal should already include totalDays calculation from frontend
            const lineSubtotal = Number(line.subtotal) || rentalPrice * quantity * transactionData.totalDays;

            // Get current stock before update
            const itemBefore = await database.queryOne(
              "SELECT available_quantity FROM items WHERE id = ?",
              [line.itemId],
            );
            const stockBefore = itemBefore?.available_quantity || 0;

            await database.execute(
              `INSERT INTO rental_transaction_details (
                rental_transaction_id, item_id, quantity, 
                rental_price, subtotal
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                result.id,
                line.itemId,
                quantity,
                rentalPrice,
                lineSubtotal,
              ],
            );

            // Update available quantity for the item
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity - ? WHERE id = ?",
              [quantity, line.itemId],
            );

            const stockAfter = stockBefore - quantity;

            // Create stock movement record
            await createStockMovement({
              itemId: line.itemId,
              movementType: "OUT",
              referenceType: "rental_transaction",
              referenceId: result.id,
              quantity,
              stockBefore,
              stockAfter,
              userId: transactionData.userId,
              notes: `Rental transaction: ${transactionCode}`,
            });
          }
        } else {
          // Insert sales transaction
          // Convert empty string to null for customer_id (customer is optional for sales)
          const customerId =
            transactionData.customerId &&
            transactionData.customerId.toString().trim() !== ""
              ? transactionData.customerId
              : null;

          result = await database.execute(
            `INSERT INTO sales_transactions (
              transaction_code, customer_id, user_id, sale_date,
              subtotal, discount, tax, total_amount, notes, cashier_session_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionCode,
              customerId,
              transactionData.userId,
              transactionData.saleDate,
              transactionData.subtotal,
              transactionData.discount || 0,
              transactionData.tax || 0,
              transactionData.totalAmount,
              transactionData.notes,
              cashierSessionId,
              "pending", // Status awal: pending (belum dibayar)
            ],
          );

          const bundleLines = hasBundles
            ? await expandBundleSelections(transactionData.bundles)
            : [];
          const saleLines = [...saleItems, ...bundleLines];
          const accessories = Array.isArray(transactionData.accessories)
            ? transactionData.accessories
            : [];

          // Validate stock before processing transaction
          for (const line of saleLines) {
            const quantity = Math.max(1, Number(line.quantity) || 0);
            await validateStock(line.itemId, quantity);
          }

          // Validate accessory stock
          for (const accessory of accessories) {
            const quantity = Math.max(1, Number(accessory.quantity) || 1);
            await validateAccessoryStock(accessory.accessoryId, quantity);
          }

          // Process items and bundles
          for (const line of saleLines) {
            const quantity = Math.max(1, Number(line.quantity) || 0);
            const salePrice = Number(line.salePrice) || 0;
            const lineSubtotal = Number(line.subtotal) || salePrice * quantity;

            // Get current stock before update
            const itemBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity FROM items WHERE id = ?",
              [line.itemId],
            );
            const stockBefore = itemBefore?.available_quantity || 0;

            await database.execute(
              `INSERT INTO sales_transaction_details (
                sales_transaction_id, item_id, accessory_id, quantity,
                sale_price, subtotal
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [result.id, line.itemId, null, quantity, salePrice, lineSubtotal],
            );

            // Update available quantity and stock quantity for the item
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity - ?, stock_quantity = stock_quantity - ? WHERE id = ?",
              [quantity, quantity, line.itemId],
            );

            const stockAfter = stockBefore - quantity;

            // Create stock movement record
            await createStockMovement({
              itemId: line.itemId,
              movementType: "OUT",
              referenceType: "sales_transaction",
              referenceId: result.id,
              quantity,
              stockBefore,
              stockAfter,
              userId: transactionData.userId,
              notes: `Sales transaction: ${transactionCode}`,
            });
          }

          // Process accessories
          for (const accessory of accessories) {
            const quantity = Math.max(1, Number(accessory.quantity) || 1);
            const salePrice = Number(accessory.salePrice) || 0;
            const lineSubtotal = Number(accessory.subtotal) || salePrice * quantity;

            // Get current stock before update
            const accessoryBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity FROM accessories WHERE id = ?",
              [accessory.accessoryId],
            );
            const stockBefore = accessoryBefore?.available_quantity || 0;

            await database.execute(
              `INSERT INTO sales_transaction_details (
                sales_transaction_id, item_id, accessory_id, quantity,
                sale_price, subtotal
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [result.id, null, accessory.accessoryId, quantity, salePrice, lineSubtotal],
            );

            // Update available quantity and stock quantity for the accessory
            await database.execute(
              "UPDATE accessories SET available_quantity = available_quantity - ?, stock_quantity = stock_quantity - ? WHERE id = ?",
              [quantity, quantity, accessory.accessoryId],
            );

            const stockAfter = stockBefore - quantity;

            // Create stock movement record
            await createStockMovement({
              accessoryId: accessory.accessoryId,
              movementType: "OUT",
              referenceType: "sales_transaction",
              referenceId: result.id,
              quantity,
              stockBefore,
              stockAfter,
              userId: transactionData.userId,
              notes: `Sales transaction: ${transactionCode}`,
            });
          }
        }

        await database.execute("COMMIT");

        // Return created transaction
        const newTransaction = await database.queryOne(
          transactionData.type === "RENTAL"
            ? "SELECT * FROM rental_transactions WHERE id = ?"
            : "SELECT * FROM sales_transactions WHERE id = ?",
          [result.id],
        );
        return newTransaction;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error creating transaction:", error);
      throw error;
    }
  });

  // Update transaction status
  ipcMain.handle("transactions:updateStatus", async (event, id, status) => {
    try {
      if (!Object.values(TRANSACTION_STATUS).includes(status)) {
        throw new Error("Data tidak valid");
      }

      await database.execute("BEGIN TRANSACTION");

      try {
        const { transactionType, transactionId } = id;

        if (transactionType === "RENTAL") {
          // Map UI status -> DB status
          const statusMap = {
            [TRANSACTION_STATUS.COMPLETED]: "returned",
            [TRANSACTION_STATUS.CANCELLED]: "cancelled",
            [TRANSACTION_STATUS.PENDING]: "active",
          };
          const dbStatus = statusMap[status] || "active";
          // Update rental transaction status
          await database.execute(
            "UPDATE rental_transactions SET status = ? WHERE id = ?",
            [dbStatus, transactionId],
          );

          // If returned, update item quantities and mark items as returned
          if (dbStatus === "returned") {
            const rentalItems = await database.query(
              `SELECT rtd.item_id, rtd.quantity, rtd.id as detail_id
               FROM rental_transaction_details rtd
               WHERE rtd.rental_transaction_id = ? AND rtd.is_returned = 0`,
              [transactionId],
            );

            // Get rental transaction info for stock movement
            const rentalTransaction = await database.queryOne(
              "SELECT user_id, transaction_code FROM rental_transactions WHERE id = ?",
              [transactionId],
            );

            for (const item of rentalItems) {
              // Get current stock before update
              const itemBefore = await database.queryOne(
                "SELECT available_quantity FROM items WHERE id = ?",
                [item.item_id],
              );
              const stockBefore = itemBefore?.available_quantity || 0;

              // Mark item as returned in rental_transaction_details
              await database.execute(
                "UPDATE rental_transaction_details SET is_returned = 1, return_condition = ? WHERE id = ?",
                ["good", item.detail_id],
              );

              // Restore available quantity
              await database.execute(
                "UPDATE items SET available_quantity = available_quantity + ? WHERE id = ?",
                [item.quantity, item.item_id],
              );

              // Get stock after update
              const stockAfter = stockBefore + item.quantity;

              // Create stock movement record for return
              await createStockMovement({
                itemId: item.item_id,
                movementType: "IN",
                referenceType: "rental_return",
                referenceId: transactionId,
                quantity: item.quantity,
                stockBefore,
                stockAfter,
                userId: rentalTransaction?.user_id,
                notes: `Return rental transaction: ${rentalTransaction?.transaction_code || transactionId}`,
              });
            }
          }
        } else {
          // For sales transactions, status is determined by payments table
          // No need to update payment_status as it's calculated from payments
        }

        await database.execute("COMMIT");
        return true;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error updating transaction status:", error);
      throw error;
    }
  });

  // Update transaction
  ipcMain.handle("transactions:update", async (event, id, transactionData) => {
    try {
      await database.execute("BEGIN TRANSACTION");

      try {
        // Determine transaction type from existing transaction
        const rentalCheck = await database.queryOne(
          "SELECT id FROM rental_transactions WHERE id = ?",
          [id],
        );
        const isRental = !!rentalCheck;

        // Check payment status and transaction status before update
        const transaction = await getTransactionPaymentStatus(
          isRental ? "rental" : "sale",
          id,
        );

        if (!transaction) {
          throw new Error("Transaksi tidak ditemukan");
        }

        const paymentStatus = transaction.calculated_payment_status || "unpaid";
        const transactionStatus = transaction.status || null;

        // Cegah update jika status sudah cancelled
        if (transactionStatus === 'cancelled') {
          throw new Error("Transaksi tidak dapat diubah");
        }

        // Cegah update jika status sudah paid
        if (paymentStatus === 'paid') {
          throw new Error("Transaksi tidak dapat diubah");
        }

        if (isRental) {
          // Update rental transaction
          const updateFields = [];
          const updateValues = [];

          if (transactionData.customerId !== undefined) {
            updateFields.push("customer_id = ?");
            updateValues.push(transactionData.customerId);
          }
          if (transactionData.rentalDate !== undefined) {
            updateFields.push("rental_date = ?");
            updateValues.push(transactionData.rentalDate);
          }
          if (transactionData.plannedReturnDate !== undefined) {
            updateFields.push("planned_return_date = ?");
            updateValues.push(transactionData.plannedReturnDate);
          }
          if (transactionData.totalAmount !== undefined) {
            updateFields.push("total_amount = ?");
            updateValues.push(transactionData.totalAmount);
          }
          if (transactionData.notes !== undefined) {
            updateFields.push("notes = ?");
            updateValues.push(transactionData.notes);
          }

          if (updateFields.length > 0) {
            updateValues.push(id);
            await database.execute(
              `UPDATE rental_transactions SET ${updateFields.join(", ")} WHERE id = ?`,
              updateValues,
            );
          }
        } else {
          // Update sales transaction
          const updateFields = [];
          const updateValues = [];

          if (transactionData.customerId !== undefined) {
            // Convert empty string to null for customer_id (customer is optional for sales)
            const customerId =
              transactionData.customerId &&
              transactionData.customerId.toString().trim() !== ""
                ? transactionData.customerId
                : null;
            updateFields.push("customer_id = ?");
            updateValues.push(customerId);
          }
          if (transactionData.saleDate !== undefined) {
            updateFields.push("sale_date = ?");
            updateValues.push(transactionData.saleDate);
          }
          if (transactionData.totalAmount !== undefined) {
            updateFields.push("total_amount = ?");
            updateValues.push(transactionData.totalAmount);
          }
          if (transactionData.notes !== undefined) {
            updateFields.push("notes = ?");
            updateValues.push(transactionData.notes);
          }

          if (updateFields.length > 0) {
            updateValues.push(id);
            await database.execute(
              `UPDATE sales_transactions SET ${updateFields.join(", ")} WHERE id = ?`,
              updateValues,
            );
          }
        }

        await database.execute("COMMIT");

        // Return updated transaction
        const updatedTransaction = await database.queryOne(
          isRental
            ? "SELECT * FROM rental_transactions WHERE id = ?"
            : "SELECT * FROM sales_transactions WHERE id = ?",
          [id],
        );
        return updatedTransaction;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error updating transaction:", error);
      throw error;
    }
  });

  // Delete transaction
  ipcMain.handle("transactions:delete", async (event, id) => {
    try {
      await database.execute("BEGIN TRANSACTION");

      try {
        // Check if it's a rental or sales transaction
        const rentalCheck = await database.queryOne(
          "SELECT id FROM rental_transactions WHERE id = ?",
          [id],
        );
        const isRental = !!rentalCheck;

        if (isRental) {
          // Delete rental transaction details first
          await database.execute(
            "DELETE FROM rental_transaction_details WHERE rental_transaction_id = ?",
            [id],
          );
          // Delete rental transaction
          await database.execute(
            "DELETE FROM rental_transactions WHERE id = ?",
            [id],
          );
        } else {
          // Delete sales transaction details first
          await database.execute(
            "DELETE FROM sales_transaction_details WHERE sales_transaction_id = ?",
            [id],
          );
          // Delete sales transaction
          await database.execute(
            "DELETE FROM sales_transactions WHERE id = ?",
            [id],
          );
        }

        await database.execute("COMMIT");
        return true;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error deleting transaction:", error);
      throw error;
    }
  });

  // Cancel transaction (only for unpaid transactions)
  ipcMain.handle("transactions:cancel", async (event, id, transactionType) => {
    try {
      await database.execute("BEGIN TRANSACTION");

      try {
        const isRental = transactionType === "rental" || transactionType === "RENTAL";

        if (isRental) {
          const rental = await getTransactionPaymentStatus("rental", id);

          if (!rental) {
            throw new Error("Transaksi tidak ditemukan");
          }

          if (rental.calculated_payment_status === "paid") {
            throw new Error("Transaksi tidak dapat dibatalkan");
          }

          if (rental.status === "cancelled") {
            throw new Error("Transaksi tidak dapat dibatalkan");
          }

          // Get transaction details untuk restore stock
          const details = await database.query(
            `SELECT item_id, quantity FROM rental_transaction_details WHERE rental_transaction_id = ?`,
            [id],
          );

          // Restore stock untuk setiap item
          for (const detail of details) {
            const itemBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity FROM items WHERE id = ?",
              [detail.item_id],
            );

            if (itemBefore) {
              const stockBefore = itemBefore.available_quantity || 0;
              const stockAfter = stockBefore + detail.quantity;

              // Update available_quantity
              await database.execute(
                "UPDATE items SET available_quantity = ? WHERE id = ?",
                [stockAfter, detail.item_id],
              );

              // Create stock movement record
              await createStockMovement({
                itemId: detail.item_id,
                movementType: "IN",
                referenceType: "rental_cancellation",
                referenceId: id,
                quantity: detail.quantity,
                stockBefore,
                stockAfter,
                userId: null,
                notes: `Cancel rental transaction: ${rental.transaction_code}`,
              });
            }
          }

          // Update status to cancelled
          await database.execute(
            "UPDATE rental_transactions SET status = 'cancelled' WHERE id = ?",
            [id],
          );
        } else {
          // Sales transaction
          const sale = await getTransactionPaymentStatus("sale", id);

          if (!sale) {
            throw new Error("Transaksi tidak ditemukan");
          }

          if (sale.calculated_payment_status === "paid") {
            throw new Error("Transaksi tidak dapat dibatalkan");
          }

          if (sale.status === "cancelled") {
            throw new Error("Transaksi tidak dapat dibatalkan");
          }

          // Get transaction details untuk restore stock
          const details = await database.query(
            `SELECT item_id, quantity FROM sales_transaction_details WHERE sales_transaction_id = ?`,
            [id],
          );

          // Restore stock untuk setiap item
          for (const detail of details) {
            const itemBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity FROM items WHERE id = ?",
              [detail.item_id],
            );

            if (itemBefore) {
              const stockBefore = itemBefore.available_quantity || 0;
              const stockAfter = stockBefore + detail.quantity;

              // Update available_quantity dan stock_quantity
              await database.execute(
                "UPDATE items SET available_quantity = ?, stock_quantity = stock_quantity + ? WHERE id = ?",
                [stockAfter, detail.quantity, detail.item_id],
              );

              // Create stock movement record
              await createStockMovement({
                itemId: detail.item_id,
                movementType: "IN",
                referenceType: "sale_cancellation",
                referenceId: id,
                quantity: detail.quantity,
                stockBefore,
                stockAfter,
                userId: null,
                notes: `Cancel sale transaction: ${sale.transaction_code}`,
              });
            }
          }

          // Update status to cancelled
          await database.execute(
            "UPDATE sales_transactions SET status = 'cancelled' WHERE id = ?",
            [id],
          );
        }

        await database.execute("COMMIT");
        return true;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error cancelling transaction:", error);
      throw error;
    }
  });

  // Return rental items
  ipcMain.handle("rentals:returnItems", async (event, data) => {
    try {
      // Ensure data is properly parsed and extract values
      const rentalTransactionId = data?.rentalTransactionId ? Number(data.rentalTransactionId) : null;
      const detailIds = Array.isArray(data?.detailIds) ? data.detailIds.map(id => Number(id)) : null;
      const returnCondition = data?.returnCondition || "good";
      const actualReturnDate = data?.actualReturnDate || null;
      const userId = data?.userId ? Number(data.userId) : null;

      if (!rentalTransactionId) {
        throw new Error("Data tidak valid");
      }

      // Validate rental transaction exists
      const rental = await database.queryOne(
        "SELECT id, user_id, transaction_code, status FROM rental_transactions WHERE id = ?",
        [rentalTransactionId],
      );

      if (!rental) {
        throw new Error("Transaksi tidak ditemukan");
      }

      if (rental.status === "cancelled") {
        throw new Error("Transaksi tidak dapat dikembalikan");
      }

      // Start transaction
      await database.execute("BEGIN TRANSACTION");

      try {
        const validReturnCondition = returnCondition;
        if (!["good", "damaged", "lost"].includes(validReturnCondition)) {
          throw new Error("Data tidak valid");
        }

        // Get rental items to return
        let rentalItems;
        if (detailIds && Array.isArray(detailIds) && detailIds.length > 0) {
          // Return specific items
          const placeholders = detailIds.map(() => "?").join(",");
          rentalItems = await database.query(
            `SELECT rtd.id, rtd.item_id, rtd.quantity, rtd.is_returned, rtd.rental_transaction_id
             FROM rental_transaction_details rtd
             WHERE rtd.id IN (${placeholders}) AND rtd.rental_transaction_id = ? AND rtd.is_returned = 0`,
            [...detailIds, rentalTransactionId],
          );
        } else {
          // Return all items
          rentalItems = await database.query(
            `SELECT rtd.id, rtd.item_id, rtd.quantity, rtd.is_returned, rtd.rental_transaction_id
             FROM rental_transaction_details rtd
             WHERE rtd.rental_transaction_id = ? AND rtd.is_returned = 0`,
            [rentalTransactionId],
          );
        }

        if (rentalItems.length === 0) {
          throw new Error("Data tidak valid");
        }

        const returnUserId = userId || rental.user_id;

        // Process each item
        for (const item of rentalItems) {
          // Get current stock before update
          const itemBefore = await database.queryOne(
            "SELECT available_quantity FROM items WHERE id = ?",
            [item.item_id],
          );
          const stockBefore = itemBefore?.available_quantity || 0;

          // Mark item as returned
          await database.execute(
            "UPDATE rental_transaction_details SET is_returned = 1, return_condition = ? WHERE id = ?",
            [validReturnCondition, item.id],
          );

          // Restore available quantity (only for good condition, or always restore and handle differently for damaged/lost)
          // For now, we restore stock for all conditions - you can adjust this logic if needed
          if (validReturnCondition !== "lost") {
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity + ? WHERE id = ?",
              [item.quantity, item.item_id],
            );

            // Get stock after update
            const stockAfter = stockBefore + item.quantity;

            // Create stock movement record for return
            await createStockMovement({
              itemId: item.item_id,
              movementType: "IN",
              referenceType: "rental_return",
              referenceId: rentalTransactionId,
              quantity: item.quantity,
              stockBefore,
              stockAfter,
              userId: returnUserId,
              notes: `Return rental item: ${rental.transaction_code} (Condition: ${validReturnCondition})`,
            });
          } else {
            // Item is lost - create stock movement record but don't restore stock
            await createStockMovement({
              itemId: item.item_id,
              movementType: "IN",
              referenceType: "rental_return_lost",
              referenceId: rentalTransactionId,
              quantity: item.quantity,
              stockBefore,
              stockAfter: stockBefore, // Stock tidak bertambah karena item hilang
              userId: returnUserId,
              notes: `Return rental item (LOST): ${rental.transaction_code}`,
            });
          }
        }

        // Check if all items are returned
        const remainingItems = await database.queryOne(
          `SELECT COUNT(*) as count FROM rental_transaction_details 
           WHERE rental_transaction_id = ? AND is_returned = 0`,
          [rentalTransactionId],
        );

        // Update actual_return_date and status if all items are returned
        if (remainingItems.count === 0) {
          const returnDate = actualReturnDate || new Date().toISOString().split("T")[0];
          await database.execute(
            "UPDATE rental_transactions SET actual_return_date = ?, status = 'returned' WHERE id = ?",
            [returnDate, rentalTransactionId],
          );
        } else if (actualReturnDate) {
          // Update return date even if not all items are returned yet
          await database.execute(
            "UPDATE rental_transactions SET actual_return_date = ? WHERE id = ?",
            [actualReturnDate, rentalTransactionId],
          );
        }

        await database.execute("COMMIT");

        return {
          success: true,
          itemsReturned: rentalItems.length,
          allItemsReturned: remainingItems.count === 0,
        };
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error returning rental items:", error);
      throw error;
    }
  });
}


// Payments CRUD Handlers
function setupPaymentHandlers() {
  // Create payment
  ipcMain.handle("payments:create", async (event, paymentData) => {
    try {
      if (!validator.isPositiveNumber(paymentData.amount)) {
        throw new Error("Data tidak valid");
      }
      if (!paymentData.transactionType || !paymentData.transactionId) {
        throw new Error("Data tidak valid");
      }

      // Check transaction status before creating payment
      const transaction = await getTransactionPaymentStatus(
        paymentData.transactionType,
        paymentData.transactionId,
      );

      if (!transaction) {
        const typeLabel =
          paymentData.transactionType === "rental"
            ? "sewa"
            : "penjualan";
        throw new Error("Transaksi tidak ditemukan");
      }

      if (transaction.status === "cancelled") {
        throw new Error("Transaksi tidak dapat dibayar");
      }

      if (transaction.total_paid >= transaction.total_amount) {
        throw new Error("Transaksi tidak dapat dibayar");
      }

      // Validate cashier session for cash payments
      if (!paymentData.paymentMethod || paymentData.paymentMethod === "cash") {
        await validateCashierSession(paymentData.userId);
      }

      const result = await database.execute(
        `INSERT INTO payments (
          transaction_type, transaction_id, payment_date, amount,
          payment_method, reference_number, user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.transactionType,
          paymentData.transactionId,
          paymentData.paymentDate || new Date().toISOString(),
          paymentData.amount,
          paymentData.paymentMethod || "cash",
          paymentData.referenceNumber || null,
          paymentData.userId,
          paymentData.notes || null,
        ],
      );

      // Update rental transaction status to 'active' after first payment
      if (paymentData.transactionType === "rental") {
        const rental = await getTransactionPaymentStatus(
          "rental",
          paymentData.transactionId,
        );

        if (rental && rental.status === "pending" && rental.total_paid > 0) {
          await database.execute(
            `UPDATE rental_transactions SET status = 'active' WHERE id = ?`,
            [paymentData.transactionId],
          );
        }
      }

      const newPayment = await database.queryOne(
        `SELECT p.*, u.full_name AS user_name
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [result.id],
      );

      return newPayment;
    } catch (error) {
      logger.error("Error creating payment:", error);
      throw error;
    }
  });

  // Update payment
  ipcMain.handle("payments:update", async (event, id, paymentData) => {
    try {
      const updateFields = [];
      const updateValues = [];

      if (paymentData.amount !== undefined) {
        updateFields.push("amount = ?");
        updateValues.push(paymentData.amount);
      }
      if (paymentData.paymentMethod !== undefined) {
        updateFields.push("payment_method = ?");
        updateValues.push(paymentData.paymentMethod);
      }
      if (paymentData.referenceNumber !== undefined) {
        updateFields.push("reference_number = ?");
        updateValues.push(paymentData.referenceNumber);
      }
      if (paymentData.paymentDate !== undefined) {
        updateFields.push("payment_date = ?");
        updateValues.push(paymentData.paymentDate);
      }
      if (paymentData.notes !== undefined) {
        updateFields.push("notes = ?");
        updateValues.push(paymentData.notes);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        await database.execute(
          `UPDATE payments SET ${updateFields.join(", ")} WHERE id = ?`,
          updateValues,
        );
      }

      const updatedPayment = await database.queryOne(
        `SELECT p.*, u.full_name AS user_name
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [id],
      );

      return updatedPayment;
    } catch (error) {
      logger.error("Error updating payment:", error);
      throw error;
    }
  });

  // Delete payment
  ipcMain.handle("payments:delete", async (event, id) => {
    try {
      await database.execute("DELETE FROM payments WHERE id = ?", [id]);

      return true;
    } catch (error) {
      logger.error("Error deleting payment:", error);
      throw error;
    }
  });
}

// Stock Movements CRUD Handlers
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
      let idField = "";
      let idValue = null;
      let nameField = "";

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
        idField = "item_id";
        idValue = movementData.itemId;
        nameField = "item_name";
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
        idField = "bundle_id";
        idValue = movementData.bundleId;
        nameField = "bundle_name";

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
        idField = "accessory_id";
        idValue = movementData.accessoryId;
        nameField = "accessory_name";
      }

      stockAfter =
        movementData.movementType === "IN"
          ? stockBefore + movementData.quantity
          : stockBefore - movementData.quantity;

      if (stockAfter < 0) {
        throw new Error("Stok tidak cukup");
      }

      await database.execute("BEGIN TRANSACTION");

      try {
        // Insert stock movement
        const result = await database.execute(
          `INSERT INTO stock_movements (
            item_id, bundle_id, accessory_id, movement_type, reference_type, reference_id,
            quantity, stock_before, stock_after, user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                // Ambil stok item sebelum update
                const itemBefore = await database.queryOne(
                  "SELECT available_quantity, stock_quantity FROM items WHERE id = ?",
                  [detail.item_id],
                );
                if (!itemBefore) {
                  throw new Error(`Item dengan ID ${detail.item_id} tidak ditemukan`);
                }
                const itemStockBefore = itemBefore.available_quantity || 0;
                const itemStockAfter = itemStockBefore - qtyNeeded;

                if (itemStockAfter < 0) {
                  throw new Error(`Stok item tidak mencukupi untuk membuat paket`);
                }

                // Kurangi stok item
                await database.execute(
                  `UPDATE items 
                   SET available_quantity = available_quantity - ?, 
                       stock_quantity = stock_quantity - ?
                   WHERE id = ?`,
                  [qtyNeeded, qtyNeeded, detail.item_id],
                );

                // Buat stock movement record untuk item (OUT)

                await database.execute(
                  `INSERT INTO stock_movements (
                    item_id, bundle_id, accessory_id, movement_type, reference_type, reference_id,
                    quantity, stock_before, stock_after, user_id, notes
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    detail.item_id,
                    movementData.bundleId,
                    null,
                    "OUT",
                    "bundle_assembly",
                    result.id,
                    qtyNeeded,
                    itemStockBefore,
                    itemStockAfter,
                    movementData.userId || null,
                    `Digunakan untuk membuat ${movementData.quantity} paket (Bundle ID: ${movementData.bundleId})`,
                  ],
                );
              } else if (detail.accessory_id) {
                // Ambil stok aksesoris sebelum update
                const accessoryBefore = await database.queryOne(
                  "SELECT available_quantity, stock_quantity FROM accessories WHERE id = ?",
                  [detail.accessory_id],
                );
                if (!accessoryBefore) {
                  throw new Error(`Aksesoris dengan ID ${detail.accessory_id} tidak ditemukan`);
                }
                const accessoryStockBefore = accessoryBefore.available_quantity || 0;
                const accessoryStockAfter = accessoryStockBefore - qtyNeeded;

                if (accessoryStockAfter < 0) {
                  throw new Error(`Stok aksesoris tidak mencukupi untuk membuat paket`);
                }

                // Kurangi stok aksesoris
                await database.execute(
                  `UPDATE accessories 
                   SET available_quantity = available_quantity - ?, 
                       stock_quantity = stock_quantity - ?
                   WHERE id = ?`,
                  [qtyNeeded, qtyNeeded, detail.accessory_id],
                );

                // Buat stock movement record untuk aksesoris (OUT)

                await database.execute(
                  `INSERT INTO stock_movements (
                    item_id, bundle_id, accessory_id, movement_type, reference_type, reference_id,
                    quantity, stock_before, stock_after, user_id, notes
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    null,
                    movementData.bundleId,
                    detail.accessory_id,
                    "OUT",
                    "bundle_assembly",
                    result.id,
                    qtyNeeded,
                    accessoryStockBefore,
                    accessoryStockAfter,
                    movementData.userId || null,
                    `Digunakan untuk membuat ${movementData.quantity} paket (Bundle ID: ${movementData.bundleId})`,
                  ],
                );
              }
            }
          }
        } else {
          await database.execute(
            `UPDATE ${tableName} SET available_quantity = ? WHERE id = ?`,
            [stockAfter, idValue],
          );
        }

        await database.execute("COMMIT");

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
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error creating stock movement:", error);
      throw error;
    }
  });

  // Delete stock movement (with stock reversal)
  ipcMain.handle("stockMovements:delete", async (event, id) => {
    try {
      await database.execute("BEGIN TRANSACTION");

      try {
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

        await database.execute("COMMIT");
        return true;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      logger.error("Error deleting stock movement:", error);
      throw error;
    }
  });
}

module.exports = {
  setupTransactionHandlers,
  setupPaymentHandlers,
  setupStockMovementHandlers,
};
