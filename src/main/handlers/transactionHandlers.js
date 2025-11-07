const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const { TRANSACTION_STATUS } = require("../../shared/constants");

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
        // Insert transaction
        const result = await database.execute(
          "INSERT INTO transactions (transaction_date, total_amount, status, customer_name, notes) VALUES (?, ?, ?, ?, ?)",
          [
            transactionData.transactionDate,
            transactionData.totalAmount,
            TRANSACTION_STATUS.PENDING,
            transactionData.customerName,
            transactionData.notes,
          ]
        );

        // Insert transaction items
        for (const item of transactionData.items) {
          await database.execute(
            "INSERT INTO transaction_items (transaction_id, item_id, quantity, price) VALUES (?, ?, ?, ?)",
            [result.id, item.itemId, item.quantity, item.price]
          );

          // Update item status jika rental
          if (item.type === "RENTAL") {
            await database.execute("UPDATE items SET status = ? WHERE id = ?", [
              "RENTED",
              item.itemId,
            ]);
          }
        }

        await database.execute("COMMIT");

        // Return created transaction
        const newTransaction = await database.queryOne(
          "SELECT * FROM transactions WHERE id = ?",
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
        // Update status
        await database.execute(
          "UPDATE transactions SET status = ? WHERE id = ?",
          [status, id]
        );

        // Jika completed, update item status
        if (status === TRANSACTION_STATUS.COMPLETED) {
          const items = await database.query(
            "SELECT ti.item_id, i.type FROM transaction_items ti JOIN items i ON ti.item_id = i.id WHERE ti.transaction_id = ?",
            [id]
          );

          for (const item of items) {
            if (item.type === "RENTAL") {
              await database.execute(
                "UPDATE items SET status = ? WHERE id = ?",
                ["AVAILABLE", item.item_id]
              );
            }
          }
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
