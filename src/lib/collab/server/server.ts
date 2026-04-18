/**
 * WebSocket Server for Real-time Collaboration
 * Handles client connections, message broadcasting, and session management
 */

import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';
import { CRDTTextImpl, Operation, CRDTUpdate } from '../core/crdt';
import { generateId } from '../utils/id';

// ============================================================================
// Types
// ============================================================================

export interface ClientInfo {
  id: string;
  userId: string;
  name: string;
  color: string;
  connected: boolean;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface CollabSession {
  id: string;
  documentId: string;
  clients: Map<string, ClientInfo>;
  crdt: CRDTTextImpl;
  createdAt: number;
  lastActivity: number;
  version: number;
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
  clients: ClientInfo[];
}

/**
 * Sync data for messages
 */
export interface SyncData {
  content: string;
  version: number;
  clients: ClientInfo[];
}

/**
 * Sync request data (client -> server)
 */
export interface SyncRequestData {
  documentId?: string;
}

/**
 * Sync response data (server -> client)
 */
export interface SyncResponseData {
  documentId: string;
  content: string;
  crdtState?: unknown;
  clients: ClientInfo[];
  vectorClock?: Record<string, number>;
}

/**
 * Join request data
 */
export interface JoinRequestData {
  documentId: string;
  userId: string;
  name: string;
  color?: string;
}

/**
 * Error data for messages
 */
export interface ErrorData {
  code: string;
  message: string;
}

export interface ServerMessage {
  type: 'operation' | 'cursor' | 'presence' | 'sync' | 'error';
  sessionId: string;
  data: OperationData | CursorData | PresenceData | SyncData | ErrorData;
  timestamp: number;
}

export interface ClientMessage {
  type: 'operation' | 'cursor' | 'sync' | 'join' | 'leave';
  sessionId: string;
  data: OperationData | CursorData | SyncData | { userId: string; name: string; color: string };
}

// ============================================================================
// WebSocket Server
// ============================================================================

export class CollabServer extends EventEmitter {
  private wss: WebSocketServer;
  private sessions: Map<string, CollabSession>;
  private clientToSession: Map<string, string>; // clientId -> sessionId
  private wsToClient: Map<WebSocket, string>;   // ws -> clientId

  constructor(port: number = 8080) {
    super();
    this.wss = new WebSocketServer({ port });
    this.sessions = new Map();
    this.clientToSession = new Map();
    this.wsToClient = new Map();

    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = generateId();
      this.wsToClient.set(ws, clientId);

      console.log(`[CollabServer] Client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleClientMessage(ws, clientId, message);
        } catch (error) {
          console.error('[CollabServer] Invalid message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws, clientId);
      });

      ws.on('error', (error) => {
        console.error(`[CollabServer] WebSocket error for ${clientId}:`, error);
      });
    });

    console.log(`[CollabServer] Server started on port ${this.wss.options.port}`);
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(ws: WebSocket, clientId: string, message: ClientMessage): void {
    const session = this.sessions.get(message.sessionId);

    switch (message.type) {
      case 'join':
        this.handleJoin(ws, clientId, message);
        break;

      case 'leave':
        this.handleLeave(clientId, message.sessionId);
        break;

      case 'operation':
        if (session) {
          // Extract the first operation from OperationData
          const opData = message.data as OperationData;
          if (opData.operations && opData.operations.length > 0) {
            this.handleOperation(session, clientId, opData.operations[0]);
          }
        }
        break;

      case 'cursor':
        if (session) {
          // Extract position from CursorData
          const cursorData = message.data as CursorData;
          this.handleCursor(session, clientId, cursorData.position);
        }
        break;

      case 'sync':
        if (session) {
          this.handleSync(ws, session);
        }
        break;
    }
  }

  /**
   * Handle client joining a session
   */
  private handleJoin(ws: WebSocket, clientId: string, message: ClientMessage): void {
    const { documentId, userId, name } = message.data as JoinRequestData;

    let session = this.sessions.get(message.sessionId);

    if (!session) {
      // Create new session
      session = this.createSession(message.sessionId, documentId);
      this.sessions.set(message.sessionId, session);
      console.log(`[CollabServer] Created new session: ${message.sessionId}`);
    }

    // Add client to session
    const clientInfo: ClientInfo = {
      id: clientId,
      userId,
      name: name || `User ${userId.slice(0, 6)}`,
      color: this.generateColor(userId),
      connected: true,
    };

    session.clients.set(clientId, clientInfo);
    this.clientToSession.set(clientId, message.sessionId);
    session.lastActivity = Date.now();

    console.log(`[CollabServer] Client ${clientId} joined session ${message.sessionId}`);

    // Send current document state to new client
    this.sendSync(ws, session);

    // Broadcast presence update
    this.broadcastPresence(session);

    this.emit('client-joined', { session, client: clientInfo });
  }

  /**
   * Handle client leaving a session
   */
  private handleLeave(clientId: string, sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const client = session.clients.get(clientId);
    if (client) {
      client.connected = false;
      session.clients.delete(clientId);
      this.clientToSession.delete(clientId);

      console.log(`[CollabServer] Client ${clientId} left session ${sessionId}`);

      // Broadcast presence update
      this.broadcastPresence(session);

      this.emit('client-left', { session, client });

      // Clean up empty sessions
      if (session.clients.size === 0) {
        this.sessions.delete(sessionId);
        console.log(`[CollabServer] Deleted empty session: ${sessionId}`);
      }
    }
  }

  /**
   * Handle operation from client
   */
  private handleOperation(session: CollabSession, clientId: string, operation: Operation): void {
    // Apply operation to CRDT
    session.crdt.applyOperation(operation);

    // Broadcast to other clients (convert Operation to OperationData)
    const operationData: OperationData = {
      operations: [operation],
      version: session.version,
    };

    this.broadcastToSession(session, {
      type: 'operation',
      sessionId: session.id,
      data: operationData,
      timestamp: Date.now(),
    }, clientId); // Exclude sender

    session.lastActivity = Date.now();

    this.emit('operation', { session, clientId, operation });
  }

  /**
   * Handle cursor position update
   */
  private handleCursor(session: CollabSession, clientId: string, cursor: CursorPosition): void {
    const client = session.clients.get(clientId);
    if (!client) return;

    client.cursor = cursor;
    session.lastActivity = Date.now();

    // Broadcast cursor to other clients
    this.broadcastToSession(session, {
      type: 'cursor',
      sessionId: session.id,
      data: { userId: clientId, position: cursor } as CursorData,
      timestamp: Date.now(),
    }, clientId); // Exclude sender
  }

  /**
   * Handle sync request
   */
  private handleSync(ws: WebSocket, session: CollabSession): void {
    this.sendSync(ws, session);
  }

  /**
   * Create a new session
   */
  private createSession(sessionId: string, documentId: string): CollabSession {
    return {
      id: sessionId,
      documentId,
      clients: new Map(),
      crdt: new CRDTTextImpl(sessionId),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      version: 0,
    };
  }

  /**
   * Send sync data to client
   */
  private sendSync(ws: WebSocket, session: CollabSession): void {
    // Convert Map to Record for vectorClock
    const vectorClockRecord: Record<string, number> = {};
    session.crdt.getVectorClock().forEach((v, k) => {
      vectorClockRecord[k] = v;
    });

    const message: ServerMessage = {
      type: 'sync',
      sessionId: session.id,
      data: {
        documentId: session.documentId,
        content: session.crdt.getText(),
        crdtState: session.crdt.toJSON(),
        clients: Array.from(session.clients.values()),
        vectorClock: vectorClockRecord,
      } as SyncResponseData,
      timestamp: Date.now(),
    };

    this.send(ws, message);
  }

  /**
   * Broadcast presence to all clients in session
   */
  private broadcastPresence(session: CollabSession): void {
    const message: ServerMessage = {
      type: 'presence',
      sessionId: session.id,
      data: {
        clients: Array.from(session.clients.values()),
      },
      timestamp: Date.now(),
    };

    this.broadcastToSession(session, message);
  }

  /**
   * Broadcast message to all clients in session (except optional exclude)
   */
  private broadcastToSession(session: CollabSession, message: ServerMessage, excludeClientId?: string): void {
    for (const [clientId, client] of Array.from(session.clients.entries())) {
      if (!client.connected) continue;
      if (excludeClientId && clientId === excludeClientId) continue;

      const ws = this.findWebSocket(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  private sendError(ws: WebSocket, error: string): void {
    const message: ServerMessage = {
      type: 'error',
      sessionId: '',
      data: { code: 'INTERNAL_ERROR', message: error } as ErrorData,
      timestamp: Date.now(),
    };

    this.send(ws, message);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: WebSocket, clientId: string): void {
    const sessionId = this.clientToSession.get(clientId);
    if (sessionId) {
      this.handleLeave(clientId, sessionId);
    }

    this.wsToClient.delete(ws);
    console.log(`[CollabServer] Client disconnected: ${clientId}`);
  }

  /**
   * Find WebSocket by client ID
   */
  private findWebSocket(clientId: string): WebSocket | undefined {
    for (const [ws, id] of Array.from(this.wsToClient.entries())) {
      if (id === clientId) {
        return ws;
      }
    }
    return undefined;
  }

  /**
   * Generate color for user
   */
  private generateColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8B500', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9',
    ];

    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CollabSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): CollabSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Close server
   */
  close(): void {
    this.wss.close();
    console.log('[CollabServer] Server closed');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new collaboration session
 */
export function createSession(documentId: string): CollabSession {
  const sessionId = generateId();
  return {
    id: sessionId,
    documentId,
    clients: new Map(),
    crdt: new CRDTTextImpl(sessionId),
    createdAt: Date.now(),
    lastActivity: Date.now(),
    version: 0,
  };
}

/**
 * Document state for export
 */
export interface DocumentState {
  documentId: string;
  content: string;
  clients: ClientInfo[];
  lastActivity: number;
}

/**
 * Get document state for a session
 */
export function getDocumentState(sessionId: string, sessions: Map<string, CollabSession>): DocumentState {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  return {
    documentId: session.documentId,
    content: session.crdt.getText(),
    clients: Array.from(session.clients.values()),
    lastActivity: session.lastActivity,
  };
}