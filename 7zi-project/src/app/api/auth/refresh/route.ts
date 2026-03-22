/**
 * Refresh Token API endpoint
 * POST /api/auth/refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshToken } from '@/lib/auth/service';
import { RefreshTokenRequest } from '@/lib/auth/types';
import { logger } from '@/lib/logger';
import {
  createValidationError,
  createErrorResponse,
  createUnauthorizedError,
} from '@/lib/api/error-handler';
import { setAuthCookies, clearAuthCookies, createSuccessResponse } from '@/lib/api/utils';
import { verifyJwtToken } from '@/lib/auth/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const { refreshToken: refreshTokenValue }: RefreshTokenRequest = body;

    if (!refreshTokenValue) {
      return createValidationError('Refresh token is required');
    }

    // Validate refresh token format using JWT verification
    // First check basic length to avoid unnecessary JWT verification
    if (!refreshTokenValue || refreshTokenValue.length < 10) {
      return createValidationError('Invalid refresh token format');
    }

    // Verify JWT token structure to ensure it's a valid JWT
    const jwtVerification = await verifyJwtToken(refreshTokenValue);
    if (!jwtVerification) {
      return createUnauthorizedError('Invalid or expired refresh token');
    }

    // Refresh token
    const result = await refreshToken({ refreshToken: refreshTokenValue });

    if (!result.success) {
      // Clear auth cookies on failure
      const errorResponse = createUnauthorizedError(result.error || 'Token refresh failed');
      clearAuthCookies(errorResponse);
      return errorResponse;
    }

    // Create response with standardized format
    const response = createSuccessResponse({
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt?.toISOString(),
    });

    // Update secure cookies
    setAuthCookies(response, result.token, result.refreshToken, false);

    return response;
  } catch (error) {
    // Never log actual refresh token values - security risk
    logger.error('Refresh token API error', error, { category: 'auth' });
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
