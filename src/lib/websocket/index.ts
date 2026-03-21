/**
 * WebSocket Service Exports
 *
 * Centralized exports for WebSocket server functionality.
 */

export {
  createServer,
  getServer,
  getStats,
  getRoomInfo,
  getAllRooms,
  broadcastSystemAnnouncement,
  broadcastTaskStatusUpdate,
  broadcastTaskStatusToUser,
} from './server';

export type {
  AuthenticatedSocket,
  Room,
  RoomUser,
  WebSocketMessage,
  TaskStatusUpdate,
} from './server';

export { default as useCollaboration } from './useCollaboration';
export type {
  ConnectionState,
  RoomUser as CollaborationRoomUser,
  CollaborationConfig,
  CollaborationState,
  CollaborationActions,
} from './useCollaboration';
