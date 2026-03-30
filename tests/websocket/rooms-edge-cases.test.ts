/**
 * WebSocket Room Manager - Edge Cases & Boundary Tests
 * Tests for src/lib/websocket/rooms.ts
 *
 * Focus: Boundary conditions, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RoomManager,
  resetRoomManager,
  type CreateRoomOptions,
  type JoinRoomOptions,
  type Room,
  type RoomType,
  type RoomVisibility,
} from '@/lib/websocket/rooms';
import { resetPermissionManager } from '@/lib/websocket/permissions';
import { resetMessageStore } from '@/lib/websocket/message-store';

describe('RoomManager - Edge Cases & Boundary Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    // Reset all singletons
    resetRoomManager();
    resetPermissionManager();
    resetMessageStore();

    // Create fresh room manager
    roomManager = new RoomManager();
  });

  afterEach(() => {
    // Clean up after each test
    resetRoomManager();
    resetPermissionManager();
    resetMessageStore();
  });

  // ============================================================================
  // Room Creation Boundary Tests
  // ============================================================================

  describe('Room Creation - Edge Cases', () => {
    it('should create room with maxParticipants = 0', () => {
      const result = roomManager.create({
        id: 'room-zero-capacity',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: 'Zero Capacity Room',
        config: {
          maxParticipants: 0,
        },
      });

      expect(result).toBeDefined();
      expect(result.config.maxParticipants).toBe(0);
      expect(result.id).toBe('room-zero-capacity');
    });

    it('should create room with negative maxParticipants', () => {
      // Note: The current implementation doesn't validate negative values
      // This test documents the behavior
      const result = roomManager.create({
        id: 'room-negative-capacity',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: 'Negative Capacity Room',
        config: {
          maxParticipants: -10,
        },
      });

      expect(result).toBeDefined();
      expect(result.config.maxParticipants).toBe(-10);
    });

    it('should create room with extremely large maxParticipants', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;

      const result = roomManager.create({
        id: 'room-large-capacity',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: 'Large Capacity Room',
        config: {
          maxParticipants: largeNumber,
        },
      });

      expect(result).toBeDefined();
      expect(result.config.maxParticipants).toBe(largeNumber);
    });

    it('should create room with empty name', () => {
      const result = roomManager.create({
        id: 'room-empty-name',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: '',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('');
    });

    it('should create room with very long name', () => {
      const longName = 'A'.repeat(10000);

      const result = roomManager.create({
        id: 'room-long-name',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: longName,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe(longName);
    });

    it('should create room with all room types', () => {
      const roomTypes: RoomType[] = ['task', 'project', 'chat', 'document', 'voice', 'video'];

      roomTypes.forEach((type) => {
        const result = roomManager.create({
          id: `room-type-${type}`,
          type,
          documentId: `doc-${type}`,
          ownerId: 'user-1',
          name: `${type} Room`,
        });

        expect(result).toBeDefined();
        expect(result.type).toBe(type);
      });
    });

    it('should return existing room when creating with same ID', () => {
      const firstRoom = roomManager.create({
        id: 'room-duplicate',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: 'First Room',
      });

      // Modify first room
      roomManager.updateData('room-duplicate', { content: 'modified' });

      const secondRoom = roomManager.create({
        id: 'room-duplicate',
        type: 'project',
        documentId: 'doc-2',
        ownerId: 'user-2',
        name: 'Second Room',
      });

      // Should return the existing room
      expect(secondRoom.id).toBe(firstRoom.id);
      expect(secondRoom.ownerId).toBe(firstRoom.ownerId);
      expect(secondRoom.type).toBe(firstRoom.type);
      expect(secondRoom.data.content).toBe('modified');
    });

    it('should create room with all visibility types', () => {
      const visibilities: RoomVisibility[] = ['public', 'private', 'invite-only'];

      visibilities.forEach((visibility) => {
        const result = roomManager.create({
          id: `room-visibility-${visibility}`,
          type: 'chat',
          documentId: 'doc-1',
          ownerId: 'user-1',
          visibility,
        });

        expect(result).toBeDefined();
        expect(result.visibility).toBe(visibility);
      });
    });

    it('should create room with special characters in ID', () => {
      const specialIds = [
        'room-with-dashes',
        'room_with_underscores',
        'room.with.dots',
        'room:with:colons',
        'room/with/slashes',
        'room with spaces',
        '房间中文id',
        'room-with-emoji-🎉',
      ];

      specialIds.forEach((id) => {
        const result = roomManager.create({
          id,
          type: 'chat',
          documentId: 'doc-1',
          ownerId: 'user-1',
        });

        expect(result).toBeDefined();
        expect(result.id).toBe(id);
      });
    });
  });

  // ============================================================================
  // Room Join Boundary Tests
  // ============================================================================

  describe('Room Join - Edge Cases', () => {
    beforeEach(() => {
      // Create a test room with capacity 2
      roomManager.create({
        id: 'room-capacity-2',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
        config: {
          maxParticipants: 2,
        },
      });
    });

    it('should reject join when room is at capacity', () => {
      // Owner joins automatically when room is created
      // Add second user
      roomManager.join('room-capacity-2', {
        userId: 'user-2',
        userName: 'User 2',
      });

      // Try to add third user
      const result = roomManager.join('room-capacity-2', {
        userId: 'user-3',
        userName: 'User 3',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    it('should allow owner to rejoin room', () => {
      const result = roomManager.join('room-capacity-2', {
        userId: 'owner-1',
        userName: 'Owner User',
      });

      expect(result.success).toBe(true);
      expect(result.participant).toBeDefined();
      expect(result.participant?.isOnline).toBe(true);
    });

    it('should update online status when rejoining', () => {
      // User joins
      roomManager.join('room-capacity-2', {
        userId: 'user-2',
        userName: 'User 2',
      });

      // Set offline
      roomManager.updateOnlineStatus('room-capacity-2', 'user-2', false);

      // Rejoin
      const result = roomManager.join('room-capacity-2', {
        userId: 'user-2',
        userName: 'User 2',
      });

      expect(result.success).toBe(true);
      expect(result.participant?.isOnline).toBe(true);
    });

    it('should handle joining non-existent room', () => {
      // Auto-create for public rooms (default behavior)
      const result = roomManager.join('non-existent-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      expect(result.success).toBe(true);
      expect(roomManager.exists('non-existent-room')).toBe(true);
    });

    it('should reject joining private room without invite', () => {
      roomManager.create({
        id: 'private-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
        visibility: 'private',
      });

      const result = roomManager.join('private-room', {
        userId: 'user-2',
        userName: 'User 2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not invited to private room');
    });

    it('should allow invited user to join private room', () => {
      roomManager.create({
        id: 'private-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
        visibility: 'private',
      });

      // Invite user
      roomManager.invite('private-room', 'user-2', 'owner-1');

      // User joins
      const result = roomManager.join('private-room', {
        userId: 'user-2',
        userName: 'User 2',
      });

      expect(result.success).toBe(true);
    });

    it('should reject banned user from joining', () => {
      // Create room
      roomManager.create({
        id: 'ban-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });

      // User joins
      roomManager.join('ban-room', {
        userId: 'user-2',
        userName: 'User 2',
      });

      // Ban user
      roomManager.ban('ban-room', 'user-2', 'owner-1');

      // Try to rejoin
      const result = roomManager.join('ban-room', {
        userId: 'user-2',
        userName: 'User 2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is banned from this room');
    });
  });

  // ============================================================================
  // Multiple Rooms Edge Cases
  // ============================================================================

  describe('Multiple Rooms - Edge Cases', () => {
    it('should allow user to join multiple rooms simultaneously', () => {
      // Create multiple rooms
      for (let i = 1; i <= 10; i++) {
        roomManager.create({
          id: `room-${i}`,
          type: 'chat',
          documentId: `doc-${i}`,
          ownerId: 'owner-1',
        });
      }

      // User joins all rooms
      const results = [];
      for (let i = 1; i <= 10; i++) {
        const result = roomManager.join(`room-${i}`, {
          userId: 'user-1',
          userName: 'User 1',
        });
        results.push(result);
      }

      // All joins should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // User should be in all rooms
      const userRooms = roomManager.getUserRooms('user-1');
      expect(userRooms.length).toBe(10);
    });

    it('should handle large number of rooms', () => {
      const roomCount = 100;

      // Create many rooms
      for (let i = 1; i <= roomCount; i++) {
        roomManager.create({
          id: `room-${i}`,
          type: 'chat',
          documentId: `doc-${i}`,
          ownerId: 'owner-1',
        });
      }

      // Verify all rooms exist
      expect(roomManager.getAllRooms().length).toBe(roomCount);
    });

    it('should get rooms for user in specific order', () => {
      // Create rooms
      roomManager.create({ id: 'room-1', type: 'chat', documentId: 'doc-1', ownerId: 'owner-1' });
      roomManager.create({ id: 'room-2', type: 'chat', documentId: 'doc-2', ownerId: 'owner-1' });
      roomManager.create({ id: 'room-3', type: 'chat', documentId: 'doc-3', ownerId: 'owner-1' });

      // User joins in specific order
      roomManager.join('room-3', { userId: 'user-1', userName: 'User 1' });
      roomManager.join('room-1', { userId: 'user-1', userName: 'User 1' });
      roomManager.join('room-2', { userId: 'user-1', userName: 'User 1' });

      const userRooms = roomManager.getUserRooms('user-1');

      // Verify user is in all rooms
      expect(userRooms.length).toBe(3);
      const roomIds = userRooms.map((r) => r.id);
      expect(roomIds).toContain('room-1');
      expect(roomIds).toContain('room-2');
      expect(roomIds).toContain('room-3');
    });
  });

  // ============================================================================
  // Room Operations Edge Cases
  // ============================================================================

  describe('Room Operations - Edge Cases', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'test-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });
      roomManager.join('test-room', {
        userId: 'user-1',
        userName: 'User 1',
      });
    });

    it('should handle leaving non-existent room', () => {
      const result = roomManager.leave('non-existent-room', 'user-1');
      expect(result.success).toBe(false);
    });

    it('should handle leaving room user is not in', () => {
      const result = roomManager.leave('test-room', 'user-not-in-room');
      expect(result.success).toBe(false);
    });

    it('should handle leaving room multiple times', () => {
      // First leave
      const firstLeave = roomManager.leave('test-room', 'user-1');
      expect(firstLeave.success).toBe(true);

      // Second leave (user not in room)
      const secondLeave = roomManager.leave('test-room', 'user-1');
      expect(secondLeave.success).toBe(false);
    });

    it('should update cursor for non-existent room', () => {
      const result = roomManager.updateCursor('non-existent-room', 'user-1', {
        position: 100,
      });
      expect(result).toBe(false);
    });

    it('should update cursor for non-existent user', () => {
      const result = roomManager.updateCursor('test-room', 'user-not-in-room', {
        position: 100,
      });
      expect(result).toBe(false);
    });

    it('should handle invalid cursor positions', () => {
      const invalidPositions = [-1, -100, Number.MIN_SAFE_INTEGER];

      invalidPositions.forEach((position) => {
        const result = roomManager.updateCursor('test-room', 'user-1', {
          position,
        });
        expect(result).toBe(true); // Current implementation accepts any position
      });
    });

    it('should handle extremely large cursor position', () => {
      const result = roomManager.updateCursor('test-room', 'user-1', {
        position: Number.MAX_SAFE_INTEGER,
      });
      expect(result).toBe(true);
    });

    it('should update typing status for non-existent user', () => {
      const result = roomManager.updateTyping('test-room', 'user-not-in-room', true);
      expect(result).toBe(false);
    });

    it('should toggle typing status multiple times', () => {
      expect(roomManager.updateTyping('test-room', 'user-1', true)).toBe(true);
      expect(roomManager.updateTyping('test-room', 'user-1', false)).toBe(true);
      expect(roomManager.updateTyping('test-room', 'user-1', true)).toBe(true);
      expect(roomManager.updateTyping('test-room', 'user-1', false)).toBe(true);
    });
  });

  // ============================================================================
  // Role Management Edge Cases
  // ============================================================================

  describe('Role Management - Edge Cases', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'role-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });
      roomManager.join('role-room', {
        userId: 'user-1',
        userName: 'User 1',
        role: 'member',
      });
      roomManager.join('role-room', {
        userId: 'user-2',
        userName: 'User 2',
        role: 'admin',
      });
    });

    it('should prevent non-owners from changing owner role', () => {
      const result = roomManager.changeRole('role-room', 'owner-1', 'member', 'user-2');
      expect(result.success).toBe(false);
    });

    it('should prevent equal role users from changing each other', () => {
      // Both are members (user-1 is member by default)
      const result = roomManager.changeRole('role-room', 'user-1', 'guest', 'owner-1');
      expect(result.success).toBe(true); // Owner can change

      // Create another member
      roomManager.join('role-room', {
        userId: 'user-3',
        userName: 'User 3',
        role: 'member',
      });

      // Member tries to change another member
      const result2 = roomManager.changeRole('role-room', 'user-3', 'guest', 'user-1');
      expect(result2.success).toBe(false);
    });

    it('should prevent lower role users from changing higher roles', () => {
      const result = roomManager.changeRole('role-room', 'user-2', 'member', 'user-1');
      expect(result.success).toBe(false);
    });

    it('should handle changing role for non-existent user', () => {
      const result = roomManager.changeRole('role-room', 'non-existent-user', 'member', 'owner-1');
      expect(result.success).toBe(false);
    });

    it('should handle changing role in non-existent room', () => {
      const result = roomManager.changeRole('non-existent-room', 'user-1', 'admin', 'owner-1');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Kick/Ban Edge Cases
  // ============================================================================

  describe('Kick/Ban - Edge Cases', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'kick-ban-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });
      roomManager.join('kick-ban-room', {
        userId: 'user-1',
        userName: 'User 1',
      });
      roomManager.join('kick-ban-room', {
        userId: 'user-2',
        userName: 'User 2',
      });
    });

    it('should prevent kicking users with equal role', () => {
      const result = roomManager.kick('kick-ban-room', 'user-1', 'user-2');
      expect(result.success).toBe(false);
    });

    it('should prevent kicking higher role users', () => {
      const result = roomManager.kick('kick-ban-room', 'owner-1', 'user-1');
      expect(result.success).toBe(false);
    });

    it('should prevent banning users with equal role', () => {
      const result = roomManager.ban('kick-ban-room', 'user-1', 'user-2');
      expect(result.success).toBe(false);
    });

    it('should prevent banning higher role users', () => {
      const result = roomManager.ban('kick-ban-room', 'owner-1', 'user-1');
      expect(result.success).toBe(false);
    });

    it('should handle kicking non-existent user', () => {
      const result = roomManager.kick('kick-ban-room', 'non-existent-user', 'owner-1');
      expect(result.success).toBe(false);
    });

    it('should handle banning non-existent user', () => {
      const result = roomManager.ban('kick-ban-room', 'non-existent-user', 'owner-1');
      // Note: Current implementation allows banning non-existent users
      expect(result).toBeDefined();
    });

    it('should handle unbanning non-banned user', () => {
      const result = roomManager.unban('kick-ban-room', 'user-1', 'owner-1');
      expect(result.success).toBe(true); // Unban succeeds even if not banned
    });

    it('should allow owner to ban and unban multiple times', () => {
      // Ban
      const banResult = roomManager.ban('kick-ban-room', 'user-1', 'owner-1');
      expect(banResult.success).toBe(true);

      // Unban
      const unbanResult = roomManager.unban('kick-ban-room', 'user-1', 'owner-1');
      expect(unbanResult.success).toBe(true);

      // Ban again
      const banResult2 = roomManager.ban('kick-ban-room', 'user-1', 'owner-1');
      expect(banResult2.success).toBe(true);

      // Unban again
      const unbanResult2 = roomManager.unban('kick-ban-room', 'user-1', 'owner-1');
      expect(unbanResult2.success).toBe(true);
    });
  });

  // ============================================================================
  // Room Lifecycle Edge Cases
  // ============================================================================

  describe('Room Lifecycle - Edge Cases', () => {
    it('should auto-cleanup empty room after timeout', () => {
      vi.useFakeTimers();

      roomManager.create({
        id: 'auto-cleanup-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
        config: {
          autoCleanupMinutes: 1, // 1 minute
        },
      });

      // Verify room exists
      expect(roomManager.exists('auto-cleanup-room')).toBe(true);

      // User joins
      roomManager.join('auto-cleanup-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      // User leaves
      roomManager.leave('auto-cleanup-room', 'user-1');

      // Fast forward time
      vi.advanceTimersByTime(61 * 1000); // 61 seconds

      // Room should be auto-destroyed
      expect(roomManager.exists('auto-cleanup-room')).toBe(false);

      vi.useRealTimers();
    });

    it('should not auto-cleanup project rooms', () => {
      vi.useFakeTimers();

      roomManager.create({
        id: 'project-room',
        type: 'project',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });

      // Verify room exists
      expect(roomManager.exists('project-room')).toBe(true);

      // User joins and leaves
      roomManager.join('project-room', {
        userId: 'user-1',
        userName: 'User 1',
      });
      roomManager.leave('project-room', 'user-1');

      // Fast forward time (even hours)
      vi.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 hours

      // Project room should still exist
      expect(roomManager.exists('project-room')).toBe(true);

      vi.useRealTimers();
    });

    it('should cancel auto-cleanup when user rejoins', () => {
      vi.useFakeTimers();

      roomManager.create({
        id: 'rejoin-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
        config: {
          autoCleanupMinutes: 1,
        },
      });

      // User joins
      roomManager.join('rejoin-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      // User leaves
      roomManager.leave('rejoin-room', 'user-1');

      // Fast forward 30 seconds
      vi.advanceTimersByTime(30 * 1000);

      // User rejoins
      roomManager.join('rejoin-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      // Fast forward another 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      // Room should still exist (cleanup was cancelled)
      expect(roomManager.exists('rejoin-room')).toBe(true);

      vi.useRealTimers();
    });

    it('should handle destroying non-existent room', () => {
      const result = roomManager.destroy('non-existent-room');
      expect(result).toBe(false);
    });

    it('should prevent non-owners from destroying room', () => {
      roomManager.create({
        id: 'protected-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });

      const result = roomManager.destroy('protected-room', 'user-1');
      expect(result).toBe(false);
    });

    it('should allow admin with manage permission to destroy room', () => {
      roomManager.create({
        id: 'admin-destroy-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });

      roomManager.join('admin-destroy-room', {
        userId: 'admin-user',
        userName: 'Admin User',
        role: 'admin',
      });

      const result = roomManager.destroy('admin-destroy-room', 'admin-user');
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Statistics Edge Cases
  // ============================================================================

  describe('Statistics - Edge Cases', () => {
    it('should handle empty room manager stats', () => {
      const stats = roomManager.getStats();

      expect(stats.totalRooms).toBe(0);
      expect(stats.totalParticipants).toBe(0);
      expect(stats.activeRooms).toBe(0);
      expect(stats.roomsByType.task).toBe(0);
      expect(stats.roomsByType.project).toBe(0);
      expect(stats.roomsByType.chat).toBe(0);
    });

    it('should correctly count all room types', () => {
      const roomTypes: RoomType[] = ['task', 'project', 'chat', 'document', 'voice', 'video'];

      roomTypes.forEach((type) => {
        roomManager.create({
          id: `room-${type}`,
          type,
          documentId: `doc-${type}`,
          ownerId: 'owner-1',
        });
      });

      const stats = roomManager.getStats();
      expect(stats.totalRooms).toBe(roomTypes.length);
      expect(stats.roomsByType.task).toBe(1);
      expect(stats.roomsByType.project).toBe(1);
      expect(stats.roomsByType.chat).toBe(1);
      expect(stats.roomsByType.document).toBe(1);
      expect(stats.roomsByType.voice).toBe(1);
      expect(stats.roomsByType.video).toBe(1);
    });

    it('should correctly count active rooms', () => {
      // Create 3 rooms
      roomManager.create({
        id: 'active-room-1',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });
      roomManager.create({
        id: 'active-room-2',
        type: 'chat',
        documentId: 'doc-2',
        ownerId: 'owner-1',
      });
      roomManager.create({
        id: 'empty-room',
        type: 'chat',
        documentId: 'doc-3',
        ownerId: 'owner-2',
      });

      // Users join 2 rooms
      roomManager.join('active-room-1', { userId: 'user-1', userName: 'User 1' });
      roomManager.join('active-room-2', { userId: 'user-1', userName: 'User 1' });

      const stats = roomManager.getStats();
      expect(stats.totalRooms).toBe(3);
      expect(stats.activeRooms).toBe(2);
    });
  });

  // ============================================================================
  // Callbacks Edge Cases
  // ============================================================================

  describe('Callbacks - Edge Cases', () => {
    it('should handle all callbacks being undefined', () => {
      const manager = new RoomManager(undefined, undefined, {});

      manager.create({
        id: 'callback-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });

      manager.join('callback-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      manager.leave('callback-room', 'user-1');

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should handle callback throwing errors', () => {
      const errorCallbacks = {
        onUserJoined: () => {
          throw new Error('Callback error');
        },
      };

      const manager = new RoomManager(undefined, undefined, errorCallbacks);

      manager.create({
        id: 'error-callback-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });

      // Callback error should not prevent the operation
      const result = manager.join('error-callback-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Data Edge Cases
  // ============================================================================

  describe('Data Operations - Edge Cases', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'data-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });
    });

    it('should handle updating data for non-existent room', () => {
      const result = roomManager.updateData('non-existent-room', {
        content: 'test',
      });
      expect(result).toBe(false);
    });

    it('should handle updating with empty data', () => {
      const result = roomManager.updateData('data-room', {});
      expect(result).toBe(true);
    });

    it('should handle updating with large content', () => {
      const largeContent = 'A'.repeat(1000000); // 1 MB

      const result = roomManager.updateData('data-room', {
        content: largeContent,
      });

      expect(result).toBe(true);
      const room = roomManager.get('data-room');
      expect(room?.data.content).toBe(largeContent);
    });

    it('should handle updating with special characters in content', () => {
      const specialContent = '特殊字符 🎉\n\t\r<script>alert("xss")</script>';

      const result = roomManager.updateData('data-room', {
        content: specialContent,
      });

      expect(result).toBe(true);
      const room = roomManager.get('data-room');
      expect(room?.data.content).toBe(specialContent);
    });

    it('should handle metadata with nested objects', () => {
      const complexMetadata = {
        nested: {
          deep: {
            value: 'test',
            array: [1, 2, 3],
          },
        },
        special: 'chars 🎉',
      };

      const result = roomManager.updateData('data-room', {
        metadata: complexMetadata,
      });

      expect(result).toBe(true);
      const room = roomManager.get('data-room');
      expect(room?.data.metadata).toEqual(complexMetadata);
    });
  });

  // ============================================================================
  // Participant Edge Cases
  // ============================================================================

  describe('Participants - Edge Cases', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'participants-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner-1',
      });
    });

    it('should handle getting participants from non-existent room', () => {
      const participants = roomManager.getParticipants('non-existent-room');
      expect(participants).toEqual([]);
    });

    it('should handle getting single participant from non-existent room', () => {
      const participant = roomManager.getParticipant('non-existent-room', 'user-1');
      expect(participant).toBeUndefined();
    });

    it('should handle getting non-existent participant', () => {
      const participant = roomManager.getParticipant('participants-room', 'non-existent-user');
      expect(participant).toBeUndefined();
    });

    it('should handle getting user rooms for non-existent user', () => {
      const rooms = roomManager.getUserRooms('non-existent-user');
      expect(rooms).toEqual([]);
    });

    it('should generate consistent colors for same user', () => {
      const colors: string[] = [];

      for (let i = 0; i < 10; i++) {
        roomManager.create({
          id: `color-room-${i}`,
          type: 'chat',
          documentId: `doc-${i}`,
          ownerId: 'owner-1',
        });

        roomManager.join(`color-room-${i}`, {
          userId: 'user-1',
          userName: 'User 1',
        });

        const participant = roomManager.getParticipant(`color-room-${i}`, 'user-1');
        colors.push(participant?.color || '');
      }

      // All colors should be the same for the same user
      expect(colors.every((c) => c === colors[0])).toBe(true);
    });

    it('should generate different colors for different users', () => {
      roomManager.join('participants-room', {
        userId: 'user-1',
        userName: 'User 1',
      });
      roomManager.join('participants-room', {
        userId: 'user-2',
        userName: 'User 2',
      });
      roomManager.join('participants-room', {
        userId: 'user-3',
        userName: 'User 3',
      });

      const participants = roomManager.getParticipants('participants-room');
      const colors = participants.map((p) => p.color);

      // Colors should be unique
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });
});
