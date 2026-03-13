/**
 * 认证 API
 * 处理用户登录、登出、令牌刷新
 */

import { NextRequest, NextResponse } from 'next/server';
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
import { authLogger } from '@/lib/logger';
import {
  withErrorHandler,
  validationError,
  authError,
  successResponse,
  serverError,
} from '@/lib/middleware';

// ============================================
// GET /api/auth - 处理各种查询操作
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // 获取 CSRF Token
  if (action === 'csrf') {
    const csrfToken = generateCsrfToken();
    const response = NextResponse.json({
      success: true,
      csrfToken,
    });

    const headers = setCsrfTokenCookie(csrfToken);
    headers.forEach((value, key) => {
      response.headers.append(key, value);
    });

    return response;
  }

  // 检查 JWT_SECRET 强度
  if (action === 'check-secret') {
    const jwtSecret = process.env.JWT_SECRET || '';
    const validation = validateJwtSecret(jwtSecret);

    return NextResponse.json({
      success: true,
      secretStrength: validation,
      isDefault: jwtSecret === 'change-me-to-a-secure-random-string-min-32-chars',
    });
  }

  // 获取当前用户信息
  if (action === 'me') {
    const token = extractToken(request);

    if (!token) {
      return authError('Not authenticated', request);
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return authError('Invalid or expired token', request);
    }

    return successResponse({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        permissions: payload.permissions,
      },
    });
  }

  // 默认响应
  return NextResponse.json({
    message: 'Auth API',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'POST /api/auth/refresh',
      'GET /api/auth?action=me',
      'GET /api/auth?action=csrf',
      'GET /api/auth?action=check-secret',
    ],
  });
});

// ============================================
// POST /api/auth - 登录或登出
// ============================================

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // 用户登录
  if (action === 'login' || !action) {
    return handleLogin(request);
  }

  // 刷新令牌
  if (action === 'refresh') {
    return handleRefresh(request);
  }

  // 用户登出
  if (action === 'logout') {
    return handleLogout(request);
  }

  return validationError('Invalid action', 'action', request);
});

// ============================================
// DELETE /api/auth - 用户登出
// ============================================

export const DELETE = withErrorHandler(handleLogout);

// ============================================
// 处理登录
// ============================================

async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 输入验证
    if (!email || !password) {
      return validationError('Email and password are required', 'credentials', request);
    }

    // 模拟用户验证 (开发环境)
    if (email === 'admin@7zi.studio' && password === 'admin123') {
      const user = {
        id: 'user-admin-001',
        email: email,
        name: 'Administrator',
        role: 'admin' as const,
        permissions: ['read', 'write', 'delete', 'admin'],
      };

      // 生成令牌
      const accessToken = await generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user);

      // 生成 CSRF Token
      const csrfToken = generateCsrfToken();

      // 创建响应
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

      // 设置认证 Cookie
      const authHeaders = setAuthCookies(accessToken, refreshToken);
      authHeaders.forEach((value, key) => {
        response.headers.append(key, value);
      });

      // 设置 CSRF Cookie
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
    return authError('Invalid email or password', request);
  } catch (error) {
    authLogger.error('Login error', error);
    return serverError('Login failed', request);
  }
}

// ============================================
// 处理登出
// ============================================

async function handleLogout(request: NextRequest) {
  try {
    const token = extractToken(request);
    
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        authLogger.info('User logged out', {
          userId: payload.sub,
          email: payload.email,
        });
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // 清除认证 Cookie
    const headers = clearAuthCookies();
    headers.forEach((value, key) => {
      response.headers.append(key, value);
    });

    return response;
  } catch (error) {
    authLogger.error('Logout error', error);
    return serverError('Logout failed', request);
  }
}

// ============================================
// 处理令牌刷新
// ============================================

async function handleRefresh(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return authError('Refresh token required', request);
    }

    const payload = await verifyToken(refreshToken);

    if (!payload) {
      return authError('Invalid or expired refresh token', request);
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions,
    };

    // 生成新的访问令牌
    const accessToken = await generateAccessToken(user);

    const response = NextResponse.json({
      success: true,
      accessToken,
    });

    // 设置新的访问令牌 Cookie
    const headers = setAuthCookies(accessToken, refreshToken);
    headers.forEach((value, key) => {
      response.headers.append(key, value);
    });

    return response;
  } catch (error) {
    authLogger.error('Token refresh error', error);
    return serverError('Token refresh failed', request);
  }
}
