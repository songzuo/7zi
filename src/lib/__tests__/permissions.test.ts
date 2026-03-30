/**
 * Permission 相关测试
 * 验证 v1.5.0 PermissionContext → Zustand 迁移后的权限功能
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Role,
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  isAdmin,
  isManagerOrAdmin,
  isMemberOrHigher,
  getRoleDefinition,
  getPermissionsForRoles,
  hasRolePermission,
  type PermissionContext,
} from '../permissions/rbac';

// 场景 B1: 权限检查函数测试
describe('权限检查函数测试', () => {
  describe('hasPermission - 单个权限检查', () => {
    it('应该返回 true 当用户拥有所需权限', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [Permission.USER_READ, Permission.USER_CREATE],
      };

      expect(hasPermission(context, Permission.USER_READ)).toBe(true);
      expect(hasPermission(context, Permission.USER_CREATE)).toBe(true);
    });

    it('应该返回 false 当用户没有所需权限', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [Permission.USER_READ],
      };

      expect(hasPermission(context, Permission.USER_DELETE)).toBe(false);
    });

    it('应该支持自定义权限检查', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [],
        customPermissions: ['custom:feature:access'],
      };

      expect(hasPermission(context, 'custom:feature:access' as Permission)).toBe(true);
    });
  });

  describe('hasAnyPermission - 任意权限检查 (OR 逻辑)', () => {
    it('应该返回 true 当用户拥有任意一个所需权限', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [Permission.USER_READ, Permission.TASK_READ],
      };

      const required = [Permission.USER_READ, Permission.USER_DELETE, Permission.ADMIN];
      expect(hasAnyPermission(context, required)).toBe(true);
    });

    it('应该返回 false 当用户没有任何所需权限', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.VIEWER],
        permissions: [Permission.USER_READ],
      };

      const required = [Permission.USER_DELETE, Permission.ADMIN, Permission.SYSTEM_MANAGE];
      expect(hasAnyPermission(context, required)).toBe(false);
    });

    it('应该处理空数组', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [],
      };

      expect(hasAnyPermission(context, [])).toBe(false);
    });
  });

  describe('hasAllPermissions - 所有权限检查 (AND 逻辑)', () => {
    it('应该返回 allowed: true 当用户拥有所有所需权限', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [
          Permission.USER_READ,
          Permission.USER_CREATE,
          Permission.USER_UPDATE,
        ],
      };

      const required = [Permission.USER_READ, Permission.USER_CREATE];
      const result = hasAllPermissions(context, required);

      expect(result.allowed).toBe(true);
      expect(result.missingPermissions).toBeUndefined();
    });

    it('应该返回 allowed: false 并列出缺失权限', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [Permission.USER_READ],
      };

      const required = [Permission.USER_READ, Permission.USER_DELETE, Permission.ADMIN];
      const result = hasAllPermissions(context, required);

      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toEqual([Permission.USER_DELETE, Permission.ADMIN]);
      expect(result.reason).toContain('Missing permissions');
    });

    it('应该处理空数组', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [],
      };

      const result = hasAllPermissions(context, []);
      expect(result.allowed).toBe(true);
    });
  });
});

// 场景 B2: 角色管理测试
describe('角色管理测试', () => {
  describe('hasRole - 单个角色检查', () => {
    it('应该返回 true 当用户拥有指定角色', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [],
      };

      expect(hasRole(context, Role.ADMIN)).toBe(true);
    });

    it('应该返回 false 当用户没有指定角色', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [],
      };

      expect(hasRole(context, Role.ADMIN)).toBe(false);
    });
  });

  describe('hasAnyRole - 任意角色检查', () => {
    it('应该返回 true 当用户拥有任意一个指定角色', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.MEMBER],
        permissions: [],
      };

      const requiredRoles = [Role.ADMIN, Role.MANAGER, Role.MEMBER];
      expect(hasAnyRole(context, requiredRoles)).toBe(true);
    });

    it('应该返回 false 当用户没有任何指定角色', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.VIEWER],
        permissions: [],
      };

      const requiredRoles = [Role.ADMIN, Role.MANAGER];
      expect(hasAnyRole(context, requiredRoles)).toBe(false);
    });
  });

  describe('hasAllRoles - 所有角色检查', () => {
    it('应该返回 true 当用户拥有所有指定角色', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN, Role.MANAGER],
        permissions: [],
      };

      expect(hasAllRoles(context, [Role.ADMIN, Role.MANAGER])).toBe(true);
    });

    it('应该返回 false 当用户没有所有指定角色', () => {
      const context: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [],
      };

      expect(hasAllRoles(context, [Role.ADMIN, Role.MANAGER])).toBe(false);
    });
  });

  describe('便捷角色检查函数', () => {
    it('isAdmin 应该正确识别管理员', () => {
      const adminContext: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [],
      };

      const memberContext: PermissionContext = {
        userId: 'user2',
        roles: [Role.MEMBER],
        permissions: [],
      };

      expect(isAdmin(adminContext)).toBe(true);
      expect(isAdmin(memberContext)).toBe(false);
    });

    it('isManagerOrAdmin 应该正确识别管理员或经理', () => {
      const adminContext: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [],
      };

      const managerContext: PermissionContext = {
        userId: 'user2',
        roles: [Role.MANAGER],
        permissions: [],
      };

      const memberContext: PermissionContext = {
        userId: 'user3',
        roles: [Role.MEMBER],
        permissions: [],
      };

      expect(isManagerOrAdmin(adminContext)).toBe(true);
      expect(isManagerOrAdmin(managerContext)).toBe(true);
      expect(isManagerOrAdmin(memberContext)).toBe(false);
    });

    it('isMemberOrHigher 应该正确识别成员及以上角色', () => {
      const adminContext: PermissionContext = {
        userId: 'user1',
        roles: [Role.ADMIN],
        permissions: [],
      };

      const managerContext: PermissionContext = {
        userId: 'user2',
        roles: [Role.MANAGER],
        permissions: [],
      };

      const memberContext: PermissionContext = {
        userId: 'user3',
        roles: [Role.MEMBER],
        permissions: [],
      };

      const viewerContext: PermissionContext = {
        userId: 'user4',
        roles: [Role.VIEWER],
        permissions: [],
      };

      expect(isMemberOrHigher(adminContext)).toBe(true);
      expect(isMemberOrHigher(managerContext)).toBe(true);
      expect(isMemberOrHigher(memberContext)).toBe(true);
      expect(isMemberOrHigher(viewerContext)).toBe(false);
    });
  });
});

// 场景 B3: 权限数据读写测试
describe('权限数据读写测试', () => {
  describe('getRoleDefinition - 获取角色定义', () => {
    it('应该返回正确的角色定义', () => {
      const adminDef = getRoleDefinition(Role.ADMIN);
      expect(adminDef).not.toBeNull();
      expect(adminDef?.id).toBe(Role.ADMIN);
      expect(adminDef?.name).toBe('Administrator');
      expect(adminDef?.isSystem).toBe(true);
    });

    it('应该返回 null 对于不存在的角色', () => {
      const result = getRoleDefinition('INVALID_ROLE' as Role);
      expect(result).toBeNull();
    });

    it('应该包含正确的权限列表', () => {
      const adminDef = getRoleDefinition(Role.ADMIN);
      expect(adminDef?.permissions).toContain(Permission.USER_READ);
      expect(adminDef?.permissions).toContain(Permission.SYSTEM_MANAGE);
    });
  });

  describe('getPermissionsForRoles - 获取多个角色的权限', () => {
    it('应该返回所有角色的权限合集', () => {
      const permissions = getPermissionsForRoles([Role.ADMIN, Role.MANAGER]);

      // 应该包含两个角色共有的权限
      expect(permissions).toContain(Permission.USER_READ);
      expect(permissions).toContain(Permission.TASK_READ);

      // 应该包含 ADMIN 特有的权限
      expect(permissions).toContain(Permission.USER_DELETE);
      expect(permissions).toContain(Permission.SYSTEM_MANAGE);
    });

    it('应该正确处理空角色数组', () => {
      const permissions = getPermissionsForRoles([]);
      expect(permissions).toEqual([]);
    });

    it('应该去重权限', () => {
      const permissions = getPermissionsForRoles([Role.ADMIN, Role.ADMIN]);
      const uniquePermissions = new Set(permissions);

      expect(permissions.length).toBe(uniquePermissions.size);
    });
  });

  describe('hasRolePermission - 角色权限检查', () => {
    it('应该返回 true 当角色拥有指定权限', () => {
      const result = hasRolePermission(Role.ADMIN, Permission.USER_READ);
      expect(result).toBe(true);
    });

    it('应该返回 false 当角色没有指定权限', () => {
      const result = hasRolePermission(Role.VIEWER, Permission.USER_DELETE);
      expect(result).toBe(false);
    });
  });
});

// 场景 B4: 不同角色类型的权限对比
describe('不同角色类型的权限对比', () => {
  it('管理员应该拥有所有权限', () => {
    const adminContext: PermissionContext = {
      userId: 'admin',
      roles: [Role.ADMIN],
      permissions: getPermissionsForRoles([Role.ADMIN]),
    };

    // 测试一些关键权限
    expect(hasPermission(adminContext, Permission.USER_READ)).toBe(true);
    expect(hasPermission(adminContext, Permission.USER_DELETE)).toBe(true);
    expect(hasPermission(adminContext, Permission.SYSTEM_MANAGE)).toBe(true);
    expect(hasPermission(adminContext, Permission.AGENT_EXECUTE)).toBe(true);
    expect(hasPermission(adminContext, Permission.WALLET_MANAGE)).toBe(true);
  });

  it('经理应该拥有团队和任务管理权限', () => {
    const managerContext: PermissionContext = {
      userId: 'manager',
      roles: [Role.MANAGER],
      permissions: getPermissionsForRoles([Role.MANAGER]),
    };

    // 应该有的权限
    expect(hasPermission(managerContext, Permission.TEAM_CREATE)).toBe(true);
    expect(hasPermission(managerContext, Permission.TASK_CREATE)).toBe(true);
    expect(hasPermission(managerContext, Permission.APPROVAL_APPROVE)).toBe(true);

    // 不应该有的权限
    expect(hasPermission(managerContext, Permission.USER_DELETE)).toBe(false);
    expect(hasPermission(managerContext, Permission.SYSTEM_MANAGE)).toBe(false);
    expect(hasPermission(managerContext, Permission.WALLET_MANAGE)).toBe(false);
  });

  it('成员应该拥有基础任务权限', () => {
    const memberContext: PermissionContext = {
      userId: 'member',
      roles: [Role.MEMBER],
      permissions: getPermissionsForRoles([Role.MEMBER]),
    };

    // 应该有的权限
    expect(hasPermission(memberContext, Permission.TASK_READ)).toBe(true);
    expect(hasPermission(memberContext, Permission.TASK_CREATE)).toBe(true);
    expect(hasPermission(memberContext, Permission.AGENT_EXECUTE)).toBe(true);

    // 不应该有的权限
    expect(hasPermission(memberContext, Permission.TASK_DELETE)).toBe(false);
    expect(hasPermission(memberContext, Permission.TEAM_CREATE)).toBe(false);
  });

  it('观察者应该只有只读权限', () => {
    const viewerContext: PermissionContext = {
      userId: 'viewer',
      roles: [Role.VIEWER],
      permissions: getPermissionsForRoles([Role.VIEWER]),
    };

    // 应该有的权限
    expect(hasPermission(viewerContext, Permission.USER_READ)).toBe(true);
    expect(hasPermission(viewerContext, Permission.TASK_READ)).toBe(true);
    expect(hasPermission(viewerContext, Permission.TEAM_READ)).toBe(true);

    // 不应该有的权限
    expect(hasPermission(viewerContext, Permission.TASK_CREATE)).toBe(false);
    expect(hasPermission(viewerContext, Permission.TASK_UPDATE)).toBe(false);
    expect(hasPermission(viewerContext, Permission.TASK_DELETE)).toBe(false);
  });
});

// 场景 B5: 复杂权限场景测试
describe('复杂权限场景测试', () => {
  it('应该正确处理多角色用户的权限', () => {
    const multiRoleContext: PermissionContext = {
      userId: 'user1',
      roles: [Role.MEMBER, Role.VIEWER],
      permissions: getPermissionsForRoles([Role.MEMBER, Role.VIEWER]),
    };

    // MEMBER 的权限应该可用
    expect(hasPermission(multiRoleContext, Permission.TASK_CREATE)).toBe(true);

    // VIEWER 的权限应该可用
    expect(hasPermission(multiRoleContext, Permission.TEAM_READ)).toBe(true);
  });

  it('应该正确处理自定义权限覆盖', () => {
    const customContext: PermissionContext = {
      userId: 'user1',
      roles: [Role.VIEWER],
      permissions: getPermissionsForRoles([Role.VIEWER]),
      customPermissions: [Permission.TASK_CREATE],
    };

    // 自定义权限应该生效
    expect(hasPermission(customContext, Permission.TASK_CREATE)).toBe(true);

    // 原有权限仍然有效
    expect(hasPermission(customContext, Permission.TASK_READ)).toBe(true);
  });

  it('应该正确处理权限层级逻辑', () => {
    const contexts = {
      admin: { userId: 'admin', roles: [Role.ADMIN], permissions: getPermissionsForRoles([Role.ADMIN]) },
      manager: { userId: 'manager', roles: [Role.MANAGER], permissions: getPermissionsForRoles([Role.MANAGER]) },
      member: { userId: 'member', roles: [Role.MEMBER], permissions: getPermissionsForRoles([Role.MEMBER]) },
    };

    // ADMIN 应该在所有层级检查中返回 true
    expect(isManagerOrAdmin(contexts.admin)).toBe(true);
    expect(isMemberOrHigher(contexts.admin)).toBe(true);

    // MANAGER 应该在管理层和成员层返回 true
    expect(isManagerOrAdmin(contexts.manager)).toBe(true);
    expect(isMemberOrHigher(contexts.manager)).toBe(true);

    // MEMBER 应该只在成员层返回 true
    expect(isManagerOrAdmin(contexts.member)).toBe(false);
    expect(isMemberOrHigher(contexts.member)).toBe(true);
  });
});

// 场景 B6: 边界条件测试
describe('边界条件测试', () => {
  it('应该正确处理空权限列表', () => {
    const context: PermissionContext = {
      userId: 'user1',
      roles: [Role.MEMBER],
      permissions: [],
    };

    expect(hasPermission(context, Permission.USER_READ)).toBe(false);
    expect(hasAnyPermission(context, [])).toBe(false);
  });

  it('应该正确处理空角色列表', () => {
    const context: PermissionContext = {
      userId: 'user1',
      roles: [],
      permissions: [],
    };

    expect(hasRole(context, Role.ADMIN)).toBe(false);
    expect(hasAnyRole(context, [Role.ADMIN, Role.MANAGER])).toBe(false);
    expect(hasAllRoles(context, [Role.ADMIN])).toBe(false);
    expect(isAdmin(context)).toBe(false);
    expect(isManagerOrAdmin(context)).toBe(false);
    expect(isMemberOrHigher(context)).toBe(false);
  });
});
