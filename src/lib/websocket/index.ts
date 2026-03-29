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
} from './server';

export type {
  AuthenticatedSocket,
  TaskStatusUpdate,
  RoomUser,
} from './server';

// Type system
export type { WebSocketMessage } from './types';

// Room management (NEW v1.4.0)
export {
  getRoomManager,
  resetRoomManager,
} from './rooms';
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
} from './rooms';

// Permission system (NEW v1.4.0)
export {
  getPermissionManager,
  resetPermissionManager,
  createPermissionChecker,
  checkPermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions';
export type {
  RoomPermission,
  MessagePermission,
  AdminPermission,
  Permission,
  UserRole,
  PermissionGrant,
  UserRoomPermissions,
  PermissionManager,
} from './permissions';

// Message store (NEW v1.4.0)
export {
  getMessageStore,
  resetMessageStore,
} from './message-store';
export type {
  StoredMessage,
  MessageReaction,
  OfflineMessage,
  MessageHistoryOptions,
  MessageStoreStats,
  MessageStore,
} from './message-store';

// React hooks
export { default as useCollaboration } from './useCollaboration';
export type {
  ConnectionState,
  RoomUser as CollaborationRoomUser,
  CollaborationConfig,
  CollaborationState,
  CollaborationActions,
} from './useCollaboration';

// Export comprehensive type system
export * from './types';
