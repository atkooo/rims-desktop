import { ipcRenderer } from "@/services/ipc";

export function fetchRentalTransactions() {
  return ipcRenderer.invoke("transactions:getRentalsView");
}

export function fetchRentalDetails() {
  return ipcRenderer.invoke("transactions:getRentalDetailsView");
}

export function fetchSalesTransactions() {
  return ipcRenderer.invoke("transactions:getSalesView");
}

export function fetchSalesDetails() {
  return ipcRenderer.invoke("transactions:getSalesDetailsView");
}

export function fetchStockMovements() {
  return ipcRenderer.invoke("transactions:getStockMovementsView");
}

export function fetchPayments() {
  return ipcRenderer.invoke("transactions:getPaymentsView");
}

// Payments CRUD
export function createPayment(paymentData) {
  return ipcRenderer.invoke("payments:create", paymentData);
}

export function updatePayment(id, paymentData) {
  return ipcRenderer.invoke("payments:update", id, paymentData);
}

export function deletePayment(id) {
  return ipcRenderer.invoke("payments:delete", id);
}

// Stock Movements CRUD
export function createStockMovement(movementData) {
  return ipcRenderer.invoke("stockMovements:create", movementData);
}

export function deleteStockMovement(id) {
  return ipcRenderer.invoke("stockMovements:delete", id);
}

// Cancel transaction
export function cancelTransaction(id, transactionType) {
  return ipcRenderer.invoke("transactions:cancel", id, transactionType);
}

// Return rental items
export function returnRentalItems({ rentalTransactionId, detailIds, returnCondition, actualReturnDate, userId }) {
  // Ensure all values are serializable (no undefined, handle null properly)
  const payload = {
    rentalTransactionId: rentalTransactionId || null,
    detailIds: detailIds && Array.isArray(detailIds) ? detailIds : null,
    returnCondition: returnCondition || "good",
    actualReturnDate: actualReturnDate || null,
    userId: userId || null,
  };
  
  return ipcRenderer.invoke("rentals:returnItems", payload);
}