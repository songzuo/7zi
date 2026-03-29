/**
 * Auth Register API 路由单元测试
 *
 * 测试 /api/auth/register 端点的功能
 * 包括: happy path, 错误处理, 边界情况
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/service', () => ({
  registerUser: vi.fn(),
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
  createValidationError: vi.fn((message: string) => {
    return {
      status: 400,
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      }),
    };
  }),
  createConflictError: vi.fn((message: string) => {
    return {
      status: 409,
      json: async () => ({
        success: false,
        error: {
          code: 'CONFLICT',
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
  validateEmail: vi.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }),
  validatePassword: vi.fn((password: string) => {
    // Minimum 8 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }),
  setAuthCookies: vi.fn(),
  createSuccessResponse: vi.fn((data: any, status?: number) => {
    return {
      status: status || 201,
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
    method: 'POST',
    path: '/api/auth/register',
  })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
  logAuthError: vi.fn(),
  sanitizeUrlForLogging: vi.fn((url: string) => url),
}));

describe('Auth Register API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Happy Path Tests ====================
  describe('POST /api/auth/register - Happy path', () => {
    it('should register user successfully with valid credentials', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          username: 'testuser',
        },
        token: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toHaveProperty('id', 'user-123');
      expect(data.data.user).toHaveProperty('email', 'test@example.com');
      expect(data.data.user).toHaveProperty('name', 'Test User');
      expect(data.data.token).toBe('access-token-123');
      expect(data.data.refreshToken).toBe('refresh-token-123');
      expect(data.data.expiresAt).toBeDefined();
    });

    it('should register user with minimal required fields', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-456',
          email: 'minimal@example.com',
          name: 'Minimal User',
          username: 'minimaluser',
        },
        token: 'access-token-456',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'minimal@example.com',
          password: 'Password123',
          name: 'Minimal User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('minimal@example.com');
      expect(data.data.refreshToken).toBeNull();
    });

    it('should set auth cookies on successful registration', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      const { setAuthCookies } = await import('@/lib/api/utils');

      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-789',
          email: 'cookies@example.com',
          name: 'Cookie User',
          username: 'cookieuser',
        },
        token: 'access-token-789',
        refreshToken: 'refresh-token-789',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'cookies@example.com',
          password: 'Password123',
          name: 'Cookie User',
        }),
      });

      await POST(request);

      expect(setAuthCookies).toHaveBeenCalledWith(
        expect.any(Object),
        'access-token-789',
        'refresh-token-789',
        false
      );
    });
  });

  // ==================== Validation Error Tests ====================
  describe('POST /api/auth/register - Validation errors', () => {
    it('should return validation error when email is missing', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Email, password, and name are required');
    });

    it('should return validation error when password is missing', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error when name is missing', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return validation error for invalid email format', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should return validation error for empty email', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: '',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return validation error for weak password (too short)', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Pass1',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return validation error for weak password (no numbers)', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return validation error for empty password', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: '',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return validation error for empty name', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return validation error for email with spaces', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test @example.com',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // ==================== Conflict Error Tests ====================
  describe('POST /api/auth/register - Conflict errors', () => {
    it('should return 409 when email already exists', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('Email already exists');
    });

    it('should return 409 when username is taken', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: false,
        error: 'Username already taken',
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'SecurePass123',
          name: 'Existing User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });

  // ==================== Edge Cases Tests ====================
  describe('POST /api/auth/register - Edge cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle empty request body', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle null values in request body', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: null,
          password: null,
          name: null,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle extra fields in request body gracefully', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-999',
          email: 'test@example.com',
          name: 'Test User',
          username: 'testuser',
        },
        token: 'access-token-999',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
          extraField: 'should be ignored',
          anotherField: 123,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockRejectedValue(new Error('Database connection failed'));

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle null user in successful registration', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: null,
        token: 'token-123',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should handle very long name', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-long',
          email: 'test@example.com',
          name: 'A'.repeat(100),
          username: 'testuser',
        },
        token: 'token-long',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'A'.repeat(100),
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should handle special characters in name', async () => {
      const { registerUser } = await import('@/lib/auth/service');
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-special',
          email: 'test@example.com',
          name: 'User with émojis 🎉 and spéci@l chars!',
          username: 'testuser',
        },
        token: 'token-special',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'User with émojis 🎉 and spéci@l chars!',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
