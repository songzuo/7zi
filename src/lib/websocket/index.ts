// @ts-nocheck
// @ts-nocheck
/**
 * WebSocket Service Exports
 *
 * Centralized exports for WebSocket server functionality.
 */

// Core server exports
export {
  getServer,
  getStats,
  getRoomInfo,
  getAllRooms,
  broadcastSystemAnnouncement,
  broadcastTaskStatusUpdate,
  broadcastTaskStatusToUser,
  createServer as createWebSocketServer,
} from './server'

export type { AuthenticatedSocket, TaskStatusUpdate } from './server'

// Type system
export type { WebSocketMessage } from './types'

// Room management (NEW v1.4.0)
export { RoomManager, getRoomManager, resetRoomManager } from './rooms'
export type {
  RoomType,
  RoomVisibility,
  RoomParticipant,
  RoomConfig,
  RoomData,
  Room,
  CreateRoomOptions,
  JoinRoomOptions,
  RoomEventCallbacks,
} from './rooms'

// Permission system (NEW v1.4.0)
export {
  PermissionManager,
  getPermissionManager,
  resetPermissionManager,
  createPermissionChecker,
  checkPermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions'
export type {
  RoomPermission,
  MessagePermission,
  AdminPermission,
  Permission,
  UserRole,
  PermissionGrant,
  UserRoomPermissions,
} from './permissions'

// Message store (NEW v1.4.0)
export { MessageStore, getMessageStore, resetMessageStore } from './message-store'
export type {
  StoredMessage,
  MessageReaction,
  OfflineMessage,
  MessageHistoryOptions,
  MessageStoreStats,
} from './message-store'

// Optimized Message Handling (v2.0)
export {
  compressMessage,
  decompressMessage,
  computeDelta,
  applyDelta,
  hashMessage,
  MessageBatcher,
  OptimizedMessageHandler,
  createMessageBatcher,
  createOptimizedMessageHandler,
  defaultCompressionConfig,
} from './optimized-message'
export type {
  OptimizedMessage,
  MessageBatch,
  CompressionConfig,
  SendCallback,
  BatchSendCallback,
  OptimizedMessageHandlerConfig,
} from './optimized-message'

// React hooks
export { default as useCollaboration } from './useCollaboration'
export type {
  ConnectionState,
  RoomUser as CollaborationRoomUser,
  CollaborationConfig,
  CollaborationState,
  CollaborationActions,
} from './useCollaboration'

// Export comprehensive type system
export * from './types'

// CRDT Sync (NEW v1.12.0)
export {
  CRDTDocumentManager,
  ConflictResolver,
  SyncProtocol,
} from './crdt-sync'
export type {
  CRDTOperation,
  CRDTOperationType,
  CRDTDocumentState,
  SyncMessage,
  SyncMessageType,
  ConflictType,
  ConflictInfo,
  ConflictResolution,
  ConflictResolutionStrategy,
} from './crdt-sync'

// Collaboration Manager (NEW v1.12.0, refactored v1.14.0)
export {
  CollaborationManager,
  getCollaborationManager,
  resetCollaborationManager,
} from './collaboration-manager'
export type {
  CollaborationSession,
  CollaborationParticipant,
  EditLock,
  CollaborationEvent,
  CollaborationEventType,
  CollaborationConfig,
  CollaborationStats,
} from './collab-types'

// Collaboration sub-modules (v1.14.0)
export {
  createCollaborationSession,
  addParticipantToSession,
  removeParticipantFromSession,
  getRoomParticipantInfo,
  createCollaborationEvent,
} from './collab-session'

export {
  acquireLock,
  releaseLock,
  renewLock,
  getLockInfo,
  getAllLocksInfo,
  isNodeLocked,
  isNodeLockedByUser,
  cleanupExpiredLocks,
  releaseAllUserLocks,
} from './collab-lock'

export {
  updateNode,
  deleteNode,
  moveNode,
  updateCursor,
  updateSelection,
  getDocumentState,
  getSyncUpdate,
  applySyncUpdate,
} from './collab-doc-sync'

// Collaboration Handlers (NEW v1.12.0)
export {
  setupCollaborationHandlers,
  handleCollaborationDisconnect,
  setupCollaborationCleanup,
  getCollaborationStats,
} from './collaboration-handlers'
