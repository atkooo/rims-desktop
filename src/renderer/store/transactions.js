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
          const status = t.status;
          return (
            dateStr.startsWith(today) && status === TRANSACTION_STATUS.COMPLETED
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
        // Normalize to UI shape (camelCase fields, unified status/date)
        this.transactions = transactions.map((t) => {
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

          // Map backend status to UI constants
          let status = t.status;
          if (isRental) {
            if (status === "active" || status === "overdue") {
              status = TRANSACTION_STATUS.PENDING;
            } else if (status === "returned") {
              status = TRANSACTION_STATUS.COMPLETED;
            } else if (status === "cancelled") {
              status = TRANSACTION_STATUS.CANCELLED;
            }
          } else {
            const pay = t.payment_status ?? status;
            if (pay === "paid") status = TRANSACTION_STATUS.COMPLETED;
            else if (pay === "partial" || pay === "unpaid")
              status = TRANSACTION_STATUS.PENDING;
          }

          const transactionType = isRental ? "RENTAL" : "SALE";

          return {
            ...t,
            transactionType,
            transactionDate,
            totalAmount,
            customerName,
            status,
          };
        });
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
