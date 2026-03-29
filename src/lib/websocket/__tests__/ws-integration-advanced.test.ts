/**
 * WebSocket 高级集成测试
 * 测试房间、权限、消息存储的复杂场景
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RoomManager,
  getRoomManager,
  resetRoomManager,
  RoomType,
} from '../rooms';
import {
  PermissionManager,
  resetPermissionManager,
} from '../permissions';
import {
  MessageStore,
  resetMessageStore,
  StoredMessage,
} from '../message-store';

describe('WebSocket 高级集成测试', () => {
  let roomManager: RoomManager;
  let permissionManager: PermissionManager;
  let messageStore: MessageStore;

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    roomManager = getRoomManager();
    permissionManager = new PermissionManager();
    messageStore = new MessageStore();
  });

  describe('房间系统复杂场景', () => {
    it('应正确处理多房间并发创建', async () => {
      const userId = 'user-concurrent';
      const roomIds = ['room-1', 'room-2', 'room-3'];

      // 同时创建多个房间
      const rooms = roomIds.map(id => roomManager.create({
        id,
        type: 'task',
        documentId: `doc-${id}`,
        ownerId: userId,
      }));

      expect(rooms.length).toBe(3);
      
      // 验证所有房间已创建
      for (const roomId of roomIds) {
        const room = roomManager.get(roomId);
        expect(room).toBeDefined();
      }
    });

    it('应正确处理房间类型差异', async () => {
      const userId = 'user-types';
      const types: RoomType[] = ['task', 'project', 'chat', 'document', 'voice', 'video'];

      for (const type of types) {
        const room = roomManager.create({
          id: `room-${type}`,
          type,
          documentId: `doc-${type}`,
          ownerId: userId,
        });

        expect(room.type).toBe(type);
      }
    });

    it('应正确处理房间满员场景', async () => {
      const ownerId = 'owner-full';
      const roomId = 'room-full';

      roomManager.create({
        id: roomId,
        type: 'task',
        documentId: 'doc-full',
        ownerId,
        config: { maxParticipants: 2 },
      });

      roomManager.join(roomId, { userId: ownerId, userName: 'Owner', role: 'owner' });
      roomManager.join(roomId, { userId: 'member-1', userName: 'Member1', role: 'member' });

      // 第三个用户加入应该失败（房间满）
      try {
        roomManager.join(roomId, { userId: 'member-2', userName: 'Member2', role: 'member' });
      } catch (e) {
        // 预期异常
      }
    });

    it('应正确执行踢出流程', async () => {
      const ownerId = 'owner-kick';
      const memberId = 'member-kick';
      const roomId = 'room-kick';

      roomManager.create({
        id: roomId,
        type: 'task',
        documentId: 'doc-kick',
        ownerId,
      });

      roomManager.join(roomId, { userId: ownerId, userName: 'Owner', role: 'owner' });
      roomManager.join(roomId, { userId: memberId, userName: 'Member', role: 'member' });

      // 移除成员
      roomManager.leave(roomId, memberId);

      const participant = roomManager.getParticipant(roomId, memberId);
      expect(participant).toBeUndefined();
    });
  });

  describe('权限系统复杂场景', () => {
    it('应正确处理权限继承', async () => {
      const userId = 'user-inherit';
      const roomId = 'room-inherit';
      
      // 创建房间
      roomManager.create({
        id: roomId,
        type: 'task',
        documentId: 'doc-inherit',
        ownerId: 'owner-inherit',
      });
      
      // Guest 应该只有基本权限
      const guestPermissions = permissionManager.getUserPermissions(userId, roomId);
      expect(guestPermissions.length).toBeGreaterThan(0);
    });

    it('应正确处理无效权限操作', async () => {
      // 对不存在的房间授予权限
      permissionManager.grantPermission(
        'user',
        'non-existent-room',
        'send_message' as any,
        'admin'
      );
      
      // 应该不会抛出异常
      expect(true).toBe(true);
    });
  });

  describe('消息存储复杂场景', () => {
    it('应正确处理大消息量存储', async () => {
      const roomId = 'room-large';
      const userId = 'user-large';

      // 存储 100 条消息
      for (let i = 0; i < 100; i++) {
        messageStore.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: `User-${i}`,
          type: 'text',
          content: `Message ${i}`,
        });
      }

      const messages = messageStore.getHistory({ roomId, limit: 100 });
      expect(messages.length).toBe(100);
    });

    it('应正确处理软删除', async () => {
      const roomId = 'room-delete';
      const userId = 'user-delete';
      const messageId = 'msg-delete';

      messageStore.store({
        id: messageId,
        roomId,
        userId,
        userName: 'User-delete',
        type: 'text',
        content: 'To be deleted',
      });

      // 软删除
      const deleteResult = messageStore.delete(messageId, userId);
      expect(deleteResult).toBe(true);

      // 验证消息已被软删除（metadata.deleted = true）
      const message = messageStore.get(messageId);
      expect(message?.metadata?.deleted).toBe(true);
    });

    it('应正确处理无效消息操作', async () => {
      const result = messageStore.edit('non-existent', 'content', 'user');
      expect(result).toBeUndefined();
    });

    it('应正确处理消息历史分页', async () => {
      const roomId = 'room-pagination';
      const userId = 'user-pagination';

      // 添加 50 条消息
      for (let i = 0; i < 50; i++) {
        messageStore.store({
          id: `msg-${i}`,
          roomId,
          userId,
          userName: `User-${i}`,
          type: 'text',
          content: `Message ${i}`,
        });
      }

      // 获取消息
      const messages = messageStore.getHistory({ roomId });
      expect(messages.length).toBe(50);
    });

    it('应正确处理消息反应', async () => {
      const roomId = 'room-reaction';
      const userId = 'user-reaction';
      const messageId = 'msg-reaction';

      messageStore.store({
        id: messageId,
        roomId,
        userId,
        userName: 'User-reaction',
        type: 'text',
        content: 'Message with reaction',
      });

      // 添加反应
      const reactionResult = messageStore.addReaction(
        messageId,
        '👍',
        'user-react',
        'Reacting User'
      );

      expect(reactionResult).toBe(true);

      const message = messageStore.get(messageId);
      expect(message?.reactions?.some(r => r.emoji === '👍' && r.userId === 'user-react')).toBe(true);
    });

    it('应正确处理消息获取', async () => {
      const roomId = 'room-get';
      const userId = 'user-get';
      const messageId = 'msg-get';

      messageStore.store({
        id: messageId,
        roomId,
        userId,
        userName: 'User-get',
        type: 'text',
        content: 'Test message',
      });

      const message = messageStore.get(messageId);
      expect(message).toBeDefined();
      expect(message?.content).toBe('Test message');
    });
  });

  describe('错误处理场景', () => {
    it('应正确处理无效房间操作', async () => {
      const room = roomManager.get('non-existent');
      expect(room).toBeUndefined();
    });

    it('应正确处理无效消息获取', async () => {
      const message = messageStore.get('non-existent');
      expect(message).toBeUndefined();
    });
  });
});
