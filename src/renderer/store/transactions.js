import { defineStore } from "pinia";
import { ipcRenderer } from "electron";
import { TRANSACTION_STATUS } from "../../shared/constants";

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
        const transDate = new Date(t.transactionDate);
        return (
          transDate >= new Date(startDate) && transDate <= new Date(endDate)
        );
      });
    },

    // Get total pendapatan hari ini
    getTodayIncome: (state) => {
      const today = new Date().toISOString().split("T")[0];
      return state.transactions
        .filter(
          (t) =>
            t.transactionDate.startsWith(today) &&
            t.status === TRANSACTION_STATUS.COMPLETED
        )
        .reduce((sum, t) => sum + t.totalAmount, 0);
    },
  },

  actions: {
    // Fetch semua transaksi
    async fetchTransactions() {
      this.loading = true;
      try {
        const transactions = await ipcRenderer.invoke("transactions:getAll");
        this.transactions = transactions;
        this.error = null;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Buat transaksi baru
    async createTransaction(transactionData) {
      this.loading = true;
      try {
        const newTransaction = await ipcRenderer.invoke(
          "transactions:create",
          transactionData
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

    // Update status transaksi
    async updateTransactionStatus(id, status) {
      this.loading = true;
      try {
        await ipcRenderer.invoke("transactions:updateStatus", id, status);
        const transaction = this.transactions.find((t) => t.id === id);
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
