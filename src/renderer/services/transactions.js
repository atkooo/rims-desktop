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

export function fetchBookings() {
  return ipcRenderer.invoke("transactions:getBookingsView");
}

export function fetchStockMovements() {
  return ipcRenderer.invoke("transactions:getStockMovementsView");
}

export function fetchPayments() {
  return ipcRenderer.invoke("transactions:getPaymentsView");
}

// Bookings CRUD
export function createBooking(bookingData) {
  return ipcRenderer.invoke("bookings:create", bookingData);
}

export function updateBooking(id, bookingData) {
  return ipcRenderer.invoke("bookings:update", id, bookingData);
}

export function deleteBooking(id) {
  return ipcRenderer.invoke("bookings:delete", id);
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
