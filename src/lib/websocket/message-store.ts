/**
 * WebSocket Message Store
 *
 * In-memory message storage with offline message queue and history query
 * Supports persistence and retrieval of room messages
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Message Types
// ============================================================================

/**
 * Stored message with metadata
 */
export interface StoredMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  type: string;
  content?: string;
  payload?: unknown;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  reactions?: MessageReaction[];
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message reaction
 */
export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

/**
 * Offline message queue entry
 */
export interface OfflineMessage {
  userId: string;
  message: StoredMessage;
  queuedAt: Date;
  expiresAt: Date;
  delivered?: boolean;
  deliveredAt?: Date;
}

/**
 * Message history query options
 */
export interface MessageHistoryOptions {
  roomId: string;
  before?: Date;
  after?: Date;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  userId?: string; // Filter by specific user
  type?: string; // Filter by message type
}

/**
 * Message store statistics
 */
export interface MessageStoreStats {
  totalMessages: number;
  messagesPerRoom: { [roomId: string]: number };
  totalOfflineMessages: number;
  offlineUsers: number;
  oldestMessage?: Date;
  newestMessage?: Date;
}

// ============================================================================
// Message Store Class
// ============================================================================

export class MessageStore {
  // In-memory storage
  private messages: Map<string, Map<string, StoredMessage>> = new Map(); // roomId -> messageId -> message
  private offlineQueue: Map<string, OfflineMessage[]> = new Map(); // userId -> messages
  private messageIndex: Map<string, Set<string>> = new Map(); // userId -> Set of messageIds

  // Configuration
  private maxHistorySize: number;
  private offlineMessageTTL: number; // Time to live in milliseconds
  private maxOfflineMessages: number;

  constructor(config?: {
    maxHistorySize?: number;
    offlineMessageTTL?: number;
    maxOfflineMessages?: number;
  }) {
    this.maxHistorySize = config?.maxHistorySize ?? 10000; // Max messages per room
    this.offlineMessageTTL = config?.offlineMessageTTL ?? 7 * 24 * 60 * 60 * 1000; // 7 days
    this.maxOfflineMessages = config?.maxOfflineMessages ?? 100; // Max offline messages per user
  }

  /**
   * Store a message
   */
  store(message: Omit<StoredMessage, 'timestamp'> & { timestamp?: Date }): StoredMessage {
    const { id, roomId, timestamp = new Date(), ...rest } = message;

    // Get or create room messages
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, new Map());
    }

    const roomMessages = this.messages.get(roomId)!;

    // Don't store if maxHistorySize is 0
    if (this.maxHistorySize === 0) {
      throw new Error('Cannot store message: maxHistorySize is 0');
    }

    // Check history size limit
    if (roomMessages.size >= this.maxHistorySize) {
      this.evictOldestMessage(roomId);
    }

    // Create stored message
    const storedMessage: StoredMessage = {
      id,
      roomId,
      timestamp,
      ...rest,
    };

    // Store message
    roomMessages.set(id, storedMessage);

    // Update user index
    if (!this.messageIndex.has(storedMessage.userId)) {
      this.messageIndex.set(storedMessage.userId, new Set());
    }
    this.messageIndex.get(storedMessage.userId)!.add(id);

    logger.debug('Message stored', {
      messageId: id,
      roomId,
      userId: storedMessage.userId,
      type: storedMessage.type,
    });

    return storedMessage;
  }

  /**
   * Get a message by ID
   */
  get(messageId: string): StoredMessage | undefined {
    for (const roomMessages of this.messages.values()) {
      const message = roomMessages.get(messageId);
      if (message) {
        return message;
      }
    }
    return undefined;
  }

  /**
   * Get a message by ID and room
   */
  getInRoom(roomId: string, messageId: string): StoredMessage | undefined {
    const roomMessages = this.messages.get(roomId);
    return roomMessages?.get(messageId);
  }

  /**
   * Edit a message
   */
  edit(messageId: string, content: string, editedBy: string): StoredMessage | undefined {
    const message = this.get(messageId);
    
    if (!message) {
      return undefined;
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();

    logger.debug('Message edited', {
      messageId,
      userId: message.userId,
      editedBy,
    });

    return message;
  }

  /**
   * Delete a message (soft delete)
   */
  delete(messageId: string, deletedBy: string): boolean {
    const message = this.get(messageId);
    
    if (!message) {
      return false;
    }

    // Soft delete by marking metadata
    message.metadata = message.metadata ?? {};
    message.metadata.deleted = true;
    message.metadata.deletedAt = new Date().toISOString();
    message.metadata.deletedBy = deletedBy;

    logger.debug('Message deleted', {
      messageId,
      userId: message.userId,
      deletedBy,
    });

    return true;
  }

  /**
   * Permanently remove a message
   */
  remove(messageId: string): boolean {
    for (const [roomId, roomMessages] of this.messages.entries()) {
      if (roomMessages.has(messageId)) {
        const message = roomMessages.get(messageId)!;
        
        // Remove from user index
        const userMessages = this.messageIndex.get(message.userId);
        if (userMessages) {
          userMessages.delete(messageId);
        }

        // Remove from room
        roomMessages.delete(messageId);

        logger.debug('Message permanently removed', {
          messageId,
          roomId,
          userId: message.userId,
        });

        return true;
      }
    }
    return false;
  }

  /**
   * Add reaction to a message
   */
  addReaction(messageId: string, emoji: string, userId: string, userName: string): boolean {
    const message = this.get(messageId);
    if (!message) return false;

    if (!message.reactions) {
      message.reactions = [];
    }

    // Remove existing reaction from same user
    message.reactions = message.reactions.filter(r => r.userId !== userId);

    // Add new reaction
    message.reactions.push({
      emoji,
      userId,
      userName,
      timestamp: new Date(),
    });

    logger.debug('Reaction added', {
      messageId,
      emoji,
      userId,
      userName,
    });

    return true;
  }

  /**
   * Remove reaction from a message
   */
  removeReaction(messageId: string, emoji: string, userId: string): boolean {
    const message = this.get(messageId);
    if (!message || !message.reactions) return false;

    const beforeCount = message.reactions.length;
    message.reactions = message.reactions.filter(r => !(r.emoji === emoji && r.userId === userId));

    return message.reactions.length < beforeCount;
  }

  /**
   * Pin a message
   */
  pin(messageId: string, pinnedBy: string): boolean {
    const message = this.get(messageId);
    if (!message) return false;

    message.pinned = true;
    message.pinnedBy = pinnedBy;
    message.pinnedAt = new Date();

    logger.debug('Message pinned', {
      messageId,
      pinnedBy,
    });

    return true;
  }

  /**
   * Unpin a message
   */
  unpin(messageId: string): boolean {
    const message = this.get(messageId);
    if (!message) return false;

    message.pinned = false;
    message.pinnedBy = undefined;
    message.pinnedAt = undefined;

    logger.debug('Message unpinned', { messageId });

    return true;
  }

  /**
   * Get message history
   */
  getHistory(options: MessageHistoryOptions): StoredMessage[] {
    const { roomId, before, after, limit = 50, offset = 0, includeDeleted = false, userId, type } = options;

    // Handle invalid limit values
    if (limit <= 0 || offset < 0) {
      return [];
    }

    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) {
      return [];
    }

    // Get all messages and sort by timestamp
    let messages = Array.from(roomMessages.values())
      .filter(message => {
        // Filter deleted messages
        if (!includeDeleted && message.metadata?.deleted) {
          return false;
        }

        // Filter by timestamp
        if (before && message.timestamp >= before) {
          return false;
        }
        if (after && message.timestamp <= after) {
          return false;
        }

        // Filter by user
        if (userId && message.userId !== userId) {
          return false;
        }

        // Filter by type
        if (type && message.type !== type) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply offset and limit
    messages = messages.slice(offset, offset + limit);

    return messages;
  }

  /**
   * Get pinned messages for a room
   */
  getPinnedMessages(roomId: string): StoredMessage[] {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages) {
      return [];
    }

    return Array.from(roomMessages.values())
      .filter(message => message.pinned && !message.metadata?.deleted)
      .sort((a, b) => (a.pinnedAt?.getTime() ?? 0) - (b.pinnedAt?.getTime() ?? 0));
  }

  /**
   * Get messages for a user
   */
  getUserMessages(userId: string, limit = 100): StoredMessage[] {
    const messageIds = this.messageIndex.get(userId);
    if (!messageIds) {
      return [];
    }

    const messages: StoredMessage[] = [];
    for (const messageId of messageIds) {
      const message = this.get(messageId);
      if (message && !message.metadata?.deleted) {
        messages.push(message);
      }
    }

    // Sort by timestamp (newest first)
    messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return messages.slice(0, limit);
  }

  /**
   * Queue message for offline user
   */
  queueOfflineMessage(userId: string, message: StoredMessage): void {
    if (!this.offlineQueue.has(userId)) {
      this.offlineQueue.set(userId, []);
    }

    const queue = this.offlineQueue.get(userId)!;
    const expiresAt = new Date(Date.now() + this.offlineMessageTTL);

    const offlineMessage: OfflineMessage = {
      userId,
      message,
      queuedAt: new Date(),
      expiresAt,
    };

    // Check queue size limit
    if (queue.length >= this.maxOfflineMessages) {
      // Remove oldest message
      queue.shift();
    }

    queue.push(offlineMessage);

    logger.debug('Message queued for offline user', {
      userId,
      messageId: message.id,
      queueSize: queue.length,
    });
  }

  /**
   * Get offline messages for a user
   */
  getOfflineMessages(userId: string): OfflineMessage[] {
    const queue = this.offlineQueue.get(userId);
    if (!queue) {
      return [];
    }

    // Filter out expired and delivered messages
    const now = new Date();
    const validMessages = queue.filter(msg => msg.expiresAt > now && !msg.delivered);

    // Update queue
    this.offlineQueue.set(userId, validMessages);

    return validMessages;
  }

  /**
   * Clear offline messages for a user (after delivery)
   */
  clearOfflineMessages(userId: string): void {
    this.offlineQueue.delete(userId);
    logger.debug('Offline messages cleared', { userId });
  }

  /**
   * Mark offline message as delivered
   */
  markOfflineMessageDelivered(userId: string, messageId: string): void {
    const queue = this.offlineQueue.get(userId);
    if (!queue) return;

    const msg = queue.find(m => m.message.id === messageId);
    if (msg) {
      msg.delivered = true;
      msg.deliveredAt = new Date();
    }
  }

  /**
   * Get statistics
   */
  getStats(): MessageStoreStats {
    const totalMessages = Array.from(this.messages.values())
      .reduce((acc, room) => acc + room.size, 0);

    const messagesPerRoom: { [roomId: string]: number } = {};
    this.messages.forEach((roomMessages, roomId) => {
      messagesPerRoom[roomId] = roomMessages.size;
    });

    const totalOfflineMessages = Array.from(this.offlineQueue.values())
      .reduce((acc, queue) => acc + queue.length, 0);

    let oldestMessage: Date | undefined;
    let newestMessage: Date | undefined;

    for (const roomMessages of this.messages.values()) {
      for (const message of roomMessages.values()) {
        if (!oldestMessage || message.timestamp < oldestMessage) {
          oldestMessage = message.timestamp;
        }
        if (!newestMessage || message.timestamp > newestMessage) {
          newestMessage = message.timestamp;
        }
      }
    }

    return {
      totalMessages,
      messagesPerRoom,
      totalOfflineMessages,
      offlineUsers: this.offlineQueue.size,
      oldestMessage,
      newestMessage,
    };
  }

  /**
   * Clear all messages for a room
   */
  clearRoom(roomId: string): void {
    const roomMessages = this.messages.get(roomId);
    if (roomMessages) {
      // Remove from user index
      for (const message of roomMessages.values()) {
        const userMessages = this.messageIndex.get(message.userId);
        if (userMessages) {
          for (const messageId of userMessages) {
            if (messageId === message.id) {
              userMessages.delete(messageId);
            }
          }
        }
      }

      this.messages.delete(roomId);
      logger.info('Room messages cleared', { roomId });
    }
  }

  /**
   * Evict oldest message from room (for size limit)
   */
  private evictOldestMessage(roomId: string): void {
    const roomMessages = this.messages.get(roomId);
    if (!roomMessages || roomMessages.size === 0) return;

    // Find oldest message
    let oldestMessage: StoredMessage | undefined;
    for (const message of roomMessages.values()) {
      if (!oldestMessage || message.timestamp < oldestMessage.timestamp) {
        oldestMessage = message;
      }
    }

    if (oldestMessage) {
      this.remove(oldestMessage.id);
      logger.debug('Oldest message evicted', {
        roomId,
        messageId: oldestMessage.id,
      });
    }
  }

  /**
   * Clean up expired offline messages
   */
  cleanupExpiredOfflineMessages(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [userId, queue] of this.offlineQueue.entries()) {
      const beforeLength = queue.length;
      
      // Filter out expired and delivered messages
      const validMessages = queue.filter(
        msg => msg.expiresAt > now && !msg.delivered
      );

      if (validMessages.length < beforeLength) {
        this.offlineQueue.set(userId, validMessages);
        cleaned += (beforeLength - validMessages.length);
      }

      // Remove empty queues
      if (validMessages.length === 0) {
        this.offlineQueue.delete(userId);
      }
    }

    if (cleaned > 0) {
      logger.info('Expired offline messages cleaned', { count: cleaned });
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let messageStoreInstance: MessageStore | null = null;

export function getMessageStore(config?: {
  maxHistorySize?: number;
  offlineMessageTTL?: number;
  maxOfflineMessages?: number;
}): MessageStore {
  if (!messageStoreInstance) {
    messageStoreInstance = new MessageStore(config);
  }
  return messageStoreInstance;
}

export function resetMessageStore(): void {
  messageStoreInstance = null;
}
