/**
 * WebSocket Client for Real-time Collaboration
 * Handles connection management, operations, and cursor synchronization
 */

import { EventEmitter } from 'events';
import { Operation, CRDTTextImpl, CRDTUpdate } from '../core/crdt';
import { generateId } from '../utils/id';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionOptions {
  url: string;
  userId: string;
  userName?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface User {
  id: string;
  userId: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
}

export interface ConnectionStatus {
  connected: boolean;
  sessionId?: string;
  reconnectAttempts: number;
}

/**
 * Operation data for messages
 */
export interface OperationData {
  operations: Operation[];
  version: number;
}

/**
 * Cursor data for messages
 */
export interface CursorData {
  position: CursorPosition;
  userId: string;
}

/**
 * Presence data for messages
 */
export interface PresenceData {
  clients: User[];
}

/**
 * Sync data for messages
 */
export interface SyncData {
  content: string;
  version: number;
  clients: User[];
}

/**
 * Error data for messages
 */
export interface ErrorData {
  code: string;
  message: string;
}

/**
 * Sync response data
 */
export interface SyncResponseData {
  content: string;
  crdtState?: unknown;
  clients: Array<{
    id: string;
    userId: string;
    name: string;
    color: string;
    cursor?: CursorPosition;
  }>;
  vectorClock?: Record<string, number>;
}

export interface ClientMessage {
  type: 'operation' | 'cursor' | 'sync' | 'join' | 'leave';
  sessionId: string;
  data: OperationData | CursorData | SyncData | { userId: string; name: string; color: string };
}

export interface ServerMessage {
  type: 'operation' | 'cursor' | 'presence' | 'sync' | 'error';
  sessionId: string;
  data: OperationData | CursorData | PresenceData | SyncData | ErrorData;
  timestamp: number;
}

// ============================================================================
// WebSocket Client
// ============================================================================

export class CollabClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: ConnectionOptions;
  private sessionId: string | null = null;
  private crdt: CRDTTextImpl | null = null;
  private pendingOperations: Operation[] = [];
  private reconnectAttempts: number = 0;
  private status: ConnectionStatus = { connected: false, reconnectAttempts: 0 };
  private users: Map<string, User> = new Map();
  private version: number = 0;

  constructor(options: ConnectionOptions) {
    super();
    this.options = {
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 3000,
      ...options,
    };
  }

  /**
   * Connect to a collaboration session
   */
  async joinSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.onopen = () => {
          console.log('[CollabClient] Connected to server');

          // Send join message
          this.send({
            type: 'join',
            sessionId,
            data: {
              userId: this.options.userId,
              name: this.options.userName || 'Anonymous',
              color: '#7C3AED', // Default color
            },
          });

          this.sessionId = sessionId;
          this.status.connected = true;
          this.status.sessionId = sessionId;
          this.reconnectAttempts = 0;

          this.emit('connected', sessionId);
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('[CollabClient] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error: Event) => {
          console.error('[CollabClient] WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event: CloseEvent) => {
          console.log('[CollabClient] Disconnected from server');
          this.status.connected = false;
          this.emit('disconnected', event);

          if (this.options.reconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Leave current session
   */
  leaveSession(): void {
    if (this.sessionId) {
      this.send({
        type: 'leave',
        sessionId: this.sessionId,
        data: { userId: '', name: '', color: '' },
      });

      this.sessionId = null;
      this.crdt = null;
      this.users.clear();
      this.pendingOperations = [];
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status.connected = false;
    this.emit('left');
  }

  /**
   * Submit an operation
   */
  submitOperation(operation: Operation): void {
    if (!this.sessionId || !this.status.connected) {
      this.pendingOperations.push(operation);
      return;
    }

    // Add to pending and send
    this.pendingOperations.push(operation);

    // Wrap single Operation in OperationData format
    const operationData: OperationData = {
      operations: [operation],
      version: this.version,
    };

    this.send({
      type: 'operation',
      sessionId: this.sessionId,
      data: operationData,
    });

    this.emit('operation-sent', operation);
  }

  /**
   * Update cursor position
   */
  updateCursor(cursor: CursorPosition): void {
    if (!this.sessionId || !this.status.connected) return;

    this.send({
      type: 'cursor',
      sessionId: this.sessionId,
      data: { userId: this.options.userId, position: cursor },
    });
  }

  /**
   * Request document sync
   */
  requestSync(): void {
    if (!this.sessionId || !this.status.connected) return;

    this.send({
      type: 'sync',
      sessionId: this.sessionId,
      data: {} as SyncData,
    });
  }

  /**
   * Insert text
   */
  insert(position: number, text: string): void {
    if (!this.crdt) {
      console.error('[CollabClient] Not connected to a session');
      return;
    }

    const operations = this.crdt.insert(position, text);
    operations.forEach(op => this.submitOperation(op));

    this.emit('local-change', { type: 'insert', position, text });
  }

  /**
   * Delete text
   */
  delete(position: number, length: number): void {
    if (!this.crdt) {
      console.error('[CollabClient] Not connected to a session');
      return;
    }

    const operations = this.crdt.delete(position, length);
    operations.forEach(op => this.submitOperation(op));

    this.emit('local-change', { type: 'delete', position, length });
  }

  /**
   * Get current document content
   */
  getContent(): string {
    return this.crdt?.getText() || '';
  }

  /**
   * Get connected users
   */
  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Handle server messages
   */
  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'sync':
        this.handleSync(message.data as SyncResponseData);
        break;

      case 'operation':
        this.handleRemoteOperation(message.data as unknown as CRDTUpdate);
        break;

      case 'cursor':
        this.handleCursorUpdate(message.data as unknown as { clientId: string; cursor: CursorPosition });
        break;

      case 'presence':
        this.handlePresenceUpdate(message.data as PresenceData);
        break;

      case 'error':
        this.emit('error', message.data);
        break;
    }
  }

  /**
   * Handle sync response
   */
  private handleSync(data: SyncResponseData): void {
    const { content, crdtState, clients, vectorClock } = data;

    // Initialize or update CRDT
    if (crdtState) {
      this.crdt = CRDTTextImpl.fromJSON(crdtState as Record<string, unknown>, this.options.userId);
    } else {
      this.crdt = new CRDTTextImpl(this.options.userId, content);
    }

    // Update users
    this.users.clear();
    clients.forEach((client) => {
      this.users.set(client.id, {
        id: client.id,
        userId: client.userId,
        name: client.name,
        color: client.color,
        cursor: client.cursor,
      });
    });

    this.emit('sync', {
      content,
      users: this.getUsers(),
    });
  }

  /**
   * Handle remote operation
   */
  private handleRemoteOperation(update: CRDTUpdate): void {
    if (!this.crdt) return;

    // Apply operations to CRDT
    update.operations.forEach(op => {
      this.crdt!.applyOperation(op);
    });

    // Remove from pending if we sent this
    update.operations.forEach(op => {
      // Only check id for operations that have it (Insert/Delete)
      if ('id' in op) {
        const idx = this.pendingOperations.findIndex(p => 
          p.type === op.type && 'id' in p && p.id === op.id
        );
        if (idx !== -1) {
          this.pendingOperations.splice(idx, 1);
        }
      }
    });

    this.emit('remote-change', {
      operations: update.operations,
      content: this.crdt.getText(),
      clientId: update.clientId,
    });
  }

  /**
   * Handle cursor update
   */
  private handleCursorUpdate(data: { clientId: string; cursor: CursorPosition }): void {
    const user = this.users.get(data.clientId);
    if (user) {
      user.cursor = data.cursor;
      this.emit('cursor-update', { userId: user.userId, cursor: data.cursor });
    }
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(data: PresenceData): void {
    this.users.clear();
    data.clients.forEach(client => {
      this.users.set(client.id, {
        id: client.id,
        userId: client.userId,
        name: client.name,
        color: client.color,
        cursor: client.cursor,
      });
    });

    this.emit('presence-update', this.getUsers());
  }

  /**
   * Send message to server
   */
  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      console.log('[CollabClient] Max reconnect attempts reached');
      this.emit('reconnect-failed');
      return;
    }

    this.reconnectAttempts++;
    this.status.reconnectAttempts = this.reconnectAttempts;

    console.log(`[CollabClient] Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      if (this.sessionId) {
        this.joinSession(this.sessionId).catch(() => {
          this.attemptReconnect();
        });
      }
    }, this.options.reconnectDelay);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and join a collaboration session
 */
export async function joinSession(
  sessionId: string,
  options: ConnectionOptions
): Promise<CollabConnection> {
  const client = new CollabClient(options);
  await client.joinSession(sessionId);

  return new CollabConnection(client);
}

// ============================================================================
// Connection Wrapper
// ============================================================================

export class CollabConnection {
  private client: CollabClient;

  constructor(client: CollabClient) {
    this.client = client;
  }

  /**
   * Get current document content
   */
  getContent(): string {
    return this.client.getContent();
  }

  /**
   * Insert text at position
   */
  insert(position: number, text: string): void {
    this.client.insert(position, text);
  }

  /**
   * Delete text
   */
  delete(position: number, length: number): void {
    this.client.delete(position, length);
  }

  /**
   * Update cursor position
   */
  setCursor(cursor: CursorPosition): void {
    this.client.updateCursor(cursor);
  }

  /**
   * Get connected users
   */
  getUsers(): User[] {
    return this.client.getUsers();
  }

  /**
   * Subscribe to content changes
   */
  onContentChange(callback: (content: string) => void): () => void {
    const handler = () => callback(this.client.getContent());

    this.client.on('remote-change', handler);
    this.client.on('sync', handler);

    return () => {
      this.client.off('remote-change', handler);
      this.client.off('sync', handler);
    };
  }

  /**
   * Subscribe to cursor updates
   */
  onCursorChange(callback: (userId: string, cursor: CursorPosition) => void): () => void {
    const handler = (data: CursorData) => callback(data.userId, data.position);

    this.client.on('cursor-update', handler);

    return () => {
      this.client.off('cursor-update', handler);
    };
  }

  /**
   * Subscribe to presence changes
   */
  onPresenceChange(callback: (users: User[]) => void): () => void {
    this.client.on('presence-update', callback);

    return () => {
      this.client.off('presence-update', callback);
    };
  }

    /**
   * Leave session and disconnect
   */
  leave(): void {
    this.client.leaveSession();
  }
}