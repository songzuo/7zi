/**
 * CSRF Token 生成端点
 *
 * 安全目的：为表单提供 CSRF 保护
 * 生成随机 token 并存储在 httpOnly cookie 中
 *
 * @refactored - Added validation and improved error handling
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { createErrorResponse, ErrorType } from '@/lib/api/error-handler';
import { csrfTokenSchema, validateBody } from '@/lib/api/validation';
import { logger } from '@/lib/logger';

interface CsrfTokenResponse {
  success: true;
  data: {
    csrfToken: string;
    expiresAt: string;
  };
  timestamp: string;
}

const TOKEN_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Generate a secure CSRF token
 */
function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate token expiry timestamp
 */
function calculateExpiry(): string {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + TOKEN_EXPIRY_SECONDS);
  return expiresAt.toISOString();
}

/**
 * GET /api/csrf-token
 * Generate and return a new CSRF token
 */
export async function GET() {
  try {
    // Generate CSRF token
    const csrfToken = generateCsrfToken();

    // Set httpOnly cookie
    const cookieStore = await cookies();

    cookieStore.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: TOKEN_EXPIRY_SECONDS,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        csrfToken,
        expiresAt: calculateExpiry(),
      },
      timestamp: new Date().toISOString(),
    } as CsrfTokenResponse);

  } catch (error) {
    logger.error('CSRF token generation error', error);

    if (error instanceof Error && error.message.includes('Cookie')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.INTERNAL,
            message: 'Failed to set CSRF cookie',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * POST /api/csrf-token
 * Validate a CSRF token (for double-submit cookie pattern)
 */
export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();

    // Validate CSRF token format
    const validation = validateBody(body, csrfTokenSchema);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION,
            message: 'Invalid CSRF token format',
            details: { errors: validation.success ? [] : ['Token must be a 64-character hexadecimal string'] },
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Get cookie
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('csrf_token');

    if (!cookieToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.VALIDATION,
            message: 'CSRF token cookie not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate tokens match
    if (cookieToken.value !== validation.data.csrfToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: ErrorType.FORBIDDEN,
            message: 'CSRF token validation failed',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Token is valid
    return NextResponse.json({
      success: true,
      data: { valid: true },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('CSRF token validation error', error);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
