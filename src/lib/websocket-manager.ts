// WebSocket Manager stub for workspace compatibility
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketManager {
  connect(): void;
  disconnect(): void;
  send(data: unknown): void;
  getState(): ConnectionState;
}

export function createWebSocketManager(_url: string): WebSocketManager {
  return {
    connect: () => {},
    disconnect: () => {},
    send: () => {},
    getState: () => 'disconnected',
  };
}
