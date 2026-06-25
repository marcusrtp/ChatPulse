export function createEventBus() {
  const listeners = new Map();

  function on(eventName, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("Event handler must be a function");
    }

    const handlers = listeners.get(eventName) ?? new Set();
    handlers.add(handler);
    listeners.set(eventName, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(eventName);
      }
    };
  }

  function emit(eventName, payload) {
    const handlers = listeners.get(eventName);
    if (!handlers) return;

    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  return { on, emit };
}
