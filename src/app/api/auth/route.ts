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
  generateSecureSecret,
} from '@/lib/security/auth';
import { generateCsrfToken, setCsrfTokenCookie } from '@/lib/security/csrf';
import { authLogger } from '@/lib/logger';

// ============================================
// POST /api/auth/login - 用户登录
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 输入验证
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // TODO: 实际的密码验证逻辑
    // 这里应该查询数据库验证用户凭据
    // 示例：const user = await db.users.findByEmail(email);
    // if (!user || !await verifyPassword(password, user.passwordHash)) { ... }

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
    return NextResponse.json(
      { error: 'Invalid email or password' },
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

// ============================================
// POST /api/auth/logout - 用户登出
// ============================================

export async function logout(request: NextRequest) {
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
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// 支持 DELETE 方法登出
export async function DELETE(request: NextRequest) {
  return logout(request);
}

// ============================================
// POST /api/auth/refresh - 刷新令牌
// ============================================

export async function refresh(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(refreshToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
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
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/auth/me - 获取当前用户信息
// ============================================

export async function me(request: NextRequest) {
  try {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        permissions: payload.permissions,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/auth/csrf - 获取 CSRF Token
// ============================================

export async function GET(request: NextRequest) {
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

  // 默认响应
  return NextResponse.json({
    message: 'Auth API',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'POST /api/auth/refresh',
      'GET /api/auth/me',
      'GET /api/auth/csrf?action=csrf',
      'GET /api/auth/check-secret?action=check-secret',
    ],
  });
}
