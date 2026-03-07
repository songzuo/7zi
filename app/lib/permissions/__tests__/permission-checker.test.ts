/**
 * 权限检查器测试
 * Permission Checker Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Permission, Role } from '../types';
import { PermissionChecker, permissionChecker, hasPermission, hasPermissions } from '../permission-checker';

describe('PermissionChecker', () => {
  let checker: PermissionChecker;

  beforeEach(() => {
    checker = new PermissionChecker();
  });

  describe('loadUserPermissions', () => {
    it('should load user permissions', () => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      });

      const result = checker.check('user1', Permission.TASK_CREATE);
      expect(result.granted).toBe(true);
    });

    it('should merge role and custom permissions', () => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
        customPermissions: [Permission.TEAM_INVITE],
      });

      expect(checker.check('user1', Permission.TASK_CREATE).granted).toBe(true);
      expect(checker.check('user1', Permission.TEAM_INVITE).granted).toBe(true);
    });
  });

  describe('check', () => {
    beforeEach(() => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ, Permission.TASK_UPDATE],
      });
    });

    it('should return granted for existing permission', () => {
      const result = checker.check('user1', Permission.TASK_CREATE);
      expect(result.granted).toBe(true);
      expect(result.permission).toBe(Permission.TASK_CREATE);
      expect(result.reason).toBeUndefined();
    });

    it('should return denied for missing permission', () => {
      const result = checker.check('user1', Permission.TASK_DELETE);
      expect(result.granted).toBe(false);
      expect(result.permission).toBe(Permission.TASK_DELETE);
      expect(result.reason).toContain('Missing permission');
    });

    it('should return denied for unknown user', () => {
      const result = checker.check('unknown', Permission.TASK_CREATE);
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('not loaded');
    });
  });

  describe('checkMultiple', () => {
    beforeEach(() => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      });
    });

    it('should check multiple permissions', () => {
      const results = checker.checkMultiple('user1', [
        Permission.TASK_CREATE,
        Permission.TASK_DELETE,
        Permission.TASK_READ,
      ]);

      expect(results[Permission.TASK_CREATE].granted).toBe(true);
      expect(results[Permission.TASK_DELETE].granted).toBe(false);
      expect(results[Permission.TASK_READ].granted).toBe(true);
    });
  });

  describe('hasAll', () => {
    beforeEach(() => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ, Permission.TASK_UPDATE],
      });
    });

    it('should return true when all permissions present', () => {
      const result = checker.hasAll('user1', [
        Permission.TASK_CREATE,
        Permission.TASK_READ,
      ]);
      expect(result).toBe(true);
    });

    it('should return false when any permission missing', () => {
      const result = checker.hasAll('user1', [
        Permission.TASK_CREATE,
        Permission.TASK_DELETE,
      ]);
      expect(result).toBe(false);
    });
  });

  describe('hasAny', () => {
    beforeEach(() => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      });
    });

    it('should return true when any permission present', () => {
      const result = checker.hasAny('user1', [
        Permission.TASK_CREATE,
        Permission.TASK_DELETE,
      ]);
      expect(result).toBe(true);
    });

    it('should return false when all permissions missing', () => {
      const result = checker.hasAny('user1', [
        Permission.TASK_DELETE,
        Permission.TEAM_INVITE,
      ]);
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return array of permissions', () => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      });

      const permissions = checker.getUserPermissions('user1');
      expect(permissions).toContain(Permission.TASK_CREATE);
      expect(permissions).toContain(Permission.TASK_READ);
      expect(permissions).toHaveLength(2);
    });

    it('should return empty array for unknown user', () => {
      const permissions = checker.getUserPermissions('unknown');
      expect(permissions).toEqual([]);
    });
  });

  describe('getUserRole', () => {
    it('should return user role', () => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MANAGER,
        permissions: [],
      });

      expect(checker.getUserRole('user1')).toBe(Role.MANAGER);
    });

    it('should return undefined for unknown user', () => {
      expect(checker.getUserRole('unknown')).toBeUndefined();
    });
  });

  describe('addCustomPermission', () => {
    beforeEach(() => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE],
      });
    });

    it('should add custom permission', () => {
      checker.addCustomPermission('user1', Permission.TEAM_INVITE);
      
      expect(checker.check('user1', Permission.TEAM_INVITE).granted).toBe(true);
    });

    it('should not duplicate permissions', () => {
      checker.addCustomPermission('user1', Permission.TASK_CREATE);
      
      const permissions = checker.getUserPermissions('user1');
      const createCount = permissions.filter((p) => p === Permission.TASK_CREATE).length;
      expect(createCount).toBe(1);
    });
  });

  describe('removeCustomPermission', () => {
    beforeEach(() => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE],
        customPermissions: [Permission.TEAM_INVITE],
      });
    });

    it('should remove custom permission', () => {
      checker.removeCustomPermission('user1', Permission.TEAM_INVITE);
      
      expect(checker.check('user1', Permission.TEAM_INVITE).granted).toBe(false);
    });

    it('should keep role permissions', () => {
      checker.removeCustomPermission('user1', Permission.TASK_CREATE);
      
      // TASK_CREATE is in role permissions, should still be there
      expect(checker.check('user1', Permission.TASK_CREATE).granted).toBe(true);
    });
  });

  describe('clearUser', () => {
    it('should clear user permissions', () => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE],
      });

      checker.clearUser('user1');
      
      const result = checker.check('user1', Permission.TASK_CREATE);
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('not loaded');
    });
  });

  describe('clearAll', () => {
    it('should clear all users', () => {
      checker.loadUserPermissions({
        userId: 'user1',
        role: Role.MEMBER,
        permissions: [Permission.TASK_CREATE],
      });
      checker.loadUserPermissions({
        userId: 'user2',
        role: Role.MANAGER,
        permissions: [Permission.TEAM_INVITE],
      });

      checker.clearAll();
      
      expect(checker.check('user1', Permission.TASK_CREATE).granted).toBe(false);
      expect(checker.check('user2', Permission.TEAM_INVITE).granted).toBe(false);
    });
  });
});

describe('Global permissionChecker instance', () => {
  beforeEach(() => {
    permissionChecker.clearAll();
  });

  it('should work with global instance', () => {
    permissionChecker.loadUserPermissions({
      userId: 'user1',
      role: Role.ADMIN,
      permissions: [Permission.TASK_CREATE],
    });

    expect(permissionChecker.check('user1', Permission.TASK_CREATE).granted).toBe(true);
  });
});

describe('Convenience functions', () => {
  beforeEach(() => {
    permissionChecker.clearAll();
    permissionChecker.loadUserPermissions({
      userId: 'user1',
      role: Role.MEMBER,
      permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
    });
  });

  describe('hasPermission', () => {
    it('should return true for granted permission', () => {
      expect(hasPermission('user1', Permission.TASK_CREATE)).toBe(true);
    });

    it('should return false for denied permission', () => {
      expect(hasPermission('user1', Permission.TASK_DELETE)).toBe(false);
    });
  });

  describe('hasPermissions', () => {
    it('should return true when all granted', () => {
      expect(hasPermissions('user1', [Permission.TASK_CREATE, Permission.TASK_READ])).toBe(true);
    });

    it('should return false when any denied', () => {
      expect(hasPermissions('user1', [Permission.TASK_CREATE, Permission.TASK_DELETE])).toBe(false);
    });
  });
});