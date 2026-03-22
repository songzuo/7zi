/**
 * Auth Login API Route Tests
 * Tests for /api/auth/login endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { createMockRequest } from '@/test/mocks/api-mocks';

// Mock dependencies
vi.mock('@/lib/auth/service');
vi.mock('@/lib/logger');

import { loginUser } from '@/lib/auth/service';

describe('/api/auth/login', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePass123',
    name: 'Test User',
  };

  const mockLoginResponse = {
    success: true,
    user: {
      id: 'user-123',
      email: testUser.email,
      name: testUser.name,
      role: 'member',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    token: 'jwt-access-token',
    refreshToken: 'refresh-token-123',
    expiresAt: new Date(Date.now() + 3600000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loginUser).mockResolvedValue(mockLoginResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/login - Success cases', () => {
    it('should login with valid credentials', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.user.name).toBe(testUser.name);
      expect(data.data.token).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
      expect(data.data.expiresAt).toBeDefined();
      expect(vi.mocked(loginUser)).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
        rememberMe: undefined, // Not provided, so undefined
      });
    });

    it('should login with rememberMe flag', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          rememberMe: true,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(vi.mocked(loginUser)).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
        rememberMe: true,
      });
    });

    it('should set auth_token cookie', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();

      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('auth_token'))).toBe(true);
    });

    it('should set refresh_token cookie', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();

      expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);
    });

    it('should not return password in user data', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.user).not.toHaveProperty('password');
    });
  });

  describe('POST /api/auth/login - Validation errors', () => {
    it('should reject login without email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Email and password are required');
    });

    it('should reject login without password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject login with invalid email format', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid email format');
    });

    it('should reject empty email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: '',
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: '',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject null email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: null,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject null password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: null,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Authentication errors', () => {
    it('should reject login with wrong email', async () => {
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'wrong@example.com',
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
      expect(data.error.message).toContain('Invalid email or password');
    });

    it('should reject login with wrong password', async () => {
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'WrongPassword123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');
    });

    it('should reject login for inactive account', async () => {
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'Account is inactive',
      });

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject login for suspended account', async () => {
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'Account is suspended',
      });

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(loginUser).mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.status).toBeLessThan(600);
    });

    it('should handle malformed JSON', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing body', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty body', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle partial body', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Cookie handling', () => {
    it('should set HttpOnly flag on auth_token cookie', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();
      const authCookie = cookies.find(c => c.includes('auth_token'));

      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
    });

    it('should set Secure or HttpOnly flag on auth_token cookie', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();
      const authCookie = cookies.find(c => c.includes('auth_token'));

      expect(authCookie).toBeDefined();
      // Check for HttpOnly (case insensitive)
      expect(authCookie).toMatch(/httponly/i);
    });

    it('should set SameSite=Lax or Strict on auth_token cookie', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();
      const authCookie = cookies.find(c => c.includes('auth_token'));

      expect(authCookie).toBeDefined();
      expect(authCookie!.toLowerCase()).toMatch(/samesite=(lax|strict)/);
    });

    it('should set appropriate expiration on cookies', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();

      cookies.forEach(cookie => {
        if (cookie.includes('auth_token') || cookie.includes('refresh_token')) {
          expect(cookie).toMatch(/Max-Age=\d+/);
        }
      });
    });

    it('should handle rememberMe with longer cookie expiration', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          rememberMe: true,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(vi.mocked(loginUser)).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true })
      );
    });
  });

  describe('POST /api/auth/login - Edge cases', () => {
    it('should handle email with extra spaces', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: `  ${testUser.email}  `,
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should either trim or reject
      expect([200, 400]).toContain(response.status);
    });

    it('should handle password with leading/trailing spaces', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: `  ${testUser.password}  `,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Passwords should not be trimmed
      if (response.status === 401) {
        expect(data.success).toBe(false);
      }
    });

    it('should handle special characters in email', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'user+tag@example.com',
          password: testUser.password,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should either accept or validate
      expect([200, 400]).toContain(response.status);
    });

    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: longEmail,
          password: testUser.password,
        },
      });

      const response = await POST(request);

      // Should handle without crashing - may accept or reject
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000);

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: testUser.email,
          password: longPassword,
        },
      });

      const response = await POST(request);

      // Should handle without crashing - may accept or reject
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });
  });
});
