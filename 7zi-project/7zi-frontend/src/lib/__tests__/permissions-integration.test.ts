/**
 * Permissions Module Integration Tests
 *
 * 测试权限系统的核心功能，包括：
 * - 权限检查（hasPermission, hasAnyPermission, hasAllPermissions）
 * - 资源访问控制（canAccessResource）
 * - 角色级别检查（hasRoleLevel, getUserMaxLevel）
 * - 权限管理器（PermissionManager）
 * - 权限装饰器（RequirePermission 等）
 * - 权限解析和构建（parsePermission, buildPermission）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Enums
  ResourceType,
  ActionType,

  // Types
  PermissionDefinition,
  RoleDefinition,
  ResourceAccessRule,
  PermissionCheckResult,
  PermissionContext,

  // Constants
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  TEAM_LEADER_ROLE,
  DEVELOPER_ROLE,
  USER_ROLE,
  GUEST_ROLE,
  Permissions,

  // Classes
  PermissionManager,
  PermissionDeniedError,

  // Functions
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
  getPermissionDescription,
  isValidPermission,
  permissionManager,

  // Types
  UserWithRoles,
} from '../permissions';

describe('Permissions Module - Integration Tests', () => {
  // 测试用户
  let superAdmin: UserWithRoles;
  let admin: UserWithRoles;
  let teamLeader: UserWithRoles;
  let developer: UserWithRoles;
  let regularUser: UserWithRoles;
  let guest: UserWithRoles;

  beforeEach(() => {
    // 清理权限管理器的自定义权限和角色
    (permissionManager as any).customPermissions.clear();
    (permissionManager as any).customRoles.clear();

    // 创建测试用户
    superAdmin = createUserWithRoles(
      {
        id: 'user-1',
        username: 'superadmin',
        email: 'superadmin@example.com',
        role: 'admin' as any,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['super_admin']
    );

    admin = createUserWithRoles(
      {
        id: 'user-2',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin' as any,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['admin']
    );

    teamLeader = createUserWithRoles(
      {
        id: 'user-3',
        username: 'teamleader',
        email: 'teamleader@example.com',
        role: 'user' as any,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['team_leader']
    );

    developer = createUserWithRoles(
      {
        id: 'user-4',
        username: 'developer',
        email: 'developer@example.com',
        role: 'user' as any,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['developer']
    );

    regularUser = createUserWithRoles(
      {
        id: 'user-5',
        username: 'user',
        email: 'user@example.com',
        role: 'user' as any,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['user']
    );

    guest = createUserWithRoles(
      {
        id: 'user-6',
        username: 'guest',
        email: 'guest@example.com',
        role: 'guest' as any,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['guest']
    );
  });

  /**
   * 集成测试 1: 权限检查链式验证
   *
   * 测试场景：
   * - 验证不同角色对不同权限的访问
   * - 测试多角色用户的权限继承
   * - 验证权限的层级关系
   */
  describe('Integration Test 1: 权限检查链式验证', () => {
    it('超级管理员应该拥有所有系统权限', () => {
      // 验证超级管理员拥有所有系统权限
      for (const permission of SYSTEM_PERMISSIONS) {
        expect(hasPermission(superAdmin, permission.id as Permission)).toBe(true);
      }

      // 验证超级管理员角色级别最高
      expect(getUserMaxLevel(superAdmin)).toBe(100);
      expect(hasRoleLevel(superAdmin, 100)).toBe(true);
    });

    it('管理员应该拥有大部分管理权限', () => {
      // 验证管理员拥有的权限
      expect(hasPermission(admin, 'user:read')).toBe(true);
      expect(hasPermission(admin, 'user:list')).toBe(true);
      expect(hasPermission(admin, 'user:update')).toBe(true);
      expect(hasPermission(admin, 'team:create')).toBe(true);
      expect(hasPermission(admin, 'project:create')).toBe(true);
      expect(hasPermission(admin, 'data:export')).toBe(true);

      // 验证管理员没有的权限
      expect(hasPermission(admin, 'user:create')).toBe(false);
      expect(hasPermission(admin, 'user:delete')).toBe(false);
      expect(hasPermission(admin, 'system:config')).toBe(false);

      // 验证角色级别
      expect(getUserMaxLevel(admin)).toBe(80);
      expect(hasRoleLevel(admin, 80)).toBe(true);
      expect(hasRoleLevel(admin, 90)).toBe(false);
    });

    it('团队负责人应该拥有团队和项目管理权限', () => {
      // 验证团队负责人拥有的权限
      expect(hasPermission(teamLeader, 'team:update')).toBe(true);
      expect(hasPermission(teamLeader, 'team:manage')).toBe(true);
      expect(hasPermission(teamLeader, 'project:create')).toBe(true);
      expect(hasPermission(teamLeader, 'project:update')).toBe(true);
      expect(hasPermission(teamLeader, 'project:delete')).toBe(true);
      expect(hasPermission(teamLeader, 'data:export')).toBe(true);

      // 验证团队负责人没有的权限
      expect(hasPermission(teamLeader, 'team:create')).toBe(false);
      expect(hasPermission(teamLeader, 'user:read')).toBe(false);

      // 验证角色级别
      expect(getUserMaxLevel(teamLeader)).toBe(60);
    });

    it('开发者应该拥有基本的开发权限', () => {
      // 验证开发者拥有的权限
      expect(hasPermission(developer, 'project:create')).toBe(true);
      expect(hasPermission(developer, 'project:update')).toBe(true);
      expect(hasPermission(developer, 'data:export')).toBe(true);
      expect(hasPermission(developer, 'mcp:execute')).toBe(true);

      // 验证开发者没有的权限
      expect(hasPermission(developer, 'project:delete')).toBe(false);
      expect(hasPermission(developer, 'team:manage')).toBe(false);
      expect(hasPermission(developer, 'user:read')).toBe(false);

      // 验证角色级别
      expect(getUserMaxLevel(developer)).toBe(40);
    });

    it('普通用户应该只有基本查看权限', () => {
      // 验证普通用户拥有的权限
      expect(hasPermission(regularUser, 'user:read')).toBe(true);
      expect(hasPermission(regularUser, 'project:read')).toBe(true);
      expect(hasPermission(regularUser, 'team:read')).toBe(true);

      // 验证普通用户没有的权限
      expect(hasPermission(regularUser, 'project:create')).toBe(false);
      expect(hasPermission(regularUser, 'project:update')).toBe(false);
      expect(hasPermission(regularUser, 'data:export')).toBe(false);

      // 验证角色级别
      expect(getUserMaxLevel(regularUser)).toBe(20);
    });

    it('访客应该只有只读权限', () => {
      // 验证访客拥有的权限
      expect(hasPermission(guest, 'project:read')).toBe(true);

      // 验证访客没有的权限
      expect(hasPermission(guest, 'user:read')).toBe(false);
      expect(hasPermission(guest, 'team:read')).toBe(false);
      expect(hasPermission(guest, 'project:create')).toBe(false);
      expect(hasPermission(guest, 'data:export')).toBe(false);

      // 验证角色级别最低
      expect(getUserMaxLevel(guest)).toBe(10);
    });

    it('多角色用户应该拥有所有角色的权限', () => {
      const multiRoleUser = createUserWithRoles(
        {
          id: 'user-multi',
          username: 'multirole',
          email: 'multi@example.com',
          role: 'user' as any,
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ['developer', 'user']
      );

      // 验证拥有开发者的权限
      expect(hasPermission(multiRoleUser, 'project:create')).toBe(true);
      expect(hasPermission(multiRoleUser, 'data:export')).toBe(true);

      // 验证拥有普通用户的权限
      expect(hasPermission(multiRoleUser, 'user:read')).toBe(true);
      expect(hasPermission(multiRoleUser, 'project:read')).toBe(true);

      // 验证角色级别取最大值
      expect(getUserMaxLevel(multiRoleUser)).toBe(40); // developer 的级别
    });
  });

  /**
   * 集成测试 2: 资源访问控制验证
   *
   * 测试场景：
   * - 验证用户对自己资源的访问权限
   * - 验证用户对他人资源的访问限制
   * - 测试超级管理员对所有资源的访问
   * - 验证资源级别权限的边界情况
   */
  describe('Integration Test 2: 资源访问控制验证', () => {
    it('用户应该可以访问自己的资源', () => {
      const context: PermissionContext = {
        userId: 'user-3',
        resourceOwnerId: 'user-3',
        resourceId: 'project-1',
        resourceType: ResourceType.PROJECT,
      };

      // 团队负责人访问自己的项目
      expect(canAccessResource(teamLeader, 'project:read' as Permission, context)).toBe(true);
      expect(canAccessResource(teamLeader, 'project:update' as Permission, context)).toBe(true);
      expect(canAccessResource(teamLeader, 'project:delete' as Permission, context)).toBe(true);
    });

    it('用户不应该可以访问他人的资源（除非有权限）', () => {
      const context: PermissionContext = {
        userId: 'user-4',
        resourceOwnerId: 'user-5',
        resourceId: 'project-2',
        resourceType: ResourceType.PROJECT,
      };

      // 开发者尝试访问普通用户的项目
      expect(canAccessResource(developer, 'project:read' as Permission, context)).toBe(false);
      expect(canAccessResource(developer, 'project:update' as Permission, context)).toBe(false);
      expect(canAccessResource(developer, 'project:delete' as Permission, context)).toBe(false);
    });

    it('超级管理员应该可以访问所有资源', () => {
      const context: PermissionContext = {
        userId: 'user-1',
        resourceOwnerId: 'user-5',
        resourceId: 'project-3',
        resourceType: ResourceType.PROJECT,
      };

      // 超级管理员访问任何资源都应该被允许
      expect(canAccessResource(superAdmin, 'project:read' as Permission, context)).toBe(true);
      expect(canAccessResource(superAdmin, 'project:update' as Permission, context)).toBe(true);
      expect(canAccessResource(superAdmin, 'project:delete' as Permission, context)).toBe(true);
      expect(canAccessResource(superAdmin, 'user:delete' as Permission, context)).toBe(true);
    });

    it('资源所有者应该对资源拥有完全控制', () => {
      const userContext: PermissionContext = {
        userId: 'user-3',
        resourceOwnerId: 'user-3',
        resourceId: 'team-1',
        resourceType: ResourceType.TEAM,
      };

      // 即使角色没有明确权限，资源所有者也应该能访问
      expect(canAccessResource(teamLeader, 'team:update' as Permission, userContext)).toBe(true);
    });

    it('应该正确处理没有资源所有者的场景', () => {
      const context: PermissionContext = {
        userId: 'user-4',
        resourceId: 'public-resource',
        resourceType: ResourceType.PROJECT,
      };

      // 没有资源所有者时，只检查权限
      expect(canAccessResource(developer, 'project:read' as Permission, context)).toBe(false);
      expect(canAccessResource(teamLeader, 'project:read' as Permission, context)).toBe(false);
    });

    it('管理员应该可以访问大部分他人资源', () => {
      const context: PermissionContext = {
        userId: 'user-2',
        resourceOwnerId: 'user-5',
        resourceId: 'project-4',
        resourceType: ResourceType.PROJECT,
      };

      // 管理员可以更新和删除他人的项目
      expect(canAccessResource(admin, 'project:update' as Permission, context)).toBe(true);
      expect(canAccessResource(admin, 'project:delete' as Permission, context)).toBe(true);

      // 但管理员不能创建用户
      expect(canAccessResource(admin, 'user:create' as Permission, context)).toBe(false);
    });
  });

  /**
   * 集成测试 3: 复合权限检查验证
   *
   * 测试场景：
   * - 测试 hasAnyPermission 的各种组合
   * - 测试 hasAllPermissions 的严格验证
   * - 测试空权限数组的边界情况
   * - 验证权限检查的性能和正确性
   */
  describe('Integration Test 3: 复合权限检查验证', () => {
    it('hasAnyPermission 应该在用户拥有任一权限时返回 true', () => {
      // 开发者拥有这些权限之一
      expect(
        hasAnyPermission(developer, [
          'project:create' as Permission,
          'user:delete' as Permission,
        ])
      ).toBe(true);

      // 访客没有这些权限中的任何一个
      expect(
        hasAnyPermission(guest, [
          'project:create' as Permission,
          'user:delete' as Permission,
        ])
      ).toBe(false);
    });

    it('hasAllPermissions 应该在用户拥有所有权限时返回 true', () => {
      // 团队负责人拥有所有这些权限
      expect(
        hasAllPermissions(teamLeader, [
          'team:update' as Permission,
          'team:manage' as Permission,
          'project:create' as Permission,
        ])
      ).toBe(true);

      // 开发者缺少 team:manage 权限
      expect(
        hasAllPermissions(developer, [
          'team:update' as Permission,
          'team:manage' as Permission,
        ])
      ).toBe(false);
    });

    it('空权限数组应该返回 true（无限制）', () => {
      expect(hasAnyPermission(developer, [])).toBe(true);
      expect(hasAllPermissions(developer, [])).toBe(true);
      expect(hasAnyPermission(guest, [])).toBe(true);
      expect(hasAllPermissions(guest, [])).toBe(true);
    });

    it('单个权限检查应该与 hasPermission 一致', () => {
      expect(
        hasAnyPermission(admin, ['user:read' as Permission])
      ).toBe(hasPermission(admin, 'user:read' as Permission));

      expect(
        hasAllPermissions(admin, ['user:read' as Permission])
      ).toBe(hasPermission(admin, 'user:read' as Permission));
    });

    it('权限检查应该遵循 OR 逻辑（hasAnyPermission）', () => {
      // 至少满足一个条件
      expect(
        hasAnyPermission(regularUser, [
          'user:read' as Permission,
          'project:create' as Permission,
        ])
      ).toBe(true);

      expect(
        hasAnyPermission(regularUser, [
          'project:create' as Permission,
          'project:update' as Permission,
        ])
      ).toBe(false);
    });

    it('权限检查应该遵循 AND 逻辑（hasAllPermissions）', () => {
      // 必须满足所有条件
      expect(
        hasAllPermissions(teamLeader, [
          'project:create' as Permission,
          'project:update' as Permission,
          'project:delete' as Permission,
        ])
      ).toBe(true);

      expect(
        hasAllPermissions(teamLeader, [
          'project:create' as Permission,
          'user:create' as Permission,
        ])
      ).toBe(false);
    });

    it('混合权限组合测试', () => {
      const permissions = [
        'project:read' as Permission,
        'project:create' as Permission,
        'project:update' as Permission,
        'project:delete' as Permission,
        'user:read' as Permission,
      ];

      // 超级管理员拥有所有权限
      expect(hasAnyPermission(superAdmin, permissions)).toBe(true);
      expect(hasAllPermissions(superAdmin, permissions)).toBe(true);

      // 团队负责人拥有部分权限
      expect(hasAnyPermission(teamLeader, permissions)).toBe(true);
      expect(hasAllPermissions(teamLeader, permissions)).toBe(false); // 缺少 user:read

      // 访客只有部分权限
      expect(hasAnyPermission(guest, permissions)).toBe(true); // project:read
      expect(hasAllPermissions(guest, permissions)).toBe(false);
    });
  });

  /**
   * 集成测试 4: 权限管理器动态管理验证
   *
   * 测试场景：
   * - 测试添加自定义权限
   * - 测试添加自定义角色
   * - 测试权限与角色的关联
   * - 验证权限和角色的查询功能
   * - 测试系统权限和角色的不可变性
   */
  describe('Integration Test 4: 权限管理器动态管理验证', () => {
    it('应该能够添加自定义权限', () => {
      const customPermission: PermissionDefinition = {
        id: 'custom:action',
        name: '自定义操作',
        description: '这是一个自定义权限',
        resourceType: ResourceType.PROJECT,
        actionType: ActionType.EXECUTE,
        isSystem: false,
      };

      expect(permissionManager.addCustomPermission(customPermission)).toBe(true);

      // 验证自定义权限已添加
      const allPermissions = permissionManager.getAllPermissions();
      expect(allPermissions).toContainEqual(customPermission);

      // 验证可以通过 ID 查找
      expect(permissionManager.getPermissionById('custom:action')).toEqual(customPermission);
    });

    it('应该能够添加自定义角色', () => {
      const customRole: RoleDefinition = {
        id: 'custom_role',
        name: '自定义角色',
        description: '这是一个自定义角色',
        permissions: ['project:create', 'project:update'],
        isSystem: false,
        level: 50,
      };

      expect(permissionManager.addCustomRole(customRole)).toBe(true);

      // 验证自定义角色已添加
      const allRoles = permissionManager.getAllRoles();
      expect(allRoles).toContainEqual(customRole);

      // 验证可以通过 ID 查找
      expect(permissionManager.getRoleById('custom_role')).toEqual(customRole);

      // 验证可以获取角色的权限
      const rolePermissions = permissionManager.getPermissionsByRole('custom_role');
      expect(rolePermissions).toEqual(['project:create', 'project:update']);
    });

    it('自定义角色应该关联自定义权限', () => {
      const customPermission: PermissionDefinition = {
        id: 'custom:feature',
        name: '自定义功能',
        description: '自定义功能权限',
        resourceType: ResourceType.PROJECT,
        actionType: ActionType.CREATE,
        isSystem: false,
      };

      const customRole: RoleDefinition = {
        id: 'custom_manager',
        name: '自定义管理员',
        description: '拥有自定义功能的管理员',
        permissions: [customPermission.id as Permission, 'project:read'],
        isSystem: false,
        level: 55,
      };

      permissionManager.addCustomPermission(customPermission);
      permissionManager.addCustomRole(customRole);

      // 创建具有自定义角色的用户
      const customUser = createUserWithRoles(
        {
          id: 'user-custom',
          username: 'customuser',
          email: 'custom@example.com',
          role: 'user' as any,
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ['custom_manager']
      );

      // 验证用户拥有自定义权限
      expect(hasPermission(customUser, 'custom:feature' as Permission)).toBe(true);
      expect(hasPermission(customUser, 'project:read' as Permission)).toBe(true);
      expect(hasPermission(customUser, 'project:create' as Permission)).toBe(false);
    });

    it('系统权限应该不可删除', () => {
      // 尝试删除系统权限应该失败
      expect(permissionManager.removePermission('user:read')).toBe(false);

      // 验证系统权限仍然存在
      expect(permissionManager.getPermissionById('user:read')).toBeTruthy();
    });

    it('系统角色应该不可删除', () => {
      // 尝试删除系统角色应该失败
      expect(permissionManager.removeRole('admin')).toBe(false);

      // 验证系统角色仍然存在
      expect(permissionManager.getRoleById('admin')).toBeTruthy();
    });

    it('应该能够删除自定义权限', () => {
      const customPermission: PermissionDefinition = {
        id: 'temp:permission',
        name: '临时权限',
        description: '临时测试权限',
        resourceType: ResourceType.PROJECT,
        actionType: ActionType.READ,
        isSystem: false,
      };

      permissionManager.addCustomPermission(customPermission);
      expect(permissionManager.getPermissionById('temp:permission')).toBeTruthy();

      // 删除自定义权限
      expect(permissionManager.removePermission('temp:permission')).toBe(true);
      expect(permissionManager.getPermissionById('temp:permission')).toBeFalsy();
    });

    it('应该能够删除自定义角色', () => {
      const customRole: RoleDefinition = {
        id: 'temp:role',
        name: '临时角色',
        description: '临时测试角色',
        permissions: [],
        isSystem: false,
        level: 1,
      };

      permissionManager.addCustomRole(customRole);
      expect(permissionManager.getRoleById('temp:role')).toBeTruthy();

      // 删除自定义角色
      expect(permissionManager.removeRole('temp:role')).toBe(true);
      expect(permissionManager.getRoleById('temp:role')).toBeFalsy();
    });

    it('角色等级应该正确影响权限优先级', () => {
      const lowLevelRole: RoleDefinition = {
        id: 'low_level',
        name: '低级角色',
        description: '低权限角色',
        permissions: ['project:read'],
        isSystem: false,
        level: 15,
      };

      const highLevelRole: RoleDefinition = {
        id: 'high_level',
        name: '高级角色',
        description: '高权限角色',
        permissions: ['project:create', 'project:delete'],
        isSystem: false,
        level: 75,
      };

      permissionManager.addCustomRole(lowLevelRole);
      permissionManager.addCustomRole(highLevelRole);

      const user = createUserWithRoles(
        {
          id: 'user-level',
          username: 'leveluser',
          email: 'level@example.com',
          role: 'user' as any,
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ['low_level', 'high_level']
      );

      // 验证用户拥有所有角色的权限
      expect(hasPermission(user, 'project:read' as Permission)).toBe(true);
      expect(hasPermission(user, 'project:create' as Permission)).toBe(true);
      expect(hasPermission(user, 'project:delete' as Permission)).toBe(true);

      // 验证最大角色级别
      expect(getUserMaxLevel(user)).toBe(75);
    });
  });

  /**
   * 集成测试 5: 权限工具函数验证
   *
   * 测试场景：
   * - 测试权限字符串的解析（parsePermission）
   * - 测试权限字符串的构建（buildPermission）
   * - 测试权限描述的获取（getPermissionDescription）
   * - 测试权限格式的验证（isValidPermission）
   * - 测试动作执行权限检查（canExecuteAction）
   * - 测试权限相关异常（PermissionDeniedError）
   */
  describe('Integration Test 5: 权限工具函数验证', () => {
    it('应该正确解析权限字符串', () => {
      // 解析标准权限格式
      expect(parsePermission('user:read')).toEqual({
        resourceType: 'user',
        action: 'read',
      });

      expect(parsePermission('project:create')).toEqual({
        resourceType: 'project',
        action: 'create',
      });

      expect(parsePermission('data:export')).toEqual({
        resourceType: 'data',
        action: 'export',
      });

      // 解析多段权限
      expect(parsePermission('system:config')).toEqual({
        resourceType: 'system',
        action: 'config',
      });

      // 解析不存在的权限（应该返回默认值）
      expect(parsePermission('invalid:permission')).toEqual({
        resourceType: 'invalid',
        action: 'permission',
      });
    });

    it('应该正确构建权限字符串', () => {
      expect(buildPermission(ResourceType.USER, ActionType.READ)).toBe('user:read');
      expect(buildPermission(ResourceType.PROJECT, ActionType.CREATE)).toBe('project:create');
      expect(buildPermission(ResourceType.DATA, ActionType.EXPORT)).toBe('data:export');
      expect(buildPermission(ResourceType.SYSTEM, ActionType.MANAGE)).toBe('system:manage');
    });

    it('parsePermission 和 buildPermission 应该互逆', () => {
      const resources = [
        ResourceType.USER,
        ResourceType.PROJECT,
        ResourceType.TEAM,
        ResourceType.DATA,
      ];

      const actions = [
        ActionType.READ,
        ActionType.CREATE,
        ActionType.UPDATE,
        ActionType.DELETE,
        ActionType.EXECUTE,
        ActionType.EXPORT,
      ];

      for (const resource of resources) {
        for (const action of actions) {
          const permission = buildPermission(resource, action);
          const parsed = parsePermission(permission);

          expect(parsed.resourceType).toBe(resource);
          expect(parsed.action).toBe(action);
        }
      }
    });

    it('应该正确获取权限描述', () => {
      // 系统权限应该有描述
      expect(getPermissionDescription('user:read')).toBe('查看用户');
      expect(getPermissionDescription('project:create')).toBe('创建新项目');
      expect(getPermissionDescription('data:export')).toBe('导出数据');

      // 不存在的权限应该返回通用描述
      expect(getPermissionDescription('custom:action')).toBe('Custom action');
      expect(getPermissionDescription('invalid:permission')).toBe('Invalid permission');
    });

    it('应该正确验证权限格式', () => {
      // 有效的权限格式
      expect(isValidPermission('user:read')).toBe(true);
      expect(isValidPermission('project:create')).toBe(true);
      expect(isValidPermission('data:export')).toBe(true);
      expect(isValidPermission('system:config')).toBe(true);

      // 无效的权限格式
      expect(isValidPermission('')).toBe(false);
      expect(isValidPermission('user')).toBe(false);
      expect(isValidPermission(':read')).toBe(false);
      expect(isValidPermission('user:')).toBe(false);
      expect(isValidPermission('user:read:extra')).toBe(false);
      expect(isValidPermission('user read')).toBe(false);
      expect(isValidPermission('user-read')).toBe(false);
    });

    it('canExecuteAction 应该正确检查动作执行权限', () => {
      // 超级管理员可以执行任何动作
      expect(canExecuteAction(superAdmin, ResourceType.PROJECT, ActionType.CREATE)).toBe(true);
      expect(canExecuteAction(superAdmin, ResourceType.USER, ActionType.DELETE)).toBe(true);
      expect(canExecuteAction(superAdmin, ResourceType.SYSTEM, ActionType.MANAGE)).toBe(true);

      // 团队负责人可以执行项目相关动作
      expect(canExecuteAction(teamLeader, ResourceType.PROJECT, ActionType.CREATE)).toBe(true);
      expect(canExecuteAction(teamLeader, ResourceType.PROJECT, ActionType.UPDATE)).toBe(true);
      expect(canExecuteAction(teamLeader, ResourceType.PROJECT, ActionType.DELETE)).toBe(true);
      expect(canExecuteAction(teamLeader, ResourceType.USER, ActionType.CREATE)).toBe(false);

      // 开发者可以执行有限的动作
      expect(canExecuteAction(developer, ResourceType.PROJECT, ActionType.CREATE)).toBe(true);
      expect(canExecuteAction(developer, ResourceType.PROJECT, ActionType.UPDATE)).toBe(true);
      expect(canExecuteAction(developer, ResourceType.PROJECT, ActionType.DELETE)).toBe(false);

      // 访客只有读权限
      expect(canExecuteAction(guest, ResourceType.PROJECT, ActionType.READ)).toBe(true);
      expect(canExecuteAction(guest, ResourceType.PROJECT, ActionType.CREATE)).toBe(false);
      expect(canExecuteAction(guest, ResourceType.USER, ActionType.READ)).toBe(false);
    });

    it('PermissionDeniedError 应该包含正确的错误信息', () => {
      const error = new PermissionDeniedError(
        ['user:delete', 'system:config'] as Permission[],
        ['user:delete'] as Permission[],
        'Insufficient permissions to delete user'
      );

      expect(error.name).toBe('PermissionDeniedError');
      expect(error.requiredPermissions).toEqual(['user:delete', 'system:config']);
      expect(error.missingPermissions).toEqual(['user:delete']);
      expect(error.message).toBe('Insufficient permissions to delete user');
    });

    it('应该验证 Permissions 常量包含所有系统权限', () => {
      // 验证 Permissions 对象包含所有系统权限的快捷方式
      expect(Permissions.USER_READ).toBe('user:read');
      expect(Permissions.USER_CREATE).toBe('user:create');
      expect(Permissions.PROJECT_READ).toBe('project:read');
      expect(Permissions.PROJECT_CREATE).toBe('project:create');
      expect(Permissions.DATA_EXPORT).toBe('data:export');
    });

    it('权限检查应该正确处理不存在的权限', () => {
      // 不存在的权限应该返回 false
      expect(hasPermission(developer, 'nonexistent:permission' as Permission)).toBe(false);
      expect(hasAnyPermission(developer, ['nonexistent:permission' as Permission])).toBe(false);
      expect(hasAllPermissions(developer, ['nonexistent:permission' as Permission])).toBe(false);
    });

    it('动作执行检查应该支持资源类型和动作类型', () => {
      const resourceTypes = [
        ResourceType.USER,
        ResourceType.PROJECT,
        ResourceType.TEAM,
        ResourceType.DATA,
      ];

      const actions = [
        ActionType.READ,
        ActionType.CREATE,
        ActionType.UPDATE,
        ActionType.DELETE,
      ];

      // 测试超级管理员对所有资源和动作的访问
      for (const resourceType of resourceTypes) {
        for (const action of actions) {
          expect(canExecuteAction(superAdmin, resourceType, action)).toBe(true);
        }
      }

      // 测试访客的受限访问
      expect(canExecuteAction(guest, ResourceType.PROJECT, ActionType.READ)).toBe(true);
      expect(canExecuteAction(guest, ResourceType.PROJECT, ActionType.CREATE)).toBe(false);
      expect(canExecuteAction(guest, ResourceType.USER, ActionType.READ)).toBe(false);
    });
  });
});
