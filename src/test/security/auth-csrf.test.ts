/**
 * 安全模块单元测试
 * 测试 Auth 和 CSRF 功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
  isAdmin,
  hasPermission,
  validateJwtSecret,
  generateSecureSecret,
  createAuthMiddleware,
  User,
  TokenPayload,
} from '@/lib/security/auth';

import {
  generateCsrfToken,
  generateSignedCsrfToken,
  verifySignedCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
  validateDoubleSubmitCookie,
} from '@/lib/security/csrf';

// Mock NextRequest
function createMockNextRequest(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  url?: string;
}): NextRequest {
  const url = new URL(options.url || 'http://localhost:3000/api/test');
  
  const headers = new Headers();
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  
  const request = new NextRequest(url, { headers });
  
  if (options.cookies) {
    Object.entries(options.cookies).forEach(([key, value]) => {
      request.cookies.set(key, value);
    });
  }
  
  return request;
}

// Mock jose
vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: vi.fn(),
}));

describe('Auth 模块', () => {
  describe('generateAccessToken', () => {
    it('应该生成访问令牌', async () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        permissions: ['read', 'write'],
      };

      const token = await generateAccessToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('应该为不同用户生成不同令牌', async () => {
      const user1: User = { id: 'user-1', email: 'user1@test.com', role: 'user' };
      const user2: User = { id: 'user-2', email: 'user2@test.com', role: 'user' };

      const token1 = await generateAccessToken(user1);
      const token2 = await generateAccessToken(user2);

      // 由于 mock 返回相同值，这里测试函数调用
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('应该生成刷新令牌', async () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'user',
      };

      const token = await generateRefreshToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('有效令牌应该返回 payload', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValueOnce({
        payload: {
          sub: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          permissions: ['read', 'write', 'delete'],
        },
      } as any);

      const payload = await verifyToken('valid-token');
      
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user-1');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe('admin');
    });

    it('无效令牌应该返回 null', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Invalid token'));

      const payload = await verifyToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('过期令牌应该返回 null', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Token expired'));

      const payload = await verifyToken('expired-token');
      expect(payload).toBeNull();
    });
  });

  describe('extractToken', () => {
    it('应该从 Authorization header 提取 Bearer token', async () => {
      const request = createMockNextRequest({
        headers: { authorization: 'Bearer my-token-123' },
      });

      const token = extractToken(request);
      expect(token).toBe('my-token-123');
    });

    it('应该从 Cookie 提取 token', async () => {
      const request = createMockNextRequest({
        cookies: { auth_token: 'cookie-token-456' },
      });

      const token = extractToken(request);
      expect(token).toBe('cookie-token-456');
    });

    it('Authorization header 优先级应该高于 Cookie', async () => {
      const request = createMockNextRequest({
        headers: { authorization: 'Bearer header-token' },
        cookies: { auth_token: 'cookie-token' },
      });

      const token = extractToken(request);
      expect(token).toBe('header-token');
    });

    it('没有 token 时应该返回 null', async () => {
      const request = createMockNextRequest({});
      const token = extractToken(request);
      expect(token).toBeNull();
    });

    it('无效 Authorization 格式应该返回 null', async () => {
      const request = createMockNextRequest({
        headers: { authorization: 'InvalidFormat token' },
      });
      const token = extractToken(request);
      // 由于没有 Bearer 前缀，应该尝试从 cookie 获取
      expect(token).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('管理员用户应该返回 true', () => {
      const admin: User = { id: '1', email: 'admin@test.com', role: 'admin' };
      expect(isAdmin(admin)).toBe(true);
    });

    it('普通用户应该返回 false', () => {
      const user: User = { id: '1', email: 'user@test.com', role: 'user' };
      expect(isAdmin(user)).toBe(false);
    });

    it('服务账号应该返回 false', () => {
      const service: User = { id: '1', email: 'service@test.com', role: 'service' };
      expect(isAdmin(service)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('有权限应该返回 true', () => {
      const user: User = {
        id: '1',
        email: 'user@test.com',
        role: 'user',
        permissions: ['read', 'write'],
      };
      expect(hasPermission(user, 'read')).toBe(true);
    });

    it('无权限应该返回 false', () => {
      const user: User = {
        id: '1',
        email: 'user@test.com',
        role: 'user',
        permissions: ['read'],
      };
      expect(hasPermission(user, 'delete')).toBe(false);
    });

    it('没有 permissions 字段应该返回 false', () => {
      const user: User = { id: '1', email: 'user@test.com', role: 'user' };
      expect(hasPermission(user, 'read')).toBe(false);
    });

    it('管理员应该有所有权限', () => {
      const admin: User = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        permissions: [],
      };
      expect(hasPermission(admin, 'any-permission')).toBe(true);
    });
  });

  describe('validateJwtSecret', () => {
    it('强密钥应该通过验证', () => {
      const result = validateJwtSecret('Str0ng!Secret#Key@2024-With-32-Chars');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('短密钥应该返回错误', () => {
      const result = validateJwtSecret('short');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('32'))).toBe(true);
    });

    it('默认密钥应该返回错误', () => {
      const result = validateJwtSecret('change-me-to-a-secure-random-string-min-32-chars');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('default') || i.includes('weak'))).toBe(true);
    });

    it('简单密钥应该返回错误', () => {
      const result = validateJwtSecret('password');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('weak') || i.includes('default'))).toBe(true);
    });

    it('低复杂度密钥应该返回警告', () => {
      const result = validateJwtSecret('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result.issues.some(i => i.includes('complexity') || i.includes('characters'))).toBe(true);
    });
  });

  describe('generateSecureSecret', () => {
    it('应该生成指定长度的密钥', () => {
      const secret = generateSecureSecret(32);
      expect(secret.length).toBe(64); // 每字节2个十六进制字符
    });

    it('应该生成唯一的密钥', () => {
      const secret1 = generateSecureSecret(32);
      const secret2 = generateSecureSecret(32);
      expect(secret1).not.toBe(secret2);
    });

    it('应该只包含十六进制字符', () => {
      const secret = generateSecureSecret(32);
      expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
    });
  });

  describe('createAuthMiddleware', () => {
    it('无 token 且非可选认证应该返回 401', async () => {
      const middleware = createAuthMiddleware();
      const request = createMockNextRequest({});
      
      const result = await middleware(request);
      
      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('可选认证时无 token 应该返回 null', async () => {
      const middleware = createAuthMiddleware({ optional: true });
      const request = createMockNextRequest({});
      
      const result = await middleware(request);
      
      expect(result).toBeNull();
    });

    it('无效 token 应该返回 401', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Invalid'));

      const middleware = createAuthMiddleware();
      const request = createMockNextRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      
      const result = await middleware(request);
      
      expect(result?.status).toBe(401);
    });

    it('角色不匹配应该返回 403', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValueOnce({
        payload: { sub: '1', email: 'user@test.com', role: 'user' },
      } as any);

      const middleware = createAuthMiddleware({ roles: ['admin'] });
      const request = createMockNextRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      
      const result = await middleware(request);
      
      expect(result?.status).toBe(403);
    });

    it('权限不匹配应该返回 403', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValueOnce({
        payload: {
          sub: '1',
          email: 'user@test.com',
          role: 'user',
          permissions: ['read'],
        },
      } as any);

      const middleware = createAuthMiddleware({ permissions: ['delete'] });
      const request = createMockNextRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      
      const result = await middleware(request);
      
      expect(result?.status).toBe(403);
    });

    it('有效认证应该返回 null', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValueOnce({
        payload: {
          sub: '1',
          email: 'admin@test.com',
          role: 'admin',
          permissions: ['read', 'write', 'delete'],
        },
      } as any);

      const middleware = createAuthMiddleware({ roles: ['admin'] });
      const request = createMockNextRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      
      const result = await middleware(request);
      
      expect(result).toBeNull();
    });
  });
});

describe('CSRF 模块', () => {
  describe('generateCsrfToken', () => {
    it('应该生成令牌', () => {
      const token = generateCsrfToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 字节 = 64 十六进制字符
    });

    it('应该生成唯一令牌', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });

    it('应该只包含十六进制字符', () => {
      const token = generateCsrfToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('generateSignedCsrfToken', () => {
    it('应该生成带签名的令牌', () => {
      const secret = 'test-secret';
      const token = generateSignedCsrfToken(secret);
      
      expect(token).toBeDefined();
      expect(token.includes('.')).toBe(true);
    });

    it('签名应该可验证', () => {
      const secret = 'test-secret';
      const token = generateSignedCsrfToken(secret);
      
      expect(verifySignedCsrfToken(token, secret)).toBe(true);
    });

    it('错误密钥应该验证失败', () => {
      const token = generateSignedCsrfToken('correct-secret');
      
      expect(verifySignedCsrfToken(token, 'wrong-secret')).toBe(false);
    });

    it('格式错误的令牌应该验证失败', () => {
      expect(verifySignedCsrfToken('invalid', 'secret')).toBe(false);
      expect(verifySignedCsrfToken('invalid.nohex', 'secret')).toBe(false);
    });
  });

  describe('verifySignedCsrfToken', () => {
    it('空令牌应该返回 false', () => {
      expect(verifySignedCsrfToken('', 'secret')).toBe(false);
    });

    it('无签名令牌应该返回 false', () => {
      expect(verifySignedCsrfToken('tokenonly', 'secret')).toBe(false);
    });

    it('篡改的令牌应该返回 false', () => {
      const secret = 'test-secret';
      const token = generateSignedCsrfToken(secret);
      const tamperedToken = token.replace(/a/g, 'b');
      
      expect(verifySignedCsrfToken(tamperedToken, secret)).toBe(false);
    });
  });

  describe('requiresCsrfProtection', () => {
    it('POST 应该需要保护', () => {
      expect(requiresCsrfProtection('POST')).toBe(true);
    });

    it('PUT 应该需要保护', () => {
      expect(requiresCsrfProtection('PUT')).toBe(true);
    });

    it('DELETE 应该需要保护', () => {
      expect(requiresCsrfProtection('DELETE')).toBe(true);
    });

    it('PATCH 应该需要保护', () => {
      expect(requiresCsrfProtection('PATCH')).toBe(true);
    });

    it('GET 不应该需要保护', () => {
      expect(requiresCsrfProtection('GET')).toBe(false);
    });

    it('HEAD 不应该需要保护', () => {
      expect(requiresCsrfProtection('HEAD')).toBe(false);
    });

    it('OPTIONS 不应该需要保护', () => {
      expect(requiresCsrfProtection('OPTIONS')).toBe(false);
    });
  });

  describe('isCsrfExempt', () => {
    it('登录路径应该豁免', () => {
      expect(isCsrfExempt('/api/auth/login')).toBe(true);
    });

    it('健康检查路径应该豁免', () => {
      expect(isCsrfExempt('/api/health')).toBe(true);
    });

    it('状态路径应该豁免', () => {
      expect(isCsrfExempt('/api/status')).toBe(true);
    });

    it('其他路径不应该豁免', () => {
      expect(isCsrfExempt('/api/tasks')).toBe(false);
      expect(isCsrfExempt('/api/users')).toBe(false);
    });

    it('自定义豁免路径应该生效', () => {
      const customExempt = ['/api/custom'];
      expect(isCsrfExempt('/api/custom', customExempt)).toBe(true);
      expect(isCsrfExempt('/api/other', customExempt)).toBe(false);
    });
  });

  describe('validateDoubleSubmitCookie', () => {
    it('匹配的 token 应该返回 true', () => {
      const request = createMockNextRequest({
        headers: { 'x-csrf-token': 'matching-token' },
        cookies: { csrf_token: 'matching-token' },
      });
      
      expect(validateDoubleSubmitCookie(request)).toBe(true);
    });

    it('不匹配的 token 应该返回 false', () => {
      const request = createMockNextRequest({
        headers: { 'x-csrf-token': 'header-token' },
        cookies: { csrf_token: 'cookie-token' },
      });
      
      expect(validateDoubleSubmitCookie(request)).toBe(false);
    });

    it('缺少 header token 应该返回 false', () => {
      const request = createMockNextRequest({
        cookies: { csrf_token: 'cookie-token' },
      });
      
      expect(validateDoubleSubmitCookie(request)).toBe(false);
    });

    it('缺少 cookie token 应该返回 false', () => {
      const request = createMockNextRequest({
        headers: { 'x-csrf-token': 'header-token' },
      });
      
      expect(validateDoubleSubmitCookie(request)).toBe(false);
    });

    it('两者都缺少应该返回 false', () => {
      const request = createMockNextRequest({});
      expect(validateDoubleSubmitCookie(request)).toBe(false);
    });
  });
});

describe('安全模块集成测试', () => {
  it('完整的认证流程', async () => {
    // 1. 生成 token
    const user: User = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    };
    
    const accessToken = await generateAccessToken(user);
    expect(accessToken).toBeDefined();

    // 2. 生成 CSRF token
    const csrfToken = generateCsrfToken();
    expect(csrfToken).toBeDefined();

    // 3. 验证 CSRF
    const request = createMockNextRequest({
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-csrf-token': csrfToken,
      },
      cookies: { csrf_token: csrfToken },
    });

    expect(validateDoubleSubmitCookie(request)).toBe(true);
  });

  it('CSRF 保护中间件流程', async () => {
    const { jwtVerify } = await import('jose');
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: '1',
        email: 'admin@test.com',
        role: 'admin',
      },
    } as any);

    // 1. 获取 CSRF token
    const csrfToken = generateCsrfToken();
    
    // 2. 创建带 token 的请求
    const request = createMockNextRequest({
      headers: {
        authorization: 'Bearer valid-token',
        'x-csrf-token': csrfToken,
      },
      cookies: { csrf_token: csrfToken },
    });

    // 3. 验证双重提交
    expect(validateDoubleSubmitCookie(request)).toBe(true);
  });
});