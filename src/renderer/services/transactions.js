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
