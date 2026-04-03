/**
 * Collaboration Feature Types
 *
 * Frontend types for real-time collaboration system
 * Connects to /api/collab/ws WebSocket endpoint
 */

// ============================================================================
// User & Presence Types
// ============================================================================

/**
 * Collaboration user information
 */
export interface CollabUser {
  id: string
  name: string
  avatar?: string
  color: string
  isOnline: boolean
  lastActivity: number
  currentNodeId?: string
}

/**
 * User presence state
 */
export interface UserPresence {
  user: CollabUser
  status: 'active' | 'idle' | 'away' | 'offline'
  sessionId: string
  joinedAt: number
  lastHeartbeat: number
}

// ============================================================================
// Cursor Types
// ============================================================================

/**
 * Cursor position on screen
 */
export interface CursorPosition {
  nodeId?: string
  x: number
  y: number
  selection?: {
    start: number
    end: number
  }
}

/**
 * Remote cursor state
 */
export interface CursorState {
  cursor: CursorPosition
  user: {
    id: string
    name: string
    color: string
    avatar?: string
  }
  timestamp: number
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * WebSocket message types for collaboration
 */
export type CollabMessageType =
  | 'cursor:move'
  | 'cursor:select'
  | 'cursor:hide'
  | 'presence:join'
  | 'presence:leave'
  | 'presence:heartbeat'
  | 'presence:update'
  | 'doc:sync'
  | 'doc:update'
  | 'lock:acquire'
  | 'lock:release'
  | 'lock:renew'
  | 'sync:request'
  | 'sync:response'
  | 'error'

/**
 * WebSocket message structure
 */
export interface CollabMessage<T = unknown> {
  type: CollabMessageType
  payload: T
  timestamp: number
  userId?: string
  sessionId?: string
}

/**
 * Cursor update payload
 */
export interface CursorMovePayload {
  position: CursorPosition
}

/**
 * Presence join payload
 */
export interface PresenceJoinPayload {
  user: CollabUser
  sessionId: string
}

/**
 * Presence update payload
 */
export interface PresenceUpdatePayload {
  userId: string
  updates: Partial<CollabUser>
}

// ============================================================================
// Y.js Document Types
// ============================================================================

/**
 * Y.js document state
 */
export interface YjsDocState {
  docId: string
  awareness: Map<string, CursorState>
  isSynced: boolean
  isConnected: boolean
}

// ============================================================================
// Room & Session Types
// ============================================================================

/**
 * Collaboration session
 */
export interface CollabSession {
  id: string
  roomId: string
  workflowId: string
  tenantId: string
  createdAt: number
  updatedAt: number
  onlineUsers: string[]
}

/**
 * Collaboration room
 */
export interface CollabRoom {
  id: string
  name: string
  workflowId?: string
  isPasswordProtected: boolean
  createdAt: number
  maxUsers?: number
}

// ============================================================================
// Connection State
// ============================================================================

/**
 * Collaboration connection state
 */
export type CollabConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

/**
 * Connection state info
 */
export interface CollabConnectionInfo {
  state: CollabConnectionState
  error?: string
  connectedAt?: number
  reconnectAttempts: number
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * CollabProvider props
 */
export interface CollabProviderProps {
  children: React.ReactNode
  roomId: string
  userId: string
  userName: string
  userAvatar?: string
  userColor?: string
  autoConnect?: boolean
  wsUrl?: string
}

/**
 * RemoteCursor component props
 */
export interface RemoteCursorProps {
  cursor: CursorState
  showName?: boolean
  animationDuration?: number
}

/**
 * CollabCursor props
 */
export interface CollabCursorProps {
  className?: string
  showLocalCursor?: boolean
  remoteCursorClassName?: string
}
