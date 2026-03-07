/**
 * 权限中间件测试
 * Permission Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { Permission, Role } from '../types';
import {
  extractUserFromRequest,
  withPermission,
  withAllPermissions,
  withAnyPermission,
  withRole,
  adminOnly,
  managerOrAbove,
  withResourceOwnership,
  canAssignRole,
} from '../middleware';
import { permissionChecker } from '../permission-checker';

// Mock Next.js Request and Response
function createMockRequest(options: {
  url?: string;
  userId?: string | null;
  userRole?: Role | null;
  method?: string;
  body?: unknown;
}): NextRequest {
  const headers = new Headers();
  
  if (options.userId !== undefined && options.userId !== null) {
    headers.set('x-user-id', options.userId);
  }
  if (options.userRole !== undefined && options.userRole !== null) {
    headers.set('x-user-role', options.userRole);
  }

  const request = {
    headers,
    url: options.url || 'http://localhost/api/test',
    method: options.method || 'GET',
    json: vi.fn().mockResolvedValue(options.body || {}),
  } as unknown as NextRequest;

  return request;
}

// Mock handler that returns a success response
const mockHandler = vi.fn().mockImplementation(
  async (_request: NextRequest, context?: { user?: { id: string; role: Role }; isOwner?: boolean; targetRole?: Role }) => {
    return NextResponse.json({ 
      success: true, 
      user: context?.user,
      isOwner: context?.isOwner,
      targetRole: context?.targetRole,
    });
  }
);

describe('Permission Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionChecker.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractUserFromRequest', () => {
    it('should extract user from valid headers', () => {
      const request = createMockRequest({
        userId: 'user1',
        userRole: Role.MEMBER,
      });

      const user = extractUserFromRequest(request);

      expect(user).not.toBeNull();
      expect(user?.id).toBe('user1');
      expect(user?.role).toBe(Role.MEMBER);
    });

    it('should return null when user-id header is missing', () => {
      const request = createMockRequest({
        userId: null,
        userRole: Role.MEMBER,
      });

      const user = extractUserFromRequest(request);

      expect(user).toBeNull();
    });

    it('should return null when user-role header is missing', () => {
      const request = createMockRequest({
        userId: 'user1',
        userRole: null,
      });

      const user = extractUserFromRequest(request);

      expect(user).toBeNull();
    });

    it('should return null when both headers are missing', () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const user = extractUserFromRequest(request);

      expect(user).toBeNull();
    });

    it('should include role permissions for admin', () => {
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const user = extractUserFromRequest(request);

      expect(user).not.toBeNull();
      expect(user?.permissions).toContain(Permission.USER_MANAGE_ROLE);
      expect(user?.permissions).toContain(Permission.SETTINGS_UPDATE);
    });

    it('should include limited permissions for viewer', () => {
      const request = createMockRequest({
        userId: 'viewer1',
        userRole: Role.VIEWER,
      });

      const user = extractUserFromRequest(request);

      expect(user).not.toBeNull();
      expect(user?.permissions).toContain(Permission.TASK_READ);
      expect(user?.permissions).not.toContain(Permission.TASK_CREATE);
    });
  });

  describe('withPermission', () => {
    it('should allow access when user has permission', async () => {
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const middleware = withPermission(Permission.TEAM_INVITE);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access when user lacks permission', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withPermission(Permission.TEAM_INVITE);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const middleware = withPermission(Permission.TASK_CREATE);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should allow admin access to any permission', async () => {
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const middleware = withPermission(Permission.USER_MANAGE_ROLE);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('withAllPermissions', () => {
    it('should allow access when user has all permissions', async () => {
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const middleware = withAllPermissions([
        Permission.TASK_CREATE,
        Permission.TEAM_INVITE,
        Permission.REPORTS_READ,
      ]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access when user is missing one permission', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withAllPermissions([
        Permission.TASK_CREATE,
        Permission.TEAM_INVITE, // Member doesn't have this
      ]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Missing permissions');
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const middleware = withAllPermissions([Permission.TASK_CREATE]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it('should work with empty permissions array', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withAllPermissions([]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
    });
  });

  describe('withAnyPermission', () => {
    it('should allow access when user has at least one permission', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withAnyPermission([
        Permission.TEAM_INVITE, // Member doesn't have
        Permission.TASK_CREATE, // Member has this
        Permission.USER_DELETE, // Member doesn't have
      ]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access when user has none of the permissions', async () => {
      const request = createMockRequest({
        userId: 'viewer1',
        userRole: Role.VIEWER,
      });

      const middleware = withAnyPermission([
        Permission.TASK_CREATE,
        Permission.TASK_DELETE,
        Permission.TEAM_INVITE,
      ]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Requires one of');
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const middleware = withAnyPermission([Permission.TASK_CREATE]);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(401);
    });
  });

  describe('withRole', () => {
    it('should allow access when user role is sufficient', async () => {
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const middleware = withRole(Role.MEMBER);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should allow access when user role equals required role', async () => {
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const middleware = withRole(Role.MANAGER);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should deny access when user role is insufficient', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withRole(Role.MANAGER);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Requires role');
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const middleware = withRole(Role.MEMBER);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it('should allow admin access to any role requirement', async () => {
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const middleware = withRole(Role.ADMIN);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should deny viewer access to member role requirement', async () => {
      const request = createMockRequest({
        userId: 'viewer1',
        userRole: Role.VIEWER,
      });

      const middleware = withRole(Role.MEMBER);
      const handler = middleware(mockHandler);

      const response = await handler(request);

      expect(response.status).toBe(403);
    });
  });

  describe('adminOnly', () => {
    it('should allow access for admin user', async () => {
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const handler = adminOnly(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access for manager user', async () => {
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const handler = adminOnly(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });

    it('should deny access for member user', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const handler = adminOnly(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });

    it('should deny access for unauthenticated user', async () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const handler = adminOnly(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(401);
    });
  });

  describe('managerOrAbove', () => {
    it('should allow access for admin user', async () => {
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const handler = managerOrAbove(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should allow access for manager user', async () => {
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const handler = managerOrAbove(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access for member user', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const handler = managerOrAbove(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });

    it('should deny access for viewer user', async () => {
      const request = createMockRequest({
        userId: 'viewer1',
        userRole: Role.VIEWER,
      });

      const handler = managerOrAbove(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });
  });

  describe('withResourceOwnership', () => {
    const mockGetResourceOwnerId = vi.fn();

    beforeEach(() => {
      mockGetResourceOwnerId.mockReset();
    });

    it('should allow access when user is resource owner', async () => {
      mockGetResourceOwnerId.mockResolvedValue('user1');
      const request = createMockRequest({
        userId: 'user1',
        userRole: Role.MEMBER,
      });

      const middleware = withResourceOwnership(mockGetResourceOwnerId);
      const handler = middleware(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.isOwner).toBe(true);
    });

    it('should allow access when user is admin (not owner)', async () => {
      mockGetResourceOwnerId.mockResolvedValue('other-user');
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const middleware = withResourceOwnership(mockGetResourceOwnerId);
      const handler = middleware(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access when user is not owner and not admin', async () => {
      mockGetResourceOwnerId.mockResolvedValue('other-user');
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withResourceOwnership(mockGetResourceOwnerId);
      const handler = middleware(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('do not have access');
    });

    it('should deny access when resource owner cannot be determined', async () => {
      mockGetResourceOwnerId.mockResolvedValue(null);
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withResourceOwnership(mockGetResourceOwnerId);
      const handler = middleware(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetResourceOwnerId.mockResolvedValue('user1');
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const middleware = withResourceOwnership(mockGetResourceOwnerId);
      const handler = middleware(mockHandler);
      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it('should pass isOwner=false to handler for admin non-owner', async () => {
      mockGetResourceOwnerId.mockResolvedValue('owner1');
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const middleware = withResourceOwnership(mockGetResourceOwnerId);
      const handler = middleware(mockHandler);
      await handler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isOwner: false,
          user: expect.objectContaining({ id: 'admin1' }),
        })
      );
    });
  });

  describe('canAssignRole', () => {
    const mockGetTargetRole = vi.fn();

    beforeEach(() => {
      mockGetTargetRole.mockReset();
    });

    it('should allow admin to assign any role', async () => {
      mockGetTargetRole.mockReturnValue(Role.MANAGER);
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ targetRole: Role.MANAGER })
      );
    });

    it('should allow manager to assign member role', async () => {
      mockGetTargetRole.mockReturnValue(Role.MEMBER);
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should deny manager from assigning admin role', async () => {
      mockGetTargetRole.mockReturnValue(Role.ADMIN);
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Cannot assign role');
    });

    it('should deny member from assigning manager role', async () => {
      mockGetTargetRole.mockReturnValue(Role.MANAGER);
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 when target role is not specified', async () => {
      mockGetTargetRole.mockReturnValue(null);
      const request = createMockRequest({
        userId: 'admin1',
        userRole: Role.ADMIN,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('BAD_REQUEST');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetTargetRole.mockReturnValue(Role.MEMBER);
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it('should deny manager from assigning another manager', async () => {
      mockGetTargetRole.mockReturnValue(Role.MANAGER);
      const request = createMockRequest({
        userId: 'manager1',
        userRole: Role.MANAGER,
      });

      const handler = canAssignRole(mockHandler, mockGetTargetRole);
      const response = await handler(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle concurrent requests to same middleware', async () => {
      const request1 = createMockRequest({
        userId: 'user1',
        userRole: Role.MEMBER,
      });
      const request2 = createMockRequest({
        userId: 'user2',
        userRole: Role.MANAGER,
      });

      const middleware = withPermission(Permission.TASK_CREATE);
      const handler = middleware(mockHandler);

      const [response1, response2] = await Promise.all([
        handler(request1),
        handler(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle malformed role header gracefully', async () => {
      const headers = new Headers();
      headers.set('x-user-id', 'user1');
      headers.set('x-user-role', 'invalid-role');

      const request = {
        headers,
        url: 'http://localhost/api/test',
        method: 'GET',
      } as unknown as NextRequest;

      const user = extractUserFromRequest(request);

      // Should return user with invalid role (getRolePermissions handles this)
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user1');
    });

    it('should handle empty user ID as unauthenticated', async () => {
      const request = createMockRequest({
        userId: '',
        userRole: Role.MEMBER,
      });

      const user = extractUserFromRequest(request);

      // Empty string is treated as missing (not authenticated)
      expect(user).toBeNull();
    });

    it('should pass user context to handler', async () => {
      const request = createMockRequest({
        userId: 'user1',
        userRole: Role.MANAGER,
      });

      const middleware = withPermission(Permission.TASK_CREATE);
      const handler = middleware(mockHandler);
      await handler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user1',
            role: Role.MANAGER,
          }),
        })
      );
    });
  });

  describe('Response format', () => {
    it('should return proper JSON error for unauthorized', async () => {
      const request = createMockRequest({
        userId: null,
        userRole: null,
      });

      const middleware = withPermission(Permission.TASK_CREATE);
      const handler = middleware(mockHandler);
      const response = await handler(request);
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return proper JSON error for forbidden', async () => {
      const request = createMockRequest({
        userId: 'member1',
        userRole: Role.MEMBER,
      });

      const middleware = withPermission(Permission.USER_DELETE);
      const handler = middleware(mockHandler);
      const response = await handler(request);
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code', 'FORBIDDEN');
    });
  });
});
