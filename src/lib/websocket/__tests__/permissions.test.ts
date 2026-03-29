/**
 * Permission System Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PermissionManager,
  getPermissionManager,
  resetPermissionManager,
  UserRole,
  RoomPermission,
  MessagePermission,
  AdminPermission,
  DEFAULT_ROLE_PERMISSIONS,
  createPermissionChecker,
  checkPermissions,
} from '../permissions';

describe('PermissionManager', () => {
  let manager: PermissionManager;
  const roomId = 'test-room';
  const user1Id = 'user1';
  const user2Id = 'user2';
  const adminId = 'admin';

  beforeEach(() => {
    resetPermissionManager();
    manager = getPermissionManager();
  });

  describe('Role Management', () => {
    it('should set and get user roles', () => {
      manager.setUserRole(user1Id, roomId, 'admin', adminId);
      
      const role = manager.getUserRole(user1Id, roomId);
      expect(role).toBe('admin');
    });

    it('should default to guest role for unknown users', () => {
      const role = manager.getUserRole('unknown', roomId);
      expect(role).toBe('guest');
    });
  });

  describe('Permission Checks', () => {
    it('should grant permissions based on role', () => {
      manager.setUserRole(user1Id, roomId, 'admin');
      
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'admin:manage_users')).toBe(true);
    });

    it('should respect role permission limits', () => {
      manager.setUserRole(user1Id, roomId, 'member');
      
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false);
      expect(manager.hasPermission(user1Id, roomId, 'admin:manage_users')).toBe(false);
    });

    it('should allow guest with limited permissions', () => {
      manager.setUserRole(user1Id, roomId, 'guest');
      
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'message:edit')).toBe(false);
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false);
    });
  });

  describe('Granular Permission Management', () => {
    it('should grant specific permissions', () => {
      manager.setUserRole(user1Id, roomId, 'member');
      
      // Member doesn't have room:manage by default
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false);
      
      // Grant specific permission
      manager.grantPermission(user1Id, roomId, 'room:manage', adminId);
      
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(true);
    });

    it('should revoke specific permissions', () => {
      manager.setUserRole(user1Id, roomId, 'member');
      
      // Member has room:join by default
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true);
      
      // Revoke specific permission
      manager.revokePermission(user1Id, roomId, 'room:join', adminId);
      
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(false);
    });

    it('should handle permission expiration', () => {
      manager.grantPermission(
        user1Id,
        roomId,
        'room:manage',
        adminId,
        new Date(Date.now() - 1000) // Expired
      );
      
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false);
    });
  });

  describe('User Banning', () => {
    it('should ban users from rooms', () => {
      manager.setUserRole(user1Id, roomId, 'admin');
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true);
      
      manager.banUser(user1Id, roomId, adminId);
      expect(manager.isUserBanned(user1Id, roomId)).toBe(true);
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(false);
    });

    it('should unban users from rooms', () => {
      manager.banUser(user1Id, roomId, adminId);
      expect(manager.isUserBanned(user1Id, roomId)).toBe(true);
      
      manager.unbanUser(user1Id, roomId);
      expect(manager.isUserBanned(user1Id, roomId)).toBe(false);
    });

    it('should list banned users', () => {
      manager.banUser(user1Id, roomId, adminId);
      manager.banUser(user2Id, roomId, adminId);
      
      const banned = manager.getBannedUsers(roomId);
      expect(banned).toContain(user1Id);
      expect(banned).toContain(user2Id);
      expect(banned).toHaveLength(2);
    });
  });

  describe('User Management', () => {
    it('should check if user can manage another user', () => {
      manager.setUserRole(adminId, roomId, 'admin');
      manager.setUserRole(user1Id, roomId, 'member');
      
      expect(manager.canManageUser(adminId, user1Id, roomId)).toBe(true);
      expect(manager.canManageUser(user1Id, adminId, roomId)).toBe(false);
    });

    it('should not allow managing users with equal roles', () => {
      manager.setUserRole(user1Id, roomId, 'member');
      manager.setUserRole(user2Id, roomId, 'member');
      
      expect(manager.canManageUser(user1Id, user2Id, roomId)).toBe(false);
    });
  });

  describe('Global Roles', () => {
    it('should set and get global roles', () => {
      manager.setGlobalRole(user1Id, 'admin');
      
      const role = manager.getGlobalRole(user1Id);
      expect(role).toBe('admin');
    });

    it('should default to member for unknown global roles', () => {
      const role = manager.getGlobalRole('unknown');
      expect(role).toBe('member');
    });
  });

  describe('Utility Functions', () => {
    it('should create permission checker', () => {
      manager.setUserRole(user1Id, roomId, 'admin');
      
      const checker = createPermissionChecker(manager, user1Id, roomId);
      
      expect(checker('room:join')).toBe(true);
      expect(checker('message:send')).toBe(true);
    });

    it('should check multiple permissions', () => {
      manager.setUserRole(user1Id, roomId, 'member');
      
      const results = checkPermissions(
        manager,
        user1Id,
        roomId,
        ['room:join', 'room:manage', 'message:send']
      );
      
      expect(results['room:join']).toBe(true);
      expect(results['room:manage']).toBe(false);
      expect(results['message:send']).toBe(true);
    });

    it('should get all user permissions', () => {
      manager.setUserRole(user1Id, roomId, 'admin');
      
      const permissions = manager.getUserPermissions(user1Id, roomId);
      
      expect(permissions).toContain('room:join');
      expect(permissions).toContain('room:manage');
      expect(permissions).toContain('message:send');
      expect(permissions).toContain('admin:manage_users');
    });
  });

  describe('Cleanup', () => {
    it('should clear room permissions', () => {
      manager.setUserRole(user1Id, roomId, 'admin');
      manager.banUser(user2Id, roomId, adminId);
      
      manager.clearRoomPermissions(roomId);
      
      expect(manager.getUserRole(user1Id, roomId)).toBe('guest');
      expect(manager.isUserBanned(user2Id, roomId)).toBe(false);
    });

    it('should remove user from all rooms', () => {
      const room1 = 'room1';
      const room2 = 'room2';
      
      manager.setUserRole(user1Id, room1, 'admin');
      manager.setUserRole(user1Id, room2, 'admin');
      
      manager.removeUserFromAllRooms(user1Id);
      
      expect(manager.getUserRole(user1Id, room1)).toBe('guest');
      expect(manager.getUserRole(user1Id, room2)).toBe('guest');
    });
  });
});

describe('DEFAULT_ROLE_PERMISSIONS', () => {
  it('should have correct permissions for owner', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.owner;
    expect(perms).toContain('room:join');
    expect(perms).toContain('room:manage');
    expect(perms).toContain('message:send');
    expect(perms).toContain('admin:manage_users');
  });

  it('should have correct permissions for admin', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.admin;
    expect(perms).toContain('room:join');
    expect(perms).toContain('room:manage');
    expect(perms).toContain('message:send');
    expect(perms).not.toContain('admin:manage_permissions');
  });

  it('should have correct permissions for moderator', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.moderator;
    expect(perms).toContain('room:join');
    expect(perms).toContain('room:kick');
    expect(perms).toContain('message:send');
    expect(perms).toContain('message:delete');
    expect(perms).not.toContain('room:manage');
  });

  it('should have correct permissions for member', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.member;
    expect(perms).toContain('room:join');
    expect(perms).toContain('message:send');
    expect(perms).not.toContain('room:manage');
    expect(perms).not.toContain('room:kick');
  });

  it('should have correct permissions for guest', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.guest;
    expect(perms).toContain('room:join');
    expect(perms).toContain('message:send');
    expect(perms).not.toContain('message:edit');
    expect(perms).not.toContain('room:manage');
  });
});
