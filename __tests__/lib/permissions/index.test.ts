/**
 * Permission Module Tests - 权限模块单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessResource,
  canExecuteAction,
  getUserMaxLevel,
  hasRoleLevel,
  isValidPermission,
  buildPermission,
  parsePermission,
  PermissionManager,
  permissionManager,
  createUserWithRoles,
} from '@/lib/permissions'
import type {
  UserWithRoles,
  Permission,
  RoleDefinition,
  PermissionContext,
  ResourceType,
  ActionType,
} from '@/lib/permissions'

// 测试数据辅助函数
function createMockUser(roles: RoleDefinition[]): UserWithRoles {
  return {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    roleIds: roles.map(r => r.id),
    roles,
  }
}

describe('Permission Functions - 权限检查函数', () => {
  // 模拟角色数据
  const adminRole: RoleDefinition = {
    id: 'admin',
    name: '管理员',
    description: '管理员角色',
    permissions: ['user:read', 'user:create', 'user:update', 'user:delete', 'user:list'],
    isSystem: true,
    level: 80,
  }

  const userRole: RoleDefinition = {
    id: 'user',
    name: '普通用户',
    description: '普通用户角色',
    permissions: ['user:read'],
    isSystem: true,
    level: 20,
  }

  const guestRole: RoleDefinition = {
    id: 'guest',
    name: '访客',
    description: '访客角色',
    permissions: [],
    isSystem: true,
    level: 10,
  }

  describe('hasPermission - 单权限检查', () => {
    it('应该返回 true 当用户有指定权限', () => {
      const user = createMockUser([adminRole])
      expect(hasPermission(user, 'user:read')).toBe(true)
      expect(hasPermission(user, 'user:create')).toBe(true)
      expect(hasPermission(user, 'user:delete')).toBe(true)
    })

    it('应该返回 false 当用户没有指定权限', () => {
      const user = createMockUser([userRole])
      expect(hasPermission(user, 'user:create')).toBe(false)
      expect(hasPermission(user, 'user:delete')).toBe(false)
      expect(hasPermission(user, 'system:config')).toBe(false)
    })

    it('应该返回 false 当用户没有任何角色', () => {
      const user = createMockUser([])
      expect(hasPermission(user, 'user:read')).toBe(false)
    })

    it('应该返回 false 当用户有权限为空的角色', () => {
      const user = createMockUser([guestRole])
      expect(hasPermission(user, 'user:read')).toBe(false)
    })

    it('应该检查多角色用户的权限', () => {
      const user = createMockUser([userRole, guestRole])
      expect(hasPermission(user, 'user:read')).toBe(true)
    })
  })

  describe('hasAnyPermission - 任一权限检查', () => {
    it('应该返回 true 当用户有任一指定权限', () => {
      const user = createMockUser([adminRole])
      expect(hasAnyPermission(user, ['user:read', 'team:create'])).toBe(true)
      expect(hasAnyPermission(user, ['user:create', 'team:create'])).toBe(true)
    })

    it('应该返回 false 当用户没有任何指定权限', () => {
      const user = createMockUser([userRole])
      expect(hasAnyPermission(user, ['team:create', 'team:delete'])).toBe(false)
    })

    it('应该返回 false 当权限列表为空', () => {
      const user = createMockUser([adminRole])
      expect(hasAnyPermission(user, [])).toBe(false)
    })
  })

  describe('hasAllPermissions - 所有权限检查', () => {
    it('应该返回 true 当用户有所有指定权限', () => {
      const user = createMockUser([adminRole])
      expect(hasAllPermissions(user, ['user:read', 'user:create'])).toBe(true)
    })

    it('应该返回 false 当用户缺少部分权限', () => {
      const user = createMockUser([userRole])
      expect(hasAllPermissions(user, ['user:read', 'user:create'])).toBe(false)
    })

    it('应该返回 true 当权限列表为空', () => {
      const user = createMockUser([userRole])
      expect(hasAllPermissions(user, [])).toBe(true)
    })
  })

  describe('canAccessResource - 资源访问检查', () => {
    it('应该允许访问当用户有权限且是资源所有者', () => {
      const user = createMockUser([adminRole])
      const context: PermissionContext = {
        userId: 'test-user-id',
        resourceOwnerId: 'test-user-id',
        resourceType: 'user',
      }
      const result = canAccessResource(user, 'user', 'read', context)
      expect(result.allowed).toBe(true)
    })

    it('应该拒绝访问当用户有权限但不是资源所有者', () => {
      const user = createMockUser([userRole])
      const context: PermissionContext = {
        userId: 'test-user-id',
        resourceOwnerId: 'other-user-id',
        resourceType: 'user',
      }
      const result = canAccessResource(user, 'user', 'read', context)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('User is not the resource owner')
    })

    it('应该拒绝访问当用户没有权限', () => {
      const user = createMockUser([userRole])
      const context: PermissionContext = {
        userId: 'test-user-id',
        resourceType: 'user',
      }
      const result = canAccessResource(user, 'user', 'delete', context)
      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain('user:delete')
    })
  })

  describe('canExecuteAction - 操作执行检查', () => {
    it('应该允许执行当用户有权限', () => {
      const user = createMockUser([adminRole])
      const result = canExecuteAction(user, 'user', 'create')
      expect(result.allowed).toBe(true)
      expect(result.requiredPermissions).toContain('user:create')
    })

    it('应该拒绝执行当用户没有权限', () => {
      const user = createMockUser([userRole])
      const result = canExecuteAction(user, 'user', 'delete')
      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain('user:delete')
    })
  })

  describe('getUserMaxLevel - 获取最高角色等级', () => {
    it('应该返回用户角色中的最高等级', () => {
      const user = createMockUser([userRole, adminRole])
      expect(getUserMaxLevel(user)).toBe(80)
    })

    it('应该返回 0 当用户没有任何角色', () => {
      const user = createMockUser([])
      expect(getUserMaxLevel(user)).toBe(0)
    })

    it('应该返回单个角色的等级', () => {
      const user = createMockUser([userRole])
      expect(getUserMaxLevel(user)).toBe(20)
    })
  })

  describe('hasRoleLevel - 角色等级检查', () => {
    it('应该返回 true 当用户等级高于或等于指定等级', () => {
      const user = createMockUser([adminRole])
      expect(hasRoleLevel(user, 80)).toBe(true)
      expect(hasRoleLevel(user, 60)).toBe(true)
      expect(hasRoleLevel(user, 20)).toBe(true)
    })

    it('应该返回 false 当用户等级低于指定等级', () => {
      const user = createMockUser([userRole])
      expect(hasRoleLevel(user, 80)).toBe(false)
      expect(hasRoleLevel(user, 30)).toBe(false)
    })

    it('应该返回 false 当用户没有任何角色', () => {
      const user = createMockUser([])
      expect(hasRoleLevel(user, 10)).toBe(false)
    })
  })
})

describe('PermissionManager - 权限管理器', () => {
  let manager: PermissionManager

  beforeEach(() => {
    manager = new PermissionManager()
  })

  describe('getAllPermissions - 获取所有权限', () => {
    it('应该返回系统权限', () => {
      const permissions = manager.getAllPermissions()
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions.some(p => p.id === 'user:read')).toBe(true)
    })
  })

  describe('getAllRoles - 获取所有角色', () => {
    it('应该返回系统角色', () => {
      const roles = manager.getAllRoles()
      expect(roles.length).toBeGreaterThan(0)
      expect(roles.some(r => r.id === 'admin')).toBe(true)
      expect(roles.some(r => r.id === 'user')).toBe(true)
    })
  })

  describe('getRoleById - 获取角色', () => {
    it('应该返回系统角色', () => {
      const role = manager.getRoleById('admin')
      expect(role).toBeDefined()
      expect(role!.id).toBe('admin')
    })

    it('应该返回 undefined 当角色不存在', () => {
      const role = manager.getRoleById('nonexistent')
      expect(role).toBeUndefined()
    })
  })

  describe('getPermissionsByRole - 获取角色的权限', () => {
    it('应该返回角色的权限列表', () => {
      const permissions = manager.getPermissionsByRole('admin')
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions).toContain('user:read')
    })

    it('应该返回空数组当角色不存在', () => {
      const permissions = manager.getPermissionsByRole('nonexistent')
      expect(permissions).toEqual([])
    })
  })

  describe('addCustomPermission - 添加自定义权限', () => {
    it('应该成功添加自定义权限', () => {
      const result = manager.addCustomPermission({
        id: 'custom:permission',
        name: '自定义权限',
        description: '测试自定义权限',
        resourceType: 'user',
        actionType: 'read',
        isSystem: false,
      })
      expect(result).toBe(true)
      expect(manager.getAllPermissions().some(p => p.id === 'custom:permission')).toBe(true)
    })

    it('应该拒绝添加系统权限', () => {
      expect(() => {
        manager.addCustomPermission({
          id: 'user:read',
          name: '用户读取',
          description: '系统权限',
          resourceType: 'user',
          actionType: 'read',
          isSystem: true,
        })
      }).toThrow('Cannot add system permission as custom')
    })

    it('应该拒绝重复添加相同权限', () => {
      manager.addCustomPermission({
        id: 'custom:permission',
        name: '自定义权限',
        description: '测试',
        resourceType: 'user',
        actionType: 'read',
        isSystem: false,
      })
      const result = manager.addCustomPermission({
        id: 'custom:permission',
        name: '自定义权限',
        description: '测试',
        resourceType: 'user',
        actionType: 'read',
        isSystem: false,
      })
      expect(result).toBe(false)
    })
  })

  describe('addCustomRole - 添加自定义角色', () => {
    it('应该成功添加自定义角色', () => {
      const result = manager.addCustomRole({
        id: 'custom_role',
        name: '自定义角色',
        description: '测试自定义角色',
        permissions: ['user:read'],
        isSystem: false,
        level: 50,
      })
      expect(result).toBe(true)
      expect(manager.getRoleById('custom_role')).toBeDefined()
    })

    it('应该拒绝添加系统角色', () => {
      expect(() => {
        manager.addCustomRole({
          id: 'admin',
          name: '管理员',
          description: '系统角色',
          permissions: ['user:read'],
          isSystem: true,
          level: 80,
        })
      }).toThrow('Cannot add system role as custom')
    })

    it('应该拒绝添加包含无效权限的角色', () => {
      expect(() => {
        manager.addCustomRole({
          id: 'invalid_role',
          name: '无效角色',
          description: '包含无效权限',
          permissions: ['invalid:permission'],
          isSystem: false,
          level: 50,
        })
      }).toThrow('Some permissions do not exist')
    })
  })

  describe('updateCustomRole - 更新自定义角色', () => {
    it('应该成功更新自定义角色', () => {
      manager.addCustomRole({
        id: 'test_role',
        name: '测试角色',
        description: '测试',
        permissions: ['user:read'],
        isSystem: false,
        level: 50,
      })
      const result = manager.updateCustomRole('test_role', {
        permissions: ['user:read', 'user:update'],
      })
      expect(result).toBe(true)
      const role = manager.getRoleById('test_role')
      expect(role!.permissions).toContain('user:update')
    })

    it('应该返回 false 当角色不存在', () => {
      const result = manager.updateCustomRole('nonexistent', {
        permissions: ['user:read'],
      })
      expect(result).toBe(false)
    })
  })

  describe('deleteCustomRole - 删除自定义角色', () => {
    it('应该成功删除自定义角色', () => {
      manager.addCustomRole({
        id: 'deletable_role',
        name: '可删除角色',
        description: '测试',
        permissions: ['user:read'],
        isSystem: false,
        level: 50,
      })
      const result = manager.deleteCustomRole('deletable_role')
      expect(result).toBe(true)
      expect(manager.getRoleById('deletable_role')).toBeUndefined()
    })

    it('应该返回 false 当角色不存在', () => {
      const result = manager.deleteCustomRole('nonexistent')
      expect(result).toBe(false)
    })
  })
})

describe('Permission Utilities - 权限工具函数', () => {
  describe('isValidPermission - 验证权限格式', () => {
    it('应该返回 true 对于有效权限格式', () => {
      expect(isValidPermission('user:read')).toBe(true)
      expect(isValidPermission('team:create')).toBe(true)
      expect(isValidPermission('project:delete')).toBe(true)
    })

    it('应该返回 false 对于无效权限格式', () => {
      expect(isValidPermission('invalid')).toBe(false)
      expect(isValidPermission('user:')).toBe(false)
      expect(isValidPermission(':read')).toBe(false)
      expect(isValidPermission('user:read:extra')).toBe(false)
    })
  })

  describe('buildPermission - 构建权限标识符', () => {
    it('应该正确构建权限标识符', () => {
      expect(buildPermission('user', 'read')).toBe('user:read')
      expect(buildPermission('team', 'create')).toBe('team:create')
    })
  })

  describe('parsePermission - 解析权限标识符', () => {
    it('应该正确解析权限标识符', () => {
      const result = parsePermission('user:read')
      expect(result.resourceType).toBe('user')
      expect(result.actionType).toBe('read')
    })
  })

  describe('createUserWithRoles - 创建用户角色信息', () => {
    it('应该正确创建用户角色信息', () => {
      const user = createUserWithRoles(
        {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ['admin', 'user']
      )
      expect(user.roleIds).toEqual(['admin', 'user'])
      expect(user.roles.length).toBeGreaterThan(0)
    })

    it('应该过滤掉不存在的角色', () => {
      const user = createUserWithRoles(
        {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ['admin', 'nonexistent']
      )
      expect(user.roleIds).toEqual(['admin', 'nonexistent'])
      expect(user.roles.length).toBe(1)
      expect(user.roles[0].id).toBe('admin')
    })
  })
})

describe('Edge Cases - 边界情况', () => {
  const adminRole: RoleDefinition = {
    id: 'admin',
    name: '管理员',
    description: '管理员',
    permissions: ['user:read', 'user:create', 'user:update', 'user:delete', 'user:list'],
    isSystem: true,
    level: 80,
  }

  it('应该处理空角色数组', () => {
    const user: UserWithRoles = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      roleIds: [],
      roles: [],
    }
    expect(hasPermission(user, 'user:read')).toBe(false)
    expect(getUserMaxLevel(user)).toBe(0)
  })

  it('应该处理权限列表中的空值', () => {
    const user = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      roleIds: ['admin'],
      roles: [adminRole],
    }
    expect(hasAnyPermission(user, [])).toBe(false)
    expect(hasAllPermissions(user, [])).toBe(true)
  })

  it('应该正确处理权限继承 (MANAGE 权限)', () => {
    const user = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      roleIds: ['admin'],
      roles: [adminRole],
    }
    // 注意: 当前实现没有自动继承逻辑，需要显式检查
    expect(hasPermission(user, 'user:manage')).toBe(false)
  })
})
