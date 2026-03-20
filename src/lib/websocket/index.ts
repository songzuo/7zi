/**
 * WebSocket Library Entry Point
 *
 * Exports all WebSocket and collaboration utilities
 */

// Server-side exports
export { createServer, getServer, getStats, getRoomInfo, getAllRooms, broadcastSystemAnnouncement } from './server';
export type { AuthenticatedSocket } from './server';

// Client-side hooks
export { useCollaboration } from './useCollaboration';
export type {
  ConnectionState,
  RoomUser,
  CollaborationConfig,
  CollaborationState,
  CollaborationActions,
} from './useCollaboration';

// Collaboration manager
export {
  CollaborationManager,
  getCollaborationManager,
  DocumentManager,
  CursorManager,
  PresenceManager,
} from '../collaboration/manager';
export type {
  Operation,
  DocumentState,
  OperationHistoryEntry,
  Cursor,
  Presence,
} from '../collaboration/manager';

// Room management
export {
  RoomHelpers,
  generateTaskRoomId,
  generateProjectRoomId,
  generateChatRoomId,
  generateDocumentRoomId,
  generateUniqueId,
  parseRoomId,
  isValidRoomId,
  isValidRoomType,
  isTaskRoom,
  isProjectRoom,
  isChatRoom,
  isDocumentRoom,
  sanitizeRoomUser,
  getTypingUsers,
  isUserTyping,
  getActiveUsers,
  getRoomStats,
  isRoomIdle,
  shouldCleanupRoom,
  getCleanupDelay,
  validateRoomOptions,
  validateRoomJoin,
  createDefaultRoomName,
  truncateRoomName,
  formatRoomAge,
  formatIdleTime,
} from '../collaboration/rooms';
export type { RoomInfo, RoomUserInfo, CreateRoomOptions } from '../collaboration/rooms';

// Utility functions
export { transform, applyOperation, composeOperations } from '../collaboration/manager';
