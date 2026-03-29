/**
 * Room Manager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RoomManager,
  getRoomManager,
  resetRoomManager,
  RoomType,
  RoomVisibility,
  RoomParticipant,
  UserRole,
} from '../rooms';
import { resetPermissionManager } from '../permissions';
import { resetMessageStore } from '../message-store';

describe('RoomManager', () => {
  let manager: RoomManager;
  const roomId = 'test-room';
  const user1Id = 'user1';
  const user1Name = 'User One';
  const user2Id = 'user2';
  const user2Name = 'User Two';
  const adminId = 'admin';

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    manager = getRoomManager();
  });

  describe('Room Creation', () => {
    it('should create a room with default options', () => {
      const room = manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      expect(room).toBeDefined();
      expect(room.id).toBe(roomId);
      expect(room.type).toBe('chat');
      expect(room.visibility).toBe('public');
      expect(room.ownerId).toBe(user1Id);
    });

    it('should create a room with custom options', () => {
      const room = manager.create({
        id: roomId,
        name: 'Test Room',
        type: 'document',
        documentId: 'doc1',
        visibility: 'private',
        ownerId: user1Id,
        config: {
          maxParticipants: 50,
          allowGuests: false,
        },
        metadata: { key: 'value' },
      });

      expect(room.name).toBe('Test Room');
      expect(room.type).toBe('document');
      expect(room.visibility).toBe('private');
      expect(room.config.maxParticipants).toBe(50);
      expect(room.config.allowGuests).toBe(false);
      expect(room.metadata?.key).toBe('value');
    });

    it('should return existing room if already exists', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      const room2 = manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc2',
        ownerId: user2Id,
      });

      expect(room2.documentId).toBe('doc1'); // Original room preserved
    });

    it('should set owner role for room creator', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      const participant = manager.getParticipant(roomId, user1Id);
      expect(participant?.role).toBe('owner');
    });
  });

  describe('Room Retrieval', () => {
    it('should get room by ID', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      const room = manager.get(roomId);
      expect(room).toBeDefined();
      expect(room?.id).toBe(roomId);
    });

    it('should check if room exists', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      expect(manager.exists(roomId)).toBe(true);
      expect(manager.exists('nonexistent')).toBe(false);
    });
  });

  describe('Joining Rooms', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });
    });

    it('should allow users to join public rooms', () => {
      const result = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      expect(result.success).toBe(true);
      expect(result.participant).toBeDefined();
      expect(result.participant?.id).toBe(user2Id);
      expect(result.room?.participants.size).toBe(1);
    });

    it('should set default member role for non-owners', () => {
      const result = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      expect(result.participant?.role).toBe('member');
    });

    it('should set owner role for room owner', () => {
      const result = manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      expect(result.participant?.role).toBe('owner');
    });

    it('should auto-create room on join if not exists', () => {
      const result = manager.join('new-room', {
        userId: user1Id,
        userName: user1Name,
      });

      expect(result.success).toBe(true);
      expect(result.room?.id).toBe('new-room');
      expect(result.room?.ownerId).toBe(user1Id);
    });

    it('should handle already joined users', () => {
      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      const result = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      expect(result.success).toBe(true);
      expect(manager.getParticipants(roomId)).toHaveLength(1);
    });

    it('should enforce max participants limit', () => {
      // Create room with max 1 participant
      manager.create({
        id: 'small-room',
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
        config: { maxParticipants: 1 },
      });

      manager.join('small-room', {
        userId: user1Id,
        userName: user1Name,
      });

      const result = manager.join('small-room', {
        userId: user2Id,
        userName: user2Name,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });
  });

  describe('Private Rooms', () => {
    it('should block access to private rooms without invite', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        visibility: 'private',
        ownerId: user1Id,
      });

      // Owner can join
      const ownerResult = manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });
      expect(ownerResult.success).toBe(true);

      // Non-invited user cannot join
      const userResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });
      expect(userResult.success).toBe(false);
      expect(userResult.error).toBe('Not invited to private room');
    });

    it('should allow invited users to join private rooms', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        visibility: 'private',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      manager.invite(roomId, user2Id, user1Id);

      const result = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Leaving Rooms', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });
    });

    it('should allow users to leave rooms', () => {
      const result = manager.leave(roomId, user2Id);

      expect(result.success).toBe(true);
      expect(result.participant?.id).toBe(user2Id);
      expect(manager.getParticipants(roomId)).toHaveLength(1);
    });

    it('should track user rooms', () => {
      expect(manager.getUserRooms(user2Id)).toHaveLength(1);
      
      manager.leave(roomId, user2Id);
      
      expect(manager.getUserRooms(user2Id)).toHaveLength(0);
    });
  });

  describe('Kicking Users', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });
    });

    it('should allow owner to kick users', () => {
      const result = manager.kick(roomId, user2Id, user1Id, 'Spamming');

      expect(result.success).toBe(true);
      expect(manager.getParticipants(roomId)).toHaveLength(1);
    });

    it('should not allow kicking users with equal or higher role', () => {
      // Make user2 an admin
      manager.changeRole(roomId, user2Id, 'admin', user1Id);

      const result = manager.kick(roomId, user2Id, user2Id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot kick user with equal or higher role');
    });

    it('should require permission to kick', () => {
      const result = manager.kick(roomId, user1Id, user2Id, 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No permission to kick users');
    });
  });

  describe('Banning Users', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });
    });

    it('should ban users from rooms', () => {
      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      const result = manager.ban(roomId, user2Id, user1Id, 'Harassment');

      expect(result.success).toBe(true);
    });

    it('should prevent banned users from rejoining', () => {
      manager.ban(roomId, user2Id, user1Id);

      const result = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is banned from this room');
    });

    it('should unban users', () => {
      manager.ban(roomId, user2Id, user1Id);

      const unbanResult = manager.unban(roomId, user2Id, user1Id);
      expect(unbanResult.success).toBe(true);

      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });

      expect(joinResult.success).toBe(true);
    });
  });

  describe('Role Management', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });
    });

    it('should change user roles', () => {
      const result = manager.changeRole(roomId, user2Id, 'admin', user1Id);

      expect(result.success).toBe(true);
      expect(result.oldRole).toBe('member');

      const participant = manager.getParticipant(roomId, user2Id);
      expect(participant?.role).toBe('admin');
    });

    it('should not allow changing roles of higher ranked users', () => {
      manager.changeRole(roomId, user2Id, 'admin', user1Id);

      const result = manager.changeRole(roomId, user1Id, 'member', user2Id);

      expect(result.success).toBe(false);
    });
  });

  describe('Participant Updates', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });
    });

    it('should update cursor position', () => {
      manager.updateCursor(roomId, user1Id, {
        position: 10,
        selection: { start: 5, end: 15 },
      });

      const participant = manager.getParticipant(roomId, user1Id);
      expect(participant?.cursor?.position).toBe(10);
      expect(participant?.cursor?.selection).toEqual({ start: 5, end: 15 });
    });

    it('should update typing status', () => {
      manager.updateTyping(roomId, user1Id, true);

      const participant = manager.getParticipant(roomId, user1Id);
      expect(participant?.isTyping).toBe(true);
    });

    it('should update online status', () => {
      manager.updateOnlineStatus(roomId, user1Id, false);

      const participant = manager.getParticipant(roomId, user1Id);
      expect(participant?.isOnline).toBe(false);
    });
  });

  describe('Room Data', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'document',
        documentId: 'doc1',
        ownerId: user1Id,
      });
    });

    it('should update room data', () => {
      manager.updateData(roomId, {
        content: 'New content',
        revision: 5,
      });

      const room = manager.get(roomId);
      expect(room?.data.content).toBe('New content');
      expect(room?.data.revision).toBe(5);
    });
  });

  describe('Room Destruction', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      });
    });

    it('should destroy rooms', () => {
      const result = manager.destroy(roomId, user1Id);

      expect(result).toBe(true);
      expect(manager.exists(roomId)).toBe(false);
    });

    it('should clear user room tracking', () => {
      manager.destroy(roomId, user1Id);

      expect(manager.getUserRooms(user1Id)).toHaveLength(0);
      expect(manager.getUserRooms(user2Id)).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      manager.create({
        id: 'room1',
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      manager.create({
        id: 'room2',
        type: 'document',
        documentId: 'doc2',
        ownerId: user2Id,
      });

      manager.join('room1', { userId: user1Id, userName: user1Name });
      manager.join('room1', { userId: user2Id, userName: user2Name });
      manager.join('room2', { userId: user1Id, userName: user1Name });
    });

    it('should provide statistics', () => {
      const stats = manager.getStats();

      expect(stats.totalRooms).toBe(2);
      expect(stats.roomsByType.chat).toBe(1);
      expect(stats.roomsByType.document).toBe(1);
      expect(stats.totalParticipants).toBe(3);
      expect(stats.activeRooms).toBe(2);
    });
  });

  describe('Callbacks', () => {
    it('should call onUserJoined callback', () => {
      const onUserJoined = vi.fn();
      
      const callbackManager = new RoomManager(
        undefined,
        undefined,
        { onUserJoined }
      );

      callbackManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      callbackManager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      expect(onUserJoined).toHaveBeenCalledTimes(1);
    });

    it('should call onUserLeft callback', () => {
      const onUserLeft = vi.fn();
      
      const callbackManager = new RoomManager(
        undefined,
        undefined,
        { onUserLeft }
      );

      callbackManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      callbackManager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      });

      callbackManager.leave(roomId, user1Id);

      expect(onUserLeft).toHaveBeenCalledTimes(1);
    });

    it('should call onRoomCreated callback', () => {
      const onRoomCreated = vi.fn();
      
      const callbackManager = new RoomManager(
        undefined,
        undefined,
        { onRoomCreated }
      );

      callbackManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      expect(onRoomCreated).toHaveBeenCalledTimes(1);
    });

    it('should call onRoomDestroyed callback', () => {
      const onRoomDestroyed = vi.fn();
      
      const callbackManager = new RoomManager(
        undefined,
        undefined,
        { onRoomDestroyed }
      );

      callbackManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      });

      callbackManager.destroy(roomId);

      expect(onRoomDestroyed).toHaveBeenCalledTimes(1);
    });
  });
});
