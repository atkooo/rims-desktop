const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validator");
const {
  getTransactionPaymentStatus,
  validateCashierSession,
} = require("./transactionHelpers");

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

      // Use appropriate payment table based on transaction type
      const paymentTable = paymentData.transactionType === "rental" ? "rental_payments" : "sales_payments";
      
      const result = await database.execute(
        `INSERT INTO ${paymentTable} (
          transaction_id, payment_date, amount,
          payment_method, reference_number, user_id, notes, is_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
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
          // Update status to active and reset is_sync to allow re-sync with new status
          await database.execute(
            `UPDATE rental_transactions SET status = 'active', is_sync = 0 WHERE id = ?`,
            [paymentData.transactionId],
          );
        }
      }

      // Check if payment is complete and update transaction status accordingly
      const updatedTransaction = await getTransactionPaymentStatus(
        paymentData.transactionType,
        paymentData.transactionId,
      );

      if (updatedTransaction) {
        const totalPaid = Number(updatedTransaction.total_paid || 0);
        const totalAmount = Number(updatedTransaction.total_amount || 0);
        const isPaymentComplete = totalPaid >= totalAmount;

        if (isPaymentComplete) {
          if (paymentData.transactionType === "sale" && updatedTransaction.status !== "completed") {
            await database.execute(
              `UPDATE sales_transactions SET status = 'completed', is_sync = 0 WHERE id = ?`,
              [paymentData.transactionId],
            );
          } else if (paymentData.transactionType === "rental" && updatedTransaction.status === "pending") {
            await database.execute(
              `UPDATE rental_transactions SET status = 'active', is_sync = 0 WHERE id = ?`,
              [paymentData.transactionId],
            );
          } else if (updatedTransaction.status !== "cancelled") {
            await database.execute(
              `UPDATE ${paymentData.transactionType === "sale" ? "sales" : "rental"}_transactions SET is_sync = 0 WHERE id = ?`,
              [paymentData.transactionId],
            );
          }
        } else if (paymentData.transactionType === "sale" && updatedTransaction.status === "completed") {
          await database.execute(
            `UPDATE sales_transactions SET status = 'pending', is_sync = 0 WHERE id = ?`,
            [paymentData.transactionId],
          );
        }
      }

      const newPayment = await database.queryOne(
        `SELECT p.*, u.full_name AS user_name, ? as transaction_type
         FROM ${paymentTable} p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [paymentData.transactionType, result.id],
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
      // Get payment info before updating - check both tables
      let payment = await database.queryOne(
        `SELECT 'rental' as transaction_type, transaction_id FROM rental_payments WHERE id = ?`,
        [id],
      );
      
      if (!payment) {
        payment = await database.queryOne(
          `SELECT 'sale' as transaction_type, transaction_id FROM sales_payments WHERE id = ?`,
          [id],
        );
      }
      
      if (!payment) {
        throw new Error("Payment tidak ditemukan");
      }
      
      const paymentTable = payment.transaction_type === "rental" ? "rental_payments" : "sales_payments";

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
          `UPDATE ${paymentTable} SET ${updateFields.join(", ")} WHERE id = ?`,
          updateValues,
        );
      }

      // Update transaction status based on payment status after update
      if (payment && payment.transaction_type === "sale") {
        const updatedTransaction = await getTransactionPaymentStatus(
          payment.transaction_type,
          payment.transaction_id,
        );

        if (updatedTransaction) {
          const totalPaid = Number(updatedTransaction.total_paid || 0);
          const totalAmount = Number(updatedTransaction.total_amount || 0);
          const isPaymentComplete = totalPaid >= totalAmount;

          if (isPaymentComplete) {
            // Payment is complete, update status to 'completed' if not already
            if (updatedTransaction.status !== "completed") {
              await database.execute(
                `UPDATE sales_transactions SET status = 'completed', is_sync = 0 WHERE id = ?`,
                [payment.transaction_id],
              );
            }
          } else {
            // Payment is not complete, update status to 'pending' if it was 'completed'
            if (updatedTransaction.status === "completed") {
              await database.execute(
                `UPDATE sales_transactions SET status = 'pending', is_sync = 0 WHERE id = ?`,
                [payment.transaction_id],
              );
            }
          }
        }
      }

      const updatedPayment = await database.queryOne(
        `SELECT p.*, u.full_name AS user_name, ? as transaction_type
         FROM ${paymentTable} p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [payment.transaction_type, id],
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
      // Get payment info before deleting - check both tables
      let payment = await database.queryOne(
        `SELECT 'rental' as transaction_type, transaction_id FROM rental_payments WHERE id = ?`,
        [id],
      );
      
      if (!payment) {
        payment = await database.queryOne(
          `SELECT 'sale' as transaction_type, transaction_id FROM sales_payments WHERE id = ?`,
          [id],
        );
      }
      
      if (!payment) {
        throw new Error("Payment tidak ditemukan");
      }
      
      const paymentTable = payment.transaction_type === "rental" ? "rental_payments" : "sales_payments";

      await database.execute(`DELETE FROM ${paymentTable} WHERE id = ?`, [id]);

      // Update transaction status if payment deletion makes it unpaid
      if (payment && payment.transaction_type === "sale") {
        const updatedTransaction = await getTransactionPaymentStatus(
          payment.transaction_type,
          payment.transaction_id,
        );

        if (updatedTransaction) {
          const totalPaid = Number(updatedTransaction.total_paid || 0);
          const totalAmount = Number(updatedTransaction.total_amount || 0);
          const isPaymentComplete = totalPaid >= totalAmount;

          // If payment is not complete and status is 'completed', change it back to 'pending'
          if (!isPaymentComplete && updatedTransaction.status === "completed") {
            await database.execute(
              `UPDATE sales_transactions SET status = 'pending', is_sync = 0 WHERE id = ?`,
              [payment.transaction_id],
            );
          }
        }
      }

      return true;
    } catch (error) {
      logger.error("Error deleting payment:", error);
      throw error;
    }
  });
}

module.exports = { setupPaymentHandlers };

