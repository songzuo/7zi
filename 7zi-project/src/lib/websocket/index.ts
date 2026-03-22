/**
 * WebSocket Service Exports
 *
 * Centralized exports for WebSocket server functionality.
 */

export {
  getServer,
  getStats,
  getRoomInfo,
  getAllRooms,
  broadcastSystemAnnouncement,
  broadcastTaskStatusUpdate,
  broadcastTaskStatusToUser,
} from './server';

export { createServer as createWebSocketServer } from './server';

export type {
  AuthenticatedSocket,
  TaskStatusUpdate,
  RoomUser,
  Room,
} from './server';

export type { WebSocketMessage } from './types';

export { default as useCollaboration } from './useCollaboration';
export type {
  ConnectionState,
  RoomUser as CollaborationRoomUser,
  CollaborationConfig,
  CollaborationState,
  CollaborationActions,
} from './useCollaboration';

export { default as performanceMonitor, PerformanceTimer } from './performance';
export type { PerformanceMetrics, MetricSnapshot } from './performance';

export { throttle, debounce, rafThrottle, Batcher, RateLimiter } from './throttle';

// Export comprehensive type system
export * from './types';
