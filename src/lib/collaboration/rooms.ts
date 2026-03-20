/**
 * Room Management Utilities
 *
 * Helper functions for managing collaboration rooms
 */

import { getCollaborationManager } from './manager';
import type { RoomUser, Room } from './server';

// ============================================================================
// Types
// ============================================================================

export interface RoomInfo {
  id: string;
  name: string;
  type: 'task' | 'project' | 'chat' | 'document';
  documentId: string;
  userCount: number;
  users: RoomUserInfo[];
  createdAt: Date;
  lastActivity: Date;
}

export interface RoomUserInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color?: string;
  isTyping?: boolean;
  lastActive: Date;
}

export interface CreateRoomOptions {
  type: 'task' | 'project' | 'chat' | 'document';
  documentId: string;
  name?: string;
}

// ============================================================================
// Room ID Generation
// ============================================================================

/**
 * Generate a room ID for a task
 */
export function generateTaskRoomId(taskId: string): string {
  return `task:${taskId}`;
}

/**
 * Generate a room ID for a project
 */
export function generateProjectRoomId(projectId: string): string {
  return `project:${projectId}`;
}

/**
 * Generate a room ID for a chat
 */
export function generateChatRoomId(chatId: string): string {
  return `chat:${chatId}`;
}

/**
 * Generate a room ID for a document
 */
export function generateDocumentRoomId(documentId: string): string {
  return `document:${documentId}`;
}

/**
 * Generate a unique room ID
 */
export function generateUniqueId(): string {
  return `room:${crypto.randomUUID()}`;
}

// ============================================================================
// Room Type Validation
// ============================================================================

/**
 * Validate room type
 */
export function isValidRoomType(type: string): type is Room['type'] {
  return ['task', 'project', 'chat', 'document'].includes(type);
}

/**
 * Parse room ID to extract type and ID
 */
export function parseRoomId(roomId: string): { type: Room['type']; id: string } | null {
  const parts = roomId.split(':');

  if (parts.length !== 2) {
    return null;
  }

  const [type, id] = parts;

  if (!isValidRoomType(type)) {
    return null;
  }

  return { type, id };
}

/**
 * Check if room ID is valid
 */
export function isValidRoomId(roomId: string): boolean {
  return parseRoomId(roomId) !== null;
}

// ============================================================================
// Room Information
// ============================================================================

/**
 * Get room information from room ID
 */
export function getRoomType(roomId: string): Room['type'] | null {
  const parsed = parseRoomId(roomId);
  return parsed ? parsed.type : null;
}

/**
 * Get entity ID from room ID
 */
export function getEntityId(roomId: string): string | null {
  const parsed = parseRoomId(roomId);
  return parsed ? parsed.id : null;
}

/**
 * Check if room is for a task
 */
export function isTaskRoom(roomId: string): boolean {
  return roomId.startsWith('task:');
}

/**
 * Check if room is for a project
 */
export function isProjectRoom(roomId: string): boolean {
  return roomId.startsWith('project:');
}

/**
 * Check if room is for a chat
 */
export function isChatRoom(roomId: string): boolean {
  return roomId.startsWith('chat:');
}

/**
 * Check if room is for a document
 */
export function isDocumentRoom(roomId: string): boolean {
  return roomId.startsWith('document:');
}

// ============================================================================
// Room User Management
// ============================================================================

/**
 * Convert RoomUser to RoomUserInfo (without sensitive data)
 */
export function sanitizeRoomUser(user: RoomUser): RoomUserInfo {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    color: user.color,
    isTyping: user.isTyping,
    lastActive: new Date(user.lastActive),
  };
}

/**
 * Get users currently typing in a room
 */
export function getTypingUsers(users: RoomUser[]): RoomUser[] {
  return users.filter(user => user.isTyping);
}

/**
 * Check if a user is currently typing
 */
export function isUserTyping(userId: string, users: RoomUser[]): boolean {
  const user = users.find(u => u.id === userId);
  return user?.isTyping || false;
}

/**
 * Get active users (active in last 5 minutes)
 */
export function getActiveUsers(users: RoomUserInfo[]): RoomUserInfo[] {
  const threshold = Date.now() - 5 * 60 * 1000;
  return users.filter(user => user.lastActive.getTime() > threshold);
}

// ============================================================================
// Room Statistics
// ============================================================================

/**
 * Get room statistics
 */
export function getRoomStats(room: RoomInfo) {
  const typingUsers = room.users.filter(u => u.isTyping);
  const activeUsers = getActiveUsers(room.users);

  return {
    totalUsers: room.userCount,
    typingUsers: typingUsers.length,
    activeUsers: activeUsers.length,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
    idleTime: Date.now() - room.lastActivity.getTime(),
  };
}

/**
 * Check if room is idle (no activity for 30 minutes)
 */
export function isRoomIdle(room: RoomInfo): boolean {
  const threshold = Date.now() - 30 * 60 * 1000;
  return room.lastActivity.getTime() < threshold;
}

/**
 * Check if room should be cleaned up (idle for 1 hour and no users)
 */
export function shouldCleanupRoom(room: RoomInfo): boolean {
  return isRoomIdle(room) && room.userCount === 0;
}

// ============================================================================
// Room Cleanup
// ============================================================================

/**
 * Calculate cleanup delay based on room type
 */
export function getCleanupDelay(roomType: Room['type']): number {
  switch (roomType) {
    case 'task':
      return 30 * 60 * 1000; // 30 minutes
    case 'chat':
      return 60 * 60 * 1000; // 1 hour
    case 'document':
      return 30 * 60 * 1000; // 30 minutes
    case 'project':
      return 24 * 60 * 60 * 1000; // 24 hours (persistent)
    default:
      return 30 * 60 * 1000;
  }
}

// ============================================================================
// Room Validation
// ============================================================================

/**
 * Validate room creation options
 */
export function validateRoomOptions(options: CreateRoomOptions): { valid: boolean; error?: string } {
  if (!options.type) {
    return { valid: false, error: 'Room type is required' };
  }

  if (!isValidRoomType(options.type)) {
    return { valid: false, error: `Invalid room type: ${options.type}` };
  }

  if (!options.documentId) {
    return { valid: false, error: 'Document ID is required' };
  }

  if (options.documentId.length > 500) {
    return { valid: false, error: 'Document ID too long' };
  }

  if (options.name && options.name.length > 200) {
    return { valid: false, error: 'Room name too long' };
  }

  return { valid: true };
}

/**
 * Validate user room join request
 */
export function validateRoomJoin(
  userId: string,
  roomId: string,
  token: string
): { valid: boolean; error?: string } {
  if (!userId) {
    return { valid: false, error: 'User ID is required' };
  }

  if (!roomId) {
    return { valid: false, error: 'Room ID is required' };
  }

  if (!isValidRoomId(roomId)) {
    return { valid: false, error: 'Invalid room ID format' };
  }

  if (!token) {
    return { valid: false, error: 'Authentication token is required' };
  }

  if (token.length < 10) {
    return { valid: false, error: 'Invalid token format' };
  }

  return { valid: true };
}

// ============================================================================
// Room Helpers
// ============================================================================

/**
 * Create a default room name based on type and ID
 */
export function createDefaultRoomName(type: Room['type'], id: string): string {
  const names: Record<Room['type'], string> = {
    task: `Task ${id}`,
    project: `Project ${id}`,
    chat: `Chat ${id}`,
    document: `Document ${id}`,
  };

  return names[type] || `Room ${id}`;
}

/**
 * Truncate room name for display
 */
export function truncateRoomName(name: string, maxLength = 50): string {
  if (name.length <= maxLength) {
    return name;
  }

  return `${name.slice(0, maxLength - 3)}...`;
}

/**
 * Format room age for display
 */
export function formatRoomAge(createdAt: Date): string {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

/**
 * Format idle time for display
 */
export function formatIdleTime(lastActivity: Date): string {
  const now = new Date();
  const diff = now.getTime() - lastActivity.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) {
    return 'Active now';
  } else if (minutes < 5) {
    return 'Active recently';
  } else if (minutes < 60) {
    return `Idle for ${minutes}m`;
  } else if (hours < 24) {
    return `Idle for ${hours}h`;
  } else {
    return 'Idle';
  }
}

// ============================================================================
// Export helpers
// ============================================================================

export const RoomHelpers = {
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
};

export default RoomHelpers;
