/**
 * Collaboration Manager
 *
 * Manages real-time collaboration features including:
 * - Document state management
 * - Operational Transformation (OT) for conflict resolution
 * - User presence tracking
 * - Cursor synchronization
 */

import { logger } from '@/lib/logger';
import type { RoomUser, Room } from './server';

// ============================================================================
// Types
// ============================================================================

export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

export interface DocumentState {
  content: string;
  revision: number;
  operations: OperationHistoryEntry[];
}

export interface OperationHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  operation: Operation;
  revision: number;
}

export interface Cursor {
  userId: string;
  userName: string;
  position: number;
  selection?: { start: number; end: number };
  color: string;
}

export interface Presence {
  userId: string;
  userName: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
  isTyping: boolean;
}

// ============================================================================
// Operational Transformation (OT)
// ============================================================================

/**
 * Transform two operations that were applied concurrently
 * This ensures that concurrent edits don't conflict
 */
export function transform(op1: Operation, op2: Operation): { op1: Operation; op2: Operation } {
  // If both are retain operations, no transformation needed
  if (op1.type === 'retain' && op2.type === 'retain') {
    return { op1, op2 };
  }

  // If op1 is retain, op2 can be transformed directly
  if (op1.type === 'retain') {
    return {
      op1,
      op2: transformOpByRetain(op2, op1.position),
    };
  }

  // If op2 is retain, op1 can be transformed directly
  if (op2.type === 'retain') {
    return {
      op1: transformOpByRetain(op1, op2.position),
      op2,
    };
  }

  // Both are insert or delete operations
  return transformConcurrentOps(op1, op2);
}

/**
 * Transform an operation by a retain operation
 */
function transformOpByRetain(op: Operation, retainPos: number): Operation {
  if (op.position < retainPos) {
    // Operation comes before retain, no change
    return op;
  }

  const shift = op.type === 'insert' ? op.content?.length || 0 : -(op.length || 0);
  return {
    ...op,
    position: op.position + shift,
  };
}

/**
 * Transform two concurrent insert/delete operations
 */
function transformConcurrentOps(op1: Operation, op2: Operation): { op1: Operation; op2: Operation } {
  // If positions are the same, use operation order (op1 first)
  if (op1.position === op2.position) {
    return { op1, op2 };
  }

  // If op1 comes before op2
  if (op1.position < op2.position) {
    const op2Shift = op1.type === 'insert' ? (op1.content?.length || 0) : -(op1.length || 0);
    return {
      op1,
      op2: {
        ...op2,
        position: op2.position + op2Shift,
      },
    };
  }

  // If op2 comes before op1
  const op1Shift = op2.type === 'insert' ? (op2.content?.length || 0) : -(op2.length || 0);
  return {
    op1: {
      ...op1,
      position: op1.position + op1Shift,
    },
    op2,
  };
}

/**
 * Apply an operation to a document
 */
export function applyOperation(document: DocumentState, operation: Operation, userId: string, userName: string): DocumentState {
  const newContent = applyOperationToContent(document.content, operation);

  const historyEntry: OperationHistoryEntry = {
    id: crypto.randomUUID(),
    userId,
    userName,
    timestamp: new Date(),
    operation,
    revision: document.revision + 1,
  };

  return {
    content: newContent,
    revision: document.revision + 1,
    operations: [historyEntry, ...document.operations].slice(0, 1000), // Keep last 1000 operations
  };
}

/**
 * Apply operation to content string
 */
export function applyOperationToContent(content: string, operation: Operation): string {
  switch (operation.type) {
    case 'insert':
      if (operation.content !== undefined) {
        return content.slice(0, operation.position) + operation.content + content.slice(operation.position);
      }
      return content;

    case 'delete':
      if (operation.length !== undefined) {
        return content.slice(0, operation.position) + content.slice(operation.position + operation.length);
      }
      return content;

    case 'retain':
      return content;

    default:
      return content;
  }
}

/**
 * Compose two operations into a single operation
 */
export function composeOperations(op1: Operation, op2: Operation): Operation {
  // If op2 is retain, just return op1
  if (op2.type === 'retain') {
    return op1;
  }

  // If op1 is retain, return op2 with adjusted position
  if (op1.type === 'retain') {
    return {
      ...op2,
      position: op2.position + op1.position,
    };
  }

  // Both are actual operations, need to compose
  return composeActualOps(op1, op2);
}

/**
 * Compose two actual operations (insert/delete)
 */
function composeActualOps(op1: Operation, op2: Operation): Operation {
  // If op1 deletes content, op2's position needs adjustment
  if (op1.type === 'delete') {
    const shift = -(op1.length || 0);
    return {
      ...op2,
      position: Math.max(0, op2.position + shift),
    };
  }

  // If op1 inserts content, op2's position needs adjustment
  if (op1.type === 'insert') {
    const shift = op1.content?.length || 0;
    return {
      ...op2,
      position: op2.position + shift,
    };
  }

  return op2;
}

// ============================================================================
// Document State Management
// ============================================================================

export class DocumentManager {
  private documents: Map<string, DocumentState> = new Map();

  /**
   * Get or create a document
   */
  getDocument(documentId: string, initialContent = ''): DocumentState {
    if (!this.documents.has(documentId)) {
      this.documents.set(documentId, {
        content: initialContent,
        revision: 0,
        operations: [],
      });
    }
    return this.documents.get(documentId)!;
  }

  /**
   * Update a document with an operation
   */
  updateDocument(documentId: string, operation: Operation, userId: string, userName: string): DocumentState {
    const document = this.getDocument(documentId);
    const updated = applyOperation(document, operation, userId, userName);
    this.documents.set(documentId, updated);
    return updated;
  }

  /**
   * Get operation history for a document
   */
  getOperationHistory(documentId: string, sinceRevision = 0): OperationHistoryEntry[] {
    const document = this.getDocument(documentId);
    return document.operations.filter(op => op.revision > sinceRevision);
  }

  /**
   * Delete a document
   */
  deleteDocument(documentId: string): void {
    this.documents.delete(documentId);
    logger.info('Document deleted', { documentId });
  }
}

// ============================================================================
// Cursor Manager
// ============================================================================

export class CursorManager {
  private cursors: Map<string, Map<string, Cursor>> = new Map(); // roomId -> userId -> cursor

  /**
   * Update cursor position
   */
  updateCursor(roomId: string, userId: string, userName: string, position: number, selection?: { start: number; end: number }, color?: string): Cursor {
    if (!this.cursors.has(roomId)) {
      this.cursors.set(roomId, new Map());
    }

    const roomCursors = this.cursors.get(roomId)!;
    const cursor: Cursor = {
      userId,
      userName,
      position,
      selection,
      color: color || this.generateColor(userId),
    };

    roomCursors.set(userId, cursor);
    return cursor;
  }

  /**
   * Get all cursors in a room
   */
  getRoomCursors(roomId: string): Cursor[] {
    const roomCursors = this.cursors.get(roomId);
    return roomCursors ? Array.from(roomCursors.values()) : [];
  }

  /**
   * Remove cursor for a user
   */
  removeCursor(roomId: string, userId: string): void {
    const roomCursors = this.cursors.get(roomId);
    if (roomCursors) {
      roomCursors.delete(userId);

      // Clean up empty room
      if (roomCursors.size === 0) {
        this.cursors.delete(roomId);
      }
    }
  }

  /**
   * Generate a consistent color for a user
   */
  private generateColor(userId: string): string {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
      '#d946ef', '#ec4899', '#f43f5e',
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

// ============================================================================
// Presence Manager
// ============================================================================

export class PresenceManager {
  private presence: Map<string, Presence> = new Map(); // userId -> presence

  /**
   * Update user presence
   */
  updatePresence(userId: string, userName: string, status: Presence['status'], isTyping?: boolean): Presence {
    const presence: Presence = {
      userId,
      userName,
      status,
      lastSeen: new Date(),
      isTyping: isTyping || false,
    };

    this.presence.set(userId, presence);
    return presence;
  }

  /**
   * Mark user as offline
   */
  markOffline(userId: string): void {
    const presence = this.presence.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.isTyping = false;
      presence.lastSeen = new Date();
    }
  }

  /**
   * Get presence for a user
   */
  getPresence(userId: string): Presence | undefined {
    return this.presence.get(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): Presence[] {
    return Array.from(this.presence.values()).filter(p => p.status !== 'offline');
  }

  /**
   * Get users in a room
   */
  getRoomUsers(roomId: string, roomUsers: Map<string, RoomUser>): Presence[] {
    const users: Presence[] = [];
    roomUsers.forEach((roomUser, userId) => {
      const presence = this.presence.get(userId);
      if (presence) {
        users.push(presence);
      }
    });
    return users;
  }

  /**
   * Clean up inactive users (not seen for 30 minutes)
   */
  cleanupInactive(): number {
    const threshold = Date.now() - 30 * 60 * 1000;
    let cleaned = 0;

    this.presence.forEach((presence, userId) => {
      if (presence.lastSeen.getTime() < threshold && presence.status === 'offline') {
        this.presence.delete(userId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info('Cleaned up inactive users', { count: cleaned });
    }

    return cleaned;
  }
}

// ============================================================================
// Collaboration Manager
// ============================================================================

export class CollaborationManager {
  private documents: DocumentManager;
  private cursors: CursorManager;
  private presence: PresenceManager;

  constructor() {
    this.documents = new DocumentManager();
    this.cursors = new CursorManager();
    this.presence = new PresenceManager();

    // Start cleanup interval
    setInterval(() => {
      this.presence.cleanupInactive();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get document manager
   */
  getDocuments(): DocumentManager {
    return this.documents;
  }

  /**
   * Get cursor manager
   */
  getCursors(): CursorManager {
    return this.cursors;
  }

  /**
   * Get presence manager
   */
  getPresence(): PresenceManager {
    return this.presence;
  }

  /**
   * Handle document operation
   */
  handleOperation(
    documentId: string,
    operation: Operation,
    userId: string,
    userName: string
  ): { document: DocumentState; operationEntry: OperationHistoryEntry } {
    const document = this.documents.updateDocument(documentId, operation, userId, userName);
    const operationEntry = document.operations[0];

    logger.debug('Operation applied', {
      documentId,
      userId,
      operation,
      revision: document.revision,
    });

    return { document, operationEntry };
  }

  /**
   * Handle cursor update
   */
  handleCursorUpdate(
    roomId: string,
    userId: string,
    userName: string,
    position: number,
    selection?: { start: number; end: number }
  ): Cursor {
    return this.cursors.updateCursor(roomId, userId, userName, position, selection);
  }

  /**
   * Update cursor (alias for handleCursorUpdate)
   */
  updateCursor(
    roomId: string,
    userId: string,
    userName: string,
    position: number,
    selection?: { start: number; end: number }
  ): Cursor {
    return this.handleCursorUpdate(roomId, userId, userName, position, selection);
  }

  /**
   * Handle presence update
   */
  handlePresenceUpdate(
    userId: string,
    userName: string,
    status: Presence['status'],
    isTyping?: boolean
  ): Presence {
    return this.presence.updatePresence(userId, userName, status, isTyping);
  }

  /**
   * Update presence (alias for handlePresenceUpdate)
   */
  updatePresence(
    userId: string,
    userName: string,
    status: Presence['status'],
    isTyping?: boolean
  ): Presence {
    return this.handlePresenceUpdate(userId, userName, status, isTyping);
  }

  /**
   * Handle user disconnect
   */
  handleDisconnect(userId: string, rooms: string[]): void {
    this.presence.markOffline(userId);

    rooms.forEach(roomId => {
      this.cursors.removeCursor(roomId, userId);
    });

    logger.info('User disconnected from collaboration', { userId, rooms });
  }

  /**
   * Get room state
   */
  getRoomState(roomId: string): {
    cursors: Cursor[];
    presence: Presence[];
  } {
    return {
      cursors: this.cursors.getRoomCursors(roomId),
      presence: this.presence.getOnlineUsers(),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let collaborationManager: CollaborationManager | null = null;

export function getCollaborationManager(): CollaborationManager {
  if (!collaborationManager) {
    collaborationManager = new CollaborationManager();
    logger.info('Collaboration manager initialized');
  }
  return collaborationManager;
}

export default CollaborationManager;
