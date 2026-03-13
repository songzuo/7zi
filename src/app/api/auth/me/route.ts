/**
 * 获取当前用户信息 API - GET /api/auth/me
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  extractToken,
} from '@/lib/security/auth';
import { authLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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
    authLogger.error('Get user error', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
