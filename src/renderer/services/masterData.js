import { ipcRenderer } from "@/services/ipc";

export function fetchAccessories() {
    return ipcRenderer.invoke("master:getAccessories");
}

export function fetchBundles() {
    return ipcRenderer.invoke("master:getBundles");
}

export function fetchBundleDetails() {
    return ipcRenderer.invoke("master:getBundleDetails");
}

export function fetchCustomers() {
    return ipcRenderer.invoke("master:getCustomers");
}

export function fetchRoles() {
    return ipcRenderer.invoke("master:getRoles");
}

export function fetchUsers() {
    return ipcRenderer.invoke("master:getUsers");
}
