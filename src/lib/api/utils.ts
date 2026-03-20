/**
 * @fileoverview API Utilities
 * @description Shared utility functions for API routes - validation, cookies, response formatting
 */

import { NextResponse } from 'next/server';
import { ErrorType } from './error-handler';

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password strength requirements
 */
export interface PasswordStrengthResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Auth cookie options
 */
interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Default cookie options based on environment
 */
function getDefaultCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  };
}

/**
 * Set authentication cookies on a response
 *
 * @param response - The NextResponse object
 * @param token - Access token (JWT)
 * @param refreshToken - Refresh token (optional)
 * @param rememberMe - Whether to use long-lived refresh token
 */
export function setAuthCookies(
  response: NextResponse,
  token: string,
  refreshToken?: string,
  rememberMe: boolean = false
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Set access token cookie (1 hour)
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/',
  });

  // Set refresh token cookie if provided
  if (refreshToken) {
    const refreshMaxAge = rememberMe ? 86400 * 7 : 3600 * 2; // 7 days if rememberMe, else 2 hours
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: refreshMaxAge,
      path: '/',
    });
  }
}

/**
 * Clear authentication cookies from a response
 *
 * @param response - The NextResponse object
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete('auth_token');
  response.cookies.delete('refresh_token');
}

/**
 * Standard success response format
 *
 * @param data - The response data
 * @param statusCode - HTTP status code (default: 200)
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<{ success: true; data: T; timestamp: string }> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create success response with pagination metadata
 *
 * @param data - The response data array
 * @param pagination - Pagination metadata
 * @param statusCode - HTTP status code (default: 200)
 */
export function createPaginatedSuccessResponse<T>(
  data: T[],
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages?: number;
  },
  statusCode: number = 200
): NextResponse<{
  success: true;
  data: { items: T[]; pagination: typeof pagination };
  timestamp: string;
}> {
  const total_pages = pagination.total_pages ?? Math.ceil(pagination.total / pagination.per_page);

  return NextResponse.json(
    {
      success: true,
      data: {
        items: data,
        pagination: { ...pagination, total_pages },
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Parse pagination parameters from request URL
 *
 * @param url - The request URL
 * @param defaultPerPage - Default items per page (default: 20)
 * @param maxPerPage - Maximum items per page (default: 100)
 */
export function parsePaginationParams(
  url: URL,
  defaultPerPage: number = 20,
  maxPerPage: number = 100
): { page: number; per_page: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const per_page = Math.min(
    maxPerPage,
    Math.max(1, parseInt(url.searchParams.get('per_page') || defaultPerPage.toString(), 10))
  );

  return { page, per_page };
}

/**
 * Create a simple success response (no data wrapper)
 * Use sparingly - prefer createSuccessResponse for consistency
 *
 * @param statusCode - HTTP status code (default: 200)
 */
export function createSimpleSuccessResponse(
  statusCode: number = 200
): NextResponse<{ success: true; timestamp: string }> {
  return NextResponse.json(
    {
      success: true,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
