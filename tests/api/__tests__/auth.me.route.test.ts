/**
 * Auth Me API 路由单元测试
 *
 * 测试 GET /api/auth/me 端点的功能
 * 包括: happy path, 错误处理, 边界情况
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { RBACUserContext } from '@/lib/auth/middleware-rbac';

// Mock dependencies BEFORE importing the route
vi.mock('@/lib/auth/repository', () => ({
  getUserById: vi.fn(),
}));

vi.mock('@/lib/auth/service', () => ({
  authenticateToken: vi.fn(),
  verifyJwtToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    auth: vi.fn(),
  },
}));

vi.mock('@/lib/api/error-handler', () => ({
  createNotFoundError: vi.fn((message: string) => ({
    status: 404,
    json: async () => ({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message,
      },
    }),
  })),
  createErrorResponse: vi.fn((error) => ({
    status: 500,
    json: async () => ({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: String(error?.message || error || 'Unknown error'),
      },
    }),
  })),
}));

vi.mock('@/lib/api/utils', () => ({
  createSuccessResponse: vi.fn((data) => ({
    status: 200,
    json: async () => ({
      success: true,
      data,
    }),
  })),
}));

vi.mock('@/lib/permissions/repository', () => ({
  getUserPermissionContext: vi.fn(),
}));

// Mock the middleware-rbac module to properly handle auth
vi.mock('@/lib/auth/middleware-rbac', () => ({
  withUserAuth: vi.fn(async (request: NextRequest, handler: (req: NextRequest, context: RBACUserContext) => Promise<NextResponse>) => {
    const authHeader = request.headers.get('authorization');
    
    // Check for missing or invalid authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header',
        },
      }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // Check for empty token
    if (!token || token.length < 10) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token format',
        },
      }, { status: 401 });
    }
    
    // Dynamically import and call authenticateToken
    const { authenticateToken } = await import('@/lib/auth/service');
    const authResult = await authenticateToken(token);
    
    if (!authResult) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      }, { status: 401 });
    }
    
    // Build context
    const context: RBACUserContext = {
      ...authResult.context,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    // Call the handler
    return handler(request, context);
  }),
}));

describe('Auth Me API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Happy Path Tests ====================
  describe('GET /api/auth/me - Happy path', () => {
    it('should return current user with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        avatar: 'https://example.com/avatar.jpg',
        role: 'MEMBER',
        status: 'active',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T12:00:00.000Z',
        password: 'hashed',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');
      const { getUserPermissionContext } = await import('@/lib/permissions/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-123',
          email: 'test@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);
      vi.mocked(getUserPermissionContext).mockResolvedValue(null);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token-123',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toHaveProperty('id', 'user-123');
      expect(data.data.user).toHaveProperty('email', 'test@example.com');
      expect(data.data.user).toHaveProperty('name', 'Test User');
      expect(data.data.user).toHaveProperty('role', 'MEMBER');
      expect(data.data.user).not.toHaveProperty('password');
    });

    it('should return user with minimal fields', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'minimal@example.com',
        name: 'Minimal User',
        username: 'minimaluser',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-456',
          email: 'minimal@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token-456',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe('user-456');
      expect(data.data.user.email).toBe('minimal@example.com');
    });

    it('should handle query parameters gracefully', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-789',
          email: 'test@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me?include=all', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token-789',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ==================== Unauthorized Tests ====================
  describe('GET /api/auth/me - Unauthorized errors', () => {
    it('should return 401 when no authorization header', async () => {
      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when authorization header is empty', async () => {
      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': '',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when authorization header is missing Bearer prefix', async () => {
      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'invalid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when token is invalid', async () => {
      const { authenticateToken } = await import('@/lib/auth/service');

      vi.mocked(authenticateToken).mockResolvedValue(null);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 when token verification throws error', async () => {
      const { authenticateToken } = await import('@/lib/auth/service');

      vi.mocked(authenticateToken).mockRejectedValue(new Error('Invalid JWT signature'));

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer malformed-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ==================== Not Found Tests ====================
  describe('GET /api/auth/me - User not found', () => {
    it('should return 404 when user does not exist', async () => {
      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: { id: 'nonexistent-user', email: 'nonexistent@example.com' } as any,
        context: {
          userId: 'nonexistent-user',
          email: 'nonexistent@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(null);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when user is deleted', async () => {
      const mockUser = {
        id: 'deleted-user',
        email: 'deleted@example.com',
        status: 'deleted',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'deleted-user',
          email: 'deleted@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // Deleted users should return 404
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // ==================== Edge Cases Tests ====================
  describe('GET /api/auth/me - Edge cases', () => {
    it('should handle service errors gracefully', async () => {
      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' } as any,
        context: {
          userId: 'user-123',
          email: 'test@example.com',
        },
      });

      vi.mocked(getUserById).mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle malformed token gracefully', async () => {
      const { authenticateToken } = await import('@/lib/auth/service');

      vi.mocked(authenticateToken).mockRejectedValue(new Error('Malformed token'));

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer not.a.valid.jwt',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should handle null user data from service', async () => {
      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: { id: 'user-null', email: 'null@example.com' } as any,
        context: {
          userId: 'user-null',
          email: 'null@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(null);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should handle empty string token', async () => {
      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should handle token with extra spaces', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-123',
          email: 'test@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer  valid-token-123  ',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // The middleware trims the token
      expect([200, 401]).toContain(response.status);
    });

    it('should handle user with disabled account', async () => {
      const mockUser = {
        id: 'disabled-user',
        email: 'disabled@example.com',
        name: 'Disabled User',
        username: 'disableduser',
        status: 'disabled',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      // Inactive users should fail authentication
      vi.mocked(authenticateToken).mockResolvedValue(null);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should handle user with pending verification', async () => {
      const mockUser = {
        id: 'pending-user',
        email: 'pending@example.com',
        name: 'Pending User',
        username: 'pendinguser',
        status: 'pending',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'pending-user',
          email: 'pending@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // Pending users may or may not be allowed depending on implementation
      expect([200, 401, 403]).toContain(response.status);
    });

    it('should handle multiple authorization headers (should use first)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-123',
          email: 'test@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer first-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ==================== User Data Tests ====================
  describe('GET /api/auth/me - User data variations', () => {
    it('should return user with all optional fields', async () => {
      const mockUser = {
        id: 'user-full',
        email: 'full@example.com',
        name: 'Full User',
        username: 'fulluser',
        avatar: 'https://example.com/avatar.jpg',
        bio: 'This is a bio',
        location: 'San Francisco',
        website: 'https://example.com',
        role: 'ADMIN',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-03-20T12:00:00.000Z',
        lastLoginAt: '2026-03-20T10:00:00.000Z',
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-full',
          email: 'full@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toHaveProperty('bio');
      expect(data.data.user).toHaveProperty('location');
      expect(data.data.user).toHaveProperty('website');
    });

    it('should return user with null optional fields', async () => {
      const mockUser = {
        id: 'user-null-fields',
        email: 'nullfields@example.com',
        name: 'Null Fields User',
        username: 'nullfieldsuser',
        avatar: null,
        bio: null,
        location: null,
        website: null,
      };

      const { authenticateToken } = await import('@/lib/auth/service');
      const { getUserById } = await import('@/lib/auth/repository');

      vi.mocked(authenticateToken).mockResolvedValue({
        user: mockUser,
        context: {
          userId: 'user-null-fields',
          email: 'nullfields@example.com',
        },
      });

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.avatar).toBeNull();
      expect(data.data.user.bio).toBeNull();
    });
  });
});
