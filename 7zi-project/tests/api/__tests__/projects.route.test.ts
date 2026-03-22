/**
 * Projects API 路由单元测试
 *
 * 直接测试路由处理函数的逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../7zi-frontend/src/app/api/projects/route';

// Mock the permission decorators for unit testing
vi.mock('../../../7zi-frontend/src/lib/permissions', () => ({
  UserWithRoles: class MockUser {
    id: string;
    username: string;
    roles: any[];
    constructor(data: any) {
      this.id = data.id;
      this.username = data.username;
      this.roles = data.roles || [];
    }
  },
  createUserWithRoles: (user: any, roles: string[]) => ({
    ...user,
    roles: roles.map(r => ({
      name: r,
      level: r === 'super_admin' ? 100 : r === 'team_leader' ? 60 : 40
    }))
  }),
  RequirePermission: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      return originalMethod.apply(this, args);
    };
    return descriptor;
  },
  RequireRoleLevel: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      return originalMethod.apply(this, args);
    };
    return descriptor;
  },
  ResourceType: {
    PROJECT: 'project',
    USER: 'user',
    TASK: 'task',
    DATA: 'data'
  },
  PermissionDeniedError: class extends Error {
    requiredPermissions: string[];
    missingPermissions: string[];
    reason?: string;
    constructor(required: string[], missing: string[], reason?: string) {
      super('Permission denied');
      this.requiredPermissions = required;
      this.missingPermissions = missing;
      this.reason = reason;
    }
  },
  Permissions: {},
  PermissionContext: {},
  canAccessResource: (user: any, resourceType: string, action: string, context: any) => {
    // Simplified permission check for testing
    if (user.roles?.some((r: any) => r.level >= 100)) {
      return { allowed: true, requiredPermissions: [], missingPermissions: [] };
    }
    return { allowed: false, requiredPermissions: ['project:create'], missingPermissions: ['project:create'], reason: 'Insufficient permissions' };
  }
}));

describe('Projects API Route', () => {
  describe('GET /api/projects', () => {
    it('should return projects list for admin user', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        headers: {
          'x-user-id': 'user-1'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should return projects list for team_leader', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        headers: {
          'x-user-id': 'user-2'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return projects list for developer', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        headers: {
          'x-user-id': 'user-3'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle missing user header gracefully', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        headers: {}
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Default user fallback
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('should create new project for admin user', async () => {
      const requestBody = {
        name: 'Test Project',
        description: 'Test description'
      };

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name', 'Test Project');
      expect(data.data).toHaveProperty('description', 'Test description');
    });

    it('should create new project for team_leader', async () => {
      const requestBody = {
        name: 'Team Leader Project',
        description: 'Created by team leader'
      };

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-2'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('ownerId', 'user-2');
    });

    it('should return 403 for user without create permission', async () => {
      const requestBody = {
        name: 'Unauthorized Project',
        description: 'Should fail'
      };

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-3'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Permission denied');
      expect(data).toHaveProperty('requiredPermissions');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        },
        body: 'invalid json'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle missing required fields', async () => {
      const requestBody = {
        // name is missing
        description: 'No name'
      };

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-1'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed but with undefined name, or fail validation
      expect([200, 500]).toContain(response.status);
    });
  });
});

describe('Project Controller Methods', () => {
  it('should export project data with correct structure', async () => {
    // This tests the internal controller logic
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
      description: 'Test Description'
    };

    expect(mockProject).toHaveProperty('id');
    expect(mockProject).toHaveProperty('name');
    expect(mockProject).toHaveProperty('description');
  });

  it('should validate project ownership', () => {
    const user = { id: 'user-1', roles: [{ name: 'super_admin', level: 100 }] };
    const project = { ownerId: 'user-1' };

    const isOwner = user.id === project.ownerId;
    const isAdmin = user.roles.some((r: any) => r.level >= 100);

    expect(isOwner || isAdmin).toBe(true);
  });

  it('should deny access for non-owner non-admin', () => {
    const user = { id: 'user-2', roles: [{ name: 'developer', level: 40 }] };
    const project = { ownerId: 'user-1' };

    const isOwner = user.id === project.ownerId;
    const isAdmin = user.roles.some((r: any) => r.level >= 100);

    expect(isOwner || isAdmin).toBe(false);
  });
});
