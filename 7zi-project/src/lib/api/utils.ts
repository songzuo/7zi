/**
 * API Utility Functions
 * API 工具函数
 */

import { NextResponse } from 'next/server';
import { createSuccessResponse as baseSuccessResponse } from './error-handler';

// ============================================================================
// Re-export from error-handler
// ============================================================================

export {
  createSuccessResponse,
  createErrorResponseJson,
  createBadRequestError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  createConflictError,
  createInternalServerError,
  createServiceUnavailableError,
} from './error-handler';

// ============================================================================
// Types
// ============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface SuccessResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// Pagination Helpers
// ============================================================================

/**
 * Parse pagination options from request
 */
export function parsePaginationOptions(
  searchParams: URLSearchParams
): Required<PaginationOptions> {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
  );
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  return { page, limit, sortBy, sortOrder };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginatedResponse<unknown>['pagination'] {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): NextResponse<PaginatedResponse<T>> {
  const { page = 1, limit = 20 } = options;
  const pagination = calculatePagination(total, page, limit);

  return NextResponse.json({
    data,
    pagination,
  });
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a success response with options
 */
export function createSuccessResponseWithOptions<T>(
  data: T,
  options: SuccessResponseOptions = {}
): NextResponse {
  const { status = 200, headers } = options;

  const response = baseSuccessResponse(data, status);

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Parse JSON body safely
 */
export async function safeJsonParse<T = unknown>(
  request: Request,
  defaultValue?: T
): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) {
      return defaultValue ?? null;
    }
    return JSON.parse(text) as T;
  } catch {
    return defaultValue ?? null;
  }
}

/**
 * Get client IP address
 */
export function getClientIp(request: Request): string {
  // Try X-Forwarded-For header first (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Try CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  return 'unknown';
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: (keyof T)[] } {
  const missing: (keyof T)[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Parse ISO date string safely
 */
export function parseIsoDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format date for API responses
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString();
}

// ============================================================================
// String Helpers
// ============================================================================

/**
 * Truncate string to max length
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
