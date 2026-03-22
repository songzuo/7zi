/**
 * Room ID generation and validation utilities
 */

// ============================================================================
// Room Type Validation
// ============================================================================

export const ROOM_TYPES = ['document', 'whiteboard', 'code', 'chat', 'task', 'project'] as const;
export type RoomType = typeof ROOM_TYPES[number];

/**
 * Check if a string is a valid room type
 */
export function isValidRoomType(type: string): type is RoomType {
  return ROOM_TYPES.includes(type as RoomType);
}

/**
 * Check if room is a document room
 */
export function isDocumentRoom(roomId: string): boolean {
  return roomId.startsWith('doc-');
}

/**
 * Check if room is a chat room
 */
export function isChatRoom(roomId: string): boolean {
  return roomId.startsWith('chat-');
}

/**
 * Check if room is a task room
 */
export function isTaskRoom(roomId: string): boolean {
  return roomId.startsWith('task-');
}

/**
 * Check if room is a project room
 */
export function isProjectRoom(roomId: string): boolean {
  return roomId.startsWith('proj-');
}

// ============================================================================
// Room ID Generation
// ============================================================================

/**
 * Generate a task room ID
 */
export function generateTaskRoomId(taskId: string): string {
  return `task-${taskId}`;
}

/**
 * Generate a project room ID
 */
export function generateProjectRoomId(projectId: string): string {
  return `proj-${projectId}`;
}

/**
 * Generate a document room ID
 */
export function generateDocumentRoomId(docId: string): string {
  return `doc-${docId}`;
}

/**
 * Generate a chat room ID
 */
export function generateChatRoomId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `chat-${sorted[0]}-${sorted[1]}`;
}

// ============================================================================
// Room ID Parsing
// ============================================================================

/**
 * Parse a room ID to extract type and ID
 */
export function parseRoomId(roomId: string): {
  type: RoomType | 'unknown';
  id: string;
} | null {
  const parts = roomId.split('-');

  if (parts.length < 2) {
    return null;
  }

  const type = parts[0];
  const id = parts.slice(1).join('-');

  if (!isValidRoomType(type)) {
    return { type: 'unknown', id };
  }

  return { type, id };
}

// ============================================================================
// Room Options Validation
// ============================================================================

export interface RoomOptions {
  name?: string;
  type?: RoomType;
  maxParticipants?: number;
  password?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validate room creation options
 */
export function validateRoomOptions(options: RoomOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.type || !isValidRoomType(options.type)) {
    errors.push(`Invalid room type. Must be one of: ${ROOM_TYPES.join(', ')}`);
  }

  if (options.maxParticipants && (options.maxParticipants < 2 || options.maxParticipants > 100)) {
    errors.push('Max participants must be between 2 and 100');
  }

  if (options.name && options.name.length > 100) {
    errors.push('Room name must be less than 100 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
