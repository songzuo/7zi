/**
 * Message Persistence Tests - 消息持久化测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessagePersistence } from '../persistence';
import { Message, MessageContent } from '../message-model';

describe('MessagePersistence', () => {
  let persistence: MessagePersistence;

  beforeEach(() => {
    persistence = new MessagePersistence();
  });

  describe('saveMessage', () => {
    it('should save a text message', async () => {
      const message: Message = {
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Hello world' },
        readBy: ['user1'],
        createdAt: Date.now(),
      };

      await persistence.saveMessage(message);

      const messages = await persistence.getMessages('room1');
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg1');
      expect(messages[0].content.text).toBe('Hello world');
    });

    it('should save multiple messages in order', async () => {
      const baseTime = Date.now();

      for (let i = 0; i < 5; i++) {
        await persistence.saveMessage({
          id: `msg${i}`,
          roomId: 'room1',
          senderId: 'user1',
          senderName: 'John',
          type: 'text',
          content: { text: `Message ${i}` },
          readBy: ['user1'],
          createdAt: baseTime + i * 1000,
        });
      }

      const messages = await persistence.getMessages('room1');
      expect(messages).toHaveLength(5);
      expect(messages[0].id).toBe('msg4'); // Should be sorted by time (desc)
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      const baseTime = Date.now();

      for (let i = 0; i < 20; i++) {
        await persistence.saveMessage({
          id: `msg${i}`,
          roomId: 'room1',
          senderId: 'user1',
          senderName: 'John',
          type: 'text',
          content: { text: `Message ${i}` },
          readBy: ['user1'],
          createdAt: baseTime + i * 1000,
        });
      }
    });

    it('should return messages with limit', async () => {
      const messages = await persistence.getMessages('room1', { limit: 10 });
      expect(messages).toHaveLength(10);
    });

    it('should return messages before timestamp', async () => {
      const messages = await persistence.getMessages('room1', {
        limit: 10,
        before: Date.now() - 5000,
      });
      expect(messages.length).toBeLessThanOrEqual(10);
    });

    it('should return messages after timestamp', async () => {
      const messages = await persistence.getMessages('room1', {
        after: Date.now() - 5000,
      });
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('editMessage', () => {
    it('should allow sender to edit message', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Original message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const result = await persistence.editMessage(
        'msg1',
        { text: 'Edited message' },
        'user1'
      );

      expect(result.success).toBe(true);

      const message = await persistence.getMessage('msg1');
      expect(message?.content.text).toBe('Edited message');
      expect(message?.editedAt).toBeDefined();
      expect(message?.editedCount).toBe(1);
    });

    it('should not allow non-sender to edit message', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Original message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const result = await persistence.editMessage(
        'msg1',
        { text: 'Edited message' },
        'user2'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Only sender can edit message');
    });

    it('should not allow editing deleted message', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Original message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      await persistence.deleteMessage('msg1', 'user1');

      const result = await persistence.editMessage(
        'msg1',
        { text: 'Edited message' },
        'user1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot edit deleted message');
    });
  });

  describe('deleteMessage', () => {
    it('should allow sender to delete message', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Test message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const result = await persistence.deleteMessage('msg1', 'user1');
      expect(result.success).toBe(true);

      const message = await persistence.getMessage('msg1');
      expect(message?.deletedAt).toBeDefined();
      expect(message?.deletedBy).toBe('user1');
    });

    it('should allow moderator to delete message', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Test message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const result = await persistence.deleteMessage('msg1', 'user2', true);
      expect(result.success).toBe(true);

      const message = await persistence.getMessage('msg1');
      expect(message?.deletedAt).toBeDefined();
    });

    it('should not allow non-moderator to delete others message', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Test message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const result = await persistence.deleteMessage('msg1', 'user2', false);
      expect(result.success).toBe(false);
      expect(result.message).toBe('No permission to delete message');
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Test message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      await persistence.markAsRead('msg1', 'user2');

      const message = await persistence.getMessage('msg1');
      expect(message?.readBy).toContain('user2');
    });

    it('should not duplicate read user', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Test message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      await persistence.markAsRead('msg1', 'user2');
      await persistence.markAsRead('msg1', 'user2');

      const message = await persistence.getMessage('msg1');
      const count = message?.readBy.filter(u => u === 'user2').length || 0;
      expect(count).toBe(1);
    });
  });

  describe('markRoomAsRead', () => {
    it('should mark all room messages as read', async () => {
      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Message 1' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      await persistence.saveMessage({
        id: 'msg2',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Message 2' },
        readBy: ['user1'],
        createdAt: Date.now() + 1000,
      });

      await persistence.markRoomAsRead('room1', 'user2');

      const msg1 = await persistence.getMessage('msg1');
      const msg2 = await persistence.getMessage('msg2');

      expect(msg1?.readBy).toContain('user2');
      expect(msg2?.readBy).toContain('user2');
    });
  });

  describe('searchMessages', () => {
    let baseTime: number;

    beforeEach(async () => {
      baseTime = Date.now();

      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Hello world' },
        readBy: ['user1'],
        createdAt: baseTime,
      });

      await persistence.saveMessage({
        id: 'msg2',
        roomId: 'room1',
        senderId: 'user2',
        senderName: 'Jane',
        type: 'text',
        content: { text: 'Goodbye world' },
        readBy: ['user2'],
        createdAt: baseTime + 1000,
      });

      await persistence.saveMessage({
        id: 'msg3',
        roomId: 'room2',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Hello again' },
        readBy: ['user1'],
        createdAt: baseTime + 2000,
      });
    });

    it('should search text across rooms', async () => {
      const results = await persistence.searchMessages({
        query: 'Hello',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.content.text?.toLowerCase().includes('hello'))).toBe(true);
    });

    it('should search in specific room', async () => {
      const results = await persistence.searchMessages({
        roomId: 'room1',
        query: 'Hello',
      });

      expect(results).toHaveLength(1);
      expect(results[0].roomId).toBe('room1');
    });

    it('should search by sender', async () => {
      const results = await persistence.searchMessages({
        senderId: 'user1',
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.senderId === 'user1')).toBe(true);
    });

    it('should filter by time range', async () => {
      const results = await persistence.searchMessages({
        startDate: baseTime,
        endDate: baseTime + 500,
      });

      expect(results).toHaveLength(1);
    });

    it('should skip deleted messages', async () => {
      await persistence.deleteMessage('msg1', 'user1');

      const results = await persistence.searchMessages({
        query: 'Hello',
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('msg3');
    });

    it('should limit results', async () => {
      const results = await persistence.searchMessages({
        limit: 1,
      });

      expect(results).toHaveLength(1);
    });
  });

  describe('syncOfflineMessages', () => {
    it('should sync messages since last online', async () => {
      const lastOnline = Date.now();

      // Simulate messages arriving while offline
      await new Promise(resolve => setTimeout(resolve, 10));

      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'New message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const offlineMessages = await persistence.syncOfflineMessages('user2', lastOnline, ['room1']);

      expect(offlineMessages).toHaveLength(1);
      expect(offlineMessages[0].id).toBe('msg1');
    });

    it('should not include old messages', async () => {
      const oldTime = Date.now() - 10000;

      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Old message' },
        readBy: ['user1'],
        createdAt: oldTime,
      });

      const lastOnline = oldTime + 5000;

      await persistence.saveMessage({
        id: 'msg2',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'New message' },
        readBy: ['user1'],
        createdAt: Date.now(),
      });

      const offlineMessages = await persistence.syncOfflineMessages('user2', lastOnline, ['room1']);

      expect(offlineMessages).toHaveLength(1);
      expect(offlineMessages[0].id).toBe('msg2');
    });
  });

  describe('getUnreadCount', () => {
    let baseTime: number;

    beforeEach(async () => {
      baseTime = Date.now();

      await persistence.saveMessage({
        id: 'msg1',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Message 1' },
        readBy: ['user1'],
        createdAt: baseTime,
      });

      await persistence.saveMessage({
        id: 'msg2',
        roomId: 'room1',
        senderId: 'user2',
        senderName: 'Jane',
        type: 'text',
        content: { text: 'Message 2' },
        readBy: ['user1', 'user2'],
        createdAt: baseTime + 1000,
      });

      await persistence.saveMessage({
        id: 'msg3',
        roomId: 'room1',
        senderId: 'user1',
        senderName: 'John',
        type: 'text',
        content: { text: 'Message 3' },
        readBy: ['user1'],
        createdAt: baseTime + 2000,
      });
    });

    it('should count unread messages', async () => {
      const count = await persistence.getUnreadCount('room1', 'user2', baseTime);
      expect(count).toBe(1);
    });

    it('should not count deleted messages', async () => {
      await persistence.deleteMessage('msg3', 'user1');

      const count = await persistence.getUnreadCount('room1', 'user2', baseTime);
      expect(count).toBe(0);
    });

    it('should not count already read messages', async () => {
      const count = await persistence.getUnreadCount('room1', 'user1', baseTime);
      expect(count).toBe(0);
    });
  });
});
