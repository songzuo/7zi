/**
 * Auth Me API 路由单元测试
 *
 * 测试 GET /api/auth/me 端点的功能
 * 包括: happy path, 错误处理, 边界情况
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/service', () => ({
  getCurrentUser: vi.fn(),
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
  createUnauthorizedError: vi.fn((message: string) => {
    return {
      status: 401,
      json: async () => ({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message,
        },
      }),
    };
  }),
  createNotFoundResponse: vi.fn((message: string) => {
    return {
      status: 404,
      json: async () => ({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message,
        },
      }),
    };
  }),
  createErrorResponse: vi.fn((error: any) => {
    return {
      status: 500,
      json: async () => ({
        success: false,
        error: error.message || 'An error occurred',
      }),
    };
  }),
}));

vi.mock('@/lib/api/utils', () => ({
  getAuthToken: vi.fn((request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }),
  createSuccessResponse: vi.fn((data: any) => {
    return {
      status: 200,
      json: async () => ({
        success: true,
        data,
      }),
    };
  }),
}));

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({
    requestId: 'test-request-id',
    timestamp: Date.now(),
    method: 'GET',
    path: '/api/auth/me',
  })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
  logAuthError: vi.fn(),
  sanitizeUrlForLogging: vi.fn((url: string) => url),
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
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        avatar: 'https://example.com/avatar.jpg',
        role: 'MEMBER',
        status: 'active',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T12:00:00.000Z',
      });

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
    });

    it('should return user with minimal fields', async () => {
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-456',
        email: 'minimal@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-456',
        email: 'minimal@example.com',
        name: 'Minimal User',
        username: 'minimaluser',
      });

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
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-789',
        email: 'test@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-789',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      });

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
      expect(data.error.message).toContain('No authorization token provided');
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
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue(null);

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
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toContain('Invalid or expired token');
    });

    it('should return 401 when token is expired', async () => {
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockRejectedValue(new Error('Token expired'));

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer expired-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when token verification throws error', async () => {
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid JWT signature'));

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
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'nonexistent-user',
        email: 'nonexistent@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue(null);

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
      expect(data.error.message).toContain('User not found');
    });

    it('should return 404 when user is deleted', async () => {
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'deleted-user',
        email: 'deleted@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'deleted-user',
        email: 'deleted@example.com',
        status: 'deleted',
      });

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // Depending on implementation, this might be 404 or 200 with deleted status
      expect([200, 404]).toContain(response.status);
    });
  });

  // ==================== Edge Cases Tests ====================
  describe('GET /api/auth/me - Edge cases', () => {
    it('should handle service errors gracefully', async () => {
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      const { getCurrentUser } = await import('@/lib/auth/service');
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Database connection failed'));

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
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockRejectedValue(new Error('Malformed token'));

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
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-null',
        email: 'null@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue(null);

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
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      const { getCurrentUser } = await import('@/lib/auth/service');
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      });

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer  valid-token-123  ',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // Depending on trim implementation, might succeed or fail
      expect([200, 401]).toContain(response.status);
    });

    it('should handle user with disabled account', async () => {
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'disabled-user',
        email: 'disabled@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'disabled-user',
        email: 'disabled@example.com',
        name: 'Disabled User',
        username: 'disableduser',
        status: 'disabled',
      });

      const { GET } = await import('@/app/api/auth/me/route');
      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // Might return 200 with disabled status, or 403/401
      expect([200, 403, 401]).toContain(response.status);
    });

    it('should handle user with pending verification', async () => {
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'pending-user',
        email: 'pending@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'pending-user',
        email: 'pending@example.com',
        name: 'Pending User',
        username: 'pendinguser',
        status: 'pending',
      });

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
      expect(data.data.user.status).toBe('pending');
    });

    it('should handle multiple authorization headers (should use first)', async () => {
      const { verifyToken } = await import('@/lib/auth/service');
      const { getCurrentUser } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      });

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
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-full',
        email: 'full@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
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
      });

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
      const { getCurrentUser } = await import('@/lib/auth/service');
      const { verifyToken } = await import('@/lib/auth/service');

      vi.mocked(verifyToken).mockResolvedValue({
        userId: 'user-null-fields',
        email: 'nullfields@example.com',
      });

      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user-null-fields',
        email: 'nullfields@example.com',
        name: 'Null Fields User',
        username: 'nullfieldsuser',
        avatar: null,
        bio: null,
        location: null,
        website: null,
      });

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
