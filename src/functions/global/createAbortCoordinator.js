export function createAbortCoordinator() {
  const handlers = new Set();
  return {
    cancelled: false,
    reason: null,
    cancel(err) {
      if (this.cancelled) {
        return;
      }
      this.cancelled = true;
      this.reason = err || new Error('Download cancelled');
      for (const handler of handlers) {
        try {
          handler(this.reason);
        } catch {
          // ignore handler errors
        }
      }
      handlers.clear();
    },
    onCancel(handler) {
      if (this.cancelled) {
        handler(this.reason);
        return () => {};
      }
      handlers.add(handler);
      return () => handlers.delete(handler);
    }
  };
}
