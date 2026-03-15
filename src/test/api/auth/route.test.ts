/**
 * Auth API 测试
 * 测试认证 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/auth/route';

// Mock 依赖
vi.mock('@/lib/security/auth', () => ({
  generateAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  generateRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  setAuthCookies: vi.fn(() => new Headers([['Set-Cookie', 'access_token=xxx']])),
  clearAuthCookies: vi.fn(() => new Headers([['Set-Cookie', 'access_token=; Max-Age=0']])),
  validateJwtSecret: vi.fn(() => ({ valid: true, strength: 'strong' })),
}));

vi.mock('@/lib/security/csrf', () => ({
  generateCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfTokenCookie: vi.fn(() => new Headers([['Set-Cookie', 'csrf_token=xxx']])),
}));

vi.mock('@/lib/logger', () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  apiLogger: {
    audit: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// 辅助函数：创建模拟请求
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>,
  cookies?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/auth');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const requestHeaders = new Headers();
  if (cookies) {
    requestHeaders.set('Cookie', Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '));
  }

  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 设置环境变量
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'test-password-123';
    process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long';
  });

  describe('GET /api/auth', () => {
    it('应该返回 API 信息', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Auth API');
      expect(Array.isArray(data.endpoints)).toBe(true);
      expect(data.endpoints).toContain('POST /api/auth/login');
    });

    it('action=csrf 应该返回 CSRF Token', async () => {
      const request = createMockRequest('GET', undefined, { action: 'csrf' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.csrfToken).toBe('mock-csrf-token');
    });

    it('action=me 需要认证', async () => {
      const { extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue(null);

      const request = createMockRequest('GET', undefined, { action: 'me' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('action=me 应该返回用户信息', async () => {
      const { extractToken, verifyToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
      });

      const request = createMockRequest('GET', undefined, { action: 'me' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('user-001');
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.role).toBe('admin');
    });

    it('action=me 无效 token 应该返回 401', async () => {
      const { extractToken, verifyToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('invalid-token');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = createMockRequest('GET', undefined, { action: 'me' });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('action=check-secret 应该返回密钥强度', async () => {
      const request = createMockRequest('GET', undefined, { action: 'check-secret' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.secretStrength).toBeDefined();
    });
  });

  describe('POST /api/auth?action=login', () => {
    it('正确凭据应该成功登录', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@example.com',
        password: 'test-password-123',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('admin@example.com');
      expect(data.user.role).toBe('admin');
      expect(data.csrfToken).toBe('mock-csrf-token');
    });

    it('错误密码应该返回 401', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@example.com',
        password: 'wrong-password',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('错误邮箱应该返回 401', async () => {
      const request = createMockRequest('POST', {
        email: 'wrong@example.com',
        password: 'test-password-123',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('缺少邮箱应该返回 400', async () => {
      const request = createMockRequest('POST', {
        password: 'test-password-123',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('缺少密码应该返回 400', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@example.com',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('空邮箱和密码应该返回 400', async () => {
      const request = createMockRequest('POST', {
        email: '',
        password: '',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth?action=logout', () => {
    it('应该成功登出', async () => {
      const { extractToken, verifyToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-001',
        email: 'test@example.com',
      });

      const request = createMockRequest('POST', undefined, { action: 'logout' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Logged out');
    });

    it('无 token 也应该成功登出', async () => {
      const { extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue(null);

      const request = createMockRequest('POST', undefined, { action: 'logout' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth?action=refresh', () => {
    it('有效 refresh token 应该返回新 access token', async () => {
      const { verifyToken } = await import('@/lib/security/auth');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
      });

      const request = createMockRequest(
        'POST',
        undefined,
        { action: 'refresh' },
        { refresh_token: 'valid-refresh-token' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.accessToken).toBe('mock-access-token');
    });

    it('无 refresh token 应该返回 401', async () => {
      const request = createMockRequest('POST', undefined, { action: 'refresh' });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('无效 refresh token 应该返回 401', async () => {
      const { verifyToken } = await import('@/lib/security/auth');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = createMockRequest(
        'POST',
        undefined,
        { action: 'refresh' },
        { refresh_token: 'invalid-refresh-token' }
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/auth', () => {
    it('DELETE 应该登出用户', async () => {
      const { extractToken, verifyToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-001',
        email: 'test@example.com',
      });

      const request = createMockRequest('DELETE');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('无效 action 应该返回 400', async () => {
      const request = createMockRequest('POST', undefined, { action: 'invalid' });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('应该处理 JSON 解析错误', async () => {
      const url = new URL('http://localhost:3000/api/auth');
      const request = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      try {
        const response = await POST(request);
        expect([400, 500]).toContain(response.status);
      } catch (error) {
        // JSON 解析错误是预期的
        expect(error).toBeDefined();
      }
    });

    it('应该处理特殊字符邮箱', async () => {
      const request = createMockRequest('POST', {
        email: 'admin+test@example.com',
        password: 'wrong',
      });
      const response = await POST(request);

      // 应该返回 401 而不是崩溃
      expect([400, 401]).toContain(response.status);
    });
  });
});

describe('Auth API 安全性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = 'secure@example.com';
    process.env.ADMIN_PASSWORD = 'secure-password-123';
    process.env.JWT_SECRET = 'secure-jwt-secret-min-32-characters-long';
  });

  it('不应该在响应中暴露密码', async () => {
    const request = createMockRequest('POST', {
      email: 'secure@example.com',
      password: 'secure-password-123',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(JSON.stringify(data)).not.toContain('secure-password-123');
  });

  it('登录失败不应该区分邮箱或密码错误', async () => {
    // 错误邮箱
    const wrongEmailRequest = createMockRequest('POST', {
      email: 'wrong@example.com',
      password: 'secure-password-123',
    });
    const wrongEmailResponse = await POST(wrongEmailRequest);

    // 错误密码
    const wrongPassRequest = createMockRequest('POST', {
      email: 'secure@example.com',
      password: 'wrong-password',
    });
    const wrongPassResponse = await POST(wrongPassRequest);

    // 两者应该返回相同的状态码
    expect(wrongEmailResponse.status).toBe(wrongPassResponse.status);
  });

  it('登录成功应该记录审计日志', async () => {
    const { authLogger } = await import('@/lib/logger');
    
    const request = createMockRequest('POST', {
      email: 'secure@example.com',
      password: 'secure-password-123',
    });
    await POST(request);

    expect(authLogger.info).toHaveBeenCalled();
  });
});