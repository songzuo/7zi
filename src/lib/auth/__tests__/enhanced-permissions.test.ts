/**
 * Enhanced Permissions Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  grantPermission,
  revokePermission,
  getEntityPermissions,
  checkPermission,
  getRolePermissionsWithInheritance,
  getPermissionSummary,
  PermissionResource,
  PermissionAction,
  initializePermissionTables,
} from '../enhanced-permissions'

describe('Enhanced Permissions Service', () => {
  const testUserId = 'user_perm_test'
  const testAgentId = 'agent_perm_test'
  const testRoleId = 'role_perm_test'
  const grantedBy = 'admin_user'

  beforeEach(async () => {
    await initializePermissionTables()
  })

  describe('grantPermission', () => {
    it('should grant a permission to a user', async () => {
      const result = await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.READ,
        grantedBy,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.resource).toBe(PermissionResource.TASK)
      expect(result.action).toBe(PermissionAction.READ)
    })

    it('should grant a permission to an agent', async () => {
      const result = await grantPermission({
        agentId: testAgentId,
        resource: PermissionResource.WORKFLOW,
        action: PermissionAction.EXECUTE,
        grantedBy,
      })

      expect(result.agentId).toBe(testAgentId)
      expect(result.resource).toBe(PermissionResource.WORKFLOW)
    })

    it('should grant a permission to a role', async () => {
      const result = await grantPermission({
        roleId: testRoleId,
        resource: PermissionResource.USER,
        action: PermissionAction.MANAGE,
        grantedBy,
      })

      expect(result.roleId).toBe(testRoleId)
      expect(result.action).toBe(PermissionAction.MANAGE)
    })

    it('should grant resource-specific permission', async () => {
      const result = await grantPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        resourceId: 'project_123',
        action: PermissionAction.UPDATE,
        grantedBy,
      })

      expect(result.resourceId).toBe('project_123')
    })

    it('should grant permission with conditions', async () => {
      const conditions = [
        {
          type: 'time' as const,
          operator: 'in' as const,
          value: [9, 10, 11, 12, 13, 14, 15, 16, 17], // Business hours
        },
      ]

      const result = await grantPermission({
        userId: testUserId,
        resource: PermissionResource.REPORT,
        action: PermissionAction.READ,
        conditions,
        grantedBy,
      })

      expect(result.conditions).toBeDefined()
      expect(result.conditions).toHaveLength(1)
    })

    it('should grant permission with expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const result = await grantPermission({
        userId: testUserId,
        resource: PermissionResource.AUDIT_LOG,
        action: PermissionAction.READ,
        grantedBy,
        expiresAt,
      })

      expect(result.expiresAt).toBeDefined()
      expect(result.expiresAt).toBeInstanceOf(Date)
    })
  })

  describe('revokePermission', () => {
    it('should revoke a permission', async () => {
      const perm = await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.READ,
        grantedBy,
      })

      const result = await revokePermission(perm.id)
      expect(result).toBe(true)

      // Verify permission is revoked
      const perms = await getEntityPermissions({ userId: testUserId })
      expect(perms.find(p => p.id === perm.id)).toBeUndefined()
    })

    it('should return false for non-existent permission', async () => {
      const result = await revokePermission('non_existent_id')
      expect(result).toBe(false)
    })
  })

  describe('getEntityPermissions', () => {
    beforeEach(async () => {
      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.READ,
        grantedBy,
      })

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.UPDATE,
        grantedBy,
      })

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        action: PermissionAction.READ,
        grantedBy,
      })
    })

    it('should get all permissions for a user', async () => {
      const perms = await getEntityPermissions({ userId: testUserId })
      expect(perms.length).toBeGreaterThanOrEqual(3)
      expect(perms.every(p => p.userId === testUserId)).toBe(true)
    })

    it('should get all permissions for an agent', async () => {
      await grantPermission({
        agentId: testAgentId,
        resource: PermissionResource.WORKFLOW,
        action: PermissionAction.EXECUTE,
        grantedBy,
      })

      const perms = await getEntityPermissions({ agentId: testAgentId })
      expect(perms.length).toBeGreaterThanOrEqual(1)
    })

    it('should get all permissions for a role', async () => {
      await grantPermission({
        roleId: testRoleId,
        resource: PermissionResource.USER,
        action: PermissionAction.MANAGE,
        grantedBy,
      })

      const perms = await getEntityPermissions({ roleId: testRoleId })
      expect(perms.length).toBeGreaterThanOrEqual(1)
    })

    it('should exclude expired permissions', async () => {
      const expiresAt = new Date(Date.now() - 1000) // Expired

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.REPORT,
        action: PermissionAction.READ,
        grantedBy,
        expiresAt,
      })

      const perms = await getEntityPermissions({ userId: testUserId })
      expect(perms.find(p => p.resource === PermissionResource.REPORT)).toBeUndefined()
    })
  })

  describe('checkPermission', () => {
    beforeEach(async () => {
      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.READ,
        grantedBy,
      })

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        action: PermissionAction.MANAGE,
        grantedBy,
      })
    })

    it('should allow permission when granted', async () => {
      const result = await checkPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.READ,
      })

      expect(result.allowed).toBe(true)
      expect(result.matchedPermissions.length).toBeGreaterThan(0)
    })

    it('should deny permission when not granted', async () => {
      const result = await checkPermission({
        userId: testUserId,
        resource: PermissionResource.USER,
        action: PermissionAction.DELETE,
      })

      expect(result.allowed).toBe(false)
      expect(result.matchedPermissions.length).toBe(0)
    })

    it('should allow MANAGE permission for all actions', async () => {
      const result = await checkPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        action: PermissionAction.CREATE,
      })

      expect(result.allowed).toBe(true)
    })

    it('should check resource-specific permissions', async () => {
      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        resourceId: 'project_123',
        action: PermissionAction.UPDATE,
        grantedBy,
      })

      const result1 = await checkPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        resourceId: 'project_123',
        action: PermissionAction.UPDATE,
      })

      const result2 = await checkPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        resourceId: 'project_456',
        action: PermissionAction.UPDATE,
      })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(false)
    })

    it('should evaluate permission conditions', async () => {
      const conditions = [
        {
          type: 'time' as const,
          operator: 'in' as const,
          value: [9, 10, 11, 12, 13, 14, 15, 16, 17],
        },
      ]

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.REPORT,
        action: PermissionAction.READ,
        conditions,
        grantedBy,
      })

      const currentHour = new Date().getHours()
      const isBusinessHour = currentHour >= 9 && currentHour <= 17

      const result = await checkPermission({
        userId: testUserId,
        resource: PermissionResource.REPORT,
        action: PermissionAction.READ,
        context: { timestamp: Date.now() },
      })

      expect(result.allowed).toBe(isBusinessHour)
    })

    it('should check role-based permissions', async () => {
      await grantPermission({
        roleId: testRoleId,
        resource: PermissionResource.WORKFLOW,
        action: PermissionAction.EXECUTE,
        grantedBy,
      })

      const result = await checkPermission({
        roles: [testRoleId],
        resource: PermissionResource.WORKFLOW,
        action: PermissionAction.EXECUTE,
      })

      expect(result.allowed).toBe(true)
      expect(result.inheritedFrom).toBe(testRoleId)
    })
  })

  describe('getRolePermissionsWithInheritance', () => {
    beforeEach(async () => {
      // Grant permissions to parent role
      await grantPermission({
        roleId: 'admin',
        resource: PermissionResource.SYSTEM,
        action: PermissionAction.ADMIN,
        grantedBy,
      })

      await grantPermission({
        roleId: 'director',
        resource: PermissionResource.TEAM,
        action: PermissionAction.MANAGE,
        grantedBy,
      })

      await grantPermission({
        roleId: 'executor',
        resource: PermissionResource.TASK,
        action: PermissionAction.EXECUTE,
        grantedBy,
      })
    })

    it('should get direct role permissions', async () => {
      const perms = await getRolePermissionsWithInheritance(['executor'])
      expect(perms.length).toBeGreaterThanOrEqual(1)
      expect(perms.some(p => p.roleId === 'executor')).toBe(true)
    })

    it('should inherit permissions from parent roles', async () => {
      const perms = await getRolePermissionsWithInheritance(['executor'])
      const hasInherited = perms.some(p => 
        p.roleId === 'director' || p.roleId === 'admin'
      )
      expect(hasInherited).toBe(true)
    })

    it('should handle multiple roles', async () => {
      const perms = await getRolePermissionsWithInheritance(['executor', 'director'])
      expect(perms.length).toBeGreaterThan(0)
    })
  })

  describe('getPermissionSummary', () => {
    beforeEach(async () => {
      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.READ,
        grantedBy,
      })

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.TASK,
        action: PermissionAction.UPDATE,
        grantedBy,
      })

      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.PROJECT,
        action: PermissionAction.READ,
        grantedBy,
      })
    })

    it('should return permission summary', async () => {
      const summary = await getPermissionSummary({ userId: testUserId })

      expect(summary).toHaveProperty('totalPermissions')
      expect(summary).toHaveProperty('byResource')
      expect(summary).toHaveProperty('byAction')
      expect(summary).toHaveProperty('hasWildcard')
      expect(summary).toHaveProperty('hasAdmin')

      expect(summary.totalPermissions).toBeGreaterThanOrEqual(3)
      expect(summary.byResource[PermissionResource.TASK]).toBeGreaterThanOrEqual(2)
      expect(summary.byAction[PermissionAction.READ]).toBeGreaterThanOrEqual(2)
    })

    it('should detect wildcard permissions', async () => {
      await grantPermission({
        userId: testUserId,
        resource: '*',
        action: '*',
        grantedBy,
      })

      const summary = await getPermissionSummary({ userId: testUserId })
      expect(summary.hasWildcard).toBe(true)
    })

    it('should detect admin permissions', async () => {
      await grantPermission({
        userId: testUserId,
        resource: PermissionResource.SYSTEM,
        action: PermissionAction.ADMIN,
        grantedBy,
      })

      const summary = await getPermissionSummary({ userId: testUserId })
      expect(summary.hasAdmin).toBe(true)
    })
  })
})