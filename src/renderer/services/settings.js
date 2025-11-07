import { ipcRenderer } from "@/services/ipc";

export function fetchBackupHistory() {
    return ipcRenderer.invoke("backup:getHistory");
}

export function fetchActivityLogs() {
    return ipcRenderer.invoke("activityLogs:get");
}
