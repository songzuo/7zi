/**
 * Login API endpoint
 * POST /api/auth/login
 *
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns an access token with optional refresh token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             standard:
 *               summary: Standard login
 *               value:
 *                 email: user@example.com
 *                 password: SecurePass123
 *                 rememberMe: false
 *             rememberMe:
 *               summary: Login with remember me
 *               value:
 *                 email: user@example.com
 *                 password: SecurePass123
 *                 rememberMe: true
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error (missing fields or invalid email)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Email and password are required
 *               invalidEmail:
 *                 summary: Invalid email format
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Invalid email format
 *       401:
 *         description: Authentication failed (wrong credentials)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: AUTH_FAILED
 *                 message: Invalid email or password
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: INTERNAL_ERROR
 *                 message: An error occurred during login
 *
 * @openapi components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 1
 *           description: User password
 *           example: SecurePass123
 *         rememberMe:
 *           type: boolean
 *           description: Whether to issue a long-lived refresh token
 *           default: false
 *     LoginResponse:
 *       type: object
 *       required:
 *         - success
 *         - user
 *         - token
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 *           description: JWT access token
 *         refreshToken:
 *           type: string
 *           nullable: true
 *           description: Refresh token (only if rememberMe is true)
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Token expiration timestamp
 */

import { NextRequest } from 'next/server';
import { loginUser } from '@/lib/auth/service';
import { LoginRequest } from '@/lib/auth/types';
import { logger } from '@/lib/logger';
import {
  createValidationError,
  createUnauthorizedError,
  createErrorResponse,
} from '@/lib/api/error-handler';
import { validateEmail, setAuthCookies, createSuccessResponse } from '@/lib/api/utils';
import { logRequestStart, logRequestComplete, logRequestError, logAuthError, sanitizeUrlForLogging } from '@/lib/api/api-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const metadata = logRequestStart(request);
  const sanitizedUrl = sanitizeUrlForLogging(request.url);

  try {
    const body = await request.json();

    // Validate request body
    const { email, password, rememberMe }: LoginRequest = body;

    if (!email || !password) {
      const response = await createValidationError('Email and password are required');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Validate email format
    if (!validateEmail(email)) {
      const response = await createValidationError('Invalid email format');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Login user
    const result = await loginUser({ email, password, rememberMe });

    if (!result.success) {
      logAuthError(metadata, 'authentication', result.error || 'Login failed');
      const response = await createUnauthorizedError(result.error || 'Login failed');
      logRequestComplete(metadata, response, startTime);
      return response;
    }

    // Create response with standardized format
    const response = createSuccessResponse({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt?.toISOString(),
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
    logRequestError(metadata, error, startTime);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
