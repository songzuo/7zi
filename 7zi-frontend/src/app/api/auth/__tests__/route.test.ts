/**
 * Auth API Route Tests
 *
 * 测试认证相关 API 端点：
 * - POST /api/auth (登录)
 * - PUT /api/auth (注册)
 * - PATCH /api/auth (重置密码)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, PUT, PATCH } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/audit/logger', () => ({
  AuditLogger: {
    logAuthEvent: vi.fn().mockResolvedValue(undefined),
    logRegistration: vi.fn().mockResolvedValue(undefined),
    logPasswordReset: vi.fn().mockResolvedValue(undefined),
    logApiAccess: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/rate-limit/limiter', () => ({
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

// Import mocked modules after vi.mock
import { AuditLogger } from '@/lib/audit/logger';

describe('Auth API - POST /api/auth (登录)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('应该成功登录有效凭据', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('登录成功');
    expect(data.user).toEqual({
      id: 'user-123',
      username: 'admin',
      email: 'admin@example.com',
    });
  });

  it('应该拒绝无效凭据', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('用户名或密码错误');
  });

  it('应该拒绝缺少用户名的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
  });

  it('应该拒绝缺少密码的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
  });

  it('应该处理无效的 JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('Auth API - PUT /api/auth (注册)', () => {
  it('应该成功注册新用户', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('注册成功');
  });

  it('应该拒绝无效的邮箱格式', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
  });

  it('应该拒绝弱密码', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('应该拒绝缺少必填字段的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'testuser',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('Auth API - PATCH /api/auth (重置密码)', () => {
  it('应该成功重置密码', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PATCH',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('密码重置成功');
  });

  it('应该拒绝缺少 token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PATCH',
      body: JSON.stringify({
        password: 'NewPassword123!',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('应该拒绝缺少新密码', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PATCH',
      body: JSON.stringify({
        token: 'valid-token',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
