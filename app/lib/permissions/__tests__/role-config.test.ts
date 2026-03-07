/**
 * 角色配置测试
 * Role Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import { Role, Permission } from '../types';
import {
  RolePermissions,
  RoleHierarchy,
  getRolePermissions,
  roleHasPermission,
  getRolesByPermission,
  compareRoles,
  canManageRole,
  getAllRoles,
  getAssignableRoles,
} from '../role-config';

describe('Role Configuration', () => {
  describe('RolePermissions', () => {
    it('should define permissions for all roles', () => {
      expect(RolePermissions[Role.ADMIN]).toBeDefined();
      expect(RolePermissions[Role.MANAGER]).toBeDefined();
      expect(RolePermissions[Role.MEMBER]).toBeDefined();
      expect(RolePermissions[Role.VIEWER]).toBeDefined();
    });

    it('should give admin all permissions', () => {
      const allPermissions = Object.values(Permission);
      const adminPermissions = RolePermissions[Role.ADMIN];
      
      allPermissions.forEach((permission) => {
        expect(adminPermissions).toContain(permission);
      });
    });

    it('should give viewer minimal permissions', () => {
      const viewerPermissions = RolePermissions[Role.VIEWER];
      
      expect(viewerPermissions).toContain(Permission.TASK_READ);
      expect(viewerPermissions).toContain(Permission.USER_READ);
      expect(viewerPermissions).toContain(Permission.REPORTS_READ);
      
      // Viewer should not have create/update/delete permissions
      expect(viewerPermissions).not.toContain(Permission.TASK_CREATE);
      expect(viewerPermissions).not.toContain(Permission.TASK_UPDATE);
      expect(viewerPermissions).not.toContain(Permission.TASK_DELETE);
    });

    it('should give member basic task permissions', () => {
      const memberPermissions = RolePermissions[Role.MEMBER];
      
      expect(memberPermissions).toContain(Permission.TASK_CREATE);
      expect(memberPermissions).toContain(Permission.TASK_READ);
      expect(memberPermissions).toContain(Permission.TASK_UPDATE);
      expect(memberPermissions).toContain(Permission.TASK_DELETE);
      
      // Member should not have assign or batch permissions
      expect(memberPermissions).not.toContain(Permission.TASK_ASSIGN);
      expect(memberPermissions).not.toContain(Permission.TASK_BATCH);
    });

    it('should give manager team permissions', () => {
      const managerPermissions = RolePermissions[Role.MANAGER];
      
      expect(managerPermissions).toContain(Permission.TEAM_INVITE);
      expect(managerPermissions).toContain(Permission.TEAM_REMOVE_MEMBER);
      expect(managerPermissions).toContain(Permission.TASK_ASSIGN);
      expect(managerPermissions).toContain(Permission.TASK_BATCH);
      
      // Manager should not have admin-only permissions
      expect(managerPermissions).not.toContain(Permission.USER_MANAGE_ROLE);
    });
  });

  describe('RoleHierarchy', () => {
    it('should define hierarchy levels for all roles', () => {
      expect(RoleHierarchy[Role.ADMIN]).toBeDefined();
      expect(RoleHierarchy[Role.MANAGER]).toBeDefined();
      expect(RoleHierarchy[Role.MEMBER]).toBeDefined();
      expect(RoleHierarchy[Role.VIEWER]).toBeDefined();
    });

    it('should have correct hierarchy order', () => {
      expect(RoleHierarchy[Role.ADMIN]).toBeGreaterThan(RoleHierarchy[Role.MANAGER]);
      expect(RoleHierarchy[Role.MANAGER]).toBeGreaterThan(RoleHierarchy[Role.MEMBER]);
      expect(RoleHierarchy[Role.MEMBER]).toBeGreaterThan(RoleHierarchy[Role.VIEWER]);
    });

    it('should have admin at highest level', () => {
      expect(RoleHierarchy[Role.ADMIN]).toBe(100);
    });

    it('should have viewer at lowest level', () => {
      expect(RoleHierarchy[Role.VIEWER]).toBe(10);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for valid role', () => {
      const permissions = getRolePermissions(Role.ADMIN);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid role', () => {
      const permissions = getRolePermissions('invalid' as Role);
      expect(permissions).toEqual([]);
    });
  });

  describe('roleHasPermission', () => {
    it('should return true when role has permission', () => {
      expect(roleHasPermission(Role.ADMIN, Permission.TASK_CREATE)).toBe(true);
      expect(roleHasPermission(Role.MANAGER, Permission.TEAM_INVITE)).toBe(true);
      expect(roleHasPermission(Role.MEMBER, Permission.TASK_CREATE)).toBe(true);
      expect(roleHasPermission(Role.VIEWER, Permission.TASK_READ)).toBe(true);
    });

    it('should return false when role lacks permission', () => {
      expect(roleHasPermission(Role.VIEWER, Permission.TASK_CREATE)).toBe(false);
      expect(roleHasPermission(Role.MEMBER, Permission.TEAM_INVITE)).toBe(false);
      expect(roleHasPermission(Role.MANAGER, Permission.USER_MANAGE_ROLE)).toBe(false);
    });
  });

  describe('getRolesByPermission', () => {
    it('should return admin for admin-only permission', () => {
      const roles = getRolesByPermission(Permission.USER_MANAGE_ROLE);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.MANAGER);
    });

    it('should return all roles for common permission', () => {
      const roles = getRolesByPermission(Permission.TASK_READ);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.MANAGER);
      expect(roles).toContain(Role.MEMBER);
      expect(roles).toContain(Role.VIEWER);
    });
  });

  describe('compareRoles', () => {
    it('should return 1 when role1 is higher', () => {
      expect(compareRoles(Role.ADMIN, Role.MANAGER)).toBe(1);
      expect(compareRoles(Role.MANAGER, Role.MEMBER)).toBe(1);
      expect(compareRoles(Role.MEMBER, Role.VIEWER)).toBe(1);
    });

    it('should return -1 when role1 is lower', () => {
      expect(compareRoles(Role.MANAGER, Role.ADMIN)).toBe(-1);
      expect(compareRoles(Role.MEMBER, Role.MANAGER)).toBe(-1);
      expect(compareRoles(Role.VIEWER, Role.MEMBER)).toBe(-1);
    });

    it('should return 0 when roles are equal', () => {
      expect(compareRoles(Role.ADMIN, Role.ADMIN)).toBe(0);
      expect(compareRoles(Role.MANAGER, Role.MANAGER)).toBe(0);
    });
  });

  describe('canManageRole', () => {
    it('should allow admin to manage all roles', () => {
      expect(canManageRole(Role.ADMIN, Role.MANAGER)).toBe(true);
      expect(canManageRole(Role.ADMIN, Role.MEMBER)).toBe(true);
      expect(canManageRole(Role.ADMIN, Role.VIEWER)).toBe(true);
    });

    it('should allow manager to manage member and viewer', () => {
      expect(canManageRole(Role.MANAGER, Role.MEMBER)).toBe(true);
      expect(canManageRole(Role.MANAGER, Role.VIEWER)).toBe(true);
      expect(canManageRole(Role.MANAGER, Role.ADMIN)).toBe(false);
    });

    it('should allow member to manage viewer', () => {
      expect(canManageRole(Role.MEMBER, Role.VIEWER)).toBe(true);
      expect(canManageRole(Role.MEMBER, Role.MANAGER)).toBe(false);
      expect(canManageRole(Role.MEMBER, Role.ADMIN)).toBe(false);
    });

    it('should not allow managing equal or higher role', () => {
      expect(canManageRole(Role.MANAGER, Role.MANAGER)).toBe(false);
      expect(canManageRole(Role.MANAGER, Role.ADMIN)).toBe(false);
    });
  });

  describe('getAllRoles', () => {
    it('should return all 4 roles', () => {
      const roles = getAllRoles();
      expect(roles).toHaveLength(4);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.MANAGER);
      expect(roles).toContain(Role.MEMBER);
      expect(roles).toContain(Role.VIEWER);
    });
  });

  describe('getAssignableRoles', () => {
    it('should return roles below admin', () => {
      const assignable = getAssignableRoles(Role.ADMIN);
      expect(assignable).toContain(Role.MANAGER);
      expect(assignable).toContain(Role.MEMBER);
      expect(assignable).toContain(Role.VIEWER);
      expect(assignable).not.toContain(Role.ADMIN);
    });

    it('should return roles below manager', () => {
      const assignable = getAssignableRoles(Role.MANAGER);
      expect(assignable).toContain(Role.MEMBER);
      expect(assignable).toContain(Role.VIEWER);
      expect(assignable).not.toContain(Role.ADMIN);
      expect(assignable).not.toContain(Role.MANAGER);
    });

    it('should return viewer for member', () => {
      const assignable = getAssignableRoles(Role.MEMBER);
      expect(assignable).toContain(Role.VIEWER);
      expect(assignable).not.toContain(Role.ADMIN);
      expect(assignable).not.toContain(Role.MANAGER);
      expect(assignable).not.toContain(Role.MEMBER);
    });

    it('should return empty array for viewer', () => {
      const assignable = getAssignableRoles(Role.VIEWER);
      expect(assignable).toEqual([]);
    });
  });
});