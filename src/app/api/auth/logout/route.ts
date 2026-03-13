/**
 * 登出 API - POST/DELETE /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  extractToken,
  clearAuthCookies,
} from '@/lib/security/auth';
import { authLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function DELETE(request: NextRequest) {
  return handleLogout(request);
}

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
