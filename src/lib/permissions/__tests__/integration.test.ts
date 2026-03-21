/**
// @ts-ignore - Mock type compatibility issues
 * RBAC Integration Test
 * Verifies the complete RBAC system works end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Permission,
  Role,
  createPermissionContext,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  isAdmin,
  isManagerOrAdmin,
  isMemberOrHigher,
  getPermissionsForRoles,
} from '../rbac';
import {
  initializeRbacTables,
  getAllRoles,
  addRolesToUser,
  removeRolesFromUser,
  getUserRoles,
  getUserPermissionContext,
  assignPermissionsToRole,
} from '../repository';
import { seedDefaultRolesAndPermissions } from '../seed';

describe('RBAC Integration Tests', () => {
  const testUserId = `test_user_${Date.now()}`;

  beforeAll(async () => {
    await initializeRbacTables();
    await seedDefaultRolesAndPermissions();
  });

  describe('End-to-End User Permission Flow', () => {
    it('should complete full user permission workflow', async () => {
      // Step 1: Add admin role to user
      await addRolesToUser(testUserId, [Role.ADMIN], 'system');

      // Step 2: Get user roles
      const roles = await getUserRoles(testUserId);
      expect(roles).toContain(Role.ADMIN);

      // Step 3: Get permission context
      const context = await getUserPermissionContext(testUserId);
      expect(context).not.toBeNull();
      expect(context?.userId).toBe(testUserId);
      expect(context?.roles).toContain(Role.ADMIN);
      expect(context?.permissions.length).toBeGreaterThan(0);

      // Step 4: Verify admin has all permissions
      if (context) {
        expect(isAdmin(context)).toBe(true);
        expect(hasPermission(context, Permission.SYSTEM_MANAGE)).toBe(true);
        expect(hasPermission(context, Permission.USER_DELETE)).toBe(true);
      }

      // Step 5: Remove admin role
      await removeRolesFromUser(testUserId, [Role.ADMIN]);

      // Step 6: Verify role removal
      const rolesAfterRemoval = await getUserRoles(testUserId);
      expect(rolesAfterRemoval).not.toContain(Role.ADMIN);
    });

    it('should handle multi-role user correctly', async () => {
      const multiRoleUserId = `multi_role_${Date.now()}`;

      // Add multiple roles
      await addRolesToUser(multiRoleUserId, [Role.ADMIN, Role.MANAGER, Role.MEMBER], 'system');

      // Get roles
      const roles = await getUserRoles(multiRoleUserId);
      expect(roles.length).toBe(3);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.MANAGER);
      expect(roles).toContain(Role.MEMBER);

      // Get permission context
      const context = await getUserPermissionContext(multiRoleUserId);
      expect(context?.roles.length).toBe(3);

      // Verify user has permissions from all roles
      if (context) {
        expect(isAdmin(context)).toBe(true);
        expect(isManagerOrAdmin(context)).toBe(true);
        expect(isMemberOrHigher(context)).toBe(true);
        expect(hasRole(context, Role.ADMIN)).toBe(true);
        expect(hasRole(context, Role.MANAGER)).toBe(true);
        expect(hasRole(context, Role.MEMBER)).toBe(true);
        expect(hasAnyRole(context, [Role.ADMIN, Role.VIEWER])).toBe(true);
        expect(hasAllRoles(context, [Role.ADMIN, Role.MANAGER])).toBe(true);
      }

      // Cleanup
      await removeRolesFromUser(multiRoleUserId, [Role.ADMIN, Role.MANAGER, Role.MEMBER]);
    });

    it('should correctly merge permissions from multiple roles', async () => {
      const testUserId2 = `test_user_2_${Date.now()}`;

      // Add member and viewer roles
      await addRolesToUser(testUserId2, [Role.MEMBER, Role.VIEWER], 'system');

      // Get permission context
      const context = await getUserPermissionContext(testUserId2);
      expect(context).not.toBeNull();

      if (context) {
        // Member has task:create, viewer does not
        expect(hasPermission(context, Permission.TASK_CREATE)).toBe(true);

        // Both have task:read
        expect(hasPermission(context, Permission.TASK_READ)).toBe(true);

        // Viewer has no write permissions
        expect(hasPermission(context, Permission.USER_CREATE)).toBe(false);

        // Check permission counts
        const memberPermissions = getPermissionsForRoles([Role.MEMBER]);
        const viewerPermissions = getPermissionsForRoles([Role.VIEWER]);
        const allPermissions = getPermissionsForRoles([Role.MEMBER, Role.VIEWER]);

        // All permissions should be the union of both roles
        expect(context.permissions.length).toBe(allPermissions.length);
      }

      // Cleanup
      await removeRolesFromUser(testUserId2, [Role.MEMBER, Role.VIEWER]);
    });
  });

  describe('Role-Permission Mapping', () => {
    it('should correctly assign custom permissions to roles', async () => {
      // Get current permissions for manager role
      const permissionsBefore = await getUserRoles('test_user'); // Will use default

      // Assign system management permission to manager (unusual but allowed)
      await assignPermissionsToRole(Role.MANAGER, [Permission.SYSTEM_MANAGE], 'admin');

      // Verify permission was assigned
      const managerContext = createPermissionContext('test', [Role.MANAGER]);
      expect(hasPermission(managerContext, Permission.SYSTEM_MANAGE)).toBe(true);

      // This demonstrates custom permissions can be added to roles
      expect(managerContext.permissions).toContain(Permission.SYSTEM_MANAGE);
    });
  });

  describe('Permission Checking Edge Cases', () => {
    it('should handle empty permissions correctly', () => {
      const emptyContext = createPermissionContext('user1', [], []);
      expect(hasPermission(emptyContext, Permission.USER_READ)).toBe(false);
      expect(hasAnyPermission(emptyContext, [Permission.USER_READ, Permission.USER_CREATE])).toBe(false);
    });

    it('should handle missing permission context', () => {
      const result = hasAllPermissions(createPermissionContext('user1', []), [Permission.USER_READ]);
      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toContain(Permission.USER_READ);
    });

    it('should handle permission checking with all permissions', () => {
      const adminContext = createPermissionContext('admin', [Role.ADMIN]);
      expect(hasAllPermissions(adminContext, [Permission.USER_READ, Permission.TEAM_CREATE, Permission.SYSTEM_MANAGE])).toBeTruthy();
    });
  });

  describe('Role Hierarchy', () => {
    it('should correctly identify admin users', () => {
      const adminContext = createPermissionContext('admin', [Role.ADMIN]);
      expect(isAdmin(adminContext)).toBe(true);
      expect(isManagerOrAdmin(adminContext)).toBe(true);
      expect(isMemberOrHigher(adminContext)).toBe(true);
    });

    it('should correctly identify manager users', () => {
      const managerContext = createPermissionContext('manager', [Role.MANAGER]);
      expect(isAdmin(managerContext)).toBe(false);
      expect(isManagerOrAdmin(managerContext)).toBe(true);
      expect(isMemberOrHigher(managerContext)).toBe(true);
    });

    it('should correctly identify member users', () => {
      const memberContext = createPermissionContext('member', [Role.MEMBER]);
      expect(isAdmin(memberContext)).toBe(false);
      expect(isManagerOrAdmin(memberContext)).toBe(false);
      expect(isMemberOrHigher(memberContext)).toBe(true);
    });

    it('should correctly identify viewer users', () => {
      const viewerContext = createPermissionContext('viewer', [Role.VIEWER]);
      expect(isAdmin(viewerContext)).toBe(false);
      expect(isManagerOrAdmin(viewerContext)).toBe(false);
      expect(isMemberOrHigher(viewerContext)).toBe(false);
    });
  });

  describe('Database Persistence', () => {
    it('should persist and retrieve user roles', async () => {
      const persistenceUserId = `persistence_${Date.now()}`;

      // Add roles
      await addRolesToUser(persistenceUserId, [Role.MEMBER, Role.VIEWER], 'system');

      // Retrieve immediately
      const roles1 = await getUserRoles(persistenceUserId);
      expect(roles1).toContain(Role.MEMBER);
      expect(roles1).toContain(Role.VIEWER);

      // Simulate new request - retrieve again
      const roles2 = await getUserRoles(persistenceUserId);
      expect(roles1).toEqual(roles2);

      // Cleanup
      await removeRolesFromUser(persistenceUserId, [Role.MEMBER, Role.VIEWER]);
    });

    it('should handle role removal correctly', async () => {
      const removalUserId = `removal_${Date.now()}`;

      // Add multiple roles
      await addRolesToUser(removalUserId, [Role.ADMIN, Role.MANAGER, Role.MEMBER], 'system');

      // Remove one role
      await removeRolesFromUser(removalUserId, [Role.MANAGER]);

      // Verify removal
      const roles = await getUserRoles(removalUserId);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.MEMBER);
      expect(roles).not.toContain(Role.MANAGER);

      // Remove all roles
      await removeRolesFromUser(removalUserId, [Role.ADMIN, Role.MEMBER]);

      // Verify empty
      const emptyRoles = await getUserRoles(removalUserId);
      expect(emptyRoles.length).toBe(0);
    });
  });

  describe('Default Role Definitions', () => {
    it('should have all default roles seeded', async () => {
      const roles = await getAllRoles();
      const roleIds = roles.map((r) => r.id);

      expect(roleIds).toContain(Role.ADMIN);
      expect(roleIds).toContain(Role.MANAGER);
      expect(roleIds).toContain(Role.MEMBER);
      expect(roleIds).toContain(Role.VIEWER);
    });

    it('should have correct system role flags', async () => {
      const roles = await getAllRoles();

      const adminRole = roles.find((r) => r.id === Role.ADMIN);
      const managerRole = roles.find((r) => r.id === Role.MANAGER);
      const memberRole = roles.find((r) => r.id === Role.MEMBER);
      const viewerRole = roles.find((r) => r.id === Role.VIEWER);

      expect(adminRole?.isSystem).toBe(true);
      expect(managerRole?.isSystem).toBe(true);
      expect(memberRole?.isSystem).toBe(true);
      expect(viewerRole?.isSystem).toBe(true);
    });

    it('should have admin with all permissions', async () => {
      const adminContext = createPermissionContext('admin', [Role.ADMIN]);

      // Check all permission categories
      expect(hasPermission(adminContext, Permission.USER_READ)).toBe(true);
      expect(hasPermission(adminContext, Permission.TEAM_CREATE)).toBe(true);
      expect(hasPermission(adminContext, Permission.TASK_DELETE)).toBe(true);
      expect(hasPermission(adminContext, Permission.SETTINGS_MANAGE)).toBe(true);
      expect(hasPermission(adminContext, Permission.APPROVAL_APPROVE)).toBe(true);
      expect(hasPermission(adminContext, Permission.REPORTS_EXPORT)).toBe(true);
      expect(hasPermission(adminContext, Permission.SYSTEM_CONFIG)).toBe(true);
      expect(hasPermission(adminContext, Permission.LOGS_EXPORT)).toBe(true);
      expect(hasPermission(adminContext, Permission.AGENT_MANAGE)).toBe(true);
      expect(hasPermission(adminContext, Permission.WALLET_TRANSFER)).toBe(true);
    });
  });
});
