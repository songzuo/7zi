/**
 * Combined Security Middleware
 *
 * Combines all security middleware into a single, easy-to-use wrapper:
 * - Rate limiting
 * - Input sanitization
 * - CORS
 * - Security headers (Helmet.js equivalent)
 * - Brute force protection (for auth endpoints)
 * - Request logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from './rate-limit';
import { withBruteForceProtection } from './brute-force-protection';
import { withCORS, type CORSConfig } from './cors';
import { withSecurityHeaders, type SecurityHeadersConfig } from './security-headers';
import {
  sanitizeRequestBody,
  sanitizeQueryParams,
  sanitizeValue,
  type SanitizationOptions,
} from './input-sanitization';
import { logRequestStart, logRequestComplete, logRequestError, type RequestMetadata } from '@/lib/api/api-logger';
import { logger } from '@/lib/logger';

/**
 * Combined security middleware configuration
 */
export interface SecurityMiddlewareConfig {
  // Rate limiting
  enableRateLimit?: boolean;
  rateLimitConfig?: {
    windowMs?: number;
    maxRequests?: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };

  // Brute force protection
  enableBruteForceProtection?: boolean;
  bruteForceConfig?: {
    maxAttempts?: number;
    baseLockoutDuration?: number;
    attemptWindow?: number;
    captchaThreshold?: number;
    trackByAccount?: boolean;
  };

  // CORS
  enableCORS?: boolean;
  corsConfig?: Partial<CORSConfig>;

  // Security headers
  enableSecurityHeaders?: boolean;
  securityHeadersConfig?: Partial<SecurityHeadersConfig>;

  // Input sanitization
  enableInputSanitization?: boolean;
  bodySchema?: Record<string, SanitizationOptions>;
  querySchema?: Record<string, SanitizationOptions>;

  // Logging
  enableLogging?: boolean;

  // Extract identifier for brute force protection (e.g., email)
  extractIdentifier?: (request: NextRequest) => Promise<string | undefined>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SecurityMiddlewareConfig = {
  enableRateLimit: true,
  enableBruteForceProtection: false,
  enableCORS: true,
  enableSecurityHeaders: true,
  enableInputSanitization: true,
  enableLogging: true,
};

/**
 * Apply input sanitization to request
 */
async function applyInputSanitization(
  request: NextRequest,
  config: SecurityMiddlewareConfig
): Promise<{ request: NextRequest; errors: string[] }> {
  const errors: string[] = [];

  if (!config.enableInputSanitization) {
    return { request, errors };
  }

  try {
    // Clone the request to modify body
    const clonedRequest = request.clone();
    let body: Record<string, unknown> = {};

    try {
      body = await clonedRequest.json();
    } catch {
      // No JSON body, that's fine
    }

    // Sanitize body if schema is provided
    if (config.bodySchema && Object.keys(body).length > 0) {
      const result = sanitizeRequestBody(body, config.bodySchema);
      if (!result.valid) {
        errors.push(
          `Body validation failed: ${Object.values(result.errors).join(', ')}`
        );
      } else {
        // Replace body with sanitized version
        (request as any).sanitizedBody = result.sanitized;
      }
    }

    // Sanitize query params if schema is provided
    if (config.querySchema) {
      const searchParams = request.nextUrl.searchParams;
      const result = sanitizeQueryParams(searchParams, config.querySchema);
      if (!result.valid) {
        errors.push(
          `Query validation failed: ${Object.values(result.errors).join(', ')}`
        );
      } else {
        (request as any).sanitizedQuery = result.sanitized;
      }
    }
  } catch (error) {
    logger.warn('Input sanitization error', { error });
  }

  return { request, errors };
}

/**
 * Combined security middleware
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: SecurityMiddlewareConfig = {}
) {
  const finalConfig: SecurityMiddlewareConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let metadata: RequestMetadata | null = null;

    // Start logging if enabled
    if (finalConfig.enableLogging) {
      metadata = logRequestStart(request);
    }

    try {
      // Apply input sanitization first
      const sanitizationResult = await applyInputSanitization(
        request,
        finalConfig
      );

      if (sanitizationResult.errors.length > 0) {
        const response = NextResponse.json(
          {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Input validation failed',
              details: { errors: sanitizationResult.errors },
            },
          },
          { status: 400 }
        );

        if (finalConfig.enableLogging && metadata) {
          logRequestComplete(metadata, response, startTime);
        }

        // Apply CORS and security headers even on error
        let finalResponse = response as unknown as NextResponse;
        if (finalConfig.enableCORS) {
          const { setCORSHeaders } = await import('./cors');
          const corsConfig = finalConfig.corsConfig || {};
          finalResponse = setCORSHeaders(
            finalResponse as any,
            request,
            {
              allowedOrigins: corsConfig.allowedOrigins || ['*'],
              allowedMethods: corsConfig.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
              allowedHeaders: corsConfig.allowedHeaders || ['Content-Type', 'Authorization', 'X-Requested-With'],
              credentials: corsConfig.credentials || false,
              maxAge: corsConfig.maxAge || 86400,
            }
          ) as any;
        }
        if (finalConfig.enableSecurityHeaders) {
          finalResponse = setSecurityHeadersOnResponse(
            finalResponse,
            finalConfig.securityHeadersConfig
          );
        }

        return finalResponse;
      }

      // Build the handler chain
      let wrappedHandler = handler;

      // Apply brute force protection
      if (finalConfig.enableBruteForceProtection) {
        const bruteForceMiddleware = withBruteForceProtection(
          async (req, context) => {
            // Add context to request
            (request as any).securityContext = context;
            return await wrappedHandler(req);
          },
          finalConfig.bruteForceConfig,
          finalConfig.extractIdentifier
        );
        wrappedHandler = bruteForceMiddleware as any;
      }

      // Apply rate limiting
      if (finalConfig.enableRateLimit) {
        const rateLimitMiddleware = withRateLimit(
          wrappedHandler,
          finalConfig.rateLimitConfig
        );
        wrappedHandler = rateLimitMiddleware;
      }

      // Apply CORS
      if (finalConfig.enableCORS) {
        const corsMiddleware = withCORS(wrappedHandler, finalConfig.corsConfig);
        wrappedHandler = corsMiddleware;
      }

      // Apply security headers
      if (finalConfig.enableSecurityHeaders) {
        const securityHeadersMiddleware = withSecurityHeaders(
          wrappedHandler,
          finalConfig.securityHeadersConfig
        );
        wrappedHandler = securityHeadersMiddleware;
      }

      // Execute the handler chain
      const response = await wrappedHandler(request);

      // Log completion
      if (finalConfig.enableLogging && metadata) {
        logRequestComplete(metadata, response, startTime);
      }

      return response;
    } catch (error) {
      // Log error
      if (finalConfig.enableLogging && metadata) {
        logRequestError(metadata, error, startTime);
      }

      // Create error response
      const response = NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        },
        { status: 500 }
      );

      // Apply CORS and security headers even on error
      let finalResponse = response as unknown as NextResponse;
      if (finalConfig.enableCORS) {
        const { setCORSHeaders } = await import('./cors');
        finalResponse = setCORSHeaders(finalResponse as any, request as any, finalConfig.corsConfig as any) as unknown as NextResponse;
      }
      if (finalConfig.enableSecurityHeaders) {
        finalResponse = setSecurityHeadersOnResponse(
          finalResponse,
          finalConfig.securityHeadersConfig
        );
      }

      return finalResponse;
    }
  };
}

/**
 * Set security headers directly on a response (without middleware wrapper)
 */
function setSecurityHeadersOnResponse(
  response: NextResponse,
  config?: Partial<SecurityHeadersConfig>
): NextResponse {
  return (require('./security-headers') as any).setSecurityHeaders(response, config);
}

/**
 * Create security configuration for specific route types
 */
export const SecurityConfigs = {
  // Public API routes (health, status)
  public: {
    enableRateLimit: true,
    enableBruteForceProtection: false,
    enableCORS: true,
    enableSecurityHeaders: true,
    enableInputSanitization: false,
    rateLimitConfig: {
      windowMs: 60 * 1000,
      maxRequests: 100,
    },
  } as SecurityMiddlewareConfig,

  // Auth routes (login, register, refresh)
  auth: {
    enableRateLimit: true,
    enableBruteForceProtection: true,
    enableCORS: true,
    enableSecurityHeaders: true,
    enableInputSanitization: true,
    rateLimitConfig: {
      windowMs: 60 * 1000,
      maxRequests: 10,
    },
    bruteForceConfig: {
      maxAttempts: 5,
      baseLockoutDuration: 5 * 60 * 1000,
      attemptWindow: 15 * 60 * 1000,
      captchaThreshold: 3,
      trackByAccount: true,
    },
  } as SecurityMiddlewareConfig,

  // Protected API routes (require authentication)
  protected: {
    enableRateLimit: true,
    enableBruteForceProtection: false,
    enableCORS: true,
    enableSecurityHeaders: true,
    enableInputSanitization: true,
    rateLimitConfig: {
      windowMs: 60 * 1000,
      maxRequests: 60,
    },
  } as SecurityMiddlewareConfig,

  // Admin routes (higher security)
  admin: {
    enableRateLimit: true,
    enableBruteForceProtection: true,
    enableCORS: true,
    enableSecurityHeaders: true,
    enableInputSanitization: true,
    rateLimitConfig: {
      windowMs: 60 * 1000,
      maxRequests: 30,
    },
    bruteForceConfig: {
      maxAttempts: 3,
      baseLockoutDuration: 10 * 60 * 1000,
      attemptWindow: 30 * 60 * 1000,
      captchaThreshold: 2,
      trackByAccount: true,
    },
    securityHeadersConfig: {
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  } as SecurityMiddlewareConfig,

  // File upload routes (special handling)
  fileUpload: {
    enableRateLimit: true,
    enableBruteForceProtection: false,
    enableCORS: true,
    enableSecurityHeaders: true,
    enableInputSanitization: true,
    rateLimitConfig: {
      windowMs: 60 * 1000,
      maxRequests: 20,
    },
    securityHeadersConfig: {
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  } as SecurityMiddlewareConfig,
};

/**
 * Quick wrapper for public routes
 */
export function withPublicSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withSecurity(handler, SecurityConfigs.public);
}

/**
 * Quick wrapper for auth routes
 */
export function withAuthSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  extractIdentifier?: (request: NextRequest) => Promise<string | undefined>,
  schemaOverrides?: {
    bodySchema?: Record<string, SanitizationOptions>;
    querySchema?: Record<string, SanitizationOptions>;
  }
) {
  return withSecurity(handler, {
    ...SecurityConfigs.auth,
    extractIdentifier,
    bodySchema: schemaOverrides?.bodySchema,
    querySchema: schemaOverrides?.querySchema,
  });
}

/**
 * Quick wrapper for protected routes
 */
export function withProtectedSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  bodySchema?: Record<string, SanitizationOptions>,
  querySchema?: Record<string, SanitizationOptions>
) {
  return withSecurity(handler, {
    ...SecurityConfigs.protected,
    bodySchema,
    querySchema,
  });
}

/**
 * Quick wrapper for admin routes
 */
export function withAdminSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  extractIdentifier?: (request: NextRequest) => Promise<string | undefined>
) {
  return withSecurity(handler, {
    ...SecurityConfigs.admin,
    extractIdentifier,
  });
}

/**
 * Get sanitized body from request
 */
export function getSanitizedBody<T = Record<string, unknown>>(
  request: NextRequest
): T | undefined {
  return (request as any).sanitizedBody as T;
}

/**
 * Get sanitized query params from request
 */
export function getSanitizedQuery<T = Record<string, unknown>>(
  request: NextRequest
): T | undefined {
  return (request as any).sanitizedQuery as T;
}

/**
 * Security context interface
 */
export interface SecurityContext {
  config: {
    maxAttempts: number;
    baseLockoutDuration: number;
    attemptWindow: number;
    captchaThreshold: number;
    trackByAccount: boolean;
  };
  identifier?: string;
  requireCaptcha: boolean;
}

/**
 * Get security context from request (brute force info)
 */
export function getSecurityContext(request: NextRequest): SecurityContext | undefined {
  return (request as { securityContext?: SecurityContext }).securityContext;
}
