/**
 * @fileoverview Structured Error Logger for API Routes
 * @description Centralized error logging with context tracking for API routes
 *
 * Features:
 * - Structured error logging with contextual metadata
 * - Request tracking via request IDs
 * - Automatic severity classification
 * - Integration with external monitoring (Sentry, DataDog)
 * - Performance metrics tracking
 *
 * @example
 * import { logApiError, logApiSuccess } from '@/lib/api/error-logger';
 *
 * logApiError(error, {
 *   requestId: 'abc-123',
 *   userId: 'user-456',
 *   path: '/api/users',
 *   method: 'GET',
 * });
 */

import { logger } from '../logger';
import { ErrorType } from './error-handler';
import { getRetryInfo } from './retry-decorator';

/**
 * Context information for API error logging
 */
export interface ErrorLogContext {
  /** Unique request identifier */
  requestId?: string;
  /** User identifier (if authenticated) */
  userId?: string;
  /** Client IP address */
  ip?: string;
  /** Request path/endpoint */
  path?: string;
  /** HTTP method */
  method?: string;
  /** User agent string */
  userAgent?: string;
  /** Request duration in milliseconds */
  duration?: number;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Structured error log data
 */
export interface ErrorLogData {
  /** Error type from ErrorType enum or custom string */
  type: ErrorType | string;
  /** Error message */
  message: string;
  /** Error stack trace (development only) */
  stack?: string;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Retry information (if retry was attempted) */
  retryInfo?: { attempts: number; config: Record<string, unknown> };
  /** Request context */
  context: ErrorLogContext;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * API success log data
 */
export interface SuccessLogData extends ErrorLogContext {
  /** HTTP status code */
  statusCode: number;
  /** Response size in bytes (if available) */
  responseSize?: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Determine log severity based on error status code
 *
 * @param statusCode - HTTP status code
 * @returns Log severity level
 */
function getSeverityForStatusCode(statusCode: number): 'error' | 'warn' | 'info' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Determine log severity based on error type
 *
 * @param errorType - Error type enum value
 * @returns Log severity level
 */
function getSeverityForErrorType(errorType: ErrorType): 'error' | 'warn' | 'info' {
  switch (errorType) {
    case ErrorType.INTERNAL:
    case ErrorType.SERVICE_UNAVAILABLE:
      return 'error';
    case ErrorType.VALIDATION:
    case ErrorType.BAD_REQUEST:
    case ErrorType.NOT_FOUND:
    case ErrorType.UNAUTHORIZED:
    case ErrorType.FORBIDDEN:
      return 'warn';
    default:
      return 'error';
  }
}

/**
 * Extract status code from error
 *
 * @param error - Error object
 * @returns Status code or undefined
 */
function extractStatusCode(error: Error): number | undefined {
  return (error as any).statusCode || (error as any).status;
}

/**
 * Extract error type from error
 *
 * @param error - Error object
 * @returns Error type or 'UNKNOWN'
 */
function extractErrorType(error: Error): ErrorType | string {
  return (error as any).type || (error as any).code || 'UNKNOWN';
}

/**
 * Sanitize sensitive data from error logs
 *
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
function sanitizeSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Log API error with structured context
 *
 * @param error - The error to log
 * @param context - Request and context information
 * @param isDevelopment - Whether we're in development mode
 *
 * @example
 * try {
 *   // API logic
 * } catch (error) {
 *   logApiError(error, {
 *     requestId: request.headers.get('x-request-id'),
 *     ip: request.headers.get('x-forwarded-for'),
 *     path: request.nextUrl.pathname,
 *     method: request.method,
 *   });
 *   throw error;
 * }
 */
export function logApiError(
  error: Error,
  context: ErrorLogContext,
  isDevelopment: boolean = process.env.NODE_ENV === 'development'
): void {
  const timestamp = new Date().toISOString();
  const statusCode = extractStatusCode(error);
  const errorType = extractErrorType(error);

  // Extract retry information if available
  const retryInfo = getRetryInfo(error);

  // Build structured error data
  const errorData: ErrorLogData = {
    type: errorType,
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    statusCode,
    retryInfo: retryInfo ? {
      attempts: retryInfo.attempts,
      config: retryInfo.config,
    } : undefined,
    context: {
      ...context,
      metadata: context.metadata ? sanitizeSensitiveData(context.metadata) : undefined,
    },
    timestamp,
  };

  // Determine severity
  const severity = statusCode
    ? getSeverityForStatusCode(statusCode)
    : getSeverityForErrorType(errorType as ErrorType);

  // Log with appropriate severity level
  if (severity === 'error') {
    logger.error('API Server Error', error, errorData);
  } else if (severity === 'warn') {
    logger.warn('API Client Error', errorData);
  } else {
    logger.info('API Error', errorData);
  }

  // Send to external monitoring if configured
  sendToExternalMonitoring(error, errorData);
}

/**
 * Log API success with context
 *
 * @param context - Request and context information
 * @param statusCode - HTTP status code (default: 200)
 *
 * @example
 * const response = await createSuccessResponse(data);
 * logApiSuccess({
 *   requestId: request.headers.get('x-request-id'),
 *   path: request.nextUrl.pathname,
 *   method: request.method,
 *   duration: Date.now() - startTime,
 * }, response.status);
 */
export function logApiSuccess(
  context: ErrorLogContext,
  statusCode: number = 200
): void {
  const successData: SuccessLogData = {
    ...context,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  logger.info('API Success', successData);
}

/**
 * Create a context object from NextRequest
 *
 * @param request - Next.js request object
 * @param additionalContext - Additional context to add
 * @returns Error log context
 *
 * @example
 * import { createApiContext } from '@/lib/api/error-logger';
 *
 * export async function GET(request: NextRequest) {
 *   const context = createApiContext(request);
 *   try {
 *     // ...
 *   } catch (error) {
 *     logApiError(error, context);
 *   }
 * }
 */
export function createApiContext(
  request: Request,
  additionalContext?: Partial<ErrorLogContext>
): ErrorLogContext {
  const url = new URL(request.url);

  return {
    requestId: (request.headers as Headers).get('x-request-id') || undefined,
    ip: (request.headers as Headers).get('x-forwarded-for') ||
        (request.headers as Headers).get('x-real-ip') ||
        undefined,
    path: url.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ...additionalContext,
  };
}

/**
 * Extract user ID from request headers or body
 *
 * @param request - Next.js request object
 * @returns User ID or undefined
 */
export function extractUserId(request: Request): string | undefined {
  const headers = request.headers as Headers;
  return headers.get('x-user-id') || headers.get('user-id') || undefined;
}

/**
 * Calculate request duration
 *
 * @param startTime - Start time in milliseconds (from Date.now())
 * @returns Duration in milliseconds
 */
export function calculateDuration(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Send error to external monitoring (Sentry, DataDog, etc.)
 * This is a placeholder for external monitoring integration
 *
 * @param error - The error object
 * @param errorData - Structured error data
 */
function sendToExternalMonitoring(error: Error, errorData: ErrorLogData): void {
  // Sentry integration (placeholder)
  if (typeof window === 'undefined' && process.env.SENTRY_DSN) {
    // In a real implementation, you would do:
    // Sentry.captureException(error, {
    //   tags: {
    //     errorType: errorData.type,
    //     statusCode: errorData.statusCode,
    //     path: errorData.context.path,
    //   },
    //   extra: {
    //     requestId: errorData.context.requestId,
    //     userId: errorData.context.userId,
    //     duration: errorData.context.duration,
    //   },
    //   level: errorData.statusCode && errorData.statusCode >= 500 ? 'error' : 'warning',
    // });
    logger.debug('Error would be sent to Sentry', { sentryDsn: process.env.SENTRY_DSN });
  }

  // DataDog integration (placeholder)
  if (process.env.DATADOG_API_KEY) {
    // In a real implementation, you would do:
    // dogstatsd.increment('api.errors', {
    //   error_type: errorData.type,
    //   status_code: errorData.statusCode,
    //   path: errorData.context.path,
    // });
    logger.debug('Error would be sent to DataDog');
  }
}

/**
 * Create a performance logger for API routes
 * Returns an object with methods to log performance metrics
 *
 * @returns Performance logger instance
 *
 * @example
 * const perf = createPerformanceLogger(request, startTime);
 * const result = await someOperation();
 * perf.logSuccess();
 */
export function createPerformanceLogger(
  request: Request,
  startTime: number
): {
  logSuccess: (statusCode?: number, responseSize?: number) => void;
  logError: (error: Error) => void;
  getDuration: () => number;
} {
  const context = createApiContext(request);

  return {
    logSuccess: (statusCode = 200, responseSize?: number) => {
      logApiSuccess(
        {
          ...context,
          duration: calculateDuration(startTime),
        },
        statusCode
      );

      // Log performance metrics
      const duration = calculateDuration(startTime);
      logger.info('API Performance', {
        path: context.path,
        method: context.method,
        duration,
        statusCode,
        responseSize,
      });
    },

    logError: (error: Error) => {
      logApiError(error, {
        ...context,
        duration: calculateDuration(startTime),
      });
    },

    getDuration: () => calculateDuration(startTime),
  };
}

/**
 * Aggregate error statistics for monitoring
 * This can be used to track error rates and patterns
 */
export class ErrorStatistics {
  private stats: Map<string, { count: number; lastSeen: number }> = new Map();
  private windowMs: number;

  constructor(windowMs: number = 60000) {
    // Default: 1 minute window
    this.windowMs = windowMs;
  }

  /**
   * Record an error occurrence
   */
  record(errorType: string, path?: string): void {
    const key = path ? `${errorType}:${path}` : errorType;
    const existing = this.stats.get(key) || { count: 0, lastSeen: 0 };

    existing.count++;
    existing.lastSeen = Date.now();
    this.stats.set(key, existing);
  }

  /**
   * Get error count for a specific error type
   */
  getCount(errorType: string, path?: string): number {
    const key = path ? `${errorType}:${path}` : errorType;
    return this.stats.get(key)?.count || 0;
  }

  /**
   * Get all error statistics
   */
  getAll(): Record<string, { count: number; lastSeen: number }> {
    return Object.fromEntries(this.stats);
  }

  /**
   * Reset statistics (call this periodically)
   */
  reset(): void {
    this.stats.clear();
  }

  /**
   * Get error types with high frequency (potential issues)
   */
  getHighFrequencyErrors(threshold: number = 10): Array<{ key: string; count: number; lastSeen: number }> {
    return Array.from(this.stats.entries())
      .filter(([_, stats]) => stats.count >= threshold)
      .map(([key, stats]) => ({ key, ...stats }))
      .sort((a, b) => b.count - a.count);
  }
}

// Global error statistics instance
export const globalErrorStats = new ErrorStatistics();
