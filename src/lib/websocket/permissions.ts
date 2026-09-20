// @ts-nocheck
/**
 * WebSocket Permission System
 *
 * Comprehensive permission control for rooms, messages, and admin functions
 * Supports role-based access control (RBAC) and fine-grained permissions
 */

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Room-level permissions
 */
export type RoomPermission =
  | 'room:join'
  | 'room:leave'
  | 'room:manage'
  | 'room:view'
  | 'room:invite'
  | 'room:kick'
  | 'room:ban'

/**
 * Message-level permissions
 */
export type MessagePermission =
  | 'message:send'
  | 'message:edit'
  | 'message:delete'
  | 'message:react'
  | 'message:pin'
  | 'message:view_history'

/**
 * Admin-level permissions
 */
export type AdminPermission =
  | 'admin:manage_users'
  | 'admin:manage_rooms'
  | 'admin:manage_permissions'
  | 'admin:ban_users'
  | 'admin:view_logs'
  | 'admin:system_announce'

/**
 * All permission types
 */
export type Permission = RoomPermission | MessagePermission | AdminPermission

/**
 * User roles with predefined permission sets
 */
export type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest'

/**
 * Permission grant entry
 */
export interface PermissionGrant {
  permission: Permission
  granted: boolean
  grantedBy?: string
  grantedAt: Date
  expiresAt?: Date
}

/**
 * User permissions in a room
 */
export interface UserRoomPermissions {
  userId: string
  roomId: string
  role: UserRole
  permissions: Map<Permission, PermissionGrant>
  grantedAt: Date
}

// ============================================================================
// Default Permission Sets by Role
// ============================================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  owner: new Set<Permission>([
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
  ]),
  admin: new Set<Permission>([
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
    'admin:view_logs',
    'admin:system_announce',
  ]),
  moderator: new Set<Permission>([
    // Room permissions
    'room:join',
    'room:leave',
    'room:view',
    'room:invite',
    'room:kick',
    // Message permissions
    'message:send',
    'message:edit',
    'message:delete',
    'message:react',
    'message:pin',
    'message:view_history',
  ]),
  member: new Set<Permission>([
    // Room permissions
    'room:join',
    'room:leave',
    'room:view',
    'room:invite',
    // Message permissions
    'message:send',
    'message:edit',
    'message:react',
    'message:view_history',
  ]),
  guest: new Set<Permission>([
    // Room permissions
    'room:join',
    'room:leave',
    'room:view',
    // Message permissions
    'message:send',
    'message:react',
  ]),
}

// ============================================================================
// Permission Manager Class
// ============================================================================

export class PermissionManager {
  private roomPermissions: Map<string, Map<string, UserRoomPermissions>> = new Map()
  private globalRoles: Map<string, UserRole> = new Map()
  private bannedUsers: Map<string, Set<string>> = new Map() // roomId -> Set of userIds

  /**
   * Get or create user permissions for a room
   */
  private getOrCreateUserPermissions(
    userId: string,
    roomId: string,
    role: UserRole = 'member'
  ): UserRoomPermissions {
    if (!this.roomPermissions.has(roomId)) {
      this.roomPermissions.set(roomId, new Map())
    }

    const roomPerms = this.roomPermissions.get(roomId)!

    if (!roomPerms.has(userId)) {
      const permissions = new Map<Permission, PermissionGrant>()
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role]

      defaultPerms.forEach(perm => {
        permissions.set(perm, {
          permission: perm,
          granted: true,
          grantedAt: new Date(),
        })
      })

      roomPerms.set(userId, {
        userId,
        roomId,
        role,
        permissions,
        grantedAt: new Date(),
      })
    }

    return roomPerms.get(userId)!
  }

  /**
   * Set user role in a room
   */
  setUserRole(userId: string, roomId: string, role: UserRole, grantedBy?: string): void {
    const userPerms = this.getOrCreateUserPermissions(userId, roomId, role)
    userPerms.role = role

    // Update permissions based on new role
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role]
    userPerms.permissions.clear()

    defaultPerms.forEach(perm => {
      userPerms.permissions.set(perm, {
        permission: perm,
        granted: true,
        grantedBy,
        grantedAt: new Date(),
      })
    })
  }

  /**
   * Get user role in a room
   */
  getUserRole(userId: string, roomId: string): UserRole {
    const roomPerms = this.roomPermissions.get(roomId)
    if (!roomPerms) return 'guest'

    const userPerms = roomPerms.get(userId)
    return userPerms?.role ?? 'guest'
  }

  /**
   * Check if user has a specific permission in a room
   */
  hasPermission(userId: string, roomId: string, permission: Permission): boolean {
    // Check if user is banned
    if (this.isUserBanned(userId, roomId)) {
      return false
    }

    const roomPerms = this.roomPermissions.get(roomId)
    if (!roomPerms) {
      // Default to guest permissions for unknown rooms
      return DEFAULT_ROLE_PERMISSIONS.guest.has(permission)
    }

    const userPerms = roomPerms.get(userId)
    if (!userPerms) {
      return DEFAULT_ROLE_PERMISSIONS.guest.has(permission)
    }

    const grant = userPerms.permissions.get(permission)
    if (!grant) return false

    // Check expiration
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      return false
    }

    return grant.granted
  }

  /**
   * Grant a specific permission to a user in a room
   */
  grantPermission(
    userId: string,
    roomId: string,
    permission: Permission,
    grantedBy: string,
    expiresAt?: Date
  ): void {
    const userPerms = this.getOrCreateUserPermissions(userId, roomId)

    userPerms.permissions.set(permission, {
      permission,
      granted: true,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
    })
  }

  /**
   * Revoke a specific permission from a user in a room
   */
  revokePermission(
    userId: string,
    roomId: string,
    permission: Permission,
    revokedBy: string
  ): void {
    const userPerms = this.getOrCreateUserPermissions(userId, roomId)

    userPerms.permissions.set(permission, {
      permission,
      granted: false,
      grantedBy: revokedBy,
      grantedAt: new Date(),
    })
  }

  /**
   * Get all permissions for a user in a room
   */
  getUserPermissions(userId: string, roomId: string): Permission[] {
    const roomPerms = this.roomPermissions.get(roomId)
    if (!roomPerms) {
      return Array.from(DEFAULT_ROLE_PERMISSIONS.guest)
    }

    const userPerms = roomPerms.get(userId)
    if (!userPerms) {
      return Array.from(DEFAULT_ROLE_PERMISSIONS.guest)
    }

    return Array.from(userPerms.permissions.entries())
      .filter(
        ([_perm, grant]) => grant.granted && (!grant.expiresAt || grant.expiresAt > new Date())
      )
      .map(([perm]) => perm)
  }

  /**
   * Ban a user from a room
   */
  banUser(userId: string, roomId: string, bannedBy: string, _reason?: string): void {
    if (!this.bannedUsers.has(roomId)) {
      this.bannedUsers.set(roomId, new Set())
    }

    this.bannedUsers.get(roomId)!.add(userId)

    // Also revoke all permissions
    const roomPerms = this.roomPermissions.get(roomId)
    if (roomPerms) {
      const userPerms = roomPerms.get(userId)
      if (userPerms) {
        userPerms.permissions.forEach((__grant, perm) => {
          userPerms.permissions.set(perm, {
            permission: perm,
            granted: false,
            grantedBy: bannedBy,
            grantedAt: new Date(),
          })
        })
      }
    }
  }

  /**
   * Unban a user from a room
   */
  unbanUser(userId: string, roomId: string): void {
    const banned = this.bannedUsers.get(roomId)
    if (banned) {
      banned.delete(userId)
    }
  }

  /**
   * Check if a user is banned from a room
   */
  isUserBanned(userId: string, roomId: string): boolean {
    const banned = this.bannedUsers.get(roomId)
    return banned?.has(userId) ?? false
  }

  /**
   * Get all banned users for a room
   */
  getBannedUsers(roomId: string): string[] {
    const banned = this.bannedUsers.get(roomId)
    return banned ? Array.from(banned) : []
  }

  /**
   * Set global role for a user (applies to all rooms they create)
   */
  setGlobalRole(userId: string, role: UserRole): void {
    this.globalRoles.set(userId, role)
  }

  /**
   * Get global role for a user
   */
  getGlobalRole(userId: string): UserRole {
    return this.globalRoles.get(userId) ?? 'member'
  }

  /**
   * Check if user can perform action on another user
   */
  canManageUser(actorId: string, targetId: string, roomId: string): boolean {
    const actorRole = this.getUserRole(actorId, roomId)
    const targetRole = this.getUserRole(targetId, roomId)

    // Role hierarchy: owner > admin > moderator > member > guest
    const roleHierarchy: UserRole[] = ['owner', 'admin', 'moderator', 'member', 'guest']

    return roleHierarchy.indexOf(actorRole) < roleHierarchy.indexOf(targetRole)
  }

  /**
   * Clear all permissions for a room
   */
  clearRoomPermissions(roomId: string): void {
    this.roomPermissions.delete(roomId)
    this.bannedUsers.delete(roomId)
  }

  /**
   * Remove user from all rooms
   */
  removeUserFromAllRooms(userId: string): void {
    this.roomPermissions.forEach(roomPerms => {
      roomPerms.delete(userId)
    })

    this.bannedUsers.forEach(banned => {
      banned.delete(userId)
    })

    this.globalRoles.delete(userId)
  }
}

// ============================================================================
// Permission Check Helpers
// ============================================================================

/**
 * Create a permission check function for a specific room
 */
export function createPermissionChecker(
  manager: PermissionManager,
  userId: string,
  roomId: string
): (permission: Permission) => boolean {
  return (permission: Permission) => manager.hasPermission(userId, roomId, permission)
}

/**
 * Check multiple permissions at once
 */
export function checkPermissions(
  manager: PermissionManager,
  userId: string,
  roomId: string,
  permissions: Permission[]
): { [key in Permission]?: boolean } {
  const result: { [key in Permission]?: boolean } = {}

  permissions.forEach(perm => {
    result[perm] = manager.hasPermission(userId, roomId, perm)
  })

  return result
}

// ============================================================================
// Singleton Instance
// ============================================================================

let permissionManagerInstance: PermissionManager | null = null

export function getPermissionManager(): PermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager()
  }
  return permissionManagerInstance
}

export function resetPermissionManager(): void {
  permissionManagerInstance = null
}
