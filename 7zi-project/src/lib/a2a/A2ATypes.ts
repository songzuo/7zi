/**
 * A2A Protocol Extended Types
 */

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'error' | 'heartbeat';
  timestamp: number;
  payload: unknown;
  correlationId?: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}

export interface A2ARequestOptions {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
  retries?: number;
}

export interface A2AHandler {
  pattern: string | RegExp;
  handler: (msg: A2AMessage) => Promise<unknown>;
}

export interface A2AConnection {
  id: string;
  agentId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface A2AServerConfig {
  port?: number;
  host?: string;
  heartbeatInterval?: number;
  maxConnections?: number;
}

export interface A2AClientConfig {
  serverUrl?: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  autoReconnect?: boolean;
}

export type A2AEventHandler = (event: A2AEvent) => void;

export interface A2AEvent {
  type: 'connected' | 'disconnected' | 'message' | 'error' | 'heartbeat';
  data?: unknown;
  timestamp: number;
}