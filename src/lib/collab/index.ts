/**
 * Real-time Collaborative Document Editing System
 *
 * Enterprise-grade collaborative editing with CRDTs, WebSocket sync,
 * and real-time presence.
 */

// ============================================================================
// Core CRDT Implementation
// ============================================================================

export {
  CRDTTextImpl,
  CRDTListImpl,
  CRDTMapImpl,
  OperationType,
} from './core/crdt';

export type {
  CRDTType,
  CRDTNode,
  CRDTText,
  CRDTList,
  CRDTMap,
  CRDTData,
  Operation,
  InsertOperation,
  DeleteOperation,
  RetainOperation,
  CRDTUpdate,
} from './core/crdt';

// ============================================================================
// Server
// ============================================================================

export {
  CollabServer,
  createSession,
  getDocumentState,
} from './server/server';

export type {
  ClientInfo,
  CursorPosition,
  CollabSession,
  ServerMessage,
  ClientMessage,
} from './server/server';

// ============================================================================
// Client
// ============================================================================

export {
  CollabClient,
  CollabConnection,
  joinSession,
} from './client/client';

export type {
  ConnectionOptions,
  ConnectionStatus,
  User,
} from './client/client';

// ============================================================================
// Utilities
// ============================================================================

export {
  generateId,
  stringToColor,
  debounce,
  throttle,
  deepClone,
  mergeVectorClocks,
  compareVectorClocks,
  positionFromLineColumn,
  lineColumnFromPosition,
  formatTimestamp,
  timeDifference,
} from './utils/id';

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a new collaboration session
 */
export { createSession as createCollabSession } from './server/server';

/**
 * Submit an operation to a session
 */
export function submitOperation(
  sessionId: string,
  operation: Operation,
  sessions: Map<string, CollabSession>
): void {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  session.crdt.applyOperation(operation);
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = '1.0.0';