/**
 * Permissions Module Tests
 * Tests for src/lib/permissions.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ResourceType,
  ActionType,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
  checkPermission,
  checkPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getUserPermissions,
  getRolePermissions,
  type Permission,
  type PermissionCheckResult,
  type PermissionContext,
} from '@/lib/permissions'

describe('Permissions Module', () => {
  describe('ResourceType enum', () => {
    it('should have USER resource type', () => {
      expect(ResourceType.USER).toBe('user')
    })

    it('should have TEAM resource type', () => {
      expect(ResourceType.TEAM).toBe('team')
    })

    it('should have PROJECT resource type', () => {
      expect(ResourceType.PROJECT).toBe('project')
    })

    it('should have SYSTEM resource type', () => {
      expect(ResourceType.SYSTEM).toBe('system')
    })
  })

  describe('ActionType enum', () => {
    it('should have CREATE action type', () => {
      expect(ActionType.CREATE).toBe('create')
    })

    it('should have READ action type', () => {
      expect(ActionType.READ).toBe('read')
    })

    it('should have UPDATE action type', () => {
      expect(ActionType.UPDATE).toBe('update')
    })

    it('should have DELETE action type', () => {
      expect(ActionType.DELETE).toBe('delete')
    })

    it('should have MANAGE action type', () => {
      expect(ActionType.MANAGE).toBe('manage')
    })
  })

  describe('SYSTEM_PERMISSIONS', () => {
    it('should have user permissions', () => {
      const userPermissions = SYSTEM_PERMISSIONS.filter(p => p.resourceType === ResourceType.USER)

      expect(userPermissions.length).toBeGreaterThan(0)
      expect(userPermissions.some(p => p.id === 'user:read')).toBe(true)
      expect(userPermissions.some(p => p.id === 'user:create')).toBe(true)
      expect(userPermissions.some(p => p.id === 'user:update')).toBe(true)
      expect(userPermissions.some(p => p.id === 'user:delete')).toBe(true)
    })

    it('should have team permissions', () => {
      const teamPermissions = SYSTEM_PERMISSIONS.filter(p => p.resourceType === ResourceType.TEAM)

      expect(teamPermissions.length).toBeGreaterThan(0)
      expect(teamPermissions.some(p => p.id === 'team:create')).toBe(true)
      expect(teamPermissions.some(p => p.id === 'team:manage')).toBe(true)
    })

    it('should have project permissions', () => {
      const projectPermissions = SYSTEM_PERMISSIONS.filter(
        p => p.resourceType === ResourceType.PROJECT
      )

      expect(projectPermissions.length).toBeGreaterThan(0)
      expect(projectPermissions.some(p => p.id === 'project:create')).toBe(true)
      expect(projectPermissions.some(p => p.id === 'project:delete')).toBe(true)
    })

    it('should mark system permissions as system', () => {
      const nonSystemPermissions = SYSTEM_PERMISSIONS.filter(p => !p.isSystem)

      expect(nonSystemPermissions.length).toBe(0)
    })
  })

  describe('SYSTEM_ROLES', () => {
    it('should have ADMIN role', () => {
      const adminRole = SYSTEM_ROLES.find(r => r.id === 'admin')

      expect(adminRole).toBeDefined()
      expect(adminRole?.name).toBe('Admin')
      expect(adminRole?.level).toBeGreaterThan(0)
    })

    it('should have USER role', () => {
      const userRole = SYSTEM_ROLES.find(r => r.id === 'user')

      expect(userRole).toBeDefined()
      expect(userRole?.name).toBe('User')
    })

    it('should have permissions assigned to roles', () => {
      SYSTEM_ROLES.forEach(role => {
        expect(Array.isArray(role.permissions)).toBe(true)
      })
    })

    it('should mark system roles as system', () => {
      const nonSystemRoles = SYSTEM_ROLES.filter(r => !r.isSystem)

      expect(nonSystemRoles.length).toBe(0)
    })
  })

  describe('checkPermission', () => {
    const mockUser = {
      id: 'user-1',
      role: 'admin',
      permissions: ['user:read', 'user:create', 'project:read'],
    }

    it('should allow access when user has permission', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceType: ResourceType.USER,
      }

      const result = checkPermission('user:read', mockUser, context)

      expect(result.allowed).toBe(true)
    })

    it('should deny access when user lacks permission', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceType: ResourceType.USER,
      }

      const result = checkPermission('user:delete', mockUser, context)

      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain('user:delete')
    })

    it('should allow resource owner access', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceOwnerId: 'user-1',
        resourceType: ResourceType.USER,
      }

      const result = checkPermission('user:update', mockUser, context)

      // Resource owner should have access even without explicit permission
      expect(result.allowed).toBe(true)
    })

    it('should deny non-owner access to user resources', () => {
      const context: PermissionContext = {
        userId: 'user-2',
        resourceOwnerId: 'user-1',
        resourceType: ResourceType.USER,
      }

      const result = checkPermission('user:update', mockUser, context)

      expect(result.allowed).toBe(false)
    })
  })

  describe('checkPermissions', () => {
    const mockUser = {
      id: 'user-1',
      role: 'admin',
      permissions: ['user:read', 'user:create', 'project:read'],
    }

    it('should check multiple permissions', () => {
      const permissions = ['user:read', 'project:read']
      const context: PermissionContext = {
        userId: 'user-1',
      }

      const result = checkPermissions(permissions, mockUser, context)

      expect(result.allowed).toBe(true)
      expect(result.missingPermissions).toHaveLength(0)
    })

    it('should identify missing permissions', () => {
      const permissions = ['user:read', 'user:delete', 'project:read']
      const context: PermissionContext = {
        userId: 'user-1',
      }

      const result = checkPermissions(permissions, mockUser, context)

      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain('user:delete')
    })

    it('should handle empty permission list', () => {
      const context: PermissionContext = {
        userId: 'user-1',
      }

      const result = checkPermissions([], mockUser, context)

      expect(result.allowed).toBe(true)
    })
  })

  describe('hasPermission', () => {
    const mockUser = {
      id: 'user-1',
      role: 'admin',
      permissions: ['user:read', 'user:create'],
    }

    it('should return true when user has permission', () => {
      expect(hasPermission('user:read', mockUser)).toBe(true)
    })

    it('should return false when user lacks permission', () => {
      expect(hasPermission('user:delete', mockUser)).toBe(false)
    })

    it('should handle users without permissions array', () => {
      const userWithoutPerms = { id: 'user-2', role: 'user' }

      expect(hasPermission('user:read', userWithoutPerms)).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    const mockUser = {
      id: 'user-1',
      role: 'admin',
      permissions: ['user:read', 'user:create', 'project:read'],
    }

    it('should return true when user has all permissions', () => {
      const permissions = ['user:read', 'user:create', 'project:read']

      expect(hasAllPermissions(permissions, mockUser)).toBe(true)
    })

    it('should return false when user missing some permissions', () => {
      const permissions = ['user:read', 'user:create', 'user:delete']

      expect(hasAllPermissions(permissions, mockUser)).toBe(false)
    })

    it('should handle empty permission list', () => {
      expect(hasAllPermissions([], mockUser)).toBe(true)
    })
  })

  describe('hasAnyPermission', () => {
    const mockUser = {
      id: 'user-1',
      role: 'admin',
      permissions: ['user:read', 'user:create'],
    }

    it('should return true when user has at least one permission', () => {
      const permissions = ['user:read', 'user:delete', 'project:read']

      expect(hasAnyPermission(permissions, mockUser)).toBe(true)
    })

    it('should return false when user has no permissions', () => {
      const permissions = ['user:delete', 'project:delete']

      expect(hasAnyPermission(permissions, mockUser)).toBe(false)
    })

    it('should handle empty permission list', () => {
      expect(hasAnyPermission([], mockUser)).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('should get user permissions from role', () => {
      const user = { id: 'user-1', role: 'admin' }

      const permissions = getUserPermissions(user)

      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions.length).toBeGreaterThan(0)
    })

    it('should get user permissions with explicit permissions', () => {
      const user = {
        id: 'user-1',
        role: 'user',
        permissions: ['user:read', 'project:read'],
      }

      const permissions = getUserPermissions(user)

      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions).toContain('user:read')
      expect(permissions).toContain('project:read')
    })

    it('should return empty array for user without role', () => {
      const user = { id: 'user-1', role: 'unknown' }

      const permissions = getUserPermissions(user)

      expect(Array.isArray(permissions)).toBe(true)
    })
  })

  describe('getRolePermissions', () => {
    it('should get permissions for admin role', () => {
      const permissions = getRolePermissions('admin')

      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions.length).toBeGreaterThan(0)
    })

    it('should get permissions for user role', () => {
      const permissions = getRolePermissions('user')

      expect(Array.isArray(permissions)).toBe(true)
    })

    it('should return empty array for unknown role', () => {
      const permissions = getRolePermissions('unknown-role')

      expect(Array.isArray(permissions)).toBe(true)
      expect(permissions).toHaveLength(0)
    })
  })

  describe('permission check edge cases', () => {
    const mockUser = {
      id: 'user-1',
      role: 'admin',
      permissions: ['user:read', 'project:read'],
    }

    it('should handle undefined context', () => {
      const result = checkPermission('user:read', mockUser, undefined as any)

      expect(result).toBeDefined()
    })

    it('should handle context without userId', () => {
      const context: PermissionContext = {} as any

      const result = checkPermission('user:read', mockUser, context)

      expect(result).toBeDefined()
    })

    it('should handle system resources', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceType: ResourceType.SYSTEM,
      }

      const result = checkPermission('system:read', mockUser, context)

      expect(result).toBeDefined()
    })
  })

  describe('permission patterns', () => {
    it('should allow admin to access all resources', () => {
      const adminUser = { id: 'admin-1', role: 'admin', permissions: ['*'] }

      expect(hasPermission('any:permission', adminUser)).toBe(true)
      expect(hasPermission('user:delete', adminUser)).toBe(true)
      expect(hasPermission('system:manage', adminUser)).toBe(true)
    })

    it('should support wildcard permissions', () => {
      const user = { id: 'user-1', role: 'user', permissions: ['user:*'] }

      expect(hasPermission('user:read', user)).toBe(true)
      expect(hasPermission('user:create', user)).toBe(true)
      expect(hasPermission('user:delete', user)).toBe(true)
      expect(hasPermission('project:read', user)).toBe(false)
    })
  })

  describe('permission reason messages', () => {
    const mockUser = {
      id: 'user-1',
      role: 'user',
      permissions: ['user:read'],
    }

    it('should provide reason for denied access', () => {
      const context: PermissionContext = {
        userId: 'user-1',
      }

      const result = checkPermission('user:delete', mockUser, context)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })

    it('should list required permissions', () => {
      const context: PermissionContext = {
        userId: 'user-1',
      }

      const result = checkPermission('user:delete', mockUser, context)

      expect(result.requiredPermissions).toContain('user:delete')
    })
  })

  describe('resource access patterns', () => {
    const mockUser = {
      id: 'user-1',
      role: 'user',
      permissions: ['project:read'],
    }

    it('should allow read access to own project', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceOwnerId: 'user-1',
        resourceType: ResourceType.PROJECT,
      }

      const result = checkPermission('project:read', mockUser, context)

      expect(result.allowed).toBe(true)
    })

    it('should allow update access to own project', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceOwnerId: 'user-1',
        resourceType: ResourceType.PROJECT,
      }

      const result = checkPermission('project:update', mockUser, context)

      expect(result.allowed).toBe(true)
    })

    it('should deny update access to others project', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceOwnerId: 'user-2',
        resourceType: ResourceType.PROJECT,
      }

      const result = checkPermission('project:update', mockUser, context)

      expect(result.allowed).toBe(false)
    })
  })
})
