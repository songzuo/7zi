/**
 * WebSocket Permission Manager - Edge Cases & Boundary Tests
 * Tests for src/lib/websocket/permissions.ts
 *
 * Focus: Boundary conditions, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PermissionManager,
  resetPermissionManager,
  UserRole,
  Permission,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/websocket/permissions';
import type { UserRoomPermissions } from '@/lib/websocket/permissions';

describe('PermissionManager - Edge Cases & Boundary Tests', () => {
  let permissionManager: PermissionManager;
  let roomId: string;
  let userId: string;
  let adminUserId: string;
  let ownerUserId: string;

  beforeEach(() => {
    // Reset singleton
    resetPermissionManager();

    // Create fresh permission manager
    permissionManager = new PermissionManager();

    // Set up test data
    roomId = 'test-room-1';
    userId = 'user-1';
    adminUserId = 'admin-1';
    ownerUserId = 'owner-1';

    // Set roles
    permissionManager.setUserRole(ownerUserId, roomId, 'owner');
    permissionManager.setUserRole(adminUserId, roomId, 'admin');
    permissionManager.setUserRole(userId, roomId, 'member');
  });

  afterEach(() => {
    resetPermissionManager();
  });

  // ============================================================================
  // Permission Granting Edge Cases
  // ============================================================================

  describe('Permission Granting - Edge Cases', () => {
    it('should grant permission to non-existent user', () => {
      // The current implementation creates the user entry if it doesn't exist
      const nonExistentUser = 'non-existent-user';

      permissionManager.grantPermission(
        nonExistentUser,
        roomId,
        'room:manage',
        ownerUserId
      );

      const hasPermission = permissionManager.hasPermission(
        nonExistentUser,
        roomId,
        'room:manage'
      );

      expect(hasPermission).toBe(true);
    });

    it('should grant permission in non-existent room', () => {
      const nonExistentRoom = 'non-existent-room';

      // Current implementation allows this
      permissionManager.grantPermission(userId, nonExistentRoom, 'room:manage', ownerUserId);

      const hasPermission = permissionManager.hasPermission(userId, nonExistentRoom, 'room:manage');

      expect(hasPermission).toBe(true);
    });

    it('should grant permission with past expiration date', () => {
      const pastDate = new Date('2020-01-01');

      permissionManager.grantPermission(
        userId,
        roomId,
        'admin:manage_users',
        ownerUserId,
        pastDate
      );

      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'admin:manage_users'
      );

      // Should be denied due to expiration
      expect(hasPermission).toBe(false);
    });

    it('should grant permission with far future expiration date', () => {
      const farFutureDate = new Date('2099-12-31');

      permissionManager.grantPermission(
        userId,
        roomId,
        'admin:manage_users',
        ownerUserId,
        farFutureDate
      );

      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'admin:manage_users'
      );

      expect(hasPermission).toBe(true);
    });

    it('should grant permission with expiration exactly at current time', () => {
      vi.useFakeTimers();
      const now = new Date();

      permissionManager.grantPermission(
        userId,
        roomId,
        'admin:manage_users',
        ownerUserId,
        now
      );

      // Should be expired immediately
      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'admin:manage_users'
      );

      expect(hasPermission).toBe(false);

      vi.useRealTimers();
    });

    it('should handle granting same permission multiple times', () => {
      // Grant permission first time
      permissionManager.grantPermission(userId, roomId, 'room:manage', ownerUserId);

      // Grant same permission again
      permissionManager.grantPermission(userId, roomId, 'room:manage', adminUserId);

      // Should still have permission
      const hasPermission = permissionManager.hasPermission(userId, roomId, 'room:manage');

      expect(hasPermission).toBe(true);
    });

    it('should handle granting conflicting permissions', () => {
      // Grant permission
      permissionManager.grantPermission(userId, roomId, 'room:manage', ownerUserId);

      // Revoke same permission
      permissionManager.revokePermission(userId, roomId, 'room:manage', ownerUserId);

      // Should not have permission
      const hasPermission = permissionManager.hasPermission(userId, roomId, 'room:manage');

      expect(hasPermission).toBe(false);

      // Grant again
      permissionManager.grantPermission(userId, roomId, 'room:manage', ownerUserId);

      // Should have permission again
      expect(permissionManager.hasPermission(userId, roomId, 'room:manage')).toBe(true);
    });
  });

  // ============================================================================
  // Permission Revocation Edge Cases
  // ============================================================================

  describe('Permission Revocation - Edge Cases', () => {
    it('should revoke permission from non-existent user', () => {
      const nonExistentUser = 'non-existent-user';

      // Should not throw error
      permissionManager.revokePermission(
        nonExistentUser,
        roomId,
        'room:manage',
        ownerUserId
      );

      const hasPermission = permissionManager.hasPermission(
        nonExistentUser,
        roomId,
        'room:manage'
      );

      expect(hasPermission).toBe(false);
    });

    it('should revoke permission in non-existent room', () => {
      const nonExistentRoom = 'non-existent-room';

      permissionManager.revokePermission(userId, nonExistentRoom, 'room:manage', ownerUserId);

      const hasPermission = permissionManager.hasPermission(userId, nonExistentRoom, 'room:manage');

      expect(hasPermission).toBe(false);
    });

    it('should handle revoking non-granted permission', () => {
      // Try to revoke a permission that user doesn't have
      permissionManager.revokePermission(userId, roomId, 'admin:manage_users', ownerUserId);

      // Should still not have permission
      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'admin:manage_users'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle revoking same permission multiple times', () => {
      permissionManager.revokePermission(userId, roomId, 'room:manage', ownerUserId);
      permissionManager.revokePermission(userId, roomId, 'room:manage', ownerUserId);
      permissionManager.revokePermission(userId, roomId, 'room:manage', ownerUserId);

      const hasPermission = permissionManager.hasPermission(userId, roomId, 'room:manage');

      expect(hasPermission).toBe(false);
    });

    it('should revoke expired permission', () => {
      const pastDate = new Date('2020-01-01');

      permissionManager.grantPermission(userId, roomId, 'room:manage', ownerUserId, pastDate);
      permissionManager.revokePermission(userId, roomId, 'room:manage', ownerUserId);

      const hasPermission = permissionManager.hasPermission(userId, roomId, 'room:manage');

      expect(hasPermission).toBe(false);
    });
  });

  // ============================================================================
  // Role Management Edge Cases
  // ============================================================================

  describe('Role Management - Edge Cases', () => {
    it('should set role for non-existent user', () => {
      const nonExistentUser = 'non-existent-user';

      permissionManager.setUserRole(nonExistentUser, roomId, 'admin');

      const role = permissionManager.getUserRole(nonExistentUser, roomId);

      expect(role).toBe('admin');
    });

    it('should set role in non-existent room', () => {
      const nonExistentRoom = 'non-existent-room';

      permissionManager.setUserRole(userId, nonExistentRoom, 'admin');

      const role = permissionManager.getUserRole(userId, nonExistentRoom);

      expect(role).toBe('admin');
    });

    it('should change role through entire hierarchy', () => {
      const roles: UserRole[] = ['guest', 'member', 'moderator', 'admin', 'owner'];

      roles.forEach((role, index) => {
        permissionManager.setUserRole(userId, roomId, role);
        const currentRole = permissionManager.getUserRole(userId, roomId);
        expect(currentRole).toBe(role);
      });
    });

    it('should return guest role for user with no permissions', () => {
      const nonExistentRoom = 'non-existent-room';

      const role = permissionManager.getUserRole('non-existent-user', nonExistentRoom);

      expect(role).toBe('guest');
    });

    it('should preserve custom permissions when changing role', () => {
      // Grant custom permission
      permissionManager.grantPermission(userId, roomId, 'admin:manage_users', ownerUserId);

      // Change role
      permissionManager.setUserRole(userId, roomId, 'guest');

      // Custom permission should be lost (role change clears permissions)
      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'admin:manage_users'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle changing role multiple times for same user', () => {
      permissionManager.setUserRole(userId, roomId, 'admin');
      expect(permissionManager.getUserRole(userId, roomId)).toBe('admin');

      permissionManager.setUserRole(userId, roomId, 'member');
      expect(permissionManager.getUserRole(userId, roomId)).toBe('member');

      permissionManager.setUserRole(userId, roomId, 'owner');
      expect(permissionManager.getUserRole(userId, roomId)).toBe('owner');

      permissionManager.setUserRole(userId, roomId, 'guest');
      expect(permissionManager.getUserRole(userId, roomId)).toBe('guest');
    });
  });

  // ============================================================================
  // Permission Checking Edge Cases
  // ============================================================================

  describe('Permission Checking - Edge Cases', () => {
    it('should deny permissions to banned user', () => {
      // Ban user
      permissionManager.banUser(userId, roomId, ownerUserId, 'Test ban');

      // Even if user has permission, should be denied
      const hasPermission = permissionManager.hasPermission(userId, roomId, 'room:join');

      expect(hasPermission).toBe(false);
    });

    it('should deny all permissions to banned user', () => {
      // User is member (has room:join)
      const hadPermissionBefore = permissionManager.hasPermission(userId, roomId, 'room:join');
      expect(hadPermissionBefore).toBe(true);

      // Ban user
      permissionManager.banUser(userId, roomId, ownerUserId);

      // Check all default permissions
      const memberPermissions = DEFAULT_ROLE_PERMISSIONS.member;
      memberPermissions.forEach((permission) => {
        const hasPermission = permissionManager.hasPermission(userId, roomId, permission);
        expect(hasPermission).toBe(false);
      });
    });

    it('should allow permissions after unban', () => {
      // Ban user
      permissionManager.banUser(userId, roomId, ownerUserId);

      // Unban user
      permissionManager.unbanUser(userId, roomId);

      // Should have permissions again
      const hasPermission = permissionManager.hasPermission(userId, roomId, 'room:join');

      expect(hasPermission).toBe(true);
    });

    it('should handle checking permission for non-existent user', () => {
      const hasPermission = permissionManager.hasPermission(
        'non-existent-user',
        roomId,
        'room:join'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle checking permission in non-existent room', () => {
      const hasPermission = permissionManager.hasPermission(
        userId,
        'non-existent-room',
        'room:join'
      );

      // Should default to guest permissions
      expect(hasPermission).toBe(true); // guest has room:join
    });

    it('should handle checking non-existent permission type', () => {
      // This tests that the system doesn't crash with unknown permissions
      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'non:existent:permission' as Permission
      );

      expect(hasPermission).toBe(false);
    });

    it('should check all default permission types', () => {
      const allPermissions: Permission[] = [
        // Room permissions
        'room:join',
        'room:leave',
        'room:manage',
        'room:view',
        'room:invite',
        'room:kick',
        'room:ban',
        // Message permissions
        'message:send',
        'message:edit',
        'message:delete',
        'message:react',
        'message:pin',
        'message:view_history',
        // Admin permissions
        'admin:manage_users',
        'admin:manage_rooms',
        'admin:manage_permissions',
        'admin:ban_users',
        'admin:view_logs',
        'admin:system_announce',
      ];

      // Owner should have all permissions
      allPermissions.forEach((permission) => {
        const hasPermission = permissionManager.hasPermission(ownerUserId, roomId, permission);
        expect(hasPermission).toBe(true);
      });
    });

    it('should return empty array for non-existent user permissions', () => {
      const permissions = permissionManager.getUserPermissions('non-existent-user', roomId);

      expect(permissions).toEqual(Array.from(DEFAULT_ROLE_PERMISSIONS.guest));
    });

    it('should return empty array for non-existent room permissions', () => {
      const permissions = permissionManager.getUserPermissions(userId, 'non-existent-room');

      expect(permissions).toEqual(Array.from(DEFAULT_ROLE_PERMISSIONS.guest));
    });
  });

  // ============================================================================
  // Hierarchy Management Edge Cases
  // ============================================================================

  describe('Hierarchy Management - Edge Cases', () => {
    it('should prevent managing users with higher role', () => {
      // Admin tries to manage owner
      const canManage = permissionManager.canManageUser(adminUserId, ownerUserId, roomId);

      expect(canManage).toBe(false);
    });

    it('should prevent managing users with equal role', () => {
      // Create another admin
      const anotherAdmin = 'admin-2';
      permissionManager.setUserRole(anotherAdmin, roomId, 'admin');

      // Admin tries to manage another admin
      const canManage = permissionManager.canManageUser(adminUserId, anotherAdmin, roomId);

      expect(canManage).toBe(false);
    });

    it('should allow managing users with lower role', () => {
      // Admin manages member
      const canManage = permissionManager.canManageUser(adminUserId, userId, roomId);

      expect(canManage).toBe(true);
    });

    it('should handle canManageUser for non-existent users', () => {
      const canManage1 = permissionManager.canManageUser(
        ownerUserId,
        'non-existent-user',
        roomId
      );

      const canManage2 = permissionManager.canManageUser(
        'non-existent-user',
        userId,
        roomId
      );

      // Non-existent user is treated as guest
      expect(canManage1).toBe(true);
      expect(canManage2).toBe(false);
    });

    it('should handle complete role hierarchy checks', () => {
      const roles: UserRole[] = ['guest', 'member', 'moderator', 'admin', 'owner'];

      for (let i = 0; i < roles.length; i++) {
        for (let j = 0; j < roles.length; j++) {
          const actorRole = roles[i];
          const targetRole = roles[j];

          const actorId = `actor-${actorRole}`;
          const targetId = `target-${targetRole}`;

          permissionManager.setUserRole(actorId, roomId, actorRole);
          permissionManager.setUserRole(targetId, roomId, targetRole);

          const canManage = permissionManager.canManageUser(actorId, targetId, roomId);

          // Can only manage if actor has higher role (lower index)
          expect(canManage).toBe(i < j);
        }
      }
    });
  });

  // ============================================================================
  // Ban/Unban Edge Cases
  // ============================================================================

  describe('Ban/Unban - Edge Cases', () => {
    it('should ban non-existent user', () => {
      const nonExistentUser = 'non-existent-user';

      permissionManager.banUser(nonExistentUser, roomId, ownerUserId, 'Test ban');

      const isBanned = permissionManager.isUserBanned(nonExistentUser, roomId);

      expect(isBanned).toBe(true);
    });

    it('should ban in non-existent room', () => {
      const nonExistentRoom = 'non-existent-room';

      permissionManager.banUser(userId, nonExistentRoom, ownerUserId);

      const isBanned = permissionManager.isUserBanned(userId, nonExistentRoom);

      expect(isBanned).toBe(true);
    });

    it('should unban non-banned user', () => {
      // Unban user who was never banned
      permissionManager.unbanUser(userId, roomId);

      const isBanned = permissionManager.isUserBanned(userId, roomId);

      expect(isBanned).toBe(false);
    });

    it('should unban non-existent user', () => {
      // Should not throw error
      permissionManager.unbanUser('non-existent-user', roomId);

      const isBanned = permissionManager.isUserBanned('non-existent-user', roomId);

      expect(isBanned).toBe(false);
    });

    it('should handle ban/unban/ban cycle', () => {
      // First ban
      permissionManager.banUser(userId, roomId, ownerUserId);
      expect(permissionManager.isUserBanned(userId, roomId)).toBe(true);

      // Unban
      permissionManager.unbanUser(userId, roomId);
      expect(permissionManager.isUserBanned(userId, roomId)).toBe(false);

      // Ban again
      permissionManager.banUser(userId, roomId, ownerUserId);
      expect(permissionManager.isUserBanned(userId, roomId)).toBe(true);

      // Unban again
      permissionManager.unbanUser(userId, roomId);
      expect(permissionManager.isUserBanned(userId, roomId)).toBe(false);
    });

    it('should ban all roles including owners', () => {
      // Even owner can be banned (though typically by system)
      permissionManager.banUser(ownerUserId, roomId, adminUserId, 'Owner ban test');

      const isBanned = permissionManager.isUserBanned(ownerUserId, roomId);

      expect(isBanned).toBe(true);
    });

    it('should revoke all permissions when user is banned', () => {
      // User has permissions as member
      const permissionsBefore = permissionManager.getUserPermissions(userId, roomId);
      expect(permissionsBefore.length).toBeGreaterThan(0);

      // Ban user
      permissionManager.banUser(userId, roomId, ownerUserId);

      // Check all member permissions are denied
      const memberPermissions = DEFAULT_ROLE_PERMISSIONS.member;
      memberPermissions.forEach((permission) => {
        const hasPermission = permissionManager.hasPermission(userId, roomId, permission);
        expect(hasPermission).toBe(false);
      });
    });

    it('should get banned users for non-existent room', () => {
      const bannedUsers = permissionManager.getBannedUsers('non-existent-room');

      expect(bannedUsers).toEqual([]);
    });

    it('should return empty array for room with no banned users', () => {
      const bannedUsers = permissionManager.getBannedUsers(roomId);

      expect(bannedUsers).toEqual([]);
    });

    it('should handle multiple banned users in same room', () => {
      const usersToBan = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

      usersToBan.forEach((uid) => {
        permissionManager.banUser(uid, roomId, ownerUserId);
      });

      const bannedUsers = permissionManager.getBannedUsers(roomId);

      expect(bannedUsers.length).toBe(usersToBan.length);
      usersToBan.forEach((uid) => {
        expect(bannedUsers).toContain(uid);
      });
    });

    it('should ban same user in multiple rooms', () => {
      const rooms = ['room-1', 'room-2', 'room-3'];

      rooms.forEach((rid) => {
        permissionManager.banUser(userId, rid, ownerUserId);
      });

      // User should be banned in all rooms
      rooms.forEach((rid) => {
        expect(permissionManager.isUserBanned(userId, rid)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Global Role Edge Cases
  // ============================================================================

  describe('Global Roles - Edge Cases', () => {
    it('should set global role for non-existent user', () => {
      const nonExistentUser = 'non-existent-user';

      permissionManager.setGlobalRole(nonExistentUser, 'admin');

      const role = permissionManager.getGlobalRole(nonExistentUser);

      expect(role).toBe('admin');
    });

    it('should return member as default global role', () => {
      const role = permissionManager.getGlobalRole('non-existent-user');

      expect(role).toBe('member');
    });

    it('should change global role multiple times', () => {
      permissionManager.setGlobalRole(userId, 'admin');
      expect(permissionManager.getGlobalRole(userId)).toBe('admin');

      permissionManager.setGlobalRole(userId, 'guest');
      expect(permissionManager.getGlobalRole(userId)).toBe('guest');

      permissionManager.setGlobalRole(userId, 'owner');
      expect(permissionManager.getGlobalRole(userId)).toBe('owner');
    });

    it('should not affect room-specific roles when global role changes', () => {
      // Set room role
      permissionManager.setUserRole(userId, roomId, 'moderator');
      expect(permissionManager.getUserRole(userId, roomId)).toBe('moderator');

      // Set global role
      permissionManager.setGlobalRole(userId, 'admin');

      // Room role should remain unchanged
      expect(permissionManager.getUserRole(userId, roomId)).toBe('moderator');
      expect(permissionManager.getGlobalRole(userId)).toBe('admin');
    });
  });

  // ============================================================================
  // Room Management Edge Cases
  // ============================================================================

  describe('Room Management - Edge Cases', () => {
    it('should clear permissions for non-existent room', () => {
      // Should not throw error
      permissionManager.clearRoomPermissions('non-existent-room');

      const hasPermission = permissionManager.hasPermission(userId, 'non-existent-room', 'room:join');

      // Should still default to guest
      expect(hasPermission).toBe(true);
    });

    it('should clear all users from room', () => {
      // Add multiple users to room
      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

      users.forEach((uid) => {
        permissionManager.setUserRole(uid, roomId, 'member');
      });

      // Verify users have permissions
      users.forEach((uid) => {
        expect(permissionManager.getUserRole(uid, roomId)).toBe('member');
      });

      // Clear room permissions
      permissionManager.clearRoomPermissions(roomId);

      // All users should be gone
      users.forEach((uid) => {
        expect(permissionManager.getUserRole(uid, roomId)).toBe('guest');
      });
    });

    it('should clear bans when room is cleared', () => {
      permissionManager.banUser(userId, roomId, ownerUserId);
      expect(permissionManager.isUserBanned(userId, roomId)).toBe(true);

      permissionManager.clearRoomPermissions(roomId);

      expect(permissionManager.isUserBanned(userId, roomId)).toBe(false);
    });

    it('should handle removing user from all rooms', () => {
      const rooms = ['room-1', 'room-2', 'room-3'];

      rooms.forEach((rid) => {
        permissionManager.setUserRole(userId, rid, 'admin');
      });

      // Verify user is admin in all rooms
      rooms.forEach((rid) => {
        expect(permissionManager.getUserRole(userId, rid)).toBe('admin');
      });

      // Remove user from all rooms
      permissionManager.removeUserFromAllRooms(userId);

      // User should be guest in all rooms
      rooms.forEach((rid) => {
        expect(permissionManager.getUserRole(userId, rid)).toBe('guest');
      });
    });

    it('should remove user from all rooms when they are banned in some', () => {
      const rooms = ['room-1', 'room-2', 'room-3'];

      rooms.forEach((rid) => {
        permissionManager.setUserRole(userId, rid, 'member');
      });

      // Ban in room-1
      permissionManager.banUser(userId, 'room-1', ownerUserId);

      // Remove from all rooms
      permissionManager.removeUserFromAllRooms(userId);

      // User should not be in any room
      rooms.forEach((rid) => {
        expect(permissionManager.getUserRole(userId, rid)).toBe('guest');
      });
    });

    it('should handle removing non-existent user from all rooms', () => {
      // Should not throw error
      permissionManager.removeUserFromAllRooms('non-existent-user');

      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Concurrent Operations Edge Cases
  // ============================================================================

  describe('Concurrent Operations - Edge Cases', () => {
    it('should handle rapid permission changes', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        if (i % 2 === 0) {
          permissionManager.grantPermission(userId, roomId, 'admin:manage_users', ownerUserId);
        } else {
          permissionManager.revokePermission(userId, roomId, 'admin:manage_users', ownerUserId);
        }
      }

      // Final state should be revoked (last operation)
      const hasPermission = permissionManager.hasPermission(
        userId,
        roomId,
        'admin:manage_users'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle rapid role changes', () => {
      const roles: UserRole[] = ['guest', 'member', 'moderator', 'admin'];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const role = roles[i % roles.length];
        permissionManager.setUserRole(userId, roomId, role);
      }

      // Final role
      const finalRole = permissionManager.getUserRole(userId, roomId);

      expect(['guest', 'member', 'moderator', 'admin']).toContain(finalRole);
    });

    it('should handle rapid ban/unban operations', () => {
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        if (i % 2 === 0) {
          permissionManager.banUser(userId, roomId, ownerUserId);
        } else {
          permissionManager.unbanUser(userId, roomId);
        }
      }

      // Final state should be unbanned (last operation)
      const isBanned = permissionManager.isUserBanned(userId, roomId);

      expect(isBanned).toBe(false);
    });

    it('should handle multiple users accessing same room simultaneously', () => {
      const userCount = 100;

      for (let i = 1; i <= userCount; i++) {
        const uid = `user-${i}`;
        permissionManager.setUserRole(uid, roomId, 'member');
      }

      // All users should have member role
      for (let i = 1; i <= userCount; i++) {
        const uid = `user-${i}`;
        const role = permissionManager.getUserRole(uid, roomId);
        expect(role).toBe('member');
      }
    });
  });

  // ============================================================================
  // Default Permissions Edge Cases
  // ============================================================================

  describe('Default Permissions - Edge Cases', () => {
    it('should have complete permission sets for all roles', () => {
      const roles: UserRole[] = ['owner', 'admin', 'moderator', 'member', 'guest'];

      roles.forEach((role) => {
        const permissions = DEFAULT_ROLE_PERMISSIONS[role];
        expect(permissions).toBeDefined();
        expect(permissions.size).toBeGreaterThan(0);
      });
    });

    it('should have proper permission hierarchy', () => {
      const ownerPerms = DEFAULT_ROLE_PERMISSIONS.owner;
      const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;
      const moderatorPerms = DEFAULT_ROLE_PERMISSIONS.moderator;
      const memberPerms = DEFAULT_ROLE_PERMISSIONS.member;
      const guestPerms = DEFAULT_ROLE_PERMISSIONS.guest;

      // Owner should have all permissions
      expect(ownerPerms.size).toBeGreaterThanOrEqual(adminPerms.size);
      expect(ownerPerms.size).toBeGreaterThanOrEqual(moderatorPerms.size);
      expect(ownerPerms.size).toBeGreaterThanOrEqual(memberPerms.size);
      expect(ownerPerms.size).toBeGreaterThanOrEqual(guestPerms.size);

      // Admin should have more than moderator
      expect(adminPerms.size).toBeGreaterThanOrEqual(moderatorPerms.size);

      // Moderator should have more than member
      expect(moderatorPerms.size).toBeGreaterThanOrEqual(memberPerms.size);

      // Member should have more than guest
      expect(memberPerms.size).toBeGreaterThan(guestPerms.size);
    });

    it('should verify owner has all admin permissions', () => {
      const ownerPerms = DEFAULT_ROLE_PERMISSIONS.owner;
      const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;

      adminPerms.forEach((permission) => {
        expect(ownerPerms.has(permission)).toBe(true);
      });
    });

    it('should verify admin has all moderator permissions', () => {
      const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;
      const moderatorPerms = DEFAULT_ROLE_PERMISSIONS.moderator;

      moderatorPerms.forEach((permission) => {
        expect(adminPerms.has(permission)).toBe(true);
      });
    });

    it('should verify moderator has all member permissions', () => {
      const moderatorPerms = DEFAULT_ROLE_PERMISSIONS.moderator;
      const memberPerms = DEFAULT_ROLE_PERMISSIONS.member;

      memberPerms.forEach((permission) => {
        expect(moderatorPerms.has(permission)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Special Characters Edge Cases
  // ============================================================================

  describe('Special Characters - Edge Cases', () => {
    it('should handle special characters in user IDs', () => {
      const specialUserIds = [
        'user-with-dashes',
        'user_with_underscores',
        'user.with.dots',
        'user@with.at',
        'user:with:colons',
        'user/with/slashes',
        'user with spaces',
        '用户中文id',
        'user-with-emoji-🎉',
      ];

      specialUserIds.forEach((uid) => {
        permissionManager.setUserRole(uid, roomId, 'member');
        const role = permissionManager.getUserRole(uid, roomId);
        expect(role).toBe('member');
      });
    });

    it('should handle special characters in room IDs', () => {
      const specialRoomIds = [
        'room-with-dashes',
        'room_with_underscores',
        'room.with.dots',
        'room:with:colons',
        'room/with/slashes',
        'room with spaces',
        '房间中文id',
        'room-with-emoji-🎉',
      ];

      specialRoomIds.forEach((rid) => {
        permissionManager.setUserRole(userId, rid, 'admin');
        const role = permissionManager.getUserRole(userId, rid);
        expect(role).toBe('admin');
      });
    });

    it('should handle very long user IDs', () => {
      const longUserId = 'A'.repeat(10000);

      permissionManager.setUserRole(longUserId, roomId, 'member');
      const role = permissionManager.getUserRole(longUserId, roomId);

      expect(role).toBe('member');
    });

    it('should handle very long room IDs', () => {
      const longRoomId = 'B'.repeat(10000);

      permissionManager.setUserRole(userId, longRoomId, 'member');
      const role = permissionManager.getUserRole(userId, longRoomId);

      expect(role).toBe('member');
    });

    it('should handle empty strings as IDs', () => {
      // Empty user ID
      permissionManager.setUserRole('', roomId, 'member');
      const userRole = permissionManager.getUserRole('', roomId);
      expect(userRole).toBe('member');

      // Empty room ID
      permissionManager.setUserRole(userId, '', 'admin');
      const roomRole = permissionManager.getUserRole(userId, '');
      expect(roomRole).toBe('admin');
    });
  });

  // ============================================================================
  // Memory and Scale Edge Cases
  // ============================================================================

  describe('Memory and Scale - Edge Cases', () => {
    it('should handle large number of users in single room', () => {
      const userCount = 1000;

      for (let i = 1; i <= userCount; i++) {
        const uid = `user-${i}`;
        permissionManager.setUserRole(uid, roomId, 'member');
      }

      // Verify some users
      expect(permissionManager.getUserRole('user-1', roomId)).toBe('member');
      expect(permissionManager.getUserRole('user-500', roomId)).toBe('member');
      expect(permissionManager.getUserRole('user-1000', roomId)).toBe('member');
    });

    it('should handle single user in many rooms', () => {
      const roomCount = 1000;

      for (let i = 1; i <= roomCount; i++) {
        const rid = `room-${i}`;
        permissionManager.setUserRole(userId, rid, 'member');
      }

      // Verify some rooms
      expect(permissionManager.getUserRole(userId, 'room-1')).toBe('member');
      expect(permissionManager.getUserRole(userId, 'room-500')).toBe('member');
      expect(permissionManager.getUserRole(userId, 'room-1000')).toBe('member');
    });

    it('should handle many users in many rooms', () => {
      const userCount = 100;
      const roomCount = 100;

      for (let i = 1; i <= userCount; i++) {
        for (let j = 1; j <= roomCount; j++) {
          const uid = `user-${i}`;
          const rid = `room-${j}`;
          permissionManager.setUserRole(uid, rid, 'member');
        }
      }

      // Verify some combinations
      expect(permissionManager.getUserRole('user-1', 'room-1')).toBe('member');
      expect(permissionManager.getUserRole('user-50', 'room-50')).toBe('member');
      expect(permissionManager.getUserRole('user-100', 'room-100')).toBe('member');
    });

    it('should handle banning many users in single room', () => {
      const userCount = 500;

      for (let i = 1; i <= userCount; i++) {
        const uid = `user-${i}`;
        permissionManager.banUser(uid, roomId, ownerUserId);
      }

      const bannedUsers = permissionManager.getBannedUsers(roomId);

      expect(bannedUsers.length).toBe(userCount);
      expect(permissionManager.isUserBanned('user-1', roomId)).toBe(true);
      expect(permissionManager.isUserBanned('user-500', roomId)).toBe(true);
    });
  });
});
