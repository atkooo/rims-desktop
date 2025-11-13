// Constants untuk status transaksi
export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

// Constants untuk tipe item
export const ITEM_TYPE = {
  RENTAL: "RENTAL",
  SALE: "SALE",
  BOTH: "BOTH", // Item bisa digunakan untuk rental dan sale
};

// Constants untuk tipe transaksi
export const TRANSACTION_TYPE = {
  RENTAL: "RENTAL",
  SALE: "SALE",
};

// Constants untuk durasi rental
export const RENTAL_DURATION = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
};
