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
  JOIN bundles b ON bd.bundle_id = b.id AND b.bundle_type = 'sale'
  JOIN items i ON bd.item_id = i.id
  WHERE bd.bundle_id = ?
`;

async function fetchBundleItemDetails(bundleId) {
  return database.query(bundleItemSql, [bundleId]);
}

async function expandBundleSelections(selections = []) {
  const cache = new Map();
  const result = [];

  for (const selection of selections) {
    const bundleId = toInteger(selection.bundleId);
    if (!bundleId) {
      throw new Error("Bundle tidak valid");
    }
    const bundleQuantity = Math.max(1, toInteger(selection.quantity));

    if (!cache.has(bundleId)) {
      const details = await fetchBundleItemDetails(bundleId);
      if (!details.length) {
        throw new Error(`Bundle ${bundleId} tidak memiliki item penjualan`);
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
        throw new Error("Tanggal transaksi tidak valid");
      }
      if (!validator.isPositiveNumber(transactionData.totalAmount)) {
        throw new Error("Total amount harus berupa angka positif");
      }
      const saleItems = Array.isArray(transactionData.items)
        ? transactionData.items
        : [];
      const hasBundles =
        Array.isArray(transactionData.bundles) &&
        transactionData.bundles.length > 0;
      if (saleItems.length === 0 && !hasBundles) {
        throw new Error("Transaksi harus memiliki minimal 1 item atau paket");
      }

      // Validasi cashier session untuk transaksi dengan pembayaran cash
      let cashierSessionId = null;
      if (
        !transactionData.paymentMethod ||
        transactionData.paymentMethod === "cash"
      ) {
        if (!transactionData.userId) {
          throw new Error("User ID harus diisi untuk membuat transaksi");
        }

        // Check if cashier session exists
        const cashierTableExists =
          await database.tableExists("cashier_sessions");
        if (cashierTableExists) {
          const activeSession = await database.queryOne(
            `SELECT id FROM cashier_sessions 
             WHERE user_id = ? AND status = 'open' 
             ORDER BY opening_date DESC LIMIT 1`,
            [transactionData.userId],
          );

          if (!activeSession) {
            throw new Error(
              "Sesi kasir belum dibuka. Silakan buka sesi kasir terlebih dahulu sebelum membuat transaksi dengan pembayaran cash.",
            );
          }

          cashierSessionId = activeSession.id;
        }
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

          // Validasi stok sebelum memproses transaksi rental
          for (const item of transactionData.items) {
            const quantity = Math.max(1, Number(item.quantity) || 0);
            
            // Get current stock
            const itemBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity, name, code FROM items WHERE id = ?",
              [item.itemId],
            );
            
            if (!itemBefore) {
              throw new Error(`Item dengan ID ${item.itemId} tidak ditemukan`);
            }
            
            const availableStock = itemBefore.available_quantity || 0;
            
            // Validasi stok tersedia
            if (availableStock < quantity) {
              const itemName = itemBefore.name || itemBefore.code || `Item ID ${item.itemId}`;
              throw new Error(
                `Stok tidak mencukupi untuk ${itemName}. Stok tersedia: ${availableStock}, dibutuhkan: ${quantity}`
              );
            }
          }

          // Insert rental transaction items
          for (const item of transactionData.items) {
            // Get current stock before update
            const itemBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity FROM items WHERE id = ?",
              [item.itemId],
            );
            const stockBefore = itemBefore?.available_quantity || 0;

            await database.execute(
              `INSERT INTO rental_transaction_details (
                rental_transaction_id, item_id, quantity, 
                rental_price, subtotal
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                result.id,
                item.itemId,
                item.quantity,
                item.rentalPrice,
                item.subtotal,
              ],
            );

            // Update available quantity for the item
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity - ? WHERE id = ?",
              [item.quantity, item.itemId],
            );

            // Get stock after update
            const stockAfter = stockBefore - item.quantity;

            // Create stock movement record
            await database.execute(
              `INSERT INTO stock_movements (
                item_id, movement_type, reference_type, reference_id,
                quantity, stock_before, stock_after, user_id, notes
              ) VALUES (?, 'OUT', 'rental_transaction', ?, ?, ?, ?, ?, ?)`,
              [
                item.itemId,
                result.id,
                item.quantity,
                stockBefore,
                stockAfter,
                transactionData.userId,
                `Rental transaction: ${transactionCode}`,
              ],
            );
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

          // Validasi stok sebelum memproses transaksi
          for (const line of saleLines) {
            const quantity = Math.max(1, Number(line.quantity) || 0);
            
            // Get current stock
            const itemBefore = await database.queryOne(
              "SELECT available_quantity, stock_quantity, name, code FROM items WHERE id = ?",
              [line.itemId],
            );
            
            if (!itemBefore) {
              throw new Error(`Item dengan ID ${line.itemId} tidak ditemukan`);
            }
            
            const availableStock = itemBefore.available_quantity || 0;
            
            // Validasi stok tersedia
            if (availableStock < quantity) {
              const itemName = itemBefore.name || itemBefore.code || `Item ID ${line.itemId}`;
              throw new Error(
                `Stok tidak mencukupi untuk ${itemName}. Stok tersedia: ${availableStock}, dibutuhkan: ${quantity}`
              );
            }
          }

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
            const stockQtyBefore = itemBefore?.stock_quantity || 0;

            await database.execute(
              `INSERT INTO sales_transaction_details (
                sales_transaction_id, item_id, quantity,
                sale_price, subtotal
              ) VALUES (?, ?, ?, ?, ?)`,
              [result.id, line.itemId, quantity, salePrice, lineSubtotal],
            );

            // Update available quantity and stock quantity for the item
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity - ?, stock_quantity = stock_quantity - ? WHERE id = ?",
              [quantity, quantity, line.itemId],
            );

            // Get stock after update
            const stockAfter = stockBefore - quantity;
            const stockQtyAfter = stockQtyBefore - quantity;

            // Create stock movement record
            await database.execute(
              `INSERT INTO stock_movements (
                item_id, movement_type, reference_type, reference_id,
                quantity, stock_before, stock_after, user_id, notes
              ) VALUES (?, 'OUT', 'sales_transaction', ?, ?, ?, ?, ?, ?)`,
              [
                line.itemId,
                result.id,
                quantity,
                stockBefore,
                stockAfter,
                transactionData.userId,
                `Sales transaction: ${transactionCode}`,
              ],
            );
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
        throw new Error("Status transaksi tidak valid");
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
              await database.execute(
                `INSERT INTO stock_movements (
                  item_id, movement_type, reference_type, reference_id,
                  quantity, stock_before, stock_after, user_id, notes
                ) VALUES (?, 'IN', 'rental_return', ?, ?, ?, ?, ?, ?)`,
                [
                  item.item_id,
                  transactionId,
                  item.quantity,
                  stockBefore,
                  stockAfter,
                  rentalTransaction?.user_id,
                  `Return rental transaction: ${rentalTransaction?.transaction_code || transactionId}`,
                ],
              );
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

        // Cek payment status dan status transaksi sebelum update
        let paymentStatus = null;
        let transactionStatus = null;
        if (isRental) {
          const rental = await database.queryOne(
            `SELECT rt.*, 
             COALESCE(SUM(p.amount), 0) as actual_paid_amount,
             CASE 
               WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
               ELSE 'unpaid'
             END as calculated_payment_status
             FROM rental_transactions rt
             LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
             WHERE rt.id = ?
             GROUP BY rt.id`,
            [id],
          );
          paymentStatus = rental?.calculated_payment_status || 'unpaid';
          transactionStatus = rental?.status || null;
        } else {
          const sale = await database.queryOne(
            `SELECT st.*,
             COALESCE(SUM(p.amount), 0) as actual_paid_amount,
             CASE 
               WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
               ELSE 'unpaid'
             END as calculated_payment_status
             FROM sales_transactions st
             LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
             WHERE st.id = ?
             GROUP BY st.id`,
            [id],
          );
          paymentStatus = sale?.calculated_payment_status || 'unpaid';
          transactionStatus = sale?.status || null;
        }

        // Cegah update jika status sudah cancelled
        if (transactionStatus === 'cancelled') {
          throw new Error("Transaksi yang sudah dibatalkan tidak dapat di-edit.");
        }

        // Cegah update jika status sudah paid
        if (paymentStatus === 'paid') {
          throw new Error("Transaksi yang sudah dibayar tidak dapat di-edit.");
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
          // Get rental transaction with payment status
          const rental = await database.queryOne(
            `SELECT rt.*, 
             COALESCE(SUM(p.amount), 0) as actual_paid_amount,
             CASE 
               WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
               ELSE 'unpaid'
             END as calculated_payment_status
             FROM rental_transactions rt
             LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
             WHERE rt.id = ?
             GROUP BY rt.id`,
            [id],
          );

          if (!rental) {
            throw new Error("Transaksi sewa tidak ditemukan");
          }

          // Cek payment status
          if (rental.calculated_payment_status === "paid") {
            throw new Error("Transaksi yang sudah dibayar tidak dapat di-cancel.");
          }

          // Cek status saat ini
          if (rental.status === "cancelled") {
            throw new Error("Transaksi sudah di-cancel sebelumnya.");
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
              await database.execute(
                `INSERT INTO stock_movements (
                  item_id, movement_type, reference_type, reference_id,
                  quantity, stock_before, stock_after, user_id, notes
                ) VALUES (?, 'IN', 'rental_cancellation', ?, ?, ?, ?, NULL, ?)`,
                [
                  detail.item_id,
                  id,
                  detail.quantity,
                  stockBefore,
                  stockAfter,
                  `Cancel rental transaction: ${rental.transaction_code}`,
                ],
              );
            }
          }

          // Update status to cancelled
          await database.execute(
            "UPDATE rental_transactions SET status = 'cancelled' WHERE id = ?",
            [id],
          );
        } else {
          // Sales transaction
          const sale = await database.queryOne(
            `SELECT st.*,
             COALESCE(SUM(p.amount), 0) as actual_paid_amount,
             CASE 
               WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
               ELSE 'unpaid'
             END as calculated_payment_status
             FROM sales_transactions st
             LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
             WHERE st.id = ?
             GROUP BY st.id`,
            [id],
          );

          if (!sale) {
            throw new Error("Transaksi penjualan tidak ditemukan");
          }

          // Cek payment status
          if (sale.calculated_payment_status === "paid") {
            throw new Error("Transaksi yang sudah dibayar tidak dapat di-cancel.");
          }

          // Cek status saat ini
          if (sale.status === "cancelled") {
            throw new Error("Transaksi sudah di-cancel sebelumnya.");
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
              await database.execute(
                `INSERT INTO stock_movements (
                  item_id, movement_type, reference_type, reference_id,
                  quantity, stock_before, stock_after, user_id, notes
                ) VALUES (?, 'IN', 'sale_cancellation', ?, ?, ?, ?, NULL, ?)`,
                [
                  detail.item_id,
                  id,
                  detail.quantity,
                  stockBefore,
                  stockAfter,
                  `Cancel sale transaction: ${sale.transaction_code}`,
                ],
              );
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
}


// Payments CRUD Handlers
function setupPaymentHandlers() {
  // Create payment
  ipcMain.handle("payments:create", async (event, paymentData) => {
    try {
      if (!validator.isPositiveNumber(paymentData.amount)) {
        throw new Error("Jumlah pembayaran harus berupa angka positif");
      }
      if (!paymentData.transactionType || !paymentData.transactionId) {
        throw new Error("Transaksi referensi harus diisi");
      }

      // Cek status transaksi sebelum membuat pembayaran
      if (paymentData.transactionType === 'rental') {
        const rental = await database.queryOne(
          `SELECT rt.*, 
           COALESCE(SUM(p.amount), 0) as total_paid
           FROM rental_transactions rt
           LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
           WHERE rt.id = ?
           GROUP BY rt.id`,
          [paymentData.transactionId],
        );
        
        if (!rental) {
          throw new Error("Transaksi sewa tidak ditemukan");
        }
        
        // Cek jika transaksi sudah dibatalkan
        if (rental.status === 'cancelled') {
          throw new Error("Transaksi yang sudah dibatalkan tidak dapat dibayar.");
        }
        
        // Cek jika transaksi sudah lunas
        if (rental.total_paid >= rental.total_amount) {
          throw new Error("Transaksi ini sudah dibayar lunas dan tidak dapat dibayar lagi.");
        }
      } else {
        const sale = await database.queryOne(
          `SELECT st.*,
           COALESCE(SUM(p.amount), 0) as total_paid
           FROM sales_transactions st
           LEFT JOIN payments p ON p.transaction_type = 'sale' AND p.transaction_id = st.id
           WHERE st.id = ?
           GROUP BY st.id`,
          [paymentData.transactionId],
        );
        
        if (!sale) {
          throw new Error("Transaksi penjualan tidak ditemukan");
        }
        
        // Cek jika transaksi sudah dibatalkan
        if (sale.status === 'cancelled') {
          throw new Error("Transaksi yang sudah dibatalkan tidak dapat dibayar.");
        }
        
        // Cek jika transaksi sudah lunas
        if (sale.total_paid >= sale.total_amount) {
          throw new Error("Transaksi ini sudah dibayar lunas dan tidak dapat dibayar lagi.");
        }
      }

      // Validasi cashier session untuk pembayaran cash
      if (!paymentData.paymentMethod || paymentData.paymentMethod === "cash") {
        if (!paymentData.userId) {
          throw new Error("User ID harus diisi untuk membuat pembayaran");
        }

        const cashierTableExists =
          await database.tableExists("cashier_sessions");
        if (cashierTableExists) {
          const activeSession = await database.queryOne(
            `SELECT id FROM cashier_sessions 
             WHERE user_id = ? AND status = 'open' 
             ORDER BY opening_date DESC LIMIT 1`,
            [paymentData.userId],
          );

          if (!activeSession) {
            throw new Error(
              "Sesi kasir belum dibuka. Silakan buka sesi kasir terlebih dahulu sebelum membuat pembayaran cash.",
            );
          }
        }
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
      if (paymentData.transactionType === 'rental') {
        // Re-fetch rental with updated payment total
        const rental = await database.queryOne(
          `SELECT rt.*, 
           COALESCE(SUM(p.amount), 0) as total_paid
           FROM rental_transactions rt
           LEFT JOIN payments p ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
           WHERE rt.id = ?
           GROUP BY rt.id`,
          [paymentData.transactionId],
        );
        
        // Update status to 'active' if it was 'pending' (unpaid) and now has payment
        if (rental && rental.status === 'pending' && rental.total_paid > 0) {
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
        throw new Error("Jumlah harus berupa angka positif");
      }
      if (!["IN", "OUT"].includes(movementData.movementType)) {
        throw new Error("Jenis pergerakan harus IN atau OUT");
      }

      // Get current stock
      const item = await database.queryOne(
        "SELECT available_quantity FROM items WHERE id = ?",
        [movementData.itemId],
      );

      if (!item) {
        throw new Error("Item tidak ditemukan");
      }

      const stockBefore = item.available_quantity || 0;
      const stockAfter =
        movementData.movementType === "IN"
          ? stockBefore + movementData.quantity
          : stockBefore - movementData.quantity;

      if (stockAfter < 0) {
        throw new Error("Stok tidak mencukupi");
      }

      await database.execute("BEGIN TRANSACTION");

      try {
        // Insert stock movement
        const result = await database.execute(
          `INSERT INTO stock_movements (
            item_id, movement_type, reference_type, reference_id,
            quantity, stock_before, stock_after, user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            movementData.itemId,
            movementData.movementType,
            movementData.referenceType || null,
            movementData.referenceId || null,
            movementData.quantity,
            stockBefore,
            stockAfter,
            movementData.userId,
            movementData.notes || null,
          ],
        );

        // Update item stock
        await database.execute(
          "UPDATE items SET available_quantity = ? WHERE id = ?",
          [stockAfter, movementData.itemId],
        );

        await database.execute("COMMIT");

        const newMovement = await database.queryOne(
          `SELECT sm.*, i.name AS item_name, u.full_name AS user_name
           FROM stock_movements sm
           LEFT JOIN items i ON sm.item_id = i.id
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
          throw new Error("Pergerakan stok tidak ditemukan");
        }

        // Reverse stock change
        const item = await database.queryOne(
          "SELECT available_quantity FROM items WHERE id = ?",
          [movement.item_id],
        );

        const currentStock = item.available_quantity || 0;
        const reversedStock =
          movement.movement_type === "IN"
            ? currentStock - movement.quantity
            : currentStock + movement.quantity;

        // Update item stock
        await database.execute(
          "UPDATE items SET available_quantity = ? WHERE id = ?",
          [reversedStock, movement.item_id],
        );

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
