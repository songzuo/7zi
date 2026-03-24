/**
 * Login API endpoint (Unified Error Handling)
 * POST /api/auth/login
 *
 * 使用统一的错误处理系统
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/service-unified';
import { logger } from '@/lib/logger';
import {
  createUnifiedErrorResponse,
  createUnifiedSuccessResponse,
  createValidationErrorResponse,
  withUnifiedErrorHandling,
} from '@/lib/errors/index';
import { validateEmail, setAuthCookies } from '@/lib/api/utils';
import { logRequestStart, logRequestComplete, logRequestError, logAuthError, sanitizeUrlForLogging } from '@/lib/api/api-logger';

/**
 * Login endpoint
 *
 * @example
 * POST /api/auth/login
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123",
 *   "rememberMe": false
 * }
 *
 * @response 200 - Login successful
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... },
 *     "token": "...",
 *     "refreshToken": "...",
 *     "expiresAt": "2024-01-01T00:00:00Z"
 *   },
 *   "timestamp": "2024-01-01T00:00:00Z"
 * }
 *
 * @response 400 - Validation error
 * {
 *   "success": false,
 *   "error": {
 *     "type": "VALIDATION_ERROR",
 *     "message": "Email and password are required",
 *     "retryable": false,
 *     "timestamp": "2024-01-01T00:00:00Z"
 *   }
 * }
 *
 * @response 401 - Unauthorized
 * {
 *   "success": false,
 *   "error": {
 *     "type": "UNAUTHORIZED",
 *     "message": "Invalid email or password",
 *     "retryable": false,
 *     "timestamp": "2024-01-01T00:00:00Z"
 *   }
 * }
 */
export const POST = withUnifiedErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  const metadata = logRequestStart(request);
  const sanitizedUrl = sanitizeUrlForLogging(request.url);

  try {
    const body = await request.json();

    // Validate request body
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      const response = createValidationErrorResponse('Email and password are required');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Validate email format
    if (!validateEmail(email)) {
      const response = createValidationErrorResponse('Invalid email format');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Login user (现在抛出 UnifiedAppError 而不是返回 { success, error })
    const result = await loginUser({ email, password, rememberMe });

    // Create response with standardized format
    const response = createUnifiedSuccessResponse({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt.toISOString(),
    });

    // Set secure cookies for auth tokens
    setAuthCookies(response, result.token, result.refreshToken, rememberMe);

    logger.auth('User logged in successfully', {
      requestId: metadata.requestId,
      userId: result.user?.id,
      email: result.user?.email,
      // Never log tokens in logs
    });

    logRequestComplete(metadata, response, startTime);
    return response;
  } catch (error) {
    // 记录认证错误
    logAuthError(metadata, 'authentication', error instanceof Error ? error.message : 'Login failed');

    // 错误会被 withUnifiedErrorHandling 捕获并转换为统一响应
    throw error;
  }
});
