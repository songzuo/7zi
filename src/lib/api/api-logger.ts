/**
 * @fileoverview API Request Logger Middleware
 * @description Middleware for logging all API requests with request ID tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request metadata interface
 */
export interface RequestMetadata {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string | undefined {
  if (!request?.headers) {
    return undefined;
  }
  return request.headers.get('user-agent') || undefined;
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: NextRequest): string | undefined {
  if (!request?.headers) {
    return undefined;
  }

  // Check various headers for the client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return undefined;
}

/**
 * Create request metadata
 */
export function createRequestMetadata(request: NextRequest): RequestMetadata {
  return {
    requestId: generateRequestId(),
    method: request?.method || 'UNKNOWN',
    url: request?.url || 'unknown',
    userAgent: getUserAgent(request),
    ip: getClientIp(request),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log API request start
 */
export function logRequestStart(request: NextRequest): RequestMetadata {
  const metadata = createRequestMetadata(request);

  logger.api('Request started', {
    requestId: metadata.requestId,
    method: metadata.method,
    url: metadata.url,
    userAgent: metadata.userAgent,
    ip: metadata.ip,
  });

  return metadata;
}

/**
 * Log API request completion
 */
export function logRequestComplete(
  metadata: RequestMetadata,
  response: NextResponse,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  const statusCode = response.status;

  const logLevel: 'info' | 'warn' | 'error' =
    statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger.api('Request completed', {
    requestId: metadata.requestId,
    method: metadata.method,
    url: metadata.url,
    statusCode,
    duration,
    durationMs: duration,
  }, logLevel);

  // Log slow requests (阈值降低到 500ms)
  if (duration > 500) {
    logger.warn('Slow request detected', {
      requestId: metadata.requestId,
      method: metadata.method,
      url: metadata.url,
      duration,
      statusCode,
    });
  }

  // Log critical slow requests
  if (duration > 2000) {
    logger.error('Critical slow request detected', {
      requestId: metadata.requestId,
      method: metadata.method,
      url: metadata.url,
      duration,
      statusCode,
    });
  }
}

/**
 * Log API request error
 */
export function logRequestError(
  metadata: RequestMetadata,
  error: Error | unknown,
  startTime: number
): void {
  const duration = Date.now() - startTime;

  logger.error('Request failed', error, {
    requestId: metadata.requestId,
    method: metadata.method,
    url: metadata.url,
    duration,
    durationMs: duration,
  });
}

/**
 * Wrapper function to add logging to API route handlers
 */
export function withApiLogging<T extends (...args: unknown[]) => Promise<NextResponse<unknown>>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    const metadata = logRequestStart(request);

    try {
      const response = await handler(...(args as Parameters<T>));
      logRequestComplete(metadata, response, startTime);
      return response;
    } catch (error) {
      logRequestError(metadata, error, startTime);
      throw error;
    }
  }) as unknown as T;
}

/**
 * Set request ID in logger context
 */
export function setRequestIdContext(requestId: string): void {
  logger.setContext({ requestId });
}

/**
 * Create a logger child with request ID context
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

/**
 * Extract path from URL (for cleaner logs)
 */
export function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Sanitize URL for logging (remove query params that might contain sensitive data)
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'password', 'api_key', 'secret', 'code'];

    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Log API validation error
 */
export function logValidationError(
  metadata: RequestMetadata,
  validationError: Record<string, string>
): void {
  logger.warn('Request validation failed', {
    requestId: metadata.requestId,
    method: metadata.method,
    url: metadata.url,
    validationErrors: validationError,
  });
}

/**
 * Log API authentication/authorization error
 */
export function logAuthError(
  metadata: RequestMetadata,
  errorType: 'authentication' | 'authorization',
  reason: string
): void {
  logger.security(`${errorType} failed`, {
    requestId: metadata.requestId,
    method: metadata.method,
    url: metadata.url,
    reason,
  });
}
