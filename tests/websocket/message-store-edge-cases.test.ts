/**
 * WebSocket Message Store - Edge Cases & Boundary Tests
 * Tests for src/lib/websocket/message-store.ts
 *
 * Focus: Boundary conditions, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MessageStore,
  resetMessageStore,
  getMessageStore,
  type StoredMessage,
  type OfflineMessage,
  type MessageHistoryOptions,
} from '@/lib/websocket/message-store';

describe('MessageStore - Edge Cases & Boundary Tests', () => {
  let messageStore: MessageStore;
  let roomId: string;
  let userId: string;

  beforeEach(() => {
    // Reset singleton
    resetMessageStore();

    // Create fresh message store
    messageStore = new MessageStore();

    // Set up test data
    roomId = 'test-room-1';
    userId = 'user-1';
  });

  afterEach(() => {
    resetMessageStore();
  });

  // ============================================================================
  // Message Storage Edge Cases
  // ============================================================================

  describe('Message Storage - Edge Cases', () => {
    it('should store message with empty content', () => {
      const message = messageStore.store({
        id: 'msg-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: '',
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('');
    });

    it('should store message with very long content', () => {
      const longContent = 'A'.repeat(1000000); // 1 MB

      const message = messageStore.store({
        id: 'msg-long',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: longContent,
      });

      expect(message).toBeDefined();
      expect(message.content).toBe(longContent);
    });

    it('should store message with special characters', () => {
      const specialContent = '特殊字符 🎉\n\t\r<script>alert("xss")</script>';

      const message = messageStore.store({
        id: 'msg-special',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: specialContent,
      });

      expect(message).toBeDefined();
      expect(message.content).toBe(specialContent);
    });

    it('should store message without content', () => {
      const message = messageStore.store({
        id: 'msg-no-content',
        roomId,
        userId,
        userName: 'User 1',
        type: 'presence',
      });

      expect(message).toBeDefined();
      expect(message.content).toBeUndefined();
    });

    it('should store message with payload instead of content', () => {
      const payload = { data: { nested: { value: 123 } } };

      const message = messageStore.store({
        id: 'msg-payload',
        roomId,
        userId,
        userName: 'User 1',
        type: 'custom',
        payload,
      });

      expect(message).toBeDefined();
      expect(message.payload).toEqual(payload);
    });

    it('should store message with both content and payload', () => {
      const message = messageStore.store({
        id: 'msg-both',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Hello',
        payload: { extra: 'data' },
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello');
      expect(message.payload).toEqual({ extra: 'data' });
    });

    it('should store message with metadata', () => {
      const metadata = {
        replyTo: 'msg-0',
        edited: false,
        attachments: ['file1.pdf'],
      };

      const message = messageStore.store({
        id: 'msg-metadata',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Test',
        metadata,
      });

      expect(message).toBeDefined();
      expect(message.metadata).toEqual(metadata);
    });

    it('should handle storing message with same ID multiple times', () => {
      // First store
      messageStore.store({
        id: 'msg-duplicate',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'First',
      });

      // Second store with same ID (should overwrite)
      messageStore.store({
        id: 'msg-duplicate',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Second',
      });

      const message = messageStore.get('msg-duplicate');

      expect(message).toBeDefined();
      expect(message?.content).toBe('Second');
    });

    it('should handle storing message with custom timestamp', () => {
      const customTimestamp = new Date('2020-01-01');

      const message = messageStore.store({
        id: 'msg-custom-time',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Test',
        timestamp: customTimestamp,
      });

      expect(message).toBeDefined();
      expect(message.timestamp).toEqual(customTimestamp);
    });

    it('should handle storing message with future timestamp', () => {
      const futureTimestamp = new Date('2099-12-31');

      const message = messageStore.store({
        id: 'msg-future-time',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Test',
        timestamp: futureTimestamp,
      });

      expect(message).toBeDefined();
      expect(message.timestamp).toEqual(futureTimestamp);
    });
  });

  // ============================================================================
  // Message Retrieval Edge Cases
  // ============================================================================

  describe('Message Retrieval - Edge Cases', () => {
    it('should return undefined for non-existent message', () => {
      const message = messageStore.get('non-existent-msg');

      expect(message).toBeUndefined();
    });

    it('should return undefined for message in non-existent room', () => {
      const message = messageStore.getInRoom('non-existent-room', 'msg-1');

      expect(message).toBeUndefined();
    });

    it('should handle retrieving message with empty ID', () => {
      const message = messageStore.get('');

      expect(message).toBeUndefined();
    });

    it('should handle special characters in message ID', () => {
      const specialIds = [
        'msg-with-dashes',
        'msg_with_underscores',
        'msg.with.dots',
        'msg:with:colons',
        '消息中文id',
        'msg-with-emoji-🎉',
      ];

      specialIds.forEach((id) => {
        messageStore.store({
          id,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: 'Test',
        });

        const message = messageStore.get(id);
        expect(message).toBeDefined();
        expect(message?.id).toBe(id);
      });
    });
  });

  // ============================================================================
  // Message Editing Edge Cases
  // ============================================================================

  describe('Message Editing - Edge Cases', () => {
    beforeEach(() => {
      messageStore.store({
        id: 'msg-edit',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Original',
      });
    });

    it('should edit message to empty content', () => {
      const result = messageStore.edit('msg-edit', '', 'user-1');

      expect(result).toBeDefined();
      expect(result?.content).toBe('');
      expect(result?.edited).toBe(true);
    });

    it('should edit message to very long content', () => {
      const longContent = 'A'.repeat(1000000);

      const result = messageStore.edit('msg-edit', longContent, 'user-1');

      expect(result).toBeDefined();
      expect(result?.content).toBe(longContent);
    });

    it('should edit message with special characters', () => {
      const specialContent = '特殊字符 🎉\n\t\r<script>alert("xss")</script>';

      const result = messageStore.edit('msg-edit', specialContent, 'user-1');

      expect(result).toBeDefined();
      expect(result?.content).toBe(specialContent);
    });

    it('should return undefined when editing non-existent message', () => {
      const result = messageStore.edit('non-existent-msg', 'New content', 'user-1');

      expect(result).toBeUndefined();
    });

    it('should handle editing same message multiple times', () => {
      // First edit
      messageStore.edit('msg-edit', 'Version 1', 'user-1');
      const message1 = messageStore.get('msg-edit');
      expect(message1?.content).toBe('Version 1');

      // Second edit
      messageStore.edit('msg-edit', 'Version 2', 'user-1');
      const message2 = messageStore.get('msg-edit');
      expect(message2?.content).toBe('Version 2');

      // Third edit
      messageStore.edit('msg-edit', 'Version 3', 'user-1');
      const message3 = messageStore.get('msg-edit');
      expect(message3?.content).toBe('Version 3');
    });

    it('should set edited timestamp correctly', () => {
      vi.useFakeTimers();

      messageStore.edit('msg-edit', 'Edited 1', 'user-1');
      const timestamp1 = messageStore.get('msg-edit')?.editedAt;
      expect(timestamp1).toBeDefined();

      vi.advanceTimersByTime(1000);

      messageStore.edit('msg-edit', 'Edited 2', 'user-1');
      const timestamp2 = messageStore.get('msg-edit')?.editedAt;
      expect(timestamp2).toBeDefined();
      expect(timestamp2?.getTime()).toBeGreaterThan(timestamp1?.getTime() || 0);

      vi.useRealTimers();
    });

    it('should handle concurrent edits to same message', () => {
      const editCount = 10;

      for (let i = 0; i < editCount; i++) {
        messageStore.edit('msg-edit', `Version ${i}`, 'user-1');
      }

      const message = messageStore.get('msg-edit');
      expect(message?.content).toBe(`Version ${editCount - 1}`);
    });
  });

  // ============================================================================
  // Message Deletion Edge Cases
  // ============================================================================

  describe('Message Deletion - Edge Cases', () => {
    beforeEach(() => {
      messageStore.store({
        id: 'msg-delete',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'To be deleted',
      });
    });

    it('should soft delete message', () => {
      const result = messageStore.delete('msg-delete', 'user-1');

      expect(result).toBe(true);

      const message = messageStore.get('msg-delete');
      expect(message).toBeDefined();
      expect(message?.metadata?.deleted).toBe(true);
      expect(message?.metadata?.deletedAt).toBeDefined();
      expect(message?.metadata?.deletedBy).toBe('user-1');
    });

    it('should return false when deleting non-existent message', () => {
      const result = messageStore.delete('non-existent-msg', 'user-1');

      expect(result).toBe(false);
    });

    it('should handle deleting same message multiple times', () => {
      const result1 = messageStore.delete('msg-delete', 'user-1');
      expect(result1).toBe(true);

      const result2 = messageStore.delete('msg-delete', 'user-1');
      expect(result2).toBe(true); // Still true (metadata is updated)
    });

    it('should permanently remove message', () => {
      const result = messageStore.remove('msg-delete');

      expect(result).toBe(true);

      const message = messageStore.get('msg-delete');
      expect(message).toBeUndefined();
    });

    it('should return false when removing non-existent message', () => {
      const result = messageStore.remove('non-existent-msg');

      expect(result).toBe(false);
    });

    it('should handle soft delete then permanent remove', () => {
      messageStore.delete('msg-delete', 'user-1');
      expect(messageStore.get('msg-delete')?.metadata?.deleted).toBe(true);

      messageStore.remove('msg-delete');
      expect(messageStore.get('msg-delete')).toBeUndefined();
    });
  });

  // ============================================================================
  // Message History Edge Cases
  // ============================================================================

  describe('Message History - Edge Cases', () => {
    beforeEach(() => {
      // Store multiple messages
      for (let i = 1; i <= 10; i++) {
        messageStore.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
        });
      }
    });

    it('should return empty array for non-existent room', () => {
      const history = messageStore.getHistory({
        roomId: 'non-existent-room',
      });

      expect(history).toEqual([]);
    });

    it('should handle limit of 0', () => {
      const history = messageStore.getHistory({
        roomId,
        limit: 0,
      });

      expect(history).toEqual([]);
    });

    it('should handle negative limit', () => {
      const history = messageStore.getHistory({
        roomId,
        limit: -5,
      });

      expect(history).toEqual([]);
    });

    it('should handle very large limit', () => {
      const history = messageStore.getHistory({
        roomId,
        limit: Number.MAX_SAFE_INTEGER,
      });

      expect(history.length).toBe(10); // Only 10 messages exist
    });

    it('should handle large offset', () => {
      const history = messageStore.getHistory({
        roomId,
        offset: 100,
      });

      expect(history).toEqual([]);
    });

    it('should filter by user ID', () => {
      // Add messages from another user
      messageStore.store({
        id: 'msg-user-2-1',
        roomId,
        userId: 'user-2',
        userName: 'User 2',
        type: 'chat',
        content: 'From user 2',
      });

      messageStore.store({
        id: 'msg-user-2-2',
        roomId,
        userId: 'user-2',
        userName: 'User 2',
        type: 'chat',
        content: 'Also from user 2',
      });

      const history = messageStore.getHistory({
        roomId,
        userId: 'user-2',
      });

      expect(history.length).toBe(2);
      expect(history.every((m) => m.userId === 'user-2')).toBe(true);
    });

    it('should filter by message type', () => {
      // Add messages of different types
      messageStore.store({
        id: 'msg-presence-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'presence',
      });

      messageStore.store({
        id: 'msg-system-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'system',
      });

      const history = messageStore.getHistory({
        roomId,
        type: 'presence',
      });

      expect(history.length).toBe(1);
      expect(history[0].type).toBe('presence');
    });

    it('should include deleted messages when requested', () => {
      messageStore.delete('msg-1', 'user-1');

      const history = messageStore.getHistory({
        roomId,
        includeDeleted: true,
      });

      expect(history.some((m) => m.id === 'msg-1')).toBe(true);
    });

    it('should exclude deleted messages by default', () => {
      messageStore.delete('msg-1', 'user-1');

      const history = messageStore.getHistory({
        roomId,
      });

      expect(history.some((m) => m.id === 'msg-1')).toBe(false);
    });

    it('should combine multiple filters', () => {
      // Add more messages
      messageStore.store({
        id: 'msg-presence-1',
        roomId,
        userId: 'user-2',
        userName: 'User 2',
        type: 'presence',
      });

      const history = messageStore.getHistory({
        roomId,
        userId: 'user-2',
        type: 'presence',
      });

      expect(history.length).toBe(1);
      expect(history[0].userId).toBe('user-2');
      expect(history[0].type).toBe('presence');
    });
  });

  // ============================================================================
  // Offline Messages Edge Cases
  // ============================================================================

  describe('Offline Messages - Edge Cases', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should queue message for offline user', () => {
      const offlineMessage: StoredMessage = {
        id: 'offline-msg-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Offline message',
        timestamp: new Date(),
      };

      messageStore.queueOfflineMessage('offline-user', offlineMessage);

      const queued = messageStore.getOfflineMessages('offline-user');

      expect(queued.length).toBe(1);
      expect(queued[0].message.id).toBe('offline-msg-1');
    });

    it('should queue multiple messages for offline user', () => {
      const messageCount = 10;

      for (let i = 1; i <= messageCount; i++) {
        const offlineMessage: StoredMessage = {
          id: `offline-msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
          timestamp: new Date(),
        };

        messageStore.queueOfflineMessage('offline-user', offlineMessage);
      }

      const queued = messageStore.getOfflineMessages('offline-user');

      expect(queued.length).toBe(messageCount);
    });

    it('should handle queueing more than max offline messages', () => {
      const store = new MessageStore({ maxOfflineMessages: 5 });

      for (let i = 1; i <= 10; i++) {
        const offlineMessage: StoredMessage = {
          id: `offline-msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
          timestamp: new Date(),
        };

        store.queueOfflineMessage('offline-user', offlineMessage);
      }

      const queued = store.getOfflineMessages('offline-user');

      expect(queued.length).toBe(5);
      // Oldest messages should be evicted
      expect(queued[0].message.id).toBe('offline-msg-6');
    });

    it('should expire offline messages after TTL', () => {
      const store = new MessageStore({ offlineMessageTTL: 1000 }); // 1 second

      const offlineMessage: StoredMessage = {
        id: 'offline-msg-expire',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Will expire',
        timestamp: new Date(),
      };

      store.queueOfflineMessage('offline-user', offlineMessage);

      // Advance time past TTL
      vi.advanceTimersByTime(1100);

      const queued = store.getOfflineMessages('offline-user');

      expect(queued.length).toBe(0);
    });

    it('should not expire offline messages before TTL', () => {
      const store = new MessageStore({ offlineMessageTTL: 1000 }); // 1 second

      const offlineMessage: StoredMessage = {
        id: 'offline-msg-not-expire',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Will not expire yet',
        timestamp: new Date(),
      };

      store.queueOfflineMessage('offline-user', offlineMessage);

      // Advance time but not past TTL
      vi.advanceTimersByTime(500);

      const queued = store.getOfflineMessages('offline-user');

      expect(queued.length).toBe(1);
    });

    it('should clear offline messages for user', () => {
      const offlineMessage: StoredMessage = {
        id: 'offline-msg-clear',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'To be cleared',
        timestamp: new Date(),
      };

      messageStore.queueOfflineMessage('offline-user', offlineMessage);

      messageStore.clearOfflineMessages('offline-user');

      const queued = messageStore.getOfflineMessages('offline-user');

      expect(queued.length).toBe(0);
    });

    it('should handle clearing offline messages for non-existent user', () => {
      // Should not throw error
      messageStore.clearOfflineMessages('non-existent-user');

      expect(true).toBe(true);
    });

    it('should mark offline message as delivered', () => {
      const offlineMessage: StoredMessage = {
        id: 'offline-msg-delivered',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'To be delivered',
        timestamp: new Date(),
      };

      messageStore.queueOfflineMessage('offline-user', offlineMessage);

      messageStore.markOfflineMessageDelivered('offline-user', 'offline-msg-delivered');

      const queued = messageStore.getOfflineMessages('offline-user');

      // Delivered messages should be filtered out in getOfflineMessages
      expect(queued.length).toBe(0);
    });

    it('should handle marking non-existent message as delivered', () => {
      const offlineMessage: StoredMessage = {
        id: 'offline-msg-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Test',
        timestamp: new Date(),
      };

      messageStore.queueOfflineMessage('offline-user', offlineMessage);

      // Should not throw error
      messageStore.markOfflineMessageDelivered('offline-user', 'non-existent-msg');

      expect(true).toBe(true);
    });

    it('should return empty array for user with no offline messages', () => {
      const queued = messageStore.getOfflineMessages('offline-user');

      expect(queued).toEqual([]);
    });
  });

  // ============================================================================
  // Reactions Edge Cases
  // ============================================================================

  describe('Reactions - Edge Cases', () => {
    beforeEach(() => {
      messageStore.store({
        id: 'msg-reactions',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'React to this',
      });
    });

    it('should add reaction with emoji', () => {
      const result = messageStore.addReaction('msg-reactions', '👍', userId, 'User 1');

      expect(result).toBe(true);

      const message = messageStore.get('msg-reactions');
      expect(message?.reactions).toHaveLength(1);
      expect(message?.reactions?.[0].emoji).toBe('👍');
    });

    it('should add multiple reactions from different users', () => {
      messageStore.addReaction('msg-reactions', '👍', 'user-1', 'User 1');
      messageStore.addReaction('msg-reactions', '❤️', 'user-2', 'User 2');
      messageStore.addReaction('msg-reactions', '😂', 'user-3', 'User 3');

      const message = messageStore.get('msg-reactions');

      expect(message?.reactions).toHaveLength(3);
    });

    it('should replace existing reaction from same user', () => {
      messageStore.addReaction('msg-reactions', '👍', 'user-1', 'User 1');
      messageStore.addReaction('msg-reactions', '❤️', 'user-1', 'User 1');

      const message = messageStore.get('msg-reactions');

      expect(message?.reactions).toHaveLength(1);
      expect(message?.reactions?.[0].emoji).toBe('❤️');
    });

    it('should return false when adding reaction to non-existent message', () => {
      const result = messageStore.addReaction('non-existent-msg', '👍', userId, 'User 1');

      expect(result).toBe(false);
    });

    it('should remove reaction', () => {
      messageStore.addReaction('msg-reactions', '👍', 'user-1', 'User 1');

      const result = messageStore.removeReaction('msg-reactions', '👍', 'user-1');

      expect(result).toBe(true);

      const message = messageStore.get('msg-reactions');
      expect(message?.reactions).toHaveLength(0);
    });

    it('should return false when removing non-existent reaction', () => {
      const result = messageStore.removeReaction('msg-reactions', '👍', 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when removing reaction from non-existent message', () => {
      const result = messageStore.removeReaction('non-existent-msg', '👍', 'user-1');

      expect(result).toBe(false);
    });

    it('should handle special characters in emoji', () => {
      const specialEmojis = ['🎉', '❤️', '😂', '🔥', '✨', '🚀'];

      specialEmojis.forEach((emoji) => {
        messageStore.addReaction('msg-reactions', emoji, `user-${emoji}`, 'User');

        const message = messageStore.get('msg-reactions');
        expect(message?.reactions?.some((r) => r.emoji === emoji)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Pinning Edge Cases
  // ============================================================================

  describe('Pinning - Edge Cases', () => {
    beforeEach(() => {
      messageStore.store({
        id: 'msg-pin',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Pin this',
      });
    });

    it('should pin message', () => {
      const result = messageStore.pin('msg-pin', 'user-1');

      expect(result).toBe(true);

      const message = messageStore.get('msg-pin');
      expect(message?.pinned).toBe(true);
      expect(message?.pinnedBy).toBe('user-1');
      expect(message?.pinnedAt).toBeDefined();
    });

    it('should return false when pinning non-existent message', () => {
      const result = messageStore.pin('non-existent-msg', 'user-1');

      expect(result).toBe(false);
    });

    it('should unpin message', () => {
      messageStore.pin('msg-pin', 'user-1');

      const result = messageStore.unpin('msg-pin');

      expect(result).toBe(true);

      const message = messageStore.get('msg-pin');
      expect(message?.pinned).toBe(false);
      expect(message?.pinnedBy).toBeUndefined();
      expect(message?.pinnedAt).toBeUndefined();
    });

    it('should return false when unpinning non-existent message', () => {
      const result = messageStore.unpin('non-existent-msg');

      expect(result).toBe(false);
    });

    it('should handle pinning multiple messages', () => {
      for (let i = 1; i <= 10; i++) {
        messageStore.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
        });

        messageStore.pin(`msg-${i}`, 'user-1');
      }

      const pinned = messageStore.getPinnedMessages(roomId);

      expect(pinned.length).toBe(10);
    });

    it('should get pinned messages sorted by pin time', () => {
      messageStore.store({ id: 'msg-2', roomId, userId, userName: 'User 1', type: 'chat', content: '2' });
      messageStore.store({ id: 'msg-3', roomId, userId, userName: 'User 1', type: 'chat', content: '3' });

      vi.advanceTimersByTime(100);
      messageStore.pin('msg-2', 'user-1');

      vi.advanceTimersByTime(100);
      messageStore.pin('msg-3', 'user-1');

      const pinned = messageStore.getPinnedMessages(roomId);

      expect(pinned.length).toBe(2);
      expect(pinned[0].id).toBe('msg-2');
      expect(pinned[1].id).toBe('msg-3');
    });
  });

  // ============================================================================
  // User Messages Edge Cases
  // ============================================================================

  describe('User Messages - Edge Cases', () => {
    beforeEach(() => {
      // Store messages from multiple users
      for (let i = 1; i <= 10; i++) {
        messageStore.store({
          id: `msg-${i}`,
          roomId,
          userId: `user-${i}`,
          userName: `User ${i}`,
          type: 'chat',
          content: `Message ${i}`,
        });
      }
    });

    it('should get messages for specific user', () => {
      messageStore.store({
        id: 'msg-user-1-2',
        roomId,
        userId: 'user-1',
        userName: 'User 1',
        type: 'chat',
        content: 'Another message',
      });

      const userMessages = messageStore.getUserMessages('user-1');

      expect(userMessages.length).toBe(2);
      expect(userMessages.every((m) => m.userId === 'user-1')).toBe(true);
    });

    it('should return empty array for user with no messages', () => {
      const userMessages = messageStore.getUserMessages('non-existent-user');

      expect(userMessages).toEqual([]);
    });

    it('should respect limit parameter', () => {
      const userMessages = messageStore.getUserMessages('user-1', 5);

      // user-1 only has 1 message, so limit doesn't matter
      expect(userMessages.length).toBeLessThanOrEqual(5);
    });

    it('should handle limit of 0', () => {
      const userMessages = messageStore.getUserMessages('user-1', 0);

      expect(userMessages).toEqual([]);
    });

    it('should handle negative limit', () => {
      const userMessages = messageStore.getUserMessages('user-1', -5);

      expect(userMessages).toEqual([]);
    });

    it('should return messages sorted by timestamp (newest first)', () => {
      const userMessages = messageStore.getUserMessages('user-1');

      for (let i = 0; i < userMessages.length - 1; i++) {
        expect(userMessages[i].timestamp.getTime() >= userMessages[i + 1].timestamp.getTime()).toBe(true);
      }
    });

    it('should exclude deleted messages', () => {
      messageStore.delete('msg-1', 'user-1');

      const userMessages = messageStore.getUserMessages('user-1');

      expect(userMessages.some((m) => m.id === 'msg-1')).toBe(false);
    });
  });

  // ============================================================================
  // Room Management Edge Cases
  // ============================================================================

  describe('Room Management - Edge Cases', () => {
    it('should clear room with no messages', () => {
      const result = messageStore.clearRoom('empty-room');

      expect(result).toBeUndefined(); // Method doesn't return anything
    });

    it('should clear room with messages', () => {
      for (let i = 1; i <= 10; i++) {
        messageStore.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
        });
      }

      messageStore.clearRoom(roomId);

      const history = messageStore.getHistory({ roomId });

      expect(history).toEqual([]);
    });

    it('should clear room with deleted messages', () => {
      messageStore.store({
        id: 'msg-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Test',
      });

      messageStore.delete('msg-1', 'user-1');

      messageStore.clearRoom(roomId);

      const history = messageStore.getHistory({ roomId, includeDeleted: true });

      expect(history).toEqual([]);
    });

    it('should handle clearing non-existent room', () => {
      // Should not throw error
      messageStore.clearRoom('non-existent-room');

      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // History Size Limit Edge Cases
  // ============================================================================

  describe('History Size Limit - Edge Cases', () => {
    it('should evict oldest message when limit is reached', () => {
      const store = new MessageStore({ maxHistorySize: 5 });

      // Store 10 messages
      for (let i = 1; i <= 10; i++) {
        store.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
        });
      }

      // Only 5 should remain
      const history = store.getHistory({ roomId });

      expect(history.length).toBe(5);
      // Oldest messages should be evicted
      expect(history.some((m) => m.id === 'msg-1')).toBe(false);
      expect(history.some((m) => m.id === 'msg-6')).toBe(true);
    });

    it('should handle maxHistorySize of 0', () => {
      const store = new MessageStore({ maxHistorySize: 0 });

      store.store({
        id: 'msg-1',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Test',
      });

      // Message might not be stored at all
      const history = store.getHistory({ roomId });

      expect(history.length).toBe(0);
    });

    it('should handle very large maxHistorySize', () => {
      const store = new MessageStore({ maxHistorySize: Number.MAX_SAFE_INTEGER });

      for (let i = 1; i <= 100; i++) {
        store.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: 'User 1',
          type: 'chat',
          content: `Message ${i}`,
        });
      }

      const history = store.getHistory({ roomId });

      expect(history.length).toBe(100);
    });
  });

  // ============================================================================
  // Statistics Edge Cases
  // ============================================================================

  describe('Statistics - Edge Cases', () => {
    it('should return empty stats for new store', () => {
      const stats = messageStore.getStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.totalOfflineMessages).toBe(0);
      expect(stats.offlineUsers).toBe(0);
      expect(stats.messagesPerRoom).toEqual({});
      expect(stats.oldestMessage).toBeUndefined();
      expect(stats.newestMessage).toBeUndefined();
    });

    it('should correctly count messages across multiple rooms', () => {
      const rooms = ['room-1', 'room-2', 'room-3'];

      rooms.forEach((rid, roomIndex) => {
        for (let i = 1; i <= 10; i++) {
          messageStore.store({
            id: `msg-${roomIndex}-${i}`,
            roomId: rid,
            userId,
            userName: 'User 1',
            type: 'chat',
            content: `Message ${i}`,
          });
        }
      });

      const stats = messageStore.getStats();

      expect(stats.totalMessages).toBe(30);
      expect(stats.messagesPerRoom['room-1']).toBe(10);
      expect(stats.messagesPerRoom['room-2']).toBe(10);
      expect(stats.messagesPerRoom['room-3']).toBe(10);
    });

    it('should correctly track oldest and newest messages', () => {
      vi.useFakeTimers();

      messageStore.store({
        id: 'msg-oldest',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Oldest',
        timestamp: new Date('2020-01-01'),
      });

      messageStore.store({
        id: 'msg-newest',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Newest',
        timestamp: new Date('2024-12-31'),
      });

      const stats = messageStore.getStats();

      expect(stats.oldestMessage).toEqual(new Date('2020-01-01'));
      expect(stats.newestMessage).toEqual(new Date('2024-12-31'));

      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Cleanup Expired Offline Messages Edge Cases
  // ============================================================================

  describe('Cleanup Expired Offline Messages - Edge Cases', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove expired offline messages', () => {
      const store = new MessageStore({ offlineMessageTTL: 1000 });

      const offlineMessage: StoredMessage = {
        id: 'offline-msg-expired',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Will expire',
        timestamp: new Date(),
      };

      store.queueOfflineMessage('offline-user', offlineMessage);

      vi.advanceTimersByTime(1100);

      store.cleanupExpiredOfflineMessages();

      const queued = store.getOfflineMessages('offline-user');

      expect(queued.length).toBe(0);
    });

    it('should not remove valid offline messages', () => {
      const offlineMessage: StoredMessage = {
        id: 'offline-msg-valid',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Will not expire',
        timestamp: new Date(),
      };

      messageStore.queueOfflineMessage('offline-user', offlineMessage);

      messageStore.cleanupExpiredOfflineMessages();

      const queued = messageStore.getOfflineMessages('offline-user');

      expect(queued.length).toBe(1);
    });

    it('should remove delivered offline messages', () => {
      const offlineMessage: StoredMessage = {
        id: 'offline-msg-delivered',
        roomId,
        userId,
        userName: 'User 1',
        type: 'chat',
        content: 'Delivered',
        timestamp: new Date(),
      };

      messageStore.queueOfflineMessage('offline-user', offlineMessage);
      messageStore.markOfflineMessageDelivered('offline-user', 'offline-msg-delivered');

      messageStore.cleanupExpiredOfflineMessages();

      const queued = messageStore.getOfflineMessages('offline-user');

      expect(queued.length).toBe(0);
    });

    it('should handle cleanup with no offline messages', () => {
      // Should not throw error
      messageStore.cleanupExpiredOfflineMessages();

      expect(true).toBe(true);
    });
  });
});
