/**
 * Permissions Module Unit Tests
 * 测试权限系统的核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canPerformAction,
  getAllRoles,
  getAllPermissions,
  type Role,
  type Permission,
} from './permissions';

// ============================================================================
// Test Suite: 权限系统基础功能
// ============================================================================

describe('Permissions Module', () => {
  // ============================================================================
  // Test Group: 基础权限检查
  // ============================================================================

  describe('基础权限检查', () => {
    it('Admin 应该拥有所有权限', () => {
      const admin: Role = 'admin';
      const allPermissions: Permission[] = [
        'read',
        'write',
        'delete',
        'admin',
        'moderate',
        'export',
        'import',
        'backup',
        'restore',
      ];

      for (const permission of allPermissions) {
        expect(hasPermission(admin, permission)).toBe(true);
      }
    });

    it('Moderator 应该拥有部分权限', () => {
      const moderator: Role = 'moderator';

      // Moderator 应该拥有的权限
      expect(hasPermission(moderator, 'read')).toBe(true);
      expect(hasPermission(moderator, 'write')).toBe(true);
      expect(hasPermission(moderator, 'moderate')).toBe(true);
      expect(hasPermission(moderator, 'export')).toBe(true);
      expect(hasPermission(moderator, 'import')).toBe(true);

      // Moderator 不应该拥有的权限
      expect(hasPermission(moderator, 'delete')).toBe(false);
      expect(hasPermission(moderator, 'admin')).toBe(false);
      expect(hasPermission(moderator, 'backup')).toBe(false);
      expect(hasPermission(moderator, 'restore')).toBe(false);
    });

    it('User 应该拥有基本权限', () => {
      const user: Role = 'user';

      // User 应该拥有的权限
      expect(hasPermission(user, 'read')).toBe(true);
      expect(hasPermission(user, 'write')).toBe(true);
      expect(hasPermission(user, 'export')).toBe(true);

      // User 不应该拥有的权限
      expect(hasPermission(user, 'delete')).toBe(false);
      expect(hasPermission(user, 'moderate')).toBe(false);
      expect(hasPermission(user, 'admin')).toBe(false);
      expect(hasPermission(user, 'import')).toBe(false);
    });

    it('Guest 应该只有只读权限', () => {
      const guest: Role = 'guest';

      // Guest 应该拥有的权限
      expect(hasPermission(guest, 'read')).toBe(true);

      // Guest 不应该拥有的权限
      expect(hasPermission(guest, 'write')).toBe(false);
      expect(hasPermission(guest, 'delete')).toBe(false);
      expect(hasPermission(guest, 'export')).toBe(false);
    });
  });

  // ============================================================================
  // Test Group: 复合权限检查
  // ============================================================================

  describe('复合权限检查', () => {
    it('hasAnyPermission 应该在任一权限匹配时返回 true', () => {
      const user: Role = 'user';
      const moderator: Role = 'moderator';

      // User 拥有 write 和 export 之一
      expect(
        hasAnyPermission(user, ['write', 'delete', 'admin'])
      ).toBe(true);

      // User 不拥有任何一个权限
      expect(
        hasAnyPermission(user, ['delete', 'admin', 'backup'])
      ).toBe(false);

      // Moderator 拥有 moderate
      expect(
        hasAnyPermission(moderator, ['delete', 'admin', 'moderate'])
      ).toBe(true);
    });

    it('hasAllPermissions 应该在所有权限都匹配时返回 true', () => {
      const admin: Role = 'admin';
      const user: Role = 'user';

      // Admin 拥有所有这些权限
      expect(
        hasAllPermissions(admin, ['read', 'write', 'delete'])
      ).toBe(true);

      // User 不拥有所有这些权限
      expect(
        hasAllPermissions(user, ['read', 'write', 'delete'])
      ).toBe(false);

      // User 拥有 read 和 write
      expect(
        hasAllPermissions(user, ['read', 'write'])
      ).toBe(true);
    });

    it('hasAnyPermission 应该正确处理空数组', () => {
      const user: Role = 'user';

      // 空数组应该返回 false（没有权限匹配）
      expect(hasAnyPermission(user, [])).toBe(false);
    });

    it('hasAllPermissions 应该正确处理空数组', () => {
      const user: Role = 'user';

      // 空数组应该返回 true（没有权限要求）
      expect(hasAllPermissions(user, [])).toBe(true);
    });
  });

  // ============================================================================
  // Test Group: 角色权限查询
  // ============================================================================

  describe('角色权限查询', () => {
    it('getRolePermissions 应该返回正确的权限列表', () => {
      const adminPermissions = getRolePermissions('admin');
      const userPermissions = getRolePermissions('user');
      const guestPermissions = getRolePermissions('guest');

      expect(adminPermissions.length).toBe(9); // 所有权限
      expect(userPermissions.length).toBe(3); // read, write, export
      expect(guestPermissions.length).toBe(1); // read

      expect(adminPermissions).toContain('delete');
      expect(adminPermissions).toContain('admin');

      expect(userPermissions).toContain('read');
      expect(userPermissions).toContain('write');
      expect(userPermissions).toContain('export');

      expect(guestPermissions).toContain('read');
    });

    it('getAllRoles 应该返回所有角色', () => {
      const roles = getAllRoles();

      expect(roles).toContain('admin');
      expect(roles).toContain('moderator');
      expect(roles).toContain('user');
      expect(roles).toContain('guest');
      expect(roles.length).toBe(4);
    });

    it('getAllPermissions 应该返回所有权限', () => {
      const permissions = getAllPermissions();

      const expectedPermissions: Permission[] = [
        'read',
        'write',
        'delete',
        'admin',
        'moderate',
        'export',
        'import',
        'backup',
        'restore',
      ];

      expect(permissions.length).toBe(expectedPermissions.length);
      expectedPermissions.forEach(permission => {
        expect(permissions).toContain(permission);
      });
    });
  });

  // ============================================================================
  // Test Group: 动作权限检查
  // ============================================================================

  describe('动作权限检查', () => {
    it('canPerformAction 应该正确验证动作权限', () => {
      const admin: Role = 'admin';
      const user: Role = 'user';
      const guest: Role = 'guest';

      // Admin 可以执行所有动作
      expect(canPerformAction(admin, 'read')).toBe(true);
      expect(canPerformAction(admin, 'write')).toBe(true);
      expect(canPerformAction(admin, 'delete')).toBe(true);

      // User 可以执行部分动作
      expect(canPerformAction(user, 'read')).toBe(true);
      expect(canPerformAction(user, 'write')).toBe(true);
      expect(canPerformAction(user, 'delete')).toBe(false);

      // Guest 只能读取
      expect(canPerformAction(guest, 'read')).toBe(true);
      expect(canPerformAction(guest, 'write')).toBe(false);
    });

    it('canPerformAction 应该处理无效动作', () => {
      const admin: Role = 'admin';
      const user: Role = 'user';

      // 无效动作应该返回 false
      expect(canPerformAction(admin, 'invalid_action' as Permission)).toBe(false);
      expect(canPerformAction(user, 'invalid_action' as Permission)).toBe(false);
    });
  });

  // ============================================================================
  // Test Group: 权限层级测试
  // ============================================================================

  describe('权限层级测试', () => {
    it('Admin 权限应该包含所有其他角色的权限', () => {
      const admin: Role = 'admin';
      const userPermissions = getRolePermissions('user');
      const moderatorPermissions = getRolePermissions('moderator');

      // Admin 应该拥有 user 和 moderator 的所有权限
      userPermissions.forEach(permission => {
        expect(hasPermission(admin, permission)).toBe(true);
      });

      moderatorPermissions.forEach(permission => {
        expect(hasPermission(admin, permission)).toBe(true);
      });
    });

    it('Moderator 权限应该包含 User 的权限', () => {
      const moderator: Role = 'moderator';
      const userPermissions = getRolePermissions('user');

      // Moderator 应该拥有 user 的所有权限
      userPermissions.forEach(permission => {
        expect(hasPermission(moderator, permission)).toBe(true);
      });
    });

    it('User 权限应该包含 Guest 的权限', () => {
      const user: Role = 'user';
      const guestPermissions = getRolePermissions('guest');

      // User 应该拥有 guest 的所有权限
      guestPermissions.forEach(permission => {
        expect(hasPermission(user, permission)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Test Group: 边界情况测试
  // ============================================================================

  describe('边界情况测试', () => {
    it('应该正确处理类型安全的权限检查', () => {
      const admin: Role = 'admin';

      // 正确的权限类型
      expect(hasPermission(admin, 'read')).toBe(true);
      expect(hasPermission(admin, 'write')).toBe(true);
      expect(hasPermission(admin, 'delete')).toBe(true);
    });

    it('应该正确处理复合权限组合', () => {
      const moderator: Role = 'moderator';

      // 测试多个权限组合
      expect(
        hasAllPermissions(moderator, ['read', 'write', 'moderate'])
      ).toBe(true);

      expect(
        hasAnyPermission(moderator, ['delete', 'admin', 'backup'])
      ).toBe(false);

      expect(
        hasAnyPermission(moderator, ['read', 'export', 'import'])
      ).toBe(true);
    });

    it('应该正确处理权限列表查询', () => {
      const roles: Role[] = ['admin', 'moderator', 'user', 'guest'];

      roles.forEach(role => {
        const permissions = getRolePermissions(role);
        expect(Array.isArray(permissions)).toBe(true);
        expect(permissions.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Test Group: 资源类型和动作类型测试
  // ============================================================================

  describe('资源类型和动作类型测试', () => {
    it('导出权限应该被正确分配', () => {
      const admin: Role = 'admin';
      const moderator: Role = 'moderator';
      const user: Role = 'user';
      const guest: Role = 'guest';

      expect(hasPermission(admin, 'export')).toBe(true);
      expect(hasPermission(moderator, 'export')).toBe(true);
      expect(hasPermission(user, 'export')).toBe(true);
      expect(hasPermission(guest, 'export')).toBe(false);
    });

    it('导入权限应该被正确分配', () => {
      const admin: Role = 'admin';
      const moderator: Role = 'moderator';
      const user: Role = 'user';
      const guest: Role = 'guest';

      expect(hasPermission(admin, 'import')).toBe(true);
      expect(hasPermission(moderator, 'import')).toBe(true);
      expect(hasPermission(user, 'import')).toBe(false);
      expect(hasPermission(guest, 'import')).toBe(false);
    });

    it('备份和恢复权限应该只分配给 Admin', () => {
      const admin: Role = 'admin';
      const moderator: Role = 'moderator';
      const user: Role = 'user';
      const guest: Role = 'guest';

      // 备份权限
      expect(hasPermission(admin, 'backup')).toBe(true);
      expect(hasPermission(moderator, 'backup')).toBe(false);
      expect(hasPermission(user, 'backup')).toBe(false);
      expect(hasPermission(guest, 'backup')).toBe(false);

      // 恢复权限
      expect(hasPermission(admin, 'restore')).toBe(true);
      expect(hasPermission(moderator, 'restore')).toBe(false);
      expect(hasPermission(user, 'restore')).toBe(false);
      expect(hasPermission(guest, 'restore')).toBe(false);
    });

    it('删除权限应该只分配给 Admin', () => {
      const admin: Role = 'admin';
      const moderator: Role = 'moderator';
      const user: Role = 'user';
      const guest: Role = 'guest';

      expect(hasPermission(admin, 'delete')).toBe(true);
      expect(hasPermission(moderator, 'delete')).toBe(false);
      expect(hasPermission(user, 'delete')).toBe(false);
      expect(hasPermission(guest, 'delete')).toBe(false);
    });

    it('管理权限应该只分配给 Admin', () => {
      const admin: Role = 'admin';
      const moderator: Role = 'moderator';
      const user: Role = 'user';
      const guest: Role = 'guest';

      expect(hasPermission(admin, 'admin')).toBe(true);
      expect(hasPermission(moderator, 'admin')).toBe(false);
      expect(hasPermission(user, 'admin')).toBe(false);
      expect(hasPermission(guest, 'admin')).toBe(false);
    });
  });
});
