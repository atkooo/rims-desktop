const listeners = new Map();

const ensureSet = (event) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  return listeners.get(event);
};

export const eventBus = {
  on(event, handler) {
    ensureSet(event).add(handler);
    return () => this.off(event, handler);
  },
  once(event, handler) {
    const wrapper = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  },
  off(event, handler) {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (!set.size) {
      listeners.delete(event);
    }
  },
  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    [...set].forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.warn(`eventBus handler error for "${event}"`, error);
      }
    });
  },
};
