import { ipcRenderer } from "@/services/ipc";

export function fetchStockMismatches() {
  return ipcRenderer.invoke("stock:getMismatchedItems");
}

export function repairItemStock(itemId) {
  return ipcRenderer.invoke("stock:repairItem", itemId);
}

export function repairBundleStock(bundleId) {
  return ipcRenderer.invoke("stock:repairBundle", bundleId);
}

export function repairAccessoryStock(accessoryId) {
  return ipcRenderer.invoke("stock:repairAccessory", accessoryId);
}

export function repairAllMismatchedItems() {
  return ipcRenderer.invoke("stock:repairAllMismatched");
}

export function createStockReceipt(payload) {
  return ipcRenderer.invoke("stockReceipts:create", payload);
}
