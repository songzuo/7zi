/**
 * 登录 API - POST /api/auth/login
 * 用户认证端点，包含速率限制
 * 
 * @example
 * POST /api/auth/login
 * {
 *   "email": "admin@example.com",
 *   "password": "your-password"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/security/auth';
import { generateCsrfToken, setCsrfTokenCookie } from '@/lib/security/csrf';
import { authLogger } from '@/lib/logger';
import { rateLimit } from '@/lib/middleware';
import {
  badRequest,
  unauthorized,
  handleApiRequest,
  success,
} from '@/lib/api-error';

// 速率限制: 5次/分钟 (防止暴力破解)
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 5,
  message: 'Too many login attempts, please try again later',
};

// 登录处理函数
const handleLogin = handleApiRequest(async (request: NextRequest): Promise<Response> => {
  const body = await request.json();
  const { email, password } = body;

  // 输入验证
  if (!email || !password) {
    return badRequest('邮箱和密码都是必填字段', { fields: ['email', 'password'] }, request);
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return badRequest('邮箱和密码必须是字符串', { fields: ['email', 'password'] }, request);
  }

  // 从环境变量获取管理员凭据
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
  
  // 验证用户
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const user = {
      id: 'user-admin-001',
      email: email,
      name: 'Administrator',
      role: 'admin' as const,
      permissions: ['read', 'write', 'delete', 'admin'],
    };

    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    const csrfToken = generateCsrfToken();

    const response = success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      csrfToken,
    }, request);

    const authHeaders = setAuthCookies(accessToken, refreshToken);
    authHeaders.forEach((value, key) => {
      response.headers.append(key, value);
    });

    const csrfHeaders = setCsrfTokenCookie(csrfToken);
    csrfHeaders.forEach((value, key) => {
      response.headers.append(key, value);
    });

    authLogger.info('User logged in', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return response;
  }

  // 验证失败
  authLogger.warn('Login failed - invalid credentials', { email });
  return unauthorized('邮箱或密码错误', request);
});

// 应用速率限制的 POST 处理器
const rateLimitMiddleware = rateLimit(RATE_LIMIT_CONFIG);

export async function POST(request: NextRequest): Promise<Response> {
  // 先应用速率限制
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // 然后处理登录
  return handleLogin(request);
}
