import { ipcRenderer } from "@/services/ipc";

// Transaction Reports
export async function fetchTransactionReport() {
  return await ipcRenderer.invoke("reports:getTransactionsView");
}

export async function fetchRentalTransactionsReport() {
  return await ipcRenderer.invoke("reports:getRentalTransactions");
}

export async function fetchSalesTransactionsReport() {
  return await ipcRenderer.invoke("reports:getSalesTransactions");
}

export async function fetchDailyRevenueReport() {
  return await ipcRenderer.invoke("reports:getDailyRevenue");
}

export async function fetchRevenueByCashierReport() {
  return await ipcRenderer.invoke("reports:getRevenueByCashier");
}

export async function fetchPaymentsReport() {
  return await ipcRenderer.invoke("reports:getPayments");
}

export async function fetchTransactionsByCustomerReport() {
  return await ipcRenderer.invoke("reports:getTransactionsByCustomer");
}

// Stock Reports
export async function fetchStockReport() {
  return await ipcRenderer.invoke("reports:getStockView");
}

export async function fetchStockItemsReport() {
  return await ipcRenderer.invoke("reports:getStockItems");
}

export async function fetchStockAccessoriesReport() {
  return await ipcRenderer.invoke("reports:getStockAccessories");
}

export async function fetchStockBundlesReport() {
  return await ipcRenderer.invoke("reports:getStockBundles");
}

export async function fetchStockMovementsReport() {
  return await ipcRenderer.invoke("reports:getStockMovements");
}

export async function fetchLowStockAlertReport() {
  return await ipcRenderer.invoke("reports:getLowStockAlert");
}

export async function fetchStockByCategoryReport() {
  return await ipcRenderer.invoke("reports:getStockByCategory");
}

// Export report to file
export async function exportReportData(reportType, format, filterParams = {}) {
  return await ipcRenderer.invoke("reports:export", reportType, format, filterParams);
}

// Preview report (export to temp and open)
export async function previewReport(reportType, filterParams = {}) {
  return await ipcRenderer.invoke("reports:preview", reportType, filterParams);
}

