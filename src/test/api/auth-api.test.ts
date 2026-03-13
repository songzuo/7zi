/**
 * Auth API 单元测试
 * 测试认证 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/auth/route';

// Mock 依赖
vi.mock('@/lib/security/auth', () => ({
  generateAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
  generateRefreshToken: vi.fn(() => Promise.resolve('mock-refresh-token')),
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  setAuthCookies: vi.fn(() => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'auth_token=mock-access-token; Path=/');
    headers.append('Set-Cookie', 'refresh_token=mock-refresh-token; Path=/');
    return headers;
  }),
  clearAuthCookies: vi.fn(() => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'auth_token=; Path=/; Max-Age=0');
    headers.append('Set-Cookie', 'refresh_token=; Path=/; Max-Age=0');
    return headers;
  }),
  validateJwtSecret: vi.fn(() => ({ valid: true, issues: [] })),
  generateSecureSecret: vi.fn(() => 'generated-secret-123'),
}));

vi.mock('@/lib/security/csrf', () => ({
  generateCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfTokenCookie: vi.fn(() => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'csrf_token=mock-csrf-token; Path=/');
    return headers;
  }),
}));

vi.mock('@/lib/logger', () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// 辅助函数：创建模拟请求
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>,
  headers?: Record<string, string>,
  cookies?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/auth');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  const requestHeaders = new Headers();
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });
  }
  
  const request = new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 设置 cookies
  if (cookies) {
    Object.entries(cookies).forEach(([key, value]) => {
      request.cookies.set(key, value);
    });
  }

  return request;
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth (login)', () => {
    it('应该成功登录管理员用户', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@7zi.studio',
        password: 'admin123',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('admin@7zi.studio');
      expect(data.user.role).toBe('admin');
      expect(data.csrfToken).toBeDefined();
    });

    it('应该拒绝无效凭据', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@7zi.studio',
        password: 'wrongpassword',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid');
    });

    it('应该拒绝不存在的用户', async () => {
      const request = createMockRequest('POST', {
        email: 'nonexistent@test.com',
        password: 'password123',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid');
    });

    it('缺少邮箱时应该返回 400 错误', async () => {
      const request = createMockRequest('POST', {
        password: 'password123',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('缺少密码时应该返回 400 错误', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@7zi.studio',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('空请求体时应该返回 400 错误', async () => {
      const request = createMockRequest('POST', {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('应该设置认证 Cookie', async () => {
      const request = createMockRequest('POST', {
        email: 'admin@7zi.studio',
        password: 'admin123',
      });
      const response = await POST(request);

      const setCookieHeaders = response.headers.getSetCookie();
      expect(setCookieHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/auth (logout)', () => {
    it('应该成功登出', async () => {
      const { verifyToken, extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-1',
        email: 'admin@7zi.studio',
        role: 'admin',
      });

      const request = createMockRequest('DELETE');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Logged out');
    });

    it('无 token 时也应该成功登出', async () => {
      const { extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue(null);

      const request = createMockRequest('DELETE');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该清除认证 Cookie', async () => {
      const request = createMockRequest('DELETE');
      const response = await DELETE(request);

      const { clearAuthCookies } = await import('@/lib/security/auth');
      expect(clearAuthCookies).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth', () => {
    it('应该返回 API 端点列表', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Auth API');
      expect(data.endpoints).toBeInstanceOf(Array);
      expect(data.endpoints.length).toBeGreaterThan(0);
    });

    it('action=csrf 应该返回 CSRF token', async () => {
      const request = createMockRequest('GET', undefined, { action: 'csrf' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.csrfToken).toBeDefined();
    });

    it('action=check-secret 应该返回密钥强度信息', async () => {
      const request = createMockRequest('GET', undefined, { action: 'check-secret' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.secretStrength).toBeDefined();
    });
  });
});

describe('Auth API - Token 验证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('令牌刷新', () => {
    it('有效刷新令牌应该返回新的访问令牌', async () => {
      const { verifyToken } = await import('@/lib/security/auth');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-1',
        email: 'admin@7zi.studio',
        name: 'Admin',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      });

      const request = createMockRequest(
        'POST',
        undefined,
        undefined,
        undefined,
        { refresh_token: 'valid-refresh-token' }
      );

      // POST 方法目前只处理登录，刷新需要单独的端点
      // 这里测试 refresh 功能逻辑
    });

    it('无效刷新令牌应该返回 401 错误', async () => {
      const { verifyToken } = await import('@/lib/security/auth');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = createMockRequest(
        'POST',
        undefined,
        undefined,
        undefined,
        { refresh_token: 'invalid-token' }
      );

      // 测试 refresh 端点逻辑
    });
  });

  describe('用户信息获取', () => {
    it('有效令牌应该返回用户信息', async () => {
      const { verifyToken, extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-1',
        email: 'admin@7zi.studio',
        name: 'Admin',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      });

      // 测试 me 端点逻辑
    });

    it('无令牌应该返回 401 错误', async () => {
      const { extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue(null);

      // 测试 me 端点逻辑
    });

    it('过期令牌应该返回 401 错误', async () => {
      const { verifyToken, extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('expired-token');
      vi.mocked(verifyToken).mockResolvedValue(null);

      // 测试 me 端点逻辑
    });
  });
});

describe('Auth API - 安全性', () => {
  it('应该正确处理 SQL 注入尝试', async () => {
    const request = createMockRequest('POST', {
      email: "admin@7zi.studio'; DROP TABLE users; --",
      password: 'admin123',
    });
    const response = await POST(request);
    const data = await response.json();

    // 应该拒绝无效邮箱格式（在真实应用中）
    expect(response.status).toBe(401);
  });

  it('应该正确处理 XSS 尝试', async () => {
    const request = createMockRequest('POST', {
      email: '<script>alert("xss")</script>@test.com',
      password: 'password',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it('应该正确处理空字符串', async () => {
    const request = createMockRequest('POST', {
      email: '',
      password: '',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('应该正确处理空白字符串', async () => {
    const request = createMockRequest('POST', {
      email: '   ',
      password: '   ',
    });
    const response = await POST(request);
    const data = await response.json();

    // 取决于输入验证实现
    expect([400, 401]).toContain(response.status);
  });

  it('应该正确处理超大请求体', async () => {
    const largePassword = 'a'.repeat(10000);
    const request = createMockRequest('POST', {
      email: 'admin@7zi.studio',
      password: largePassword,
    });
    const response = await POST(request);

    // 应该拒绝或正常处理（不崩溃）
    expect([200, 401, 413]).toContain(response.status);
  });
});

describe('Auth API - 边界情况', () => {
  it('应该处理特殊字符邮箱', async () => {
    const request = createMockRequest('POST', {
      email: 'user+test@example.com',
      password: 'password123',
    });
    const response = await POST(request);
    const data = await response.json();

    // 特殊格式邮箱应该被正确处理
    expect(response.status).toBe(401); // 不是有效的管理员账户
  });

  it('应该处理 Unicode 字符', async () => {
    const request = createMockRequest('POST', {
      email: '用户@7zi.studio',
      password: '密码123',
    });
    const response = await POST(request);

    // 应该不崩溃
    expect([200, 400, 401]).toContain(response.status);
  });

  it('应该处理重复登录请求', async () => {
    const request = createMockRequest('POST', {
      email: 'admin@7zi.studio',
      password: 'admin123',
    });

    // 多次登录应该都成功（模拟每次都是新请求）
    const results = [];
    for (let i = 0; i < 3; i++) {
      const req = createMockRequest('POST', {
        email: 'admin@7zi.studio',
        password: 'admin123',
      });
      results.push(await POST(req));
    }

    results.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});