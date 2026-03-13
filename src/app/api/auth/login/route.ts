/**
 * 登录 API - POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/security/auth';
import { generateCsrfToken, setCsrfTokenCookie } from '@/lib/security/csrf';
import { authLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
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
