let ipcRenderer = null;

try {
  const electron = window.require ? window.require("electron") : null;
  ipcRenderer = electron?.ipcRenderer ?? null;
} catch (error) {
  console.warn("ipcRenderer not available:", error);
  ipcRenderer = null;
}

export function isIpcAvailable() {
  return Boolean(ipcRenderer);
}

export async function invoke(channel, ...args) {
  if (!ipcRenderer)
    throw new Error("ipcRenderer is not available in the current context");
  return ipcRenderer.invoke(channel, ...args);
}

export function send(channel, ...args) {
  if (!ipcRenderer)
    throw new Error("ipcRenderer is not available in the current context");
  return ipcRenderer.send(channel, ...args);
}

export function on(channel, listener) {
  if (!ipcRenderer)
    throw new Error("ipcRenderer is not available in the current context");
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

export function once(channel, listener) {
  if (!ipcRenderer)
    throw new Error("ipcRenderer is not available in the current context");
  ipcRenderer.once(channel, listener);
}
