/**
 * WebSocket Advanced Integration Tests - 高级功能集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WebSocketAdvancedService } from '../lib/websocket-advanced';
import { RoomType, MemberRole } from '../room/room-model';
import { MessageType } from '../message/message-model';

describe('WebSocketAdvancedService Integration', () => {
  let service: WebSocketAdvancedService;

  beforeEach(() => {
    service = new WebSocketAdvancedService();
  });

  describe('Room and Message Integration', () => {
    it('should allow sending messages in a room', async () => {
      // Create room
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      // Join room
      await service.joinRoom(room.id, 'user2', 'Jane');

      // Send message
      const { message } = await service.sendMessage(
        room.id,
        'user2',
        'Jane',
        { text: 'Hello everyone!' },
        'text'
      );

      expect(message.id).toBeDefined();
      expect(message.senderId).toBe('user2');
      expect(message.content.text).toBe('Hello everyone!');
    });

    it('should not allow sending messages without permission', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      // User2 加入房间后，让其成为 guest（无发送权限）
      await service.joinRoom(room.id, 'user2', 'Jane');

      // 更新用户角色为 guest
      service.updateMemberRole(room.id, 'user1', 'user2', 'guest');

      await expect(
        service.sendMessage(
          room.id,
          'user2',
          'Jane',
          { text: 'Hello!' },
          'text'
        )
      ).rejects.toThrow('No permission to send messages');
    });

    it('should retrieve room messages', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      await service.sendMessage(
        room.id,
        'user1',
        'Owner',
        { text: 'Message 1' },
        'text'
      );

      await service.sendMessage(
        room.id,
        'user2',
        'Jane',
        { text: 'Message 2' },
        'text'
      );

      const messages = await service.getMessages(room.id, 'user1', { limit: 10 });

      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should support message replies', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.sendMessage(
        room.id,
        'user1',
        'Owner',
        { text: 'Original message' },
        'text'
      );

      const messages = await service.getMessages(room.id, 'user1', { limit: 1 });
      const originalMessageId = messages[0].id;

      const { message } = await service.sendMessage(
        room.id,
        'user1',
        'Owner',
        { text: 'Reply' },
        'text',
        originalMessageId
      );

      expect(message.replyTo).toBe(originalMessageId);
      expect(message.replyToContent).toBeDefined();
    });
  });

  describe('Permission Integration', () => {
    it('should enforce room-level permissions', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Private Room',
          type: 'private' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      // Try to join private room (should fail)
      const result = await service.joinRoom(room.id, 'user2', 'Jane');
      expect(result.success).toBe(false);

      // Try to send message from non-member (should fail)
      await expect(
        service.sendMessage(
          room.id,
          'user2',
          'Jane',
          { text: 'Hello!' },
          'text'
        )
      ).rejects.toThrow();
    });

    it('should allow admin to kick members', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');
      await service.joinRoom(room.id, 'user3', 'Bob');

      // Promote user2 to admin
      service.updateMemberRole(room.id, 'user1', 'user2', 'admin');

      // User2 (admin) kicks user3
      const result = service.kickMember(room.id, 'user2', 'user3');
      expect(result.success).toBe(true);

      // Verify user3 is not in room
      const rooms = service.getUserRooms('user3');
      expect(rooms.length).toBe(0);
    });

    it('should enforce message edit permissions', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      const { message } = await service.sendMessage(
        room.id,
        'user2',
        'Jane',
        { text: 'Original' },
        'text'
      );

      // Sender can edit
      const editResult = await service.editMessage(
        message.id,
        'user2',
        { text: 'Edited' }
      );
      expect(editResult.success).toBe(true);

      // Non-sender cannot edit
      const editResult2 = await service.editMessage(
        message.id,
        'user1',
        { text: 'Edited again' }
      );
      expect(editResult2.success).toBe(false);
    });

    it('should enforce message delete permissions', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      const { message } = await service.sendMessage(
        room.id,
        'user2',
        'Jane',
        { text: 'Test' },
        'text'
      );

      // Owner can delete (as moderator)
      const deleteResult = await service.deleteMessage(message.id, 'user1');
      expect(deleteResult.success).toBe(true);

      // Sender can delete
      const { message: msg2 } = await service.sendMessage(
        room.id,
        'user2',
        'Jane',
        { text: 'Test 2' },
        'text'
      );

      const deleteResult2 = await service.deleteMessage(msg2.id, 'user2');
      expect(deleteResult2.success).toBe(true);
    });
  });

  describe('Offline Sync Integration', () => {
    it('should sync offline messages when user comes online', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      // 记录离线时间
      const offlineTime = Date.now();
      service.setUserOfflineTime('user2', offlineTime);

      // 等待一小段时间确保时间差异
      await new Promise(resolve => setTimeout(resolve, 5));

      // 发送离线消息
      await service.sendMessage(
        room.id,
        'user1',
        'Owner',
        { text: 'Message while offline' },
        'text'
      );

      // 用户上线
      service.userOnline('user2');

      // 同步离线消息
      const offlineMessages = await service.syncOfflineMessages('user2');

      expect(offlineMessages.length).toBeGreaterThan(0);
      expect(offlineMessages.some(m => m.content.text === 'Message while offline')).toBe(true);
    });

    it('should track unread message counts', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      // 记录离线时间
      const offlineTime = Date.now();
      service.setUserOfflineTime('user2', offlineTime);

      // 等待一小段时间确保时间差异
      await new Promise(resolve => setTimeout(resolve, 5));

      // 发送3条消息
      await service.sendMessage(room.id, 'user1', 'Owner', { text: 'Msg 1' }, 'text');
      await service.sendMessage(room.id, 'user1', 'Owner', { text: 'Msg 2' }, 'text');
      await service.sendMessage(room.id, 'user1', 'Owner', { text: 'Msg 3' }, 'text');

      // 用户上线
      service.userOnline('user2');

      const unreadCounts = await service.getUnreadCounts('user2');

      expect(unreadCounts[room.id]).toBe(3);

      // Mark as read
      await service.markAsRead(room.id, 'user2');

      const unreadCountsAfter = await service.getUnreadCounts('user2');
      expect(unreadCountsAfter[room.id]).toBe(0);
    });
  });

  describe('Search Integration', () => {
    it('should search across multiple rooms', async () => {
      const { room: room1 } = await service.createRoom(
        {
          name: 'Room 1',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      const { room: room2 } = await service.createRoom(
        {
          name: 'Room 2',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room1.id, 'user2', 'Jane');
      await service.joinRoom(room2.id, 'user2', 'Jane');

      await service.sendMessage(room1.id, 'user2', 'Jane', { text: 'Hello world' }, 'text');
      await service.sendMessage(room2.id, 'user2', 'Jane', { text: 'Hello there' }, 'text');
      await service.sendMessage(room1.id, 'user2', 'Jane', { text: 'Goodbye' }, 'text');

      const results = await service.searchMessages('user2', { query: 'Hello' });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(r => r.content.text?.toLowerCase().includes('hello'))).toBe(true);
    });

    it('should filter search results by sender', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      await service.sendMessage(room.id, 'user1', 'Owner', { text: 'Message from owner' }, 'text');
      await service.sendMessage(room.id, 'user2', 'Jane', { text: 'Message from member' }, 'text');

      const results = await service.searchMessages('user2', {
        roomId: room.id,
        senderId: 'user1',
      });

      expect(results.length).toBe(1);
      expect(results[0].senderId).toBe('user1');
    });
  });

  describe('Multi-Room Management', () => {
    it('should manage multiple rooms for a user', async () => {
      const { room: room1 } = await service.createRoom(
        { name: 'Room 1', type: 'public' as RoomType, ownerId: 'user1' },
        'Owner'
      );

      const { room: room2 } = await service.createRoom(
        { name: 'Room 2', type: 'public' as RoomType, ownerId: 'user1' },
        'Owner'
      );

      const { room: room3 } = await service.createRoom(
        { name: 'Room 3', type: 'public' as RoomType, ownerId: 'user2' },
        'User 2'
      );

      await service.joinRoom(room1.id, 'user2', 'Jane');
      await service.joinRoom(room2.id, 'user2', 'Jane');

      const userRooms = service.getUserRooms('user2');

      expect(userRooms.length).toBe(3);
      expect(userRooms.map(r => r.id)).toContain(room1.id);
      expect(userRooms.map(r => r.id)).toContain(room2.id);
      expect(userRooms.map(r => r.id)).toContain(room3.id);
    });

    it('should handle room deletion correctly', async () => {
      const { room } = await service.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      await service.joinRoom(room.id, 'user2', 'Jane');

      // Send some messages
      await service.sendMessage(room.id, 'user1', 'Owner', { text: 'Test' }, 'text');
      await service.sendMessage(room.id, 'user2', 'Jane', { text: 'Test 2' }, 'text');

      // Delete room
      service.deleteRoom(room.id, 'user1');

      // Verify room is deleted
      expect(service.getRoom(room.id)).toBeUndefined();

      // Verify user room list is updated
      const userRooms = service.getUserRooms('user2');
      expect(userRooms.find(r => r.id === room.id)).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const { room: room1 } = await service.createRoom(
        {
          name: 'Public Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      );

      const { room: room2 } = await service.createRoom(
        {
          name: 'Private Room',
          type: 'private' as RoomType,
          ownerId: 'user2',
        },
        'User 2'
      );

      await service.joinRoom(room1.id, 'user2', 'Jane');
      await service.joinRoom(room1.id, 'user3', 'Bob');

      await service.sendMessage(room1.id, 'user1', 'Owner', { text: 'Msg 1' }, 'text');
      await service.sendMessage(room1.id, 'user2', 'Jane', { text: 'Msg 2' }, 'text');
      await service.sendMessage(room1.id, 'user3', 'Bob', { text: 'Msg 3' }, 'text');

      service.userOnline('user1');
      service.userOnline('user2');
      service.userOnline('user3');

      const stats = service.getStats();

      expect(stats.rooms.totalRooms).toBe(2);
      expect(stats.rooms.publicRooms).toBe(1);
      expect(stats.rooms.privateRooms).toBe(1);
      expect(stats.rooms.totalMembers).toBeGreaterThan(0);
      expect(stats.messages.totalMessages).toBe(3);
      expect(stats.users.online).toBe(3);
    });
  });
});
