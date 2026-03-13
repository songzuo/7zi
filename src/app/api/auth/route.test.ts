/**
 * Auth API Route Tests
 * Tests for authentication endpoints (login, logout, refresh, me)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, DELETE, GET } from '@/app/api/auth/route';
import { NextRequest } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
  setAuthCookies,
  clearAuthCookies,
  validateJwtSecret,
} from '@/lib/security/auth';
import { generateCsrfToken, setCsrfTokenCookie } from '@/lib/security/csrf';

// Mock dependencies
vi.mock('@/lib/security/auth', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
  validateJwtSecret: vi.fn(),
  generateSecureSecret: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/security/csrf', () => ({
  generateCsrfToken: vi.fn(),
  setCsrfTokenCookie: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create mock request
function createRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, cookies = {} } = options;

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  // Cast to Next.js RequestInit to avoid signal type incompatibility
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), init as RequestInit);
  
  // Mock cookies - fix the function signature
  const getCookieFn = (name: string) => {
    if (name in cookies) {
      return { name, value: cookies[name] };
    }
    return undefined;
  };
  
  // Use vi.spyOn properly
  vi.spyOn(request.cookies, 'get').mockImplementation(getCookieFn as never);

  return request;
}

describe('/api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateAccessToken).mockResolvedValue('mock-access-token');
    vi.mocked(generateRefreshToken).mockResolvedValue('mock-refresh-token');
    vi.mocked(verifyToken).mockResolvedValue(null);
    vi.mocked(extractToken).mockReturnValue(null);
    vi.mocked(generateCsrfToken).mockReturnValue('mock-csrf-token');
    
    // Mock setAuthCookies to return proper Headers
    const mockAuthHeaders = new Headers();
    mockAuthHeaders.append('Set-Cookie', 'auth_token=mock; Path=/; HttpOnly; Secure; SameSite=Strict');
    vi.mocked(setAuthCookies).mockReturnValue(mockAuthHeaders);
    
    // Mock setCsrfTokenCookie to return proper Headers
    const mockCsrfHeaders = new Headers();
    mockCsrfHeaders.append('Set-Cookie', 'csrf_token=mock; Path=/; HttpOnly; Secure; SameSite=Strict');
    vi.mocked(setCsrfTokenCookie).mockReturnValue(mockCsrfHeaders);
    
    // Mock clearAuthCookies to return proper Headers
    const mockClearHeaders = new Headers();
    mockClearHeaders.append('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
    vi.mocked(clearAuthCookies).mockReturnValue(mockClearHeaders);
    
    vi.mocked(validateJwtSecret).mockReturnValue({ valid: true, issues: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST (login)', () => {
    it('should login successfully with valid credentials', async () => {
      const request = createRequest('/api/auth', {
        method: 'POST',
        body: { email: 'admin@7zi.studio', password: 'admin123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('admin@7zi.studio');
      expect(data.user.role).toBe('admin');
      expect(data.csrfToken).toBe('mock-csrf-token');
    });

    it('should reject login without email', async () => {
      const request = createRequest('/api/auth', {
        method: 'POST',
        body: { password: 'admin123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Email and password');
    });

    it('should reject login without password', async () => {
      const request = createRequest('/api/auth', {
        method: 'POST',
        body: { email: 'admin@7zi.studio' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Email and password');
    });

    it('should reject login with invalid credentials', async () => {
      const request = createRequest('/api/auth', {
        method: 'POST',
        body: { email: 'wrong@example.com', password: 'wrongpass' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid email or password');
    });

    it('should generate tokens on successful login', async () => {
      const request = createRequest('/api/auth', {
        method: 'POST',
        body: { email: 'admin@7zi.studio', password: 'admin123' },
      });

      await POST(request);

      expect(generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-admin-001',
          email: 'admin@7zi.studio',
          role: 'admin',
        })
      );
      expect(generateRefreshToken).toHaveBeenCalled();
    });

    it('should set auth cookies on successful login', async () => {
      const request = createRequest('/api/auth', {
        method: 'POST',
        body: { email: 'admin@7zi.studio', password: 'admin123' },
      });

      await POST(request);

      expect(setAuthCookies).toHaveBeenCalled();
      expect(setCsrfTokenCookie).toHaveBeenCalledWith('mock-csrf-token');
    });

    it('should handle malformed JSON body', async () => {
      const request = new NextRequest(new URL('/api/auth', 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE (logout)', () => {
    it('should logout successfully', async () => {
      const request = createRequest('/api/auth', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Logged out');
    });

    it('should clear auth cookies on logout', async () => {
      const request = createRequest('/api/auth', {
        method: 'DELETE',
      });

      await DELETE(request);

      expect(clearAuthCookies).toHaveBeenCalled();
    });

    it('should logout even without token', async () => {
      vi.mocked(extractToken).mockReturnValue(null);

      const request = createRequest('/api/auth', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle logout with valid token', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      const request = createRequest('/api/auth', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET', () => {
    it('should return API info by default', async () => {
      const request = createRequest('/api/auth');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Auth API');
      expect(Array.isArray(data.endpoints)).toBe(true);
    });

    it('should return CSRF token with action=csrf', async () => {
      const request = createRequest('/api/auth?action=csrf');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.csrfToken).toBe('mock-csrf-token');
    });

    it('should set CSRF cookie when requesting CSRF token', async () => {
      const request = createRequest('/api/auth?action=csrf');

      await GET(request);

      expect(setCsrfTokenCookie).toHaveBeenCalledWith('mock-csrf-token');
    });

    it('should check secret strength with action=check-secret', async () => {
      const request = createRequest('/api/auth?action=check-secret');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.secretStrength).toBeDefined();
    });

    it('should report default secret status', async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'change-me-to-a-secure-random-string-min-32-chars';

      const request = createRequest('/api/auth?action=check-secret');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDefault).toBe(true);

      process.env.JWT_SECRET = originalEnv;
    });
  });
});