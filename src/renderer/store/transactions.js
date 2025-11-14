import { defineStore } from "pinia";
import { ipcRenderer } from "@/services/ipc";
import { TRANSACTION_STATUS } from "@shared/constants";

export const useTransactionStore = defineStore("transactions", {
  state: () => ({
    transactions: [],
    currentTransaction: null,
    loading: false,
    error: null,
  }),

  getters: {
    // Get transaksi berdasarkan status
    getTransactionsByStatus: (state) => (status) => {
      return state.transactions.filter((t) => t.status === status);
    },

    // Get transaksi berdasarkan rentang tanggal
    getTransactionsByDateRange: (state) => (startDate, endDate) => {
      return state.transactions.filter((t) => {
        const dateStr =
          t.transactionDate || t.rental_date || t.sale_date || t.created_at;
        if (!dateStr) return false;
        const transDate = new Date(dateStr);
        return (
          transDate >= new Date(startDate) && transDate <= new Date(endDate)
        );
      });
    },

    // Get total pendapatan hari ini
    getTodayIncome: (state) => {
      const today = new Date().toISOString().split("T")[0];
      return state.transactions
        .filter((t) => {
          const dateStr = (
            t.transactionDate ||
            t.rental_date ||
            t.sale_date ||
            t.created_at ||
            ""
          ).toString();
          return (
            dateStr.startsWith(today) &&
            t.status === TRANSACTION_STATUS.COMPLETED
          );
        })
        .reduce((sum, t) => sum + (Number(t.totalAmount ?? 0) || 0), 0);
    },
  },

  actions: {
    // Fetch semua transaksi
    async fetchTransactions() {
      this.loading = true;
      try {
        const transactions = await ipcRenderer.invoke("transactions:getAll");
        this.transactions = transactions.map((t) =>
          this.normalizeTransaction(t),
        );
        this.error = null;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Normalize transaction data to UI format
    normalizeTransaction(t) {
      const isRental =
        t.transaction_type === "rental" ||
        t.transaction_type === "RENTAL" ||
        !!t.rental_date;

      const transactionDate =
        t.transactionDate ||
        (isRental ? t.rental_date : t.sale_date) ||
        t.created_at ||
        null;

      const totalAmount = Number(t.totalAmount ?? t.total_amount ?? 0) || 0;
      const customerName =
        t.customerName || t.customer_name || t.customer || null;
      const paidAmount =
        Number(t.paid_amount ?? t.actual_paid_amount ?? 0) || 0;

      // Map backend status to UI constants
      const status = this.mapTransactionStatus(t, isRental);

      return {
        ...t,
        transactionType: isRental ? "RENTAL" : "SALE",
        transactionDate,
        totalAmount,
        customerName,
        status,
        paid_amount: paidAmount,
      };
    },

    // Map transaction status from backend to UI constants
    mapTransactionStatus(t, isRental) {
      const status = t.status;

      if (isRental) {
        if (status === "pending") return TRANSACTION_STATUS.PENDING;
        if (status === "active" || status === "overdue")
          return TRANSACTION_STATUS.PENDING;
        if (status === "returned") return TRANSACTION_STATUS.COMPLETED;
        if (status === "cancelled") return TRANSACTION_STATUS.CANCELLED;
        return TRANSACTION_STATUS.PENDING;
      }

      // For sales transactions
      if (status === "cancelled") return TRANSACTION_STATUS.CANCELLED;

      const paymentStatus = t.payment_status ?? status;
      if (paymentStatus === "paid") return TRANSACTION_STATUS.COMPLETED;
      if (paymentStatus === "unpaid") return TRANSACTION_STATUS.PENDING;

      return TRANSACTION_STATUS.PENDING;
    },

    // Buat transaksi baru
    async createTransaction(transactionData) {
      this.loading = true;
      try {
        const newTransaction = await ipcRenderer.invoke(
          "transactions:create",
          transactionData,
        );
        this.transactions.unshift(newTransaction);
        this.error = null;
        return newTransaction;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Update transaksi
    async updateTransaction(id, transactionData) {
      this.loading = true;
      try {
        const updatedTransaction = await ipcRenderer.invoke(
          "transactions:update",
          id,
          transactionData,
        );
        const index = this.transactions.findIndex((t) => t.id === id);
        if (index !== -1) {
          this.transactions[index] = {
            ...this.transactions[index],
            ...updatedTransaction,
          };
        }
        this.error = null;
        return updatedTransaction;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Update status transaksi
    async updateTransactionStatus(id, status) {
      this.loading = true;
      try {
        const transaction = this.transactions.find((t) => t.id === id);
        const payload = {
          transactionType: transaction?.transactionType || "RENTAL",
          transactionId: id,
        };
        await ipcRenderer.invoke("transactions:updateStatus", payload, status);
        if (transaction) {
          transaction.status = status;
        }
        this.error = null;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Delete transaksi
    async deleteTransaction(id) {
      this.loading = true;
      try {
        await ipcRenderer.invoke("transactions:delete", id);
        this.transactions = this.transactions.filter((t) => t.id !== id);
        this.error = null;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Set current transaction
    setCurrentTransaction(transaction) {
      this.currentTransaction = transaction;
    },

    // Clear current transaction
    clearCurrentTransaction() {
      this.currentTransaction = null;
    },
  },
});
