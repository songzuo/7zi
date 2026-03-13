/**
 * 刷新令牌 API - POST /api/auth/refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  verifyToken,
  setAuthCookies,
} from '@/lib/security/auth';
import { authLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
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

    const accessToken = await generateAccessToken(user);

    const response = NextResponse.json({
      success: true,
      accessToken,
    });

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
