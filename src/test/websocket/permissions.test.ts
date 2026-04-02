/**
 * Permission System Unit Tests
 *
 * Tests for WebSocket Permission Management functionality
 * Covers: Role management, permission checks, banning, user management
 */

import { describe, it, expect, beforeEach } from 'vitest'
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
} from '@/lib/websocket/permissions'

describe('PermissionManager', () => {
  let manager: PermissionManager
  const roomId = 'test-room'
  const user1Id = 'user1'
  const user2Id = 'user2'
  const adminId = 'admin'

  beforeEach(() => {
    resetPermissionManager()
    manager = getPermissionManager()
  })

  describe('Role Management', () => {
    it('should set and get user roles', () => {
      manager.setUserRole(user1Id, roomId, 'admin', adminId)

      const role = manager.getUserRole(user1Id, roomId)
      expect(role).toBe('admin')
    })

    it('should default to guest role for unknown users', () => {
      const role = manager.getUserRole('unknown', roomId)
      expect(role).toBe('guest')
    })

    it('should update role permissions when role changes', () => {
      manager.setUserRole(user1Id, roomId, 'member')
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false)

      manager.setUserRole(user1Id, roomId, 'admin')
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(true)
    })
  })

  describe('Permission Checks', () => {
    it('should grant permissions based on role', () => {
      manager.setUserRole(user1Id, roomId, 'admin')

      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'admin:manage_users')).toBe(true)
    })

    it('should respect role permission limits', () => {
      manager.setUserRole(user1Id, roomId, 'member')

      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false)
      expect(manager.hasPermission(user1Id, roomId, 'admin:manage_users')).toBe(false)
    })

    it('should allow guest with limited permissions', () => {
      manager.setUserRole(user1Id, roomId, 'guest')

      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'message:send')).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'message:edit')).toBe(false)
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false)
    })

    it('should use default guest permissions for unknown rooms', () => {
      // No permissions set for this user/room
      const result = manager.hasPermission(user1Id, 'unknown-room', 'room:join')
      expect(result).toBe(true) // Guest has room:join
    })
  })

  describe('Granular Permission Management', () => {
    it('should grant specific permissions', () => {
      manager.setUserRole(user1Id, roomId, 'member')

      // Member doesn't have room:manage by default
      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false)

      // Grant specific permission
      manager.grantPermission(user1Id, roomId, 'room:manage', adminId)

      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(true)
    })

    it('should revoke specific permissions', () => {
      manager.setUserRole(user1Id, roomId, 'member')

      // Member has room:join by default
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true)

      // Revoke specific permission
      manager.revokePermission(user1Id, roomId, 'room:join', adminId)

      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(false)
    })

    it('should handle permission expiration', () => {
      manager.grantPermission(
        user1Id,
        roomId,
        'room:manage',
        adminId,
        new Date(Date.now() - 1000) // Expired
      )

      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(false)
    })

    it('should grant permissions with future expiration', () => {
      manager.grantPermission(
        user1Id,
        roomId,
        'room:manage',
        adminId,
        new Date(Date.now() + 60000) // Expires in 1 minute
      )

      expect(manager.hasPermission(user1Id, roomId, 'room:manage')).toBe(true)
    })
  })

  describe('User Banning', () => {
    it('should ban users from rooms', () => {
      manager.setUserRole(user1Id, roomId, 'admin')
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(true)

      manager.banUser(user1Id, roomId, adminId)
      expect(manager.isUserBanned(user1Id, roomId)).toBe(true)
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(false)
    })

    it('should unban users from rooms', () => {
      manager.banUser(user1Id, roomId, adminId)
      expect(manager.isUserBanned(user1Id, roomId)).toBe(true)

      manager.unbanUser(user1Id, roomId)
      expect(manager.isUserBanned(user1Id, roomId)).toBe(false)
    })

    it('should list banned users', () => {
      manager.banUser(user1Id, roomId, adminId)
      manager.banUser(user2Id, roomId, adminId)

      const banned = manager.getBannedUsers(roomId)
      expect(banned).toContain(user1Id)
      expect(banned).toContain(user2Id)
      expect(banned).toHaveLength(2)
    })

    it('should revoke all permissions when banning', () => {
      manager.setUserRole(user1Id, roomId, 'admin')

      const permissionsBefore = manager.getUserPermissions(user1Id, roomId)
      expect(permissionsBefore.length).toBeGreaterThan(0)

      manager.banUser(user1Id, roomId, adminId)

      // Banned user has no permissions
      expect(manager.hasPermission(user1Id, roomId, 'room:join')).toBe(false)
    })
  })

  describe('User Management', () => {
    it('should check if user can manage another user', () => {
      manager.setUserRole(adminId, roomId, 'admin')
      manager.setUserRole(user1Id, roomId, 'member')

      expect(manager.canManageUser(adminId, user1Id, roomId)).toBe(true)
      expect(manager.canManageUser(user1Id, adminId, roomId)).toBe(false)
    })

    it('should not allow managing users with equal roles', () => {
      manager.setUserRole(user1Id, roomId, 'member')
      manager.setUserRole(user2Id, roomId, 'member')

      expect(manager.canManageUser(user1Id, user2Id, roomId)).toBe(false)
    })

    it('should respect role hierarchy', () => {
      // owner > admin > moderator > member > guest
      manager.setUserRole('owner', roomId, 'owner')
      manager.setUserRole('admin', roomId, 'admin')
      manager.setUserRole('mod', roomId, 'moderator')
      manager.setUserRole('member', roomId, 'member')
      manager.setUserRole('guest', roomId, 'guest')

      // Owner can manage everyone
      expect(manager.canManageUser('owner', 'admin', roomId)).toBe(true)
      expect(manager.canManageUser('owner', 'guest', roomId)).toBe(true)

      // Admin can manage moderator, member, guest
      expect(manager.canManageUser('admin', 'mod', roomId)).toBe(true)
      expect(manager.canManageUser('admin', 'member', roomId)).toBe(true)
      expect(manager.canManageUser('admin', 'owner', roomId)).toBe(false)

      // Guest cannot manage anyone
      expect(manager.canManageUser('guest', 'member', roomId)).toBe(false)
    })
  })

  describe('Global Roles', () => {
    it('should set and get global roles', () => {
      manager.setGlobalRole(user1Id, 'admin')

      const role = manager.getGlobalRole(user1Id)
      expect(role).toBe('admin')
    })

    it('should default to member for unknown global roles', () => {
      const role = manager.getGlobalRole('unknown')
      expect(role).toBe('member')
    })
  })

  describe('Utility Functions', () => {
    it('should create permission checker', () => {
      manager.setUserRole(user1Id, roomId, 'admin')

      const checker = createPermissionChecker(manager, user1Id, roomId)

      expect(checker('room:join')).toBe(true)
      expect(checker('message:send')).toBe(true)
    })

    it('should check multiple permissions', () => {
      manager.setUserRole(user1Id, roomId, 'member')

      const results = checkPermissions(manager, user1Id, roomId, [
        'room:join',
        'room:manage',
        'message:send',
      ])

      expect(results['room:join']).toBe(true)
      expect(results['room:manage']).toBe(false)
      expect(results['message:send']).toBe(true)
    })

    it('should get all user permissions', () => {
      manager.setUserRole(user1Id, roomId, 'admin')

      const permissions = manager.getUserPermissions(user1Id, roomId)

      expect(permissions).toContain('room:join')
      expect(permissions).toContain('room:manage')
      expect(permissions).toContain('message:send')
      expect(permissions).toContain('admin:manage_users')
    })

    it('should return guest permissions for unknown user', () => {
      const permissions = manager.getUserPermissions('unknown', roomId)
      expect(permissions).toContain('room:join')
      expect(permissions).toContain('message:send')
    })
  })

  describe('Cleanup', () => {
    it('should clear room permissions', () => {
      manager.setUserRole(user1Id, roomId, 'admin')
      manager.banUser(user2Id, roomId, adminId)

      manager.clearRoomPermissions(roomId)

      expect(manager.getUserRole(user1Id, roomId)).toBe('guest')
      expect(manager.isUserBanned(user2Id, roomId)).toBe(false)
    })

    it('should remove user from all rooms', () => {
      const room1 = 'room1'
      const room2 = 'room2'

      manager.setUserRole(user1Id, room1, 'admin')
      manager.setUserRole(user1Id, room2, 'admin')

      manager.removeUserFromAllRooms(user1Id)

      expect(manager.getUserRole(user1Id, room1)).toBe('guest')
      expect(manager.getUserRole(user1Id, room2)).toBe('guest')
    })
  })
})

describe('DEFAULT_ROLE_PERMISSIONS', () => {
  it('should have correct permissions for owner', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.owner
    expect(perms).toContain('room:join')
    expect(perms).toContain('room:manage')
    expect(perms).toContain('message:send')
    expect(perms).toContain('admin:manage_users')
    expect(perms).toContain('admin:manage_permissions')
  })

  it('should have correct permissions for admin', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.admin
    expect(perms).toContain('room:join')
    expect(perms).toContain('room:manage')
    expect(perms).toContain('message:send')
    expect(perms).not.toContain('admin:manage_permissions')
  })

  it('should have correct permissions for moderator', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.moderator
    expect(perms).toContain('room:join')
    expect(perms).toContain('room:kick')
    expect(perms).toContain('message:send')
    expect(perms).toContain('message:delete')
    expect(perms).not.toContain('room:manage')
  })

  it('should have correct permissions for member', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.member
    expect(perms).toContain('room:join')
    expect(perms).toContain('message:send')
    expect(perms).not.toContain('room:manage')
    expect(perms).not.toContain('room:kick')
  })

  it('should have correct permissions for guest', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.guest
    expect(perms).toContain('room:join')
    expect(perms).toContain('message:send')
    expect(perms).not.toContain('message:edit')
    expect(perms).not.toContain('room:manage')
  })

  it('should have progressive permission sets', () => {
    // Guest < Member < Moderator < Admin < Owner
    const guestCount = DEFAULT_ROLE_PERMISSIONS.guest.size
    const memberCount = DEFAULT_ROLE_PERMISSIONS.member.size
    const modCount = DEFAULT_ROLE_PERMISSIONS.moderator.size
    const adminCount = DEFAULT_ROLE_PERMISSIONS.admin.size
    const ownerCount = DEFAULT_ROLE_PERMISSIONS.owner.size

    expect(guestCount).toBeLessThan(memberCount)
    expect(memberCount).toBeLessThan(modCount)
    expect(modCount).toBeLessThan(adminCount)
    expect(adminCount).toBeLessThan(ownerCount)
  })
})
