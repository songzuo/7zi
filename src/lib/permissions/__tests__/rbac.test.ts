/**
// @ts-expect-error - Mock type compatibility issues
 * RBAC System Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  Permission,
  Role,
  getRoleDefinition,
  getPermissionsForRoles,
  hasRolePermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  createPermissionContext,
  isAdmin,
  isManagerOrAdmin,
  isMemberOrHigher,
  parsePermission,
  getPermissionsForResource,
  getPermissionsForAction,
} from '../rbac'
import {
  initializeRbacTables,
  getAllRoles,
  getAllPermissions,
  getPermissionsByRole,
  assignPermissionsToRole,
  removePermissionsFromRole,
  addRolesToUser,
  removeRolesFromUser,
  getUserRoles,
  getUserPermissionContext,
  getAllRolesWithCount,
} from '../repository'
import { seedDefaultRolesAndPermissions, needsSeeding } from '../seed'

describe('RBAC Core Functions', () => {
  describe('getRoleDefinition', () => {
    it('should return admin role definition', () => {
      const admin = getRoleDefinition(Role.ADMIN)
      expect(admin).not.toBeNull()
      expect(admin?.id).toBe(Role.ADMIN)
      expect(admin?.name).toBe('Administrator')
      expect(admin?.isSystem).toBe(true)
    })

    it('should return manager role definition', () => {
      const manager = getRoleDefinition(Role.MANAGER)
      expect(manager).not.toBeNull()
      expect(manager?.id).toBe(Role.MANAGER)
      expect(manager?.name).toBe('Manager')
    })

    it('should return null for invalid role', () => {
      const invalid = getRoleDefinition('invalid' as Role)
      expect(invalid).toBeNull()
    })
  })

  describe('getPermissionsForRoles', () => {
    it('should return permissions for single role', () => {
      const permissions = getPermissionsForRoles([Role.VIEWER])
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions).toContain(Permission.USER_READ)
      expect(permissions).toContain(Permission.TEAM_READ)
    })

    it('should merge permissions for multiple roles', () => {
      const permissions = getPermissionsForRoles([Role.VIEWER, Role.MEMBER])
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions).toContain(Permission.USER_READ)
      expect(permissions).toContain(Permission.TASK_CREATE)
      // No duplicates
      expect(permissions).toEqual([...new Set(permissions)])
    })
  })

  describe('hasRolePermission', () => {
    it('should return true for admin with system permissions', () => {
      expect(hasRolePermission(Role.ADMIN, Permission.SYSTEM_MANAGE)).toBe(true)
      expect(hasRolePermission(Role.ADMIN, Permission.USER_DELETE)).toBe(true)
    })

    it('should return false for viewer with write permissions', () => {
      expect(hasRolePermission(Role.VIEWER, Permission.USER_CREATE)).toBe(false)
      expect(hasRolePermission(Role.VIEWER, Permission.TASK_UPDATE)).toBe(false)
    })

    it('should return true for viewer with read permissions', () => {
      expect(hasRolePermission(Role.VIEWER, Permission.USER_READ)).toBe(true)
      expect(hasRolePermission(Role.VIEWER, Permission.TEAM_READ)).toBe(true)
    })
  })

  describe('hasPermission', () => {
    it('should check user permissions from context', () => {
      const context = createPermissionContext('user1', [Role.ADMIN])
      expect(hasPermission(context, Permission.USER_DELETE)).toBe(true)
      expect(hasPermission(context, Permission.SYSTEM_MANAGE)).toBe(true)
    })

    it('should respect custom permissions', () => {
      const context = createPermissionContext(
        'user1',
        [Role.MEMBER],
        [
          Permission.USER_DELETE, // Extra permission not in member role
        ]
      )
      expect(hasPermission(context, Permission.USER_DELETE)).toBe(true)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if any permission matches', () => {
      const context = createPermissionContext('user1', [Role.MEMBER])
      expect(hasAnyPermission(context, [Permission.USER_DELETE, Permission.USER_READ])).toBe(true)
    })

    it('should return false if none match', () => {
      const context = createPermissionContext('user1', [Role.VIEWER])
      expect(hasAnyPermission(context, [Permission.USER_DELETE, Permission.SYSTEM_MANAGE])).toBe(
        false
      )
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if all permissions match', () => {
      const context = createPermissionContext('user1', [Role.ADMIN])
      const result = hasAllPermissions(context, [Permission.USER_READ, Permission.TEAM_READ])
      expect(result.allowed).toBe(true)
      expect(result.missingPermissions).toBeUndefined()
    })

    it('should return false with missing permissions', () => {
      const context = createPermissionContext('user1', [Role.VIEWER])
      const result = hasAllPermissions(context, [Permission.USER_READ, Permission.USER_CREATE])
      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain(Permission.USER_CREATE)
    })
  })

  describe('hasRole', () => {
    it('should return true if user has role', () => {
      const context = createPermissionContext('user1', [Role.ADMIN, Role.MANAGER])
      expect(hasRole(context, Role.ADMIN)).toBe(true)
      expect(hasRole(context, Role.MANAGER)).toBe(true)
    })

    it('should return false if user does not have role', () => {
      const context = createPermissionContext('user1', [Role.MEMBER])
      expect(hasRole(context, Role.ADMIN)).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('should return true if user has any of the roles', () => {
      const context = createPermissionContext('user1', [Role.MEMBER])
      expect(hasAnyRole(context, [Role.ADMIN, Role.MANAGER, Role.MEMBER])).toBe(true)
    })

    it('should return false if user has none of the roles', () => {
      const context = createPermissionContext('user1', [Role.VIEWER])
      expect(hasAnyRole(context, [Role.ADMIN, Role.MANAGER])).toBe(false)
    })
  })

  describe('hasAllRoles', () => {
    it('should return true if user has all roles', () => {
      const context = createPermissionContext('user1', [Role.ADMIN, Role.MANAGER])
      expect(hasAllRoles(context, [Role.ADMIN, Role.MANAGER])).toBe(true)
    })

    it('should return false if user is missing a role', () => {
      const context = createPermissionContext('user1', [Role.ADMIN])
      expect(hasAllRoles(context, [Role.ADMIN, Role.MANAGER])).toBe(false)
    })
  })

  describe('Role helpers', () => {
    it('should detect admin users', () => {
      const adminContext = createPermissionContext('admin', [Role.ADMIN])
      expect(isAdmin(adminContext)).toBe(true)

      const managerContext = createPermissionContext('manager', [Role.MANAGER])
      expect(isAdmin(managerContext)).toBe(false)
    })

    it('should detect manager or admin users', () => {
      const adminContext = createPermissionContext('admin', [Role.ADMIN])
      expect(isManagerOrAdmin(adminContext)).toBe(true)

      const managerContext = createPermissionContext('manager', [Role.MANAGER])
      expect(isManagerOrAdmin(managerContext)).toBe(true)

      const memberContext = createPermissionContext('member', [Role.MEMBER])
      expect(isManagerOrAdmin(memberContext)).toBe(false)
    })

    it('should detect member or higher users', () => {
      const adminContext = createPermissionContext('admin', [Role.ADMIN])
      expect(isMemberOrHigher(adminContext)).toBe(true)

      const memberContext = createPermissionContext('member', [Role.MEMBER])
      expect(isMemberOrHigher(memberContext)).toBe(true)

      const viewerContext = createPermissionContext('viewer', [Role.VIEWER])
      expect(isMemberOrHigher(viewerContext)).toBe(false)
    })
  })

  describe('parsePermission', () => {
    it('should parse permission string', () => {
      const parsed = parsePermission(Permission.USER_READ)
      expect(parsed.resource).toBe('user')
      expect(parsed.action).toBe('read')
    })
  })

  describe('getPermissionsForResource', () => {
    it('should get all permissions for a resource', () => {
      const userPermissions = getPermissionsForResource('user')
      expect(userPermissions).toContain(Permission.USER_READ)
      expect(userPermissions).toContain(Permission.USER_CREATE)
      expect(userPermissions).toContain(Permission.USER_DELETE)
    })
  })

  describe('getPermissionsForAction', () => {
    it('should get all permissions for an action', () => {
      const readPermissions = getPermissionsForAction('read')
      expect(readPermissions).toContain(Permission.USER_READ)
      expect(readPermissions).toContain(Permission.TEAM_READ)
      expect(readPermissions).toContain(Permission.TASK_READ)
    })
  })
})

describe('RBAC Repository', () => {
  beforeAll(async () => {
    await initializeRbacTables()
  })

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      const roles = await getAllRoles()
      expect(roles.length).toBeGreaterThan(0)
    })
  })

  describe('getAllRolesWithCount', () => {
    it('should return roles with user count', async () => {
      const roles = await getAllRolesWithCount()
      expect(roles.length).toBeGreaterThan(0)
      roles.forEach(role => {
        expect(role).toHaveProperty('userCount')
        expect(typeof role.userCount).toBe('number')
      })
    })
  })

  describe('getPermissionsByRole', () => {
    it('should return permissions for admin role', async () => {
      const permissions = await getPermissionsByRole(Role.ADMIN)
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions).toContain(Permission.SYSTEM_MANAGE)
    })
  })

  describe('User role management', () => {
    const testUserId = `test_${Date.now()}`

    it('should add roles to user', async () => {
      await addRolesToUser(testUserId, [Role.ADMIN, Role.MANAGER])
      const roles = await getUserRoles(testUserId)
      expect(roles).toContain(Role.ADMIN)
      expect(roles).toContain(Role.MANAGER)
    })

    it('should remove roles from user', async () => {
      await removeRolesFromUser(testUserId, [Role.MANAGER])
      const roles = await getUserRoles(testUserId)
      expect(roles).toContain(Role.ADMIN)
      expect(roles).not.toContain(Role.MANAGER)
    })
  })

  describe('getUserPermissionContext', () => {
    it('should return permission context for user', async () => {
      const testUserId = `test_${Date.now()}`
      await addRolesToUser(testUserId, [Role.MEMBER, Role.VIEWER])

      const context = await getUserPermissionContext(testUserId)
      expect(context).not.toBeNull()
      expect(context?.userId).toBe(testUserId)
      expect(context?.roles).toContain(Role.MEMBER)
      expect(context?.permissions.length).toBeGreaterThan(0)
    })
  })
})

describe('RBAC Seeding', () => {
  it('should detect if seeding is needed', async () => {
    const needs = await needsSeeding()
    expect(typeof needs).toBe('boolean')
  })

  it('should seed default roles and permissions', async () => {
    const result = await seedDefaultRolesAndPermissions()
    expect(result.success).toBe(true)
    expect(result.rolesSeeded.length).toBeGreaterThan(0)
  })
})
