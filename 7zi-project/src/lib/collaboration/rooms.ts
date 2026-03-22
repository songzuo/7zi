/**
 * Collaboration Rooms
 * Real-time collaboration room management
 * Optimized with message limits and performance improvements
 */

// ============================================================================
// Types
// ============================================================================

export interface Room {
  id: string;
  name: string;
  type: 'document' | 'whiteboard' | 'code' | 'chat';
  ownerId: string;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  type: 'join' | 'leave' | 'message' | 'operation';
  content?: unknown;
  timestamp: Date;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  MAX_MESSAGES_PER_ROOM: 1000, // Limit message history to prevent memory bloat
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Cleanup every 5 minutes
  MAX_AGE_MS: 24 * 60 * 60 * 1000, // Remove messages older than 24 hours
} as const;

// ============================================================================
// In-memory room storage
// ============================================================================

const rooms: Map<string, Room> = new Map();
const roomMessages: Map<string, RoomMessage[]> = new Map();

// ============================================================================
// Room Functions
// ============================================================================

/**
 * Create a new room
 */
export function createRoom(
  name: string,
  type: Room['type'],
  ownerId: string,
  metadata?: Record<string, unknown>
): Room {
  const room: Room = {
    id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    ownerId,
    participants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata,
  };

  rooms.set(room.id, room);
  roomMessages.set(room.id, []);

  return room;
}

/**
 * Get a room by ID
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * Get all rooms for a user
 */
export function getUserRooms(userId: string): Room[] {
  return Array.from(rooms.values()).filter(
    (room) => room.ownerId === userId || room.participants.includes(userId)
  );
}

/**
 * Join a room
 */
export function joinRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) {
    return false;
  }

  if (!room.participants.includes(userId)) {
    room.participants.push(userId);
    room.updatedAt = new Date();
  }

  return true;
}

/**
 * Leave a room
 */
export function leaveRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) {
    return false;
  }

  room.participants = room.participants.filter((id) => id !== userId);
  room.updatedAt = new Date();

  return true;
}

/**
 * Delete a room
 */
export function deleteRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || room.ownerId !== userId) {
    return false;
  }

  rooms.delete(roomId);
  roomMessages.delete(roomId);

  return true;
}

/**
 * Add a message to a room
 */
export function addRoomMessage(
  roomId: string,
  userId: string,
  type: RoomMessage['type'],
  content?: unknown
): RoomMessage | null {
  const room = rooms.get(roomId);
  if (!room) {
    return null;
  }

  const message: RoomMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    userId,
    type,
    content,
    timestamp: new Date(),
  };

  const messages = roomMessages.get(roomId) || [];
  messages.push(message);

  // Enforce message limit to prevent memory bloat
  if (messages.length > CONFIG.MAX_MESSAGES_PER_ROOM) {
    // Remove oldest messages beyond limit
    messages.splice(0, messages.length - CONFIG.MAX_MESSAGES_PER_ROOM);
  }

  roomMessages.set(roomId, messages);

  return message;
}

/**
 * Get messages for a room
 */
export function getRoomMessages(roomId: string, limit?: number): RoomMessage[] {
  const messages = roomMessages.get(roomId) || [];

  if (limit) {
    return messages.slice(-limit);
  }

  return messages;
}

/**
 * Clear messages for a room
 */
export function clearRoomMessages(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) {
    return false;
  }

  roomMessages.set(roomId, []);
  return true;
}

/**
 * Cleanup old messages for all rooms
 */
export function cleanupOldMessages(): { cleaned: number; roomsCleaned: number } {
  let cleaned = 0;
  let roomsCleaned = 0;
  const now = Date.now();

  for (const [roomId, messages] of roomMessages.entries()) {
    const beforeLength = messages.length;

    // Filter out old messages
    const filtered = messages.filter(msg => {
      const age = now - new Date(msg.timestamp).getTime();
      return age < CONFIG.MAX_AGE_MS;
    });

    if (filtered.length !== beforeLength) {
      roomMessages.set(roomId, filtered);
      cleaned += beforeLength - filtered.length;
      roomsCleaned++;
    }
  }

  return { cleaned, roomsCleaned };
}

// ============================================================================
// Room ID Generation
// ============================================================================

/**
 * Generate a task room ID
 */
export function generateTaskRoomId(taskId: string): string {
  return `task:${taskId}`;
}

/**
 * Generate a project room ID
 */
export function generateProjectRoomId(projectId: string): string {
  return `project:${projectId}`;
}

/**
 * Generate a document room ID
 */
export function generateDocumentRoomId(documentId: string): string {
  return `document:${documentId}`;
}

/**
 * Generate a chat room ID
 */
export function generateChatRoomId(chatId: string): string {
  return `chat:${chatId}`;
}

/**
 * Parse a room ID
 */
export function parseRoomId(roomId: string): { type: string; id: string } | null {
  const parts = roomId.split(':');
  if (parts.length !== 2) {
    return null;
  }

  return { type: parts[0], id: parts[1] };
}

/**
 * Check if room is a task room
 */
export function isTaskRoom(roomId: string): boolean {
  return roomId.startsWith('task:');
}

/**
 * Check if room is a project room
 */
export function isProjectRoom(roomId: string): boolean {
  return roomId.startsWith('project:');
}

/**
 * Check if room is a document room
 */
export function isDocumentRoom(roomId: string): boolean {
  return roomId.startsWith('document:');
}

/**
 * Check if room is a chat room
 */
export function isChatRoom(roomId: string): boolean {
  return roomId.startsWith('chat:');
}

/**
 * Check if room type is valid
 */
export function isValidRoomType(type: string): boolean {
  return ['task', 'project', 'document', 'chat'].includes(type);
}

/**
 * Validate room options
 */
export function validateRoomOptions(options: { type?: string; id?: string }): boolean {
  if (!options.type || !options.id) {
    return false;
  }

  return isValidRoomType(options.type);
}

// ============================================================================
// Cleanup Scheduler
// ============================================================================

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cleanup of old messages
 */
export function startCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const result = cleanupOldMessages();
    if (result.cleaned > 0 || result.roomsCleaned > 0) {
      console.log(`[Room Cleanup] Cleaned ${result.cleaned} messages from ${result.roomsCleaned} rooms`);
    }
  }, CONFIG.CLEANUP_INTERVAL_MS);

  console.log('[Room Cleanup] Started periodic cleanup');
}

/**
 * Stop periodic cleanup
 */
export function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[Room Cleanup] Stopped periodic cleanup');
  }
}

// ============================================================================
// Statistics
// ============================================================================

export function getRoomStats() {
  const roomCount = rooms.size;
  let totalMessages = 0;
  let totalParticipants = 0;

  for (const [roomId, messages] of roomMessages.entries()) {
    totalMessages += messages.length;
  }

  for (const room of rooms.values()) {
    totalParticipants += room.participants.length;
  }

  return {
    roomCount,
    totalMessages,
    totalParticipants,
    avgMessagesPerRoom: roomCount > 0 ? totalMessages / roomCount : 0,
    avgParticipantsPerRoom: roomCount > 0 ? totalParticipants / roomCount : 0,
  };
}
