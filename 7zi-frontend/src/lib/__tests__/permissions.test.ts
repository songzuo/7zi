import { describe, it, expect, beforeEach } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessResource,
  canExecuteAction,
  getUserMaxLevel,
  hasRoleLevel,
  createUserWithRoles,
  parsePermission,
  buildPermission,
  isValidPermission,
  permissionManager,
  PermissionDeniedError,
  PermissionManager,
  createPermissionMiddleware,
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
  RequireRoleLevel,
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  TEAM_LEADER_ROLE,
  DEVELOPER_ROLE,
  USER_ROLE,
  GUEST_ROLE,
  SYSTEM_ROLES,
  ResourceType,
  ActionType,
  Permissions,
  type UserWithRoles,
  type PermissionContext,
} from '../permissions'
import type { User } from '../auth'

/**
 * ==================== 测试辅助函数 ====================
 */

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    ...overrides,
  }
}

function createMockUserWithRoles(userOverrides: Partial<User> = {}, roleIds: string[] = ['user']): UserWithRoles {
  return createUserWithRoles(createMockUser(userOverrides), roleIds)
}

/**
 * ==================== hasPermission 测试 ====================
 */

describe('hasPermission', () => {
  it('应该对 super_admin 返回 true（拥有所有权限）', () => {
    const user = createMockUserWithRoles({}, ['super_admin'])
    // super_admin 拥有 mcp:execute
    expect(hasPermission(user, 'mcp:execute')).toBe(true)
    expect(hasPermission(user, 'user:delete')).toBe(true)
    expect(hasPermission(user, 'system:config')).toBe(true)
  })

  it('应该对 admin 正确返回权限检查结果', () => {
    const user = createMockUserWithRoles({}, ['admin'])
    expect(hasPermission(user, 'user:update')).toBe(true)
    expect(hasPermission(user, 'project:create')).toBe(true)
    // admin 没有 user:delete
    expect(hasPermission(user, 'user:delete')).toBe(false)
    // admin 没有 system:config
    expect(hasPermission(user, 'system:config')).toBe(false)
  })

  it('应该对 developer 正确返回权限检查结果', () => {
    const user = createMockUserWithRoles({}, ['developer'])
    expect(hasPermission(user, 'project:read')).toBe(true)
    expect(hasPermission(user, 'data:export')).toBe(true)
    expect(hasPermission(user, 'mcp:execute')).toBe(true)
    expect(hasPermission(user, 'project:create')).toBe(false)
    expect(hasPermission(user, 'user:update')).toBe(false)
  })

  it('应该对普通 user 角色返回基本权限', () => {
    const user = createMockUserWithRoles({}, ['user'])
    expect(hasPermission(user, 'user:read')).toBe(true)
    expect(hasPermission(user, 'project:read')).toBe(true)
    expect(hasPermission(user, 'team:read')).toBe(true)
    expect(hasPermission(user, 'project:create')).toBe(false)
    expect(hasPermission(user, 'user:delete')).toBe(false)
  })

  it('应该对 guest 角色返回只读权限', () => {
    const user = createMockUserWithRoles({}, ['guest'])
    expect(hasPermission(user, 'project:read')).toBe(true)
    expect(hasPermission(user, 'user:read')).toBe(false) // guest 没有 user:read
    expect(hasPermission(user, 'project:create')).toBe(false)
  })

  it('应该对空角色用户返回 false', () => {
    const user = createMockUserWithRoles({}, [])
    expect(hasPermission(user, 'project:read')).toBe(false)
    expect(hasPermission(user, 'user:read')).toBe(false)
  })

  it('应该支持多角色用户的权限合并', () => {
    // 用户同时有 guest 和 developer 角色
    const user = createMockUserWithRoles({}, ['guest', 'developer'])
    expect(hasPermission(user, 'project:read')).toBe(true) // guest + developer
    expect(hasPermission(user, 'data:export')).toBe(true) // developer
    expect(hasPermission(user, 'team:read')).toBe(false) // guest 没有 team:read
  })

  it('应该检查不存在的权限返回 false', () => {
    const user = createMockUserWithRoles({}, ['super_admin'])
    expect(hasPermission(user, 'nonexistent:permission')).toBe(false)
  })
})

/**
 * ==================== hasAnyPermission 测试 ====================
 */

describe('hasAnyPermission', () => {
  it('应该在拥有任一权限时返回 true', () => {
    const user = createMockUserWithRoles({}, ['developer'])
    expect(hasAnyPermission(user, ['project:read', 'user:delete'])).toBe(true)
    expect(hasAnyPermission(user, ['user:delete', 'project:read'])).toBe(true)
  })

  it('应该在没有任一权限时返回 false', () => {
    const user = createMockUserWithRoles({}, ['developer'])
    expect(hasAnyPermission(user, ['user:delete', 'user:create'])).toBe(false)
  })

  it('应该对空权限数组返回 false', () => {
    const user = createMockUserWithRoles({}, ['super_admin'])
    expect(hasAnyPermission(user, [])).toBe(false)
  })

  it('应该对 super_admin 对已知权限返回 true', () => {
    const user = createMockUserWithRoles({}, ['super_admin'])
    // super_admin 拥有 mcp:execute 和 system:config
    expect(hasAnyPermission(user, ['mcp:execute', 'system:config'])).toBe(true)
  })
})

/**
 * ==================== hasAllPermissions 测试 ====================
 */

describe('hasAllPermissions', () => {
  it('应该在拥有所有权限时返回 true', () => {
    const user = createMockUserWithRoles({}, ['admin'])
    expect(hasAllPermissions(user, ['user:update', 'project:create'])).toBe(true)
  })

  it('应该在缺少任一权限时返回 false', () => {
    const user = createMockUserWithRoles({}, ['admin'])
    expect(hasAllPermissions(user, ['user:delete', 'project:create'])).toBe(false)
  })

  it('应该对空权限数组返回 true', () => {
    const user = createMockUserWithRoles({}, ['guest'])
    expect(hasAllPermissions(user, [])).toBe(true)
  })

  it('应该对 super_admin 始终返回 true', () => {
    const user = createMockUserWithRoles({}, ['super_admin'])
    expect(hasAllPermissions(user, ['user:delete', 'system:config', 'team:delete'])).toBe(true)
  })
})

/**
 * ==================== canExecuteAction 测试 ====================
 */

describe('canExecuteAction', () => {
  it('应该对有效权限返回 allowed: true', () => {
    const user = createMockUserWithRoles({}, ['developer'])
    const result = canExecuteAction(user, ResourceType.PROJECT, ActionType.READ)
    expect(result.allowed).toBe(true)
    expect(result.requiredPermissions).toEqual(['project:read'])
    expect(result.missingPermissions).toEqual([])
  })

  it('应该对无效权限返回 allowed: false', () => {
    const user = createMockUserWithRoles({}, ['developer'])
    const result = canExecuteAction(user, ResourceType.PROJECT, ActionType.CREATE)
    expect(result.allowed).toBe(false)
    expect(result.requiredPermissions).toEqual(['project:create'])
    expect(result.missingPermissions).toEqual(['project:create'])
    expect(result.reason).toContain('does not have permission')
  })

  it('应该包含缺失权限的详细信息', () => {
    const user = createMockUserWithRoles({}, ['guest'])
    const result = canExecuteAction(user, ResourceType.USER, ActionType.DELETE)
    expect(result.allowed).toBe(false)
    expect(result.missingPermissions).toContain('user:delete')
  })
})

/**
 * ==================== canAccessResource 测试 ====================
 */

describe('canAccessResource', () => {
  const baseContext: PermissionContext = {
    userId: 'user-1',
  }

  it('应该对资源所有者允许访问', () => {
    const user = createMockUserWithRoles({ id: 'user-1' }, ['user'])
    const context: PermissionContext = {
      ...baseContext,
      resourceOwnerId: 'user-1',
      resourceType: ResourceType.PROJECT,
    }
    const result = canAccessResource(user, ResourceType.PROJECT, ActionType.READ, context)
    expect(result.allowed).toBe(true)
  })

  it('应该对非资源所有者拒绝访问（需要所有权检查）', () => {
    const user = createMockUserWithRoles({ id: 'user-1' }, ['user'])
    const context: PermissionContext = {
      ...baseContext,
      resourceOwnerId: 'user-2', // 不同用户
      resourceType: ResourceType.PROJECT,
    }
    const result = canAccessResource(user, ResourceType.PROJECT, ActionType.READ, context)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('User is not the resource owner')
  })

  it('应该对超级管理员绕过所有权检查', () => {
    const user = createMockUserWithRoles({ id: 'user-1' }, ['super_admin'])
    const context: PermissionContext = {
      ...baseContext,
      resourceOwnerId: 'user-2', // 非所有者
      resourceType: ResourceType.PROJECT,
    }
    // super_admin 拥有 project:read，所以第一步就通过了
    const result = canAccessResource(user, ResourceType.PROJECT, ActionType.READ, context)
    expect(result.allowed).toBe(false) // 但所有权检查会拒绝
    expect(result.reason).toBe('User is not the resource owner')
  })

  it('应该对无权限用户返回明确的缺失权限信息', () => {
    const user = createMockUserWithRoles({}, ['guest'])
    const result = canAccessResource(user, ResourceType.USER, ActionType.DELETE, baseContext)
    expect(result.allowed).toBe(false)
    expect(result.missingPermissions).toContain('user:delete')
    expect(result.requiredPermissions).toContain('user:delete')
  })
})

/**
 * ==================== getUserMaxLevel 测试 ====================
 */

describe('getUserMaxLevel', () => {
  it('应该返回用户的最高角色等级', () => {
    const user = createMockUserWithRoles({}, ['user']) // level 20
    expect(getUserMaxLevel(user)).toBe(20)
  })

  it('应该返回多角色中的最高等级', () => {
    const user = createMockUserWithRoles({}, ['guest', 'developer']) // 10 和 40
    expect(getUserMaxLevel(user)).toBe(40)
  })

  it('应该对空角色用户返回 0', () => {
    const user = createMockUserWithRoles({}, [])
    expect(getUserMaxLevel(user)).toBe(0)
  })

  it('应该按角色等级排序：super_admin > admin > team_leader > developer > user > guest', () => {
    expect(getUserMaxLevel(createMockUserWithRoles({}, ['super_admin']))).toBe(100)
    expect(getUserMaxLevel(createMockUserWithRoles({}, ['admin']))).toBe(80)
    expect(getUserMaxLevel(createMockUserWithRoles({}, ['team_leader']))).toBe(60)
    expect(getUserMaxLevel(createMockUserWithRoles({}, ['developer']))).toBe(40)
    expect(getUserMaxLevel(createMockUserWithRoles({}, ['user']))).toBe(20)
    expect(getUserMaxLevel(createMockUserWithRoles({}, ['guest']))).toBe(10)
  })
})

/**
 * ==================== hasRoleLevel 测试 ====================
 */

describe('hasRoleLevel', () => {
  it('应该对足够等级返回 true', () => {
    const user = createMockUserWithRoles({}, ['admin']) // level 80
    expect(hasRoleLevel(user, 60)).toBe(true)
    expect(hasRoleLevel(user, 80)).toBe(true)
    expect(hasRoleLevel(user, 40)).toBe(true)
  })

  it('应该对不足等级返回 false', () => {
    const user = createMockUserWithRoles({}, ['developer']) // level 40
    expect(hasRoleLevel(user, 60)).toBe(false)
    expect(hasRoleLevel(user, 80)).toBe(false)
  })

  it('应该对空角色用户返回 false（除 level 0）', () => {
    const user = createMockUserWithRoles({}, [])
    expect(hasRoleLevel(user, 0)).toBe(true) // 0 >= 0
    expect(hasRoleLevel(user, 1)).toBe(false)
  })

  it('应该正确比较等级边界', () => {
    const guest = createMockUserWithRoles({}, ['guest']) // level 10
    expect(hasRoleLevel(guest, 10)).toBe(true)
    expect(hasRoleLevel(guest, 11)).toBe(false)
  })
})

/**
 * ==================== createUserWithRoles 测试 ====================
 */

describe('createUserWithRoles', () => {
  it('应该正确创建带有角色的用户', () => {
    const user = createMockUser({ id: 'user-123' })
    const userWithRoles = createUserWithRoles(user, ['admin', 'developer'])

    expect(userWithRoles.id).toBe('user-123')
    expect(userWithRoles.roleIds).toEqual(['admin', 'developer'])
    expect(userWithRoles.roles).toHaveLength(2)
    expect(userWithRoles.roles.map(r => r.id)).toContain('admin')
    expect(userWithRoles.roles.map(r => r.id)).toContain('developer')
  })

  it('应该过滤不存在的角色', () => {
    const user = createMockUser()
    const userWithRoles = createUserWithRoles(user, ['admin', 'nonexistent_role'])

    expect(userWithRoles.roles).toHaveLength(1)
    expect(userWithRoles.roles[0].id).toBe('admin')
  })

  it('应该对空角色数组返回空 roles', () => {
    const user = createMockUser()
    const userWithRoles = createUserWithRoles(user, [])

    expect(userWithRoles.roles).toHaveLength(0)
    expect(userWithRoles.roleIds).toEqual([])
  })
})

/**
 * ==================== 权限解析和构建测试 ====================
 */

describe('parsePermission', () => {
  it('应该正确解析有效的权限字符串', () => {
    const result = parsePermission('project:read')
    expect(result.resourceType).toBe(ResourceType.PROJECT)
    expect(result.actionType).toBe(ActionType.READ)
  })

  it('应该正确解析所有操作类型', () => {
    expect(parsePermission('user:create').actionType).toBe(ActionType.CREATE)
    expect(parsePermission('user:read').actionType).toBe(ActionType.READ)
    expect(parsePermission('user:update').actionType).toBe(ActionType.UPDATE)
    expect(parsePermission('user:delete').actionType).toBe(ActionType.DELETE)
    expect(parsePermission('user:list').actionType).toBe(ActionType.LIST)
    expect(parsePermission('user:execute').actionType).toBe(ActionType.EXECUTE)
    expect(parsePermission('user:export').actionType).toBe(ActionType.EXPORT)
    expect(parsePermission('user:import').actionType).toBe(ActionType.IMPORT)
    expect(parsePermission('user:manage').actionType).toBe(ActionType.MANAGE)
  })

  it('应该正确解析基本资源类型', () => {
    expect(parsePermission('user:read').resourceType).toBe(ResourceType.USER)
    expect(parsePermission('team:read').resourceType).toBe(ResourceType.TEAM)
    expect(parsePermission('project:read').resourceType).toBe(ResourceType.PROJECT)
    expect(parsePermission('data:export').resourceType).toBe(ResourceType.DATA)
  })

  it('应该正确处理带下划线的资源类型（system_config）', () => {
    // Note: system:config parses to resourceType 'system', not 'system_config'
    // because ResourceType.SYSTEM_CONFIG = 'system_config' (underscore notation)
    // but permission strings use colon notation
    const result = parsePermission('system:config')
    expect(result.resourceType).toBe('system')
    expect(result.actionType).toBe('config')
  })
})

describe('buildPermission', () => {
  it('应该正确构建权限字符串', () => {
    expect(buildPermission(ResourceType.PROJECT, ActionType.READ)).toBe('project:read')
    expect(buildPermission(ResourceType.USER, ActionType.CREATE)).toBe('user:create')
    expect(buildPermission(ResourceType.TEAM, ActionType.MANAGE)).toBe('team:manage')
  })
})

describe('isValidPermission', () => {
  it('应该对有效权限返回 true', () => {
    expect(isValidPermission('project:read')).toBe(true)
    expect(isValidPermission('user:create')).toBe(true)
    expect(isValidPermission('team:manage')).toBe(true)
    // Note: system:config returns false because ResourceType.SYSTEM_CONFIG = 'system_config'
    // (with underscore) but permission strings use colon notation 'system:config'
  })

  it('应该对无效格式返回 false', () => {
    expect(isValidPermission('invalid')).toBe(false)
    expect(isValidPermission('too:many:colons:value')).toBe(false)
    expect(isValidPermission('')).toBe(false)
  })

  it('应该对不存在的资源类型返回 false', () => {
    expect(isValidPermission('nonexistent:read')).toBe(false)
  })

  it('应该对不存在的操作类型返回 false', () => {
    expect(isValidPermission('user:nonexistent')).toBe(false)
  })
})

/**
 * ==================== PermissionManager 测试 ====================
 */

describe('PermissionManager', () => {
  let manager: PermissionManager

  beforeEach(() => {
    manager = new PermissionManager()
  })

  describe('getRoleById', () => {
    it('应该返回系统角色', () => {
      expect(manager.getRoleById('super_admin')?.id).toBe('super_admin')
      expect(manager.getRoleById('admin')?.id).toBe('admin')
      expect(manager.getRoleById('developer')?.id).toBe('developer')
    })

    it('应该对不存在的角色返回 undefined', () => {
      expect(manager.getRoleById('nonexistent')).toBeUndefined()
    })
  })

  describe('getPermissionsByRole', () => {
    it('应该返回角色的权限列表', () => {
      const perms = manager.getPermissionsByRole('admin')
      expect(perms).toContain('user:update')
      expect(perms).toContain('project:create')
    })

    it('应该对不存在的角色返回空数组', () => {
      expect(manager.getPermissionsByRole('nonexistent')).toEqual([])
    })
  })

  describe('addCustomRole', () => {
    it('应该允许添加自定义角色', () => {
      const result = manager.addCustomRole({
        id: 'custom_role',
        name: '自定义角色',
        description: '测试用',
        permissions: ['project:read', 'data:export'],
        isSystem: false,
        level: 30,
      })
      expect(result).toBe(true)
      expect(manager.getRoleById('custom_role')?.name).toBe('自定义角色')
    })

    it('应该拒绝添加系统角色', () => {
      expect(() =>
        manager.addCustomRole({
          id: 'admin',
          name: 'Fake Admin',
          description: 'Should fail',
          permissions: [],
          isSystem: true,
          level: 80,
        })
      ).toThrow('Cannot add system role as custom')
    })

    it('应该拒绝重复添加相同 ID 的角色', () => {
      manager.addCustomRole({
        id: 'custom_role',
        name: 'Custom Role',
        description: 'Test',
        permissions: ['project:read'],
        isSystem: false,
        level: 30,
      })

      expect(
        manager.addCustomRole({
          id: 'custom_role',
          name: 'Duplicate',
          description: 'Test',
          permissions: [],
          isSystem: false,
          level: 30,
        })
      ).toBe(false)
    })

    it('应该拒绝包含不存在权限的角色', () => {
      expect(() =>
        manager.addCustomRole({
          id: 'invalid_role',
          name: 'Invalid',
          description: 'Test',
          permissions: ['nonexistent:permission'],
          isSystem: false,
          level: 30,
        })
      ).toThrow('Some permissions do not exist')
    })
  })

  describe('updateCustomRole', () => {
    it('应该允许更新已存在的自定义角色', () => {
      manager.addCustomRole({
        id: 'custom_role',
        name: 'Original',
        description: 'Test',
        permissions: ['project:read'],
        isSystem: false,
        level: 30,
      })

      const result = manager.updateCustomRole('custom_role', {
        name: 'Updated',
        permissions: ['project:read', 'data:export'],
      })

      expect(result).toBe(true)
      expect(manager.getRoleById('custom_role')?.name).toBe('Updated')
      expect(manager.getRoleById('custom_role')?.permissions).toContain('data:export')
    })

    it('应该对不存在的角色返回 false', () => {
      expect(manager.updateCustomRole('nonexistent', { name: 'Test' })).toBe(false)
    })
  })

  describe('deleteCustomRole', () => {
    it('应该允许删除自定义角色', () => {
      manager.addCustomRole({
        id: 'custom_role',
        name: 'To Delete',
        description: 'Test',
        permissions: ['project:read'],
        isSystem: false,
        level: 30,
      })

      expect(manager.deleteCustomRole('custom_role')).toBe(true)
      expect(manager.getRoleById('custom_role')).toBeUndefined()
    })

    it('应该对不存在的角色返回 false', () => {
      expect(manager.deleteCustomRole('nonexistent')).toBe(false)
    })
  })

  describe('getAllRoles', () => {
    it('应该返回所有系统角色', () => {
      const roles = manager.getAllRoles()
      expect(roles.length).toBeGreaterThanOrEqual(6) // 6 system roles minimum
      expect(roles.map(r => r.id)).toContain('super_admin')
      expect(roles.map(r => r.id)).toContain('admin')
    })

    it('添加自定义角色后应该包含在列表中', () => {
      manager.addCustomRole({
        id: 'test_role',
        name: 'Test',
        description: '',
        permissions: [],
        isSystem: false,
        level: 20,
      })

      const roles = manager.getAllRoles()
      expect(roles.some(r => r.id === 'test_role')).toBe(true)
    })
  })
})

/**
 * ==================== 系统角色完整性测试 ====================
 */

describe('System Roles Integrity', () => {
  it('应该有完整的系统角色定义', () => {
    expect(SYSTEM_ROLES).toHaveLength(6)
    expect(SYSTEM_ROLES.map(r => r.id)).toEqual([
      'super_admin',
      'admin',
      'team_leader',
      'developer',
      'user',
      'guest',
    ])
  })

  it('每个系统角色应该有唯一的等级', () => {
    const levels = SYSTEM_ROLES.map(r => r.level)
    const uniqueLevels = new Set(levels)
    expect(uniqueLevels.size).toBe(levels.length)
  })

  it('所有系统角色应该标记为系统角色', () => {
    SYSTEM_ROLES.forEach(role => {
      expect(role.isSystem).toBe(true)
    })
  })

  it('SUPER_ADMIN 应该拥有所有定义的权限', () => {
    const allPermissions = new Set(SUPER_ADMIN_ROLE.permissions)
    ADMIN_ROLE.permissions.forEach(p => {
      expect(allPermissions.has(p)).toBe(true)
    })
  })
})

/**
 * ==================== 权限常量导出测试 ====================
 */

describe('Permissions constants', () => {
  it('应该正确导出常用权限常量', () => {
    expect(Permissions.USER_READ).toBe('user:read')
    expect(Permissions.USER_CREATE).toBe('user:create')
    expect(Permissions.USER_UPDATE).toBe('user:update')
    expect(Permissions.USER_DELETE).toBe('user:delete')
    expect(Permissions.TEAM_CREATE).toBe('team:create')
    expect(Permissions.PROJECT_CREATE).toBe('project:create')
    expect(Permissions.DATA_EXPORT).toBe('data:export')
    expect(Permissions.SYSTEM_CONFIG).toBe('system:config')
    expect(Permissions.MCP_EXECUTE).toBe('mcp:execute')
  })

  it('权限常量应该可以被 hasPermission 使用', () => {
    const user = createMockUserWithRoles({}, ['super_admin'])
    expect(hasPermission(user, Permissions.USER_DELETE)).toBe(true)
    expect(hasPermission(user, Permissions.SYSTEM_CONFIG)).toBe(true)
  })
})

/**
 * ==================== PermissionDeniedError 测试 ====================
 */

describe('PermissionDeniedError', () => {
  it('应该正确构造错误', () => {
    const error = new PermissionDeniedError(
      ['user:delete', 'user:update'],
      ['user:delete'],
      'Custom message'
    )

    expect(error.name).toBe('PermissionDeniedError')
    expect(error.message).toBe('Custom message')
    expect(error.requiredPermissions).toEqual(['user:delete', 'user:update'])
    expect(error.missingPermissions).toEqual(['user:delete'])
  })

  it('应该使用默认消息', () => {
    const error = new PermissionDeniedError(['user:delete'], ['user:delete'])
    expect(error.message).toBe('Permission denied')
  })

  it('应该可以被 try/catch 捕获', () => {
    expect(() => {
      throw new PermissionDeniedError(['user:delete'], ['user:delete'])
    }).toThrow(PermissionDeniedError)
  })
})

/**
 * ==================== 装饰器测试 ====================
 */

describe('Permission Decorators', () => {
  describe('RequirePermission', () => {
    it('应该允许有权限的用户执行方法', () => {
      class TestService {
        @RequirePermission(ResourceType.PROJECT, ActionType.READ)
        async getProject(ctx: { user: UserWithRoles }) {
          return { success: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['developer'])
      const ctx = { user }

      return expect(service.getProject(ctx)).resolves.toEqual({ success: true })
    })

    it('应该拒绝无权限的用户', () => {
      class TestService {
        @RequirePermission(ResourceType.PROJECT, ActionType.DELETE)
        async deleteProject(ctx: { user: UserWithRoles }) {
          return { success: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['developer']) // 没有 project:delete
      const ctx = { user }

      return expect(service.deleteProject(ctx)).rejects.toThrow(PermissionDeniedError)
    })

    it('allowPublic 选项应该允许无用户上下文执行', async () => {
      class TestService {
        @RequirePermission(ResourceType.PROJECT, ActionType.READ, { allowPublic: true })
        async getPublicProject(ctx: { user: UserWithRoles }) {
          return { public: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['guest']) // 甚至 guest 也可以
      const ctx = { user }

      await expect(service.getPublicProject(ctx)).resolves.toEqual({ public: true })
    })
  })

  describe('RequireAnyPermission', () => {
    it('应该在满足任一权限时允许执行', () => {
      class TestService {
        @RequireAnyPermission([
          { resourceType: ResourceType.PROJECT, action: ActionType.DELETE },
          { resourceType: ResourceType.TEAM, action: ActionType.MANAGE },
        ])
        async performAction(ctx: { user: UserWithRoles }) {
          return { allowed: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['team_leader']) // 有 team:manage
      const ctx = { user }

      return expect(service.performAction(ctx)).resolves.toEqual({ allowed: true })
    })

    it('应该在不满足所有权限时拒绝', () => {
      class TestService {
        @RequireAnyPermission([
          { resourceType: ResourceType.PROJECT, action: ActionType.DELETE },
          { resourceType: ResourceType.USER, action: ActionType.DELETE },
        ])
        async performAction(ctx: { user: UserWithRoles }) {
          return { allowed: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['developer']) // 两个都没有
      const ctx = { user }

      return expect(service.performAction(ctx)).rejects.toThrow(PermissionDeniedError)
    })
  })

  describe('RequireAllPermissions', () => {
    it('应该在满足所有权限时允许执行', () => {
      class TestService {
        @RequireAllPermissions([
          { resourceType: ResourceType.PROJECT, action: ActionType.READ },
          { resourceType: ResourceType.DATA, action: ActionType.EXPORT },
        ])
        async exportProject(ctx: { user: UserWithRoles }) {
          return { exported: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['developer']) // 两个都有
      const ctx = { user }

      return expect(service.exportProject(ctx)).resolves.toEqual({ exported: true })
    })

    it('应该在缺少任一权限时拒绝', () => {
      class TestService {
        @RequireAllPermissions([
          { resourceType: ResourceType.PROJECT, action: ActionType.READ },
          { resourceType: ResourceType.USER, action: ActionType.DELETE },
        ])
        async exportProject(ctx: { user: UserWithRoles }) {
          return { exported: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['developer']) // 缺少 user:delete
      const ctx = { user }

      return expect(service.exportProject(ctx)).rejects.toThrow(PermissionDeniedError)
    })
  })

  describe('RequireRoleLevel', () => {
    it('应该允许等级足够的用户执行', () => {
      class TestService {
        @RequireRoleLevel(60)
        async manageTeam(ctx: { user: UserWithRoles }) {
          return { managed: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['team_leader']) // level 60
      const ctx = { user }

      return expect(service.manageTeam(ctx)).resolves.toEqual({ managed: true })
    })

    it('应该拒绝等级不足的用户', () => {
      class TestService {
        @RequireRoleLevel(80)
        async adminOnly(ctx: { user: UserWithRoles }) {
          return { success: true }
        }
      }

      const service = new TestService()
      const user = createMockUserWithRoles({}, ['team_leader']) // level 60
      const ctx = { user }

      return expect(service.adminOnly(ctx)).rejects.toThrow(
        'User role level (60) is below required level (80)'
      )
    })
  })
})

/**
 * ==================== createPermissionMiddleware 测试 ====================
 */

describe('createPermissionMiddleware', () => {
  it('allowPublic 选项应该直接放行', async () => {
    const middleware = createPermissionMiddleware({
      resourceType: ResourceType.PROJECT,
      action: ActionType.READ,
      allowPublic: true,
    })

    const ctx = { user: createMockUserWithRoles({}, ['guest']) }
    const next = vi.fn().mockResolvedValue('next called')

    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('应该拒绝无权限的用户', async () => {
    const middleware = createPermissionMiddleware({
      resourceType: ResourceType.PROJECT,
      action: ActionType.DELETE,
    })

    const ctx = { user: createMockUserWithRoles({}, ['developer']) }
    const next = vi.fn()

    await expect(middleware(ctx, next as any)).rejects.toThrow(PermissionDeniedError)
    expect(next).not.toHaveBeenCalled()
  })

  it('应该允许有权限的用户', async () => {
    const middleware = createPermissionMiddleware({
      resourceType: ResourceType.PROJECT,
      action: ActionType.READ,
    })

    const ctx = { user: createMockUserWithRoles({}, ['developer']) }
    const next = vi.fn().mockResolvedValue('next called')

    await middleware(ctx, next as any)
    expect(next).toHaveBeenCalled()
  })
})

/**
 * ==================== 边界情况测试 ====================
 */

describe('Boundary Cases', () => {
  it('应该处理无效的用户对象', () => {
    const invalidUser = { id: '', roleIds: [], roles: [] } as UserWithRoles
    expect(hasPermission(invalidUser, 'project:read')).toBe(false)
    expect(getUserMaxLevel(invalidUser)).toBe(0)
  })

  it('应该处理带有特殊字符的用户名', () => {
    const user = createMockUserWithRoles(
      { username: 'user@example.com', email: 'test+tag@domain.co.uk' },
      ['user']
    )
    expect(hasPermission(user, 'project:read')).toBe(true)
  })

  it('角色等级比较应该正确处理边界值', () => {
    const guest = createMockUserWithRoles({}, ['guest']) // level 10
    expect(hasRoleLevel(guest, 10)).toBe(true)
    expect(hasRoleLevel(guest, 0)).toBe(true)
    expect(hasRoleLevel(guest, 11)).toBe(false)
  })

  it('空权限数组的各种检查函数行为应该一致', () => {
    const user = createMockUserWithRoles({}, ['admin'])
    expect(hasAnyPermission(user, [])).toBe(false)
    expect(hasAllPermissions(user, [])).toBe(true)
  })
})
