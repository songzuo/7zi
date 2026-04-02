/**
 * WebSocket Feature Types
 */

export enum WebSocketStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export interface WebSocketMessage {
  type: string
  payload: unknown
  timestamp?: Date
}

export interface WebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface WebSocketState {
  status: WebSocketStatus
  lastMessage?: WebSocketMessage
  error?: Error
  connectionTime?: Date
}
