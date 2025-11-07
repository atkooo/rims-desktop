import { ipcRenderer } from "@/services/ipc";

const channels = {
  itemsWithStock: "reports:getItemsWithStock",
  activeRentals: "reports:getActiveRentals",
  dailySales: "reports:getDailySales",
  stockAlerts: "reports:getStockAlerts",
  topCustomers: "reports:getTopCustomers",
};

export function fetchItemsWithStock() {
  return ipcRenderer.invoke(channels.itemsWithStock);
}

export function fetchActiveRentals() {
  return ipcRenderer.invoke(channels.activeRentals);
}

export function fetchDailySales() {
  return ipcRenderer.invoke(channels.dailySales);
}

export function fetchStockAlerts() {
  return ipcRenderer.invoke(channels.stockAlerts);
}

export function fetchTopCustomers() {
  return ipcRenderer.invoke(channels.topCustomers);
}
