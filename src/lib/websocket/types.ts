/**
 * WebSocket Types
 *
 * Shared type definitions for WebSocket and voice meeting modules.
 * This file breaks the circular dependency between server.ts and signaling.ts.
 */

import type { Socket } from 'socket.io'

/**
 * Authenticated Socket with user data
 */
export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string
      name: string
      email?: string
      avatar?: string
    }
    lastHeartbeat: number
    rooms: Set<string>
  }
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: string
  id: string
  timestamp: string
  roomId?: string
  userId?: string
  payload?: unknown
}

/**
 * Cursor update for collaboration
 */
export interface CursorUpdate {
  userId: string
  userName: string
  color: string
  position: number
  selection?: {
    start: number
    end: number
  }
}

/**
 * Selection update for collaboration
 */
export interface SelectionUpdate {
  userId: string
  userName: string
  color: string
  selection: {
    start: number
    end: number
  }
}

/**
 * Document operation type
 */
export type DocumentOperationType = 'insert' | 'delete' | 'replace' | 'retain'

/**
 * Document operation for collaboration
 */
export interface DocumentOperation {
  type: DocumentOperationType
  position: number
  content?: string
  length?: number
  userId?: string
  timestamp?: number
}

/**
 * Document state for collaboration
 */
export interface DocumentState {
  content: string
  version: number
  lastModifiedBy?: string
  lastModifiedAt?: number
}

/**
 * Collaboration message types
 */
export type CollaborationMessageType =
  | 'cursor_update'
  | 'cursor:move'
  | 'selection_update'
  | 'selection:update'
  | 'document_operation'
  | 'doc:operation'
  | 'document_sync'
  | 'presence_update'
  | 'presence:typing'

/**
 * Collaboration message
 */
export interface CollaborationMessage {
  type: CollaborationMessageType
  roomId?: string
  userId?: string
  id?: string
  timestamp?: number | string
  payload:
    | CursorUpdate
    | SelectionUpdate
    | DocumentOperation
    | DocumentState
    | Record<string, unknown>
}

/**
 * Room user for collaboration
 */
export interface RoomUser {
  id: string
  name: string
  email?: string
  avatar?: string
  color?: string
  role?: 'owner' | 'admin' | 'member' | 'guest'
  lastActivity?: number | Date
  isOnline?: boolean
}
