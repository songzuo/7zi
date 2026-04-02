/**
 * Permission Inheritance Unit Tests
 *
 * 测试覆盖：
 * - 角色层级
 * - 权限继承策略
 * - 权限覆盖
 * - 多角色权限合并
 */

import { describe, it, expect } from 'vitest'
import {
  PermissionInheritance,
  InheritanceStrategy,
  PermissionOverride,
  calculateInheritedPermissions,
  calculatePermissionsForRoles,
  checkOverride,
  applyPermissionOverrides,
  getSubRoles,
  getParentRoles,
} from '../permission-inheritance'
import { Role, Permission } from '@/lib/permissions/types'

describe('PermissionInheritance', () => {
  let inheritance: PermissionInheritance

  beforeEach(() => {
    inheritance = new PermissionInheritance()
  })

  describe('角色层级', () => {
    it('应该正确返回角色层级', () => {
      expect(inheritance.getRoleLevel(Role.ADMIN)).toBe(100)
      expect(inheritance.getRoleLevel(Role.MANAGER)).toBe(80)
      expect(inheritance.getRoleLevel(Role.MEMBER)).toBe(50)
      expect(inheritance.getRoleLevel(Role.VIEWER)).toBe(30)
      expect(inheritance.getRoleLevel(Role.GUEST)).toBe(10)
    })

    it('应该正确比较角色优先级', () => {
      expect(inheritance.compareRoles(Role.ADMIN, Role.MANAGER)).toBeGreaterThan(0)
      expect(inheritance.compareRoles(Role.MANAGER, Role.ADMIN)).toBeLessThan(0)
      expect(inheritance.compareRoles(Role.MEMBER, Role.MEMBER)).toBe(0)
    })

    it('应该正确判断高/低角色', () => {
      expect(inheritance.isHigherRole(Role.ADMIN, Role.MANAGER)).toBe(true)
      expect(inheritance.isHigherRole(Role.MANAGER, Role.ADMIN)).toBe(false)
      expect(inheritance.isLowerRole(Role.GUEST, Role.MEMBER)).toBe(true)
      expect(inheritance.isLowerRole(Role.MEMBER, Role.GUEST)).toBe(false)
    })

    it('应该正确获取子角色', () => {
      const adminSubRoles = inheritance.getSubRoles(Role.ADMIN)
      expect(adminSubRoles).toContain(Role.MANAGER)
      expect(adminSubRoles).toContain(Role.MEMBER)
      expect(adminSubRoles).toContain(Role.VIEWER)
      expect(adminSubRoles).toContain(Role.GUEST)
      expect(adminSubRoles).not.toContain(Role.ADMIN)
    })

    it('应该正确获取父角色', () => {
      const memberParentRoles = inheritance.getParentRoles(Role.MEMBER)
      expect(memberParentRoles).toContain(Role.MANAGER)
      expect(memberParentRoles).toContain(Role.ADMIN)
      expect(memberParentRoles).not.toContain(Role.MEMBER)
      expect(memberParentRoles).not.toContain(Role.VIEWER)
      expect(memberParentRoles).not.toContain(Role.GUEST)
    })
  })

  describe('权限覆盖检查', () => {
    it('高优先级应该覆盖低优先级', () => {
      const base: PermissionOverride = {
        permission: Permission.USER_READ,
        override: true,
        priority: 10,
      }

      const override: PermissionOverride = {
        permission: Permission.USER_READ,
        override: false,
        priority: 20,
      }

      expect(checkOverride(base, override)).toBe(true)
    })

    it('低优先级不应该覆盖高优先级', () => {
      const base: PermissionOverride = {
        permission: Permission.USER_READ,
        override: true,
        priority: 20,
      }

      const override: PermissionOverride = {
        permission: Permission.USER_READ,
        override: false,
        priority: 10,
      }

      expect(checkOverride(base, override)).toBe(false)
    })

    it('相同优先级时，拒绝应该覆盖允许', () => {
      const base: PermissionOverride = {
        permission: Permission.USER_READ,
        override: true,
        priority: 10,
      }

      const override: PermissionOverride = {
        permission: Permission.USER_READ,
        override: false,
        priority: 10,
      }

      expect(checkOverride(base, override)).toBe(true)
    })

    it('相同优先级时，允许不应该覆盖拒绝', () => {
      const base: PermissionOverride = {
        permission: Permission.USER_READ,
        override: false,
        priority: 10,
      }

      const override: PermissionOverride = {
        permission: Permission.USER_READ,
        override: true,
        priority: 10,
      }

      expect(checkOverride(base, override)).toBe(false)
    })
  })

  describe('计算继承权限', () => {
    it('应该正确计算单个角色的权限（UNION）', () => {
      const result = inheritance.calculateInheritedPermissions(
        Role.ADMIN,
        InheritanceStrategy.UNION
      )

      expect(result.permissions).toContain(Permission.USER_READ)
      expect(result.permissions).toContain(Permission.USER_CREATE)
      expect(result.permissions).toContain(Permission.USER_UPDATE)
      expect(result.permissions).toContain(Permission.USER_DELETE)
    })

    it('应该正确计算单个角色的权限（OVERRIDE）', () => {
      const result = inheritance.calculateInheritedPermissions(
        Role.ADMIN,
        InheritanceStrategy.OVERRIDE
      )

      expect(result.permissions.length).toBeGreaterThan(0)
      expect(result.overridden.size).toBeGreaterThanOrEqual(0)
    })

    it('未知角色应该返回空权限', () => {
      const result = inheritance.calculateInheritedPermissions(
        'unknown' as Role,
        InheritanceStrategy.UNION
      )

      expect(result.permissions).toEqual([])
    })

    it('OVERRIDE 策略应该记录权限来源', () => {
      const result = inheritance.calculateInheritedPermissions(
        Role.ADMIN,
        InheritanceStrategy.OVERRIDE
      )

      // OVERRIDE 策略会记录权限来源
      expect(result.sources.size).toBeGreaterThan(0)
    })
  })

  describe('计算多个角色的权限', () => {
    it('应该正确合并多个角色的权限（UNION）', () => {
      const result = inheritance.calculatePermissionsForRoles(
        [Role.ADMIN, Role.MANAGER],
        InheritanceStrategy.UNION
      )

      // 应该包含两个角色的所有权限
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('应该正确取交集（INTERSECTION）', () => {
      const result = inheritance.calculatePermissionsForRoles(
        [Role.ADMIN, Role.MANAGER],
        InheritanceStrategy.INTERSECTION
      )

      // 交集应该包含在两个角色中都有的权限
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('应该正确应用覆盖（OVERRIDE）', () => {
      const result = inheritance.calculatePermissionsForRoles(
        [Role.ADMIN, Role.MEMBER],
        InheritanceStrategy.OVERRIDE
      )

      // ADMIN 权限应该覆盖 MEMBER
      expect(result.permissions).toContain(Permission.USER_READ)
    })

    it('空角色数组应该返回空权限', () => {
      const result = inheritance.calculatePermissionsForRoles([], InheritanceStrategy.UNION)

      expect(result.permissions).toEqual([])
    })
  })

  describe('应用权限覆盖', () => {
    it('应该正确应用允许覆盖', () => {
      const permissions: Permission[] = [
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
      ]

      const overrides: PermissionOverride[] = [
        {
          permission: Permission.USER_DELETE,
          override: true,
          priority: 10,
        },
        {
          permission: Permission.USER_READ,
          override: false,
          priority: 10,
        },
      ]

      const result = inheritance.applyPermissionOverrides(permissions, overrides)

      // 未被覆盖的权限应该保留
      expect(result).toContain(Permission.USER_UPDATE)
      // 允许的权限应该保留
      expect(result).toContain(Permission.USER_DELETE)
      // 被拒绝的权限不应该在结果中
      expect(result).not.toContain(Permission.USER_READ)
    })

    it('应该正确应用拒绝覆盖', () => {
      const permissions: Permission[] = [Permission.USER_READ, Permission.USER_UPDATE]

      const overrides: PermissionOverride[] = [
        {
          permission: Permission.USER_READ,
          override: false,
          priority: 10,
        },
      ]

      const result = inheritance.applyPermissionOverrides(permissions, overrides)

      // 被拒绝的权限不应该在结果中
      expect(result).not.toContain(Permission.USER_READ)
      // 未被覆盖的权限应该保留
      expect(result).toContain(Permission.USER_UPDATE)
    })

    it('高优先级覆盖应该生效', () => {
      const permissions: Permission[] = [Permission.USER_READ]

      const overrides: PermissionOverride[] = [
        {
          permission: Permission.USER_READ,
          override: true,
          priority: 10,
        },
        {
          permission: Permission.USER_READ,
          override: false,
          priority: 20,
        },
      ]

      const result = inheritance.applyPermissionOverrides(permissions, overrides)

      // 高优先级的拒绝应该生效
      expect(result).not.toContain(Permission.USER_READ)
    })

    it('应该返回空的权限列表（全部拒绝）', () => {
      const permissions: Permission[] = [
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
      ]

      const overrides: PermissionOverride[] = [
        {
          permission: Permission.USER_READ,
          override: false,
          priority: 10,
        },
        {
          permission: Permission.USER_UPDATE,
          override: false,
          priority: 10,
        },
        {
          permission: Permission.USER_DELETE,
          override: false,
          priority: 10,
        },
      ]

      const result = inheritance.applyPermissionOverrides(permissions, overrides)

      expect(result).toEqual([])
    })
  })

  describe('便捷函数', () => {
    it('calculateInheritedPermissions 应该工作', () => {
      const result = calculateInheritedPermissions(Role.ADMIN)
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('calculatePermissionsForRoles 应该工作', () => {
      const result = calculatePermissionsForRoles([Role.ADMIN, Role.MANAGER])
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('getSubRoles 应该工作', () => {
      const subRoles = getSubRoles(Role.ADMIN)
      expect(subRoles.length).toBeGreaterThan(0)
    })

    it('getParentRoles 应该工作', () => {
      const parentRoles = getParentRoles(Role.GUEST)
      expect(parentRoles.length).toBeGreaterThan(0)
    })
  })
})
