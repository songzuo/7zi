/**
 * 登录 API - POST /api/auth/login
 * 演示如何使用认证中间件
 * 
 * @example
 * 使用速率限制:
 * export const POST = withRateLimit()(handleLogin);
 * 
 * 使用自定义认证:
 * export const POST = withAuth({ rateLimit: { windowMs: 60000, maxRequests: 5 } })(handleLogin);
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/security/auth';
import { generateCsrfToken, setCsrfTokenCookie } from '@/lib/security/csrf';
import { authLogger } from '@/lib/logger';
import { rateLimit, validationError } from '@/lib/middleware';

// 速率限制: 5次/分钟 (防止暴力破解)
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 5,
  message: 'Too many login attempts, please try again later',
};

// 登录处理函数
async function handleLogin(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 输入验证
    if (!email || !password) {
      return validationError('Email and password are required', 'credentials', request);
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

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        csrfToken,
      });

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
    return NextResponse.json(
      { error: 'Invalid email or password', code: 'AUTH_INVALID' },
      { status: 401 }
    );
  } catch (error) {
    authLogger.error('Login error', error);
    return NextResponse.json(
      { error: 'Login failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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
