const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { TRANSACTION_STATUS } = require("../../shared/constants");
const { generateTransactionCode } = require("../helpers/codeUtils");
const {
  executeTransaction,
  getStockBefore,
  updateStock,
  restoreStock,
  restoreStockWithMovement,
  createStockMovement,
  validateStock,
  validateAccessoryStock,
  getTransactionPaymentStatus,
  validateCashierSession,
  expandBundleSelections,
} = require("./transactionHelpers");

function setupTransactionHandlers() {
  // Get all transactions
  ipcMain.handle("transactions:getAll", async () => {
    try {
      // Get rental transactions with payment calculation from rental_payments table
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
                LEFT JOIN rental_payments p ON p.transaction_id = rt.id
                GROUP BY rt.id
            `);

      // Get sales transactions with payment calculation from sales_payments table
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
                LEFT JOIN sales_payments p ON p.transaction_id = st.id
                GROUP BY st.id
            `);

      // Process transactions to use actual payment data
      const processedRentalTransactions = rentalTransactions.map((t) => ({
        ...t,
        paid_amount: t.actual_paid_amount || 0,
        payment_status:
          t.calculated_payment_status || t.payment_status || "unpaid",
      }));

      const processedSalesTransactions = await Promise.all(
        salesTransactions.map(async (t) => {
          // Fix status inconsistency: if status is 'completed' but payment is not complete, update to 'pending'
          const paymentStatus =
            t.calculated_payment_status || t.payment_status || "unpaid";
          if (
            t.status === "completed" &&
            paymentStatus === "unpaid" &&
            (t.actual_paid_amount || 0) < (t.total_amount || 0)
          ) {
            // Fix the status in database
            await database.execute(
              `UPDATE sales_transactions SET status = 'pending', is_sync = 0 WHERE id = ?`,
              [t.id],
            );
            t.status = "pending";
          }
          return {
            ...t,
            paid_amount: t.actual_paid_amount || 0,
            payment_status: paymentStatus,
          };
        }),
      );

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
      return await executeTransaction(async () => {
        let result;
        const transactionCode = generateTransactionCode(transactionData.type);

        if (transactionData.type === "RENTAL") {
          // Validasi customer wajib untuk rental
          if (!transactionData.customerId || transactionData.customerId === null || transactionData.customerId === "") {
            throw new Error("Customer wajib dipilih untuk transaksi rental");
          }
          
          // Insert rental transaction
          result = await database.execute(
            `INSERT INTO rental_transactions (
              transaction_code, customer_id, user_id, rental_date, 
              planned_return_date, total_days, subtotal, deposit, discount, tax,
              total_amount, status, notes, cashier_session_id, is_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              transactionCode,
              transactionData.customerId,
              transactionData.userId,
              transactionData.rentalDate,
              transactionData.plannedReturnDate,
              transactionData.totalDays,
              transactionData.subtotal,
              transactionData.deposit,
              transactionData.discount || 0,
              transactionData.tax || 0,
              transactionData.totalAmount,
              "pending", // Status awal: pending (belum dibayar), akan diupdate ke 'active' setelah pembayaran
              transactionData.notes,
              cashierSessionId,
            ],
          );

          // Expand bundles to items for rental
          const rentalItems = saleItems;
          const bundleLines = hasBundles
            ? await expandBundleSelections(transactionData.bundles, true)
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
            const stockBefore = await getStockBefore(line.itemId);

            await database.execute(
              `INSERT INTO rental_transaction_details (
                rental_transaction_id, item_id, quantity, 
                rental_price, subtotal, is_sync
              ) VALUES (?, ?, ?, ?, ?, 0)`,
              [
                result.id,
                line.itemId,
                quantity,
                rentalPrice,
                lineSubtotal,
              ],
            );

            // Update available quantity for the item
            await updateStock(line.itemId, quantity);
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
              subtotal, discount, tax, total_amount, notes, cashier_session_id, status, is_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
            ? await expandBundleSelections(transactionData.bundles, false)
            : [];
          const saleLines = [...saleItems, ...bundleLines];
          const accessories = Array.isArray(transactionData.accessories)
            ? transactionData.accessories
            : [];

          // Validate stock before processing transaction
          for (const line of saleLines) {
            await validateStock(line.itemId, Math.max(1, Number(line.quantity) || 0));
          }

          // Validate accessory stock
          for (const accessory of accessories) {
            await validateAccessoryStock(accessory.accessoryId, Math.max(1, Number(accessory.quantity) || 1));
          }

          // Process items and bundles
          for (const line of saleLines) {
            const quantity = Math.max(1, Number(line.quantity) || 0);
            const salePrice = Number(line.salePrice) || 0;
            const lineSubtotal = Number(line.subtotal) || salePrice * quantity;

            const stockBefore = await getStockBefore(line.itemId);

            await database.execute(
              `INSERT INTO sales_transaction_details (
                sales_transaction_id, item_id, accessory_id, quantity,
                sale_price, subtotal, is_sync
              ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
              [result.id, line.itemId, null, quantity, salePrice, lineSubtotal],
            );

            // Update available quantity and stock quantity for the item
            await updateStock(line.itemId, quantity, "items", true);
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

            const stockBefore = await getStockBefore(accessory.accessoryId, "accessories");

            await database.execute(
              `INSERT INTO sales_transaction_details (
                sales_transaction_id, item_id, accessory_id, quantity,
                sale_price, subtotal, is_sync
              ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
              [result.id, null, accessory.accessoryId, quantity, salePrice, lineSubtotal],
            );

            // Update available quantity and stock quantity for the accessory
            await updateStock(accessory.accessoryId, quantity, "accessories", true);
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

        // Return created transaction
        const newTransaction = await database.queryOne(
          transactionData.type === "RENTAL"
            ? "SELECT * FROM rental_transactions WHERE id = ?"
            : "SELECT * FROM sales_transactions WHERE id = ?",
          [result.id],
        );
        return newTransaction;
      });
    } catch (error) {
      logger.error("Error creating transaction:", error);
      
      // Handle SQLite constraint errors with user-friendly messages
      if (error.code === "SQLITE_CONSTRAINT") {
        if (error.message && error.message.includes("customer_id")) {
          throw new Error("Customer wajib dipilih untuk transaksi rental");
        }
        if (error.message && error.message.includes("NOT NULL")) {
          const field = error.message.match(/NOT NULL constraint failed: \w+\.(\w+)/);
          if (field && field[1]) {
            const fieldName = field[1].replace(/_/g, " ");
            throw new Error(`Data tidak lengkap: ${fieldName} wajib diisi`);
          }
          throw new Error("Data tidak lengkap: Ada field wajib yang belum diisi");
        }
        throw new Error("Data tidak valid: Terjadi kesalahan saat menyimpan transaksi");
      }
      
      throw error;
    }
  });

  // Update transaction status
  ipcMain.handle("transactions:updateStatus", async (event, id, status) => {
    try {
      if (!Object.values(TRANSACTION_STATUS).includes(status)) {
        throw new Error("Data tidak valid");
      }

      return await executeTransaction(async () => {
        const { transactionType, transactionId } = id;

        if (transactionType === "RENTAL") {
          // Map UI status -> DB status
          const statusMap = {
            [TRANSACTION_STATUS.COMPLETED]: "returned",
            [TRANSACTION_STATUS.CANCELLED]: "cancelled",
            [TRANSACTION_STATUS.PENDING]: "active",
          };
          const dbStatus = statusMap[status] || "active";
          // Update rental transaction status and reset is_sync to allow re-sync with new status
          await database.execute(
            "UPDATE rental_transactions SET status = ?, is_sync = 0 WHERE id = ?",
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
              const stockBefore = await getStockBefore(item.item_id);

              // Mark item as returned in rental_transaction_details
              await database.execute(
                "UPDATE rental_transaction_details SET is_returned = 1, return_condition = ? WHERE id = ?",
                ["good", item.detail_id],
              );

              // Restore available quantity
              await restoreStock(item.item_id, item.quantity);
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
        }
        // For sales transactions, status is determined by payments table
        // No need to update payment_status as it's calculated from payments

        return true;
      });
    } catch (error) {
      logger.error("Error updating transaction status:", error);
      throw error;
    }
  });

  // Update transaction
  ipcMain.handle("transactions:update", async (event, id, transactionData) => {
    try {
      return await executeTransaction(async () => {
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
          if (transactionData.subtotal !== undefined) {
            updateFields.push("subtotal = ?");
            updateValues.push(transactionData.subtotal);
          }
          if (transactionData.deposit !== undefined) {
            updateFields.push("deposit = ?");
            updateValues.push(transactionData.deposit);
          }
          if (transactionData.discount !== undefined) {
            updateFields.push("discount = ?");
            updateValues.push(transactionData.discount);
          }
          if (transactionData.tax !== undefined) {
            updateFields.push("tax = ?");
            updateValues.push(transactionData.tax);
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
          if (transactionData.subtotal !== undefined) {
            updateFields.push("subtotal = ?");
            updateValues.push(transactionData.subtotal);
          }
          if (transactionData.discount !== undefined) {
            updateFields.push("discount = ?");
            updateValues.push(transactionData.discount);
          }
          if (transactionData.tax !== undefined) {
            updateFields.push("tax = ?");
            updateValues.push(transactionData.tax);
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

          // Update transaction details if provided
          if (
            transactionData.items !== undefined ||
            transactionData.bundles !== undefined ||
            transactionData.accessories !== undefined
          ) {
            // Get existing transaction details for stock return
            const existingDetails = await database.query(
              `SELECT id, item_id, accessory_id, quantity 
               FROM sales_transaction_details 
               WHERE sales_transaction_id = ?`,
              [id],
            );

            // Get transaction code for stock movement notes
            const transactionRecord = await database.queryOne(
              "SELECT transaction_code FROM sales_transactions WHERE id = ?",
              [id],
            );
            const transactionCode = transactionRecord?.transaction_code || "";

            // Return stock for existing items
            for (const detail of existingDetails) {
              const quantity = detail.quantity || 0;
              if (detail.item_id) {
                await restoreStockWithMovement({
                  entityId: detail.item_id,
                  quantity,
                  tableName: "items",
                  increaseStockQuantity: true,
                  referenceType: "sales_transaction_update",
                  referenceId: id,
                  userId: transaction.user_id || 1,
                  notes: `Sales transaction update (return): ${transactionCode}`,
                });
              } else if (detail.accessory_id) {
                await restoreStockWithMovement({
                  entityId: detail.accessory_id,
                  quantity,
                  tableName: "accessories",
                  increaseStockQuantity: true,
                  referenceType: "sales_transaction_update",
                  referenceId: id,
                  userId: transaction.user_id || 1,
                  notes: `Sales transaction update (return): ${transactionCode}`,
                });
              }
            }

            // Delete existing transaction details
            await database.execute(
              "DELETE FROM sales_transaction_details WHERE sales_transaction_id = ?",
              [id],
            );

            // Process new items, bundles, and accessories
            const bundleLines = hasBundles
              ? await expandBundleSelections(transactionData.bundles)
              : [];
            const saleLines = [...saleItems, ...bundleLines];
            const accessories = Array.isArray(transactionData.accessories)
              ? transactionData.accessories
              : [];

            // Validate stock before processing
            for (const line of saleLines) {
              const quantity = Math.max(1, Number(line.quantity) || 0);
              await validateStock(line.itemId, quantity);
            }

            // Validate accessory stock
            for (const accessory of accessories) {
              const quantity = Math.max(1, Number(accessory.quantity) || 1);
              await validateAccessoryStock(accessory.accessoryId, quantity);
            }

            // Process items, bundles, and accessories
            const allLines = [
              ...saleLines.map(line => ({ ...line, isItem: true })),
              ...accessories.map(acc => ({ ...acc, itemId: acc.accessoryId, salePrice: acc.salePrice, quantity: acc.quantity, subtotal: acc.subtotal, isItem: false })),
            ];

            for (const line of allLines) {
              const quantity = Math.max(1, Number(line.quantity) || 0);
              const salePrice = Number(line.salePrice) || 0;
              const lineSubtotal = Number(line.subtotal) || salePrice * quantity;
              const tableName = line.isItem ? "items" : "accessories";
              const stockBefore = await getStockBefore(line.itemId, tableName);

              await database.execute(
                `INSERT INTO sales_transaction_details (
                  sales_transaction_id, item_id, accessory_id, quantity,
                  sale_price, subtotal, is_sync
                ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                [id, line.isItem ? line.itemId : null, line.isItem ? null : line.itemId, quantity, salePrice, lineSubtotal],
              );

              await updateStock(line.itemId, quantity, tableName, true);
              const stockAfter = stockBefore - quantity;

              await createStockMovement({
                itemId: line.isItem ? line.itemId : null,
                accessoryId: line.isItem ? null : line.itemId,
                movementType: "OUT",
                referenceType: "sales_transaction_update",
                referenceId: id,
                quantity,
                stockBefore,
                stockAfter,
                userId: transaction.user_id || 1,
                notes: `Sales transaction update: ${transactionCode}`,
              });
            }
          }
        }

        // Return updated transaction
        const updatedTransaction = await database.queryOne(
          isRental
            ? "SELECT * FROM rental_transactions WHERE id = ?"
            : "SELECT * FROM sales_transactions WHERE id = ?",
          [id],
        );
        return updatedTransaction;
      });
    } catch (error) {
      logger.error("Error updating transaction:", error);
      throw error;
    }
  });

  // Delete transaction
  ipcMain.handle("transactions:delete", async (event, id) => {
    try {
      return await executeTransaction(async () => {
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

        return true;
      });
    } catch (error) {
      logger.error("Error deleting transaction:", error);
      throw error;
    }
  });

  // Cancel transaction (only for unpaid transactions)
  ipcMain.handle("transactions:cancel", async (event, id, transactionType) => {
    try {
      return await executeTransaction(async () => {
        const isRental = transactionType === "rental" || transactionType === "RENTAL";
        const type = isRental ? "rental" : "sale";
        const tableName = isRental ? "rental_transactions" : "sales_transactions";
        const detailsTable = isRental ? "rental_transaction_details" : "sales_transaction_details";
        const detailIdField = isRental ? "rental_transaction_id" : "sales_transaction_id";
        const referenceType = isRental ? "rental_cancellation" : "sale_cancellation";

        const transaction = await getTransactionPaymentStatus(type, id);

        if (!transaction) {
          throw new Error("Transaksi tidak ditemukan");
        }

        if (transaction.calculated_payment_status === "paid") {
          throw new Error("Transaksi tidak dapat dibatalkan");
        }

        if (transaction.status === "cancelled") {
          throw new Error("Transaksi tidak dapat dibatalkan");
        }

        // Get transaction details untuk restore stock
        const details = await database.query(
          `SELECT item_id, accessory_id, quantity FROM ${detailsTable} WHERE ${detailIdField} = ?`,
          [id],
        );

        // Restore stock untuk setiap item/accessory
        for (const detail of details) {
          if (detail.item_id) {
            await restoreStockWithMovement({
              entityId: detail.item_id,
              quantity: detail.quantity,
              tableName: "items",
              increaseStockQuantity: !isRental,
              referenceType,
              referenceId: id,
              userId: null,
              notes: `Cancel ${type} transaction: ${transaction.transaction_code}`,
            });
          } else if (detail.accessory_id) {
            await restoreStockWithMovement({
              entityId: detail.accessory_id,
              quantity: detail.quantity,
              tableName: "accessories",
              increaseStockQuantity: !isRental,
              referenceType,
              referenceId: id,
              userId: null,
              notes: `Cancel ${type} transaction: ${transaction.transaction_code}`,
            });
          }
        }

        // Update status to cancelled and reset is_sync to allow re-sync with new status
        await database.execute(
          `UPDATE ${tableName} SET status = 'cancelled', is_sync = 0 WHERE id = ?`,
          [id],
        );

        return true;
      });
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

      // Validate rental transaction exists and get deposit info
      const rental = await database.queryOne(
        "SELECT id, user_id, transaction_code, status, deposit FROM rental_transactions WHERE id = ?",
        [rentalTransactionId],
      );

      if (!rental) {
        throw new Error("Transaksi tidak ditemukan");
      }

      if (rental.status === "cancelled") {
        throw new Error("Transaksi tidak dapat dikembalikan");
      }

      // Start transaction
      return await executeTransaction(async () => {
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
          const stockBefore = await getStockBefore(item.item_id);

          // Mark item as returned
          await database.execute(
            "UPDATE rental_transaction_details SET is_returned = 1, return_condition = ? WHERE id = ?",
            [validReturnCondition, item.id],
          );

          // Restore available quantity (only for good condition, or always restore and handle differently for damaged/lost)
          // For now, we restore stock for all conditions - you can adjust this logic if needed
          if (validReturnCondition !== "lost") {
            await restoreStock(item.item_id, item.quantity);
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
          // Update status to returned and reset is_sync to allow re-sync with new status
          await database.execute(
            "UPDATE rental_transactions SET actual_return_date = ?, status = 'returned', is_sync = 0 WHERE id = ?",
            [returnDate, rentalTransactionId],
          );

          // Check if deposit has already been refunded
          const existingRefund = await database.queryOne(
            `SELECT COUNT(*) as count FROM rental_payments 
             WHERE transaction_id = ? 
             AND (notes LIKE '%Deposit Refund%' OR notes LIKE '%Pengembalian Deposit%' OR amount < 0)`,
            [rentalTransactionId],
          );

          // Refund deposit if deposit exists and hasn't been refunded yet
          const depositAmount = Number(rental.deposit || 0);
          if (depositAmount > 0 && (!existingRefund || existingRefund.count === 0)) {
            // Check for lost or damaged items - if any item is lost or damaged, don't refund deposit
            const lostItemsResult = await database.queryOne(
              `SELECT COUNT(*) as count FROM rental_transaction_details 
               WHERE rental_transaction_id = ? AND is_returned = 1 AND return_condition = 'lost'`,
              [rentalTransactionId],
            );

            const damagedItemsResult = await database.queryOne(
              `SELECT COUNT(*) as count FROM rental_transaction_details 
               WHERE rental_transaction_id = ? AND is_returned = 1 AND return_condition = 'damaged'`,
              [rentalTransactionId],
            );

            // Only refund deposit if all items are returned in good condition
            // If any item is lost or damaged, deposit is not refunded (hangus)
            const hasLostItems = lostItemsResult && lostItemsResult.count > 0;
            const hasDamagedItems = damagedItemsResult && damagedItemsResult.count > 0;
            
            if (!hasLostItems && !hasDamagedItems) {
              // All items returned in good condition - refund full deposit
              // Validate cashier session for cash refunds
              await validateCashierSession(returnUserId);
              
              await database.execute(
                `INSERT INTO rental_payments (
                  transaction_id, payment_date, amount,
                  payment_method, reference_number, user_id, notes, is_sync
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                  rentalTransactionId,
                  new Date().toISOString(),
                  -depositAmount, // Negative amount for refund
                  "cash", // Default to cash refund
                  null,
                  returnUserId,
                  `Deposit Refund - Pengembalian Deposit untuk ${rental.transaction_code}`,
                ],
              );
            }
            // If has lost or damaged items, deposit is not refunded (hangus)
          }
        } else if (actualReturnDate) {
          // Update return date even if not all items are returned yet
          // Also reset is_sync in case status changes
          await database.execute(
            "UPDATE rental_transactions SET actual_return_date = ?, is_sync = 0 WHERE id = ?",
            [actualReturnDate, rentalTransactionId],
          );
        }

        return {
          success: true,
          itemsReturned: rentalItems.length,
          allItemsReturned: remainingItems.count === 0,
        };
      });
    } catch (error) {
      logger.error("Error returning rental items:", error);
      throw error;
    }
  });
}

module.exports = { setupTransactionHandlers };
