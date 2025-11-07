let ipcRenderer = null;

const bridge = typeof window !== "undefined" ? window.api : null;

if (bridge) {
  const listenerMap = new WeakMap();

  ipcRenderer = {
    invoke: (channel, ...args) => bridge.invoke(channel, ...args),
    send: (channel, ...args) => bridge.send?.(channel, ...args),
    on: (channel, listener) => {
      if (!bridge.on) return ipcRenderer;
      const wrapped = (...args) => listener(...args);
      const unsubscribe = bridge.on(channel, wrapped);

      if (typeof unsubscribe === "function") {
        listenerMap.set(listener, unsubscribe);
      } else if (bridge.removeListener) {
        listenerMap.set(listener, wrapped);
      }

      return ipcRenderer;
    },
    once: (channel, listener) => {
      if (!bridge.once) return ipcRenderer;
      bridge.once(channel, (...args) => listener(...args));
      return ipcRenderer;
    },
    removeListener: (channel, listener) => {
      const stored = listenerMap.get(listener);

      if (typeof stored === "function") {
        stored();
      } else if (stored) {
        bridge.removeListener?.(channel, stored);
      } else {
        bridge.removeListener?.(channel, listener);
      }

      listenerMap.delete(listener);
      return ipcRenderer;
    },
  };
} else {
  try {
    const electron = window.require ? window.require("electron") : null;
    ipcRenderer = electron?.ipcRenderer ?? null;
  } catch (error) {
    console.warn("ipcRenderer not available:", error);
    ipcRenderer = null;
  }
}

function ensureIpc() {
  if (!ipcRenderer) {
    throw new Error("ipcRenderer is not available in the current context");
  }
}

export function isIpcAvailable() {
  return Boolean(ipcRenderer);
}

export async function invoke(channel, ...args) {
  ensureIpc();
  return ipcRenderer.invoke(channel, ...args);
}

export function send(channel, ...args) {
  ensureIpc();
  if (!ipcRenderer.send) {
    throw new Error("ipcRenderer.send is not available in this context");
  }
  return ipcRenderer.send(channel, ...args);
}

export function on(channel, listener) {
  ensureIpc();
  if (!ipcRenderer.on) {
    throw new Error("ipcRenderer.on is not available in this context");
  }
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener?.(channel, listener);
}

export function once(channel, listener) {
  ensureIpc();
  if (!ipcRenderer.once) {
    throw new Error("ipcRenderer.once is not available in this context");
  }
  ipcRenderer.once(channel, listener);
}

export { ipcRenderer };
