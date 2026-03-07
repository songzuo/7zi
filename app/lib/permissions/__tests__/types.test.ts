/**
 * 权限类型测试
 * Permission Types Tests
 */

import { describe, it, expect } from 'vitest';
import { Permission, Role, RoleLabels, RoleDescriptions, PermissionGroups } from '../types';

describe('Permission Types', () => {
  describe('Permission enum', () => {
    it('should define task permissions', () => {
      expect(Permission.TASK_CREATE).toBe('task:create');
      expect(Permission.TASK_READ).toBe('task:read');
      expect(Permission.TASK_UPDATE).toBe('task:update');
      expect(Permission.TASK_DELETE).toBe('task:delete');
      expect(Permission.TASK_ASSIGN).toBe('task:assign');
      expect(Permission.TASK_BATCH).toBe('task:batch');
    });

    it('should define user permissions', () => {
      expect(Permission.USER_CREATE).toBe('user:create');
      expect(Permission.USER_READ).toBe('user:read');
      expect(Permission.USER_UPDATE).toBe('user:update');
      expect(Permission.USER_DELETE).toBe('user:delete');
      expect(Permission.USER_MANAGE_ROLE).toBe('user:manage-role');
    });

    it('should define team permissions', () => {
      expect(Permission.TEAM_MANAGE).toBe('team:manage');
      expect(Permission.TEAM_INVITE).toBe('team:invite');
      expect(Permission.TEAM_REMOVE_MEMBER).toBe('team:remove-member');
    });

    it('should define report permissions', () => {
      expect(Permission.REPORTS_READ).toBe('reports:read');
      expect(Permission.REPORTS_EXPORT).toBe('reports:export');
      expect(Permission.REPORTS_GENERATE).toBe('reports:generate');
    });

    it('should define settings permissions', () => {
      expect(Permission.SETTINGS_READ).toBe('settings:read');
      expect(Permission.SETTINGS_UPDATE).toBe('settings:update');
    });
  });

  describe('Role enum', () => {
    it('should define all roles', () => {
      expect(Role.ADMIN).toBe('admin');
      expect(Role.MANAGER).toBe('manager');
      expect(Role.MEMBER).toBe('member');
      expect(Role.VIEWER).toBe('viewer');
    });

    it('should have 4 roles', () => {
      expect(Object.keys(Role).length).toBe(4);
    });
  });

  describe('RoleLabels', () => {
    it('should have labels for all roles', () => {
      expect(RoleLabels[Role.ADMIN]).toBe('管理员');
      expect(RoleLabels[Role.MANAGER]).toBe('经理');
      expect(RoleLabels[Role.MEMBER]).toBe('成员');
      expect(RoleLabels[Role.VIEWER]).toBe('观察者');
    });

    it('should have Chinese labels', () => {
      Object.values(RoleLabels).forEach((label) => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('RoleDescriptions', () => {
    it('should have descriptions for all roles', () => {
      expect(RoleDescriptions[Role.ADMIN]).toContain('所有权限');
      expect(RoleDescriptions[Role.MANAGER]).toContain('管理任务');
      expect(RoleDescriptions[Role.MEMBER]).toContain('创建和管理');
      expect(RoleDescriptions[Role.VIEWER]).toContain('查看');
    });

    it('should have meaningful descriptions', () => {
      Object.values(RoleDescriptions).forEach((desc) => {
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(5);
      });
    });
  });

  describe('PermissionGroups', () => {
    it('should define all permission groups', () => {
      const groupNames = PermissionGroups.map((g) => g.name);
      expect(groupNames).toContain('任务管理');
      expect(groupNames).toContain('用户管理');
      expect(groupNames).toContain('团队管理');
      expect(groupNames).toContain('报告管理');
      expect(groupNames).toContain('系统设置');
    });

    it('should have permissions in each group', () => {
      PermissionGroups.forEach((group) => {
        expect(Array.isArray(group.permissions)).toBe(true);
        expect(group.permissions.length).toBeGreaterThan(0);
      });
    });

    it('should have valid permissions in groups', () => {
      const allPermissions = Object.values(Permission);
      
      PermissionGroups.forEach((group) => {
        group.permissions.forEach((permission) => {
          expect(allPermissions).toContain(permission);
        });
      });
    });
  });
});