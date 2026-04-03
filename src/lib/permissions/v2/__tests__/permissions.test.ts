/**
 * v1.12.0 Fine-Grained RBAC Tests
 * 细粒度权限系统测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ResourceType,
  ActionType,
  ConditionOperator,
  FineGrainedPermission,
  PermissionCheckRequest,
} from './types'
import { PermissionEngine, createPermissionEngine } from './engine'
import { InheritanceManager, createInheritanceManager } from './inheritance'

describe('PermissionEngine', () => {
  let engine: PermissionEngine
  let permissions: FineGrainedPermission[]

  beforeEach(() => {
    engine = createPermissionEngine({
      enableCache: true,
      enableMetrics: true,
      enableAudit: false,
    })

    permissions = [
      {
        id: 'perm_1',
        name: 'Read Tasks',
        resourceType: ResourceType.TASK,
        action: ActionType.READ,
        priority: 0,
        isDeny: false,
      },
      {
        id: 'perm_2',
        name: 'Create Tasks',
        resourceType: ResourceType.TASK,
        action: ActionType.CREATE,
        priority: 0,
        isDeny: false,
      },
      {
        id: 'perm_3',
        name: 'Deny Delete Tasks',
        resourceType: ResourceType.TASK,
        action: ActionType.DELETE,
        priority: 10,
        isDeny: true,
      },
      {
        id: 'perm_4',
        name: 'Read Own User',
        resourceType: ResourceType.USER,
        action: ActionType.READ,
        priority: 0,
        isDeny: false,
        conditions: {
          logic: 'AND',
          conditions: [
            {
              field: 'resource.ownerId',
              operator: ConditionOperator.EQUALS,
              value: 'user.userId',
            },
          ],
        },
      },
      {
        id: 'perm_5',
        name: 'Team Tasks',
        resourceType: ResourceType.TASK,
        action: ActionType.READ,
        priority: 5,
        isDeny: false,
        scope: {
          resourceType: ResourceType.TASK,
          attributeFilters: [
            {
              field: 'teamId',
              operator: ConditionOperator.IN,
              value: 'user.teamIds',
            },
          ],
        },
      },
    ]
  })

  afterEach(() => {
    engine.clearCache()
  })

  describe('Basic Permission Checks', () => {
    it('should allow access when user has permission', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_1'],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
          },
        },
        action: ActionType.READ,
      }

      const result = await engine.checkPermission(request, permissions)

      expect(result.allowed).toBe(true)
      expect(result.source).toBe('direct')
      expect(result.matchedPermissionId).toBe('perm_1')
    })

    it('should deny access when user lacks permission', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['guest'],
          permissions: [],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
          },
        },
        action: ActionType.DELETE,
      }

      const result = await engine.checkPermission(request, permissions)

      expect(result.allowed).toBe(false)
      expect(result.denyReason).toBeDefined()
    })

    it('should respect deny permissions with higher priority', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['admin'],
          permissions: ['perm_1', 'perm_3'], // Has both read and deny
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
          },
        },
        action: ActionType.DELETE,
      }

      const result = await engine.checkPermission(request, permissions)

      expect(result.allowed).toBe(false)
      expect(result.source).toBe('deny')
      expect(result.matchedPermissionId).toBe('perm_3')
    })
  })

  describe('Condition Evaluation', () => {
    it('should evaluate equals condition correctly', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_4'],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.USER,
          resourceId: 'user_1',
          attributes: {
            resourceType: ResourceType.USER,
            id: 'user_1',
            ownerId: 'user_1',
          },
        },
        action: ActionType.READ,
      }

      const result = await engine.checkPermission(request, permissions)

      expect(result.allowed).toBe(true)
    })

    it('should deny when condition is not met', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_4'],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.USER,
          resourceId: 'user_2',
          attributes: {
            resourceType: ResourceType.USER,
            id: 'user_2',
            ownerId: 'user_2',
          },
        },
        action: ActionType.READ,
      }

      const result = await engine.checkPermission(request, permissions)

      expect(result.allowed).toBe(false)
    })
  })

  describe('Resource Scope', () => {
    it('should check resource scope attributes', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_5'],
          attributes: {
            userId: 'user_1',
            teamIds: ['team_1', 'team_2'],
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
            teamId: 'team_1',
          },
        },
        action: ActionType.READ,
      }

      const result = await engine.checkPermission(request, permissions)

      expect(result.allowed).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should complete permission check in under 1ms', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_1'],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
          },
        },
        action: ActionType.READ,
      }

      const start = performance.now()
      await engine.checkPermission(request, permissions)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(1)
    })

    it('should use cache for repeated checks', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_1'],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
          },
        },
        action: ActionType.READ,
      }

      // First check
      const result1 = await engine.checkPermission(request, permissions)
      expect(result1.cacheHit).toBeFalsy()

      // Second check (should hit cache)
      const result2 = await engine.checkPermission(request, permissions)
      expect(result2.cacheHit).toBe(true)
    })
  })

  describe('Metrics', () => {
    it('should track performance metrics', async () => {
      const request: PermissionCheckRequest = {
        user: {
          userId: 'user_1',
          roles: ['member'],
          permissions: ['perm_1'],
          attributes: {
            userId: 'user_1',
          },
        },
        resource: {
          resourceType: ResourceType.TASK,
          resourceId: 'task_1',
          attributes: {
            resourceType: ResourceType.TASK,
            id: 'task_1',
          },
        },
        action: ActionType.READ,
      }

      await engine.checkPermission(request, permissions)
      await engine.checkPermission(request, permissions)

      const metrics = engine.getMetrics()
      expect(metrics.checkCount).toBe(2)
      expect(metrics.avgTimeMs).toBeGreaterThan(0)
      expect(metrics.cacheHits).toBe(1)
    })
  })
})

describe('InheritanceManager', () => {
  let manager: InheritanceManager

  beforeEach(() => {
    manager = createInheritanceManager({
      maxDepth: 10,
      detectCycles: true,
    })
  })

  describe('Inheritance Relationships', () => {
    it('should add inheritance relationships', () => {
      manager.addInheritance('child_role', 'parent_role')

      const parents = manager.getAllParentRoles('child_role')
      expect(parents).toContain('parent_role')
    })

    it('should detect circular inheritance', () => {
      manager.addInheritance('role_a', 'role_b')

      expect(() => {
        manager.addInheritance('role_b', 'role_a')
      }).toThrow('Circular inheritance detected')
    })

    it('should respect max depth', () => {
      const deepManager = createInheritanceManager({ maxDepth: 2 })

      deepManager.addInheritance('role_1', 'role_2')
      deepManager.addInheritance('role_2', 'role_3')

      expect(() => {
        deepManager.getAllParentRoles('role_1')
      }).toThrow('Maximum inheritance depth exceeded')
    })
  })

  describe('Permission Computation', () => {
    it('should compute inherited permissions', async () => {
      const allRoles = new Map([
        ['parent_role', {
          id: 'parent_role',
          name: 'Parent',
          permissions: ['perm_1', 'perm_2'],
          inheritanceDepth: 0,
          isSystem: false,
          level: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        ['child_role', {
          id: 'child_role',
          name: 'Child',
          permissions: ['perm_3'],
          inheritsFrom: ['parent_role'],
          inheritanceDepth: 1,
          isSystem: false,
          level: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      ])

      const allPermissions = new Map()

      manager.addInheritance('child_role', 'parent_role')

      const computed = await manager.computeRolePermissions(
        'child_role',
        allRoles,
        allPermissions
      )

      expect(computed).toContain('perm_1')
      expect(computed).toContain('perm_2')
      expect(computed).toContain('perm_3')
    })
  })

  describe('Inheritance Validation', () => {
    it('should validate inheritance relationships', () => {
      manager.addInheritance('child_role', 'parent_role')

      const allRoles = new Map([
        ['parent_role', { id: 'parent_role', name: 'Parent', permissions: [], inheritanceDepth: 0, isSystem: false, level: 1, createdAt: new Date(), updatedAt: new Date() }],
        ['child_role', { id: 'child_role', name: 'Child', permissions: [], inheritanceDepth: 1, isSystem: false, level: 0, createdAt: new Date(), updatedAt: new Date() }],
      ])

      const result = manager.validateInheritance(allRoles)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing parent roles', () => {
      manager.addInheritance('child_role', 'nonexistent_parent')

      const allRoles = new Map([
        ['child_role', { id: 'child_role', name: 'Child', permissions: [], inheritanceDepth: 1, isSystem: false, level: 0, createdAt: new Date(), updatedAt: new Date() }],
      ])

      const result = manager.validateInheritance(allRoles)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('Condition Operators', () => {
  let engine: PermissionEngine

  beforeEach(() => {
    engine = createPermissionEngine()
  })

  const createPermissionWithCondition = (
    condition: any
  ): FineGrainedPermission => ({
    id: 'test_perm',
    name: 'Test Permission',
    resourceType: ResourceType.TASK,
    action: ActionType.READ,
    conditions: {
      logic: 'AND',
      conditions: [condition],
    },
    priority: 0,
    isDeny: false,
  })

  it('should evaluate EQUALS operator', async () => {
    const permission = createPermissionWithCondition({
      field: 'resource.status',
      operator: ConditionOperator.EQUALS,
      value: 'active',
    })

    const request: PermissionCheckRequest = {
      user: {
        userId: 'user_1',
        roles: ['member'],
        permissions: ['test_perm'],
        attributes: { userId: 'user_1' },
      },
      resource: {
        resourceType: ResourceType.TASK,
        resourceId: 'task_1',
        attributes: {
          status: 'active',
        },
      },
      action: ActionType.READ,
    }

    const result = await engine.checkPermission(request, [permission])
    expect(result.allowed).toBe(true)
  })

  it('should evaluate IN operator', async () => {
    const permission = createPermissionWithCondition({
      field: 'resource.priority',
      operator: ConditionOperator.IN,
      value: ['high', 'critical'],
    })

    const request: PermissionCheckRequest = {
      user: {
        userId: 'user_1',
        roles: ['member'],
        permissions: ['test_perm'],
        attributes: { userId: 'user_1' },
      },
      resource: {
        resourceType: ResourceType.TASK,
        resourceId: 'task_1',
        attributes: {
          priority: 'high',
        },
      },
      action: ActionType.READ,
    }

    const result = await engine.checkPermission(request, [permission])
    expect(result.allowed).toBe(true)
  })

  it('should evaluate CONTAINS operator', async () => {
    const permission = createPermissionWithCondition({
      field: 'resource.title',
      operator: ConditionOperator.CONTAINS,
      value: 'important',
    })

    const request: PermissionCheckRequest = {
      user: {
        userId: 'user_1',
        roles: ['member'],
        permissions: ['test_perm'],
        attributes: { userId: 'user_1' },
      },
      resource: {
        resourceType: ResourceType.TASK,
        resourceId: 'task_1',
        attributes: {
          title: 'This is an important task',
        },
      },
      action: ActionType.READ,
    }

    const result = await engine.checkPermission(request, [permission])
    expect(result.allowed).toBe(true)
  })

  it('should evaluate REGEX operator', async () => {
    const permission = createPermissionWithCondition({
      field: 'resource.code',
      operator: ConditionOperator.REGEX,
      value: '^TASK-\\d+$',
    })

    const request: PermissionCheckRequest = {
      user: {
        userId: 'user_1',
        roles: ['member'],
        permissions: ['test_perm'],
        attributes: { userId: 'user_1' },
      },
      resource: {
        resourceType: ResourceType.TASK,
        resourceId: 'task_1',
        attributes: {
          code: 'TASK-123',
        },
      },
      action: ActionType.READ,
    }

    const result = await engine.checkPermission(request, [permission])
    expect(result.allowed).toBe(true)
  })
})
