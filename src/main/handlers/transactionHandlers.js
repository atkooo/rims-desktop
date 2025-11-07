const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { TRANSACTION_STATUS } = require("../../shared/constants");

function generateTransactionCode(type) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  const prefix = type === "RENTAL" ? "RNT" : "SLS";
  return `${prefix}${year}${month}${day}${random}`;
}

function setupTransactionHandlers() {
  // Get all transactions
  ipcMain.handle("transactions:getAll", async () => {
    try {
      // Get rental transactions
      const rentalTransactions = await database.query(`
                SELECT 
                    rt.*,
                    GROUP_CONCAT(rtd.item_id) as item_ids,
                    GROUP_CONCAT(rtd.quantity) as quantities,
                    'rental' as transaction_type
                FROM rental_transactions rt
                LEFT JOIN rental_transaction_details rtd ON rt.id = rtd.rental_transaction_id
                GROUP BY rt.id
            `);

      // Get sales transactions
      const salesTransactions = await database.query(`
                SELECT 
                    st.*,
                    GROUP_CONCAT(std.item_id) as item_ids,
                    GROUP_CONCAT(std.quantity) as quantities,
                    'sale' as transaction_type
                FROM sales_transactions st
                LEFT JOIN sales_transaction_details std ON st.id = std.sales_transaction_id
                GROUP BY st.id
            `);

      // Combine and sort both types of transactions
      const transactions = [...rentalTransactions, ...salesTransactions].sort(
        (a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateB - dateA;
        }
      );
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
      if (!transactionData.items || transactionData.items.length === 0) {
        throw new Error("Transaksi harus memiliki minimal 1 item");
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
              planned_return_date, total_days, subtotal, deposit,
              total_amount, payment_method, payment_status, paid_amount,
              status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionCode,
              transactionData.customerId,
              transactionData.userId,
              transactionData.rentalDate,
              transactionData.plannedReturnDate,
              transactionData.totalDays,
              transactionData.subtotal,
              transactionData.deposit,
              transactionData.totalAmount,
              transactionData.paymentMethod || "cash",
              transactionData.paymentStatus || "unpaid",
              transactionData.paidAmount || 0,
              "active",
              transactionData.notes,
            ]
          );

          // Insert rental transaction items
          for (const item of transactionData.items) {
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
              ]
            );

            // Update available quantity for the item
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity - ? WHERE id = ?",
              [item.quantity, item.itemId]
            );
          }
        } else {
          // Insert sales transaction
          result = await database.execute(
            `INSERT INTO sales_transactions (
              transaction_code, customer_id, user_id, sale_date,
              subtotal, discount, tax, total_amount, payment_method,
              payment_status, paid_amount, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionCode,
              transactionData.customerId,
              transactionData.userId,
              transactionData.saleDate,
              transactionData.subtotal,
              transactionData.discount || 0,
              transactionData.tax || 0,
              transactionData.totalAmount,
              transactionData.paymentMethod || "cash",
              transactionData.paymentStatus || "paid",
              transactionData.paidAmount || transactionData.totalAmount,
              transactionData.notes,
            ]
          );

          // Insert sales transaction items
          for (const item of transactionData.items) {
            await database.execute(
              `INSERT INTO sales_transaction_details (
                sales_transaction_id, item_id, quantity,
                sale_price, subtotal
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                result.id,
                item.itemId,
                item.quantity,
                item.salePrice,
                item.subtotal,
              ]
            );

            // Update available quantity for the item
            await database.execute(
              "UPDATE items SET available_quantity = available_quantity - ? WHERE id = ?",
              [item.quantity, item.itemId]
            );
          }
        }

        await database.execute("COMMIT");

        // Return created transaction
        const newTransaction = await database.queryOne(
          transactionData.type === "RENTAL"
            ? "SELECT * FROM rental_transactions WHERE id = ?"
            : "SELECT * FROM sales_transactions WHERE id = ?",
          [result.id]
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
          // Update rental transaction status
          await database.execute(
            "UPDATE rental_transactions SET status = ? WHERE id = ?",
            [status, transactionId]
          );

          // If returned, update item quantities and mark items as returned
          if (status === "returned") {
            const rentalItems = await database.query(
              `SELECT rtd.item_id, rtd.quantity, rtd.id as detail_id
               FROM rental_transaction_details rtd
               WHERE rtd.rental_transaction_id = ? AND rtd.is_returned = 0`,
              [transactionId]
            );

            for (const item of rentalItems) {
              // Mark item as returned in rental_transaction_details
              await database.execute(
                "UPDATE rental_transaction_details SET is_returned = 1, return_condition = ? WHERE id = ?",
                ["good", item.detail_id]
              );

              // Restore available quantity
              await database.execute(
                "UPDATE items SET available_quantity = available_quantity + ? WHERE id = ?",
                [item.quantity, item.item_id]
              );
            }
          }
        } else {
          // Update sales transaction status
          await database.execute(
            "UPDATE sales_transactions SET payment_status = ? WHERE id = ?",
            [status, transactionId]
          );
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
}

module.exports = setupTransactionHandlers;
