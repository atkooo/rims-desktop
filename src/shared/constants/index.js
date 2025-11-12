// Constants untuk status transaksi
const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

// Constants untuk tipe item
const ITEM_TYPE = {
  RENTAL: "RENTAL",
  SALE: "SALE",
};

// Constants untuk tipe transaksi
const TRANSACTION_TYPE = {
  RENTAL: "RENTAL",
  SALE: "SALE",
};

// Constants untuk durasi rental
const RENTAL_DURATION = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
};

module.exports = {
  TRANSACTION_STATUS,
  ITEM_TYPE,
  TRANSACTION_TYPE,
  RENTAL_DURATION,
};
