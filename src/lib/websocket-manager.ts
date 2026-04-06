// WebSocket Manager stub for workspace compatibility
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type EventHandler = (...args: any[]) => void;

export interface WebSocketManager {
  connect(): void;
  disconnect(): void;
  send(data: unknown): void;
  getState(): ConnectionState;
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, ...args: unknown[]): void;
}

export function createWebSocketManager(_url: string): WebSocketManager {
  const handlers: Map<string, Set<EventHandler>> = new Map();

  return {
    connect: () => {},
    disconnect: () => {},
    send: () => {},
    getState: () => 'disconnected',
    on(event: string, handler: EventHandler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: EventHandler) {
      handlers.get(event)?.delete(handler);
    },
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.forEach(h => h(...args));
    },
  };
}
