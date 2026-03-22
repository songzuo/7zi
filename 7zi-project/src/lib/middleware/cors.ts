/**
 * CORS Configuration and Middleware
 *
 * Configures Cross-Origin Resource Sharing (CORS) for API routes:
 * - Allowed origins
 * - Allowed methods
 * - Allowed headers
 * - Credentials support
 * - Preflight handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * CORS configuration
 */
export interface CORSConfig {
  // Allowed origins (use '*' for all, or array of specific origins)
  allowedOrigins: string[];

  // Allowed HTTP methods
  allowedMethods?: string[];

  // Allowed headers
  allowedHeaders?: string[];

  // Exposed headers (for browser access)
  exposedHeaders?: string[];

  // Allow credentials (cookies, authorization headers)
  credentials?: boolean;

  // Max age for preflight requests (seconds)
  maxAge?: number;

  // Cache preflight responses
  cachePreflight?: boolean;
}

/**
 * Default CORS configuration for development
 */
const DEFAULT_DEV_CONFIG: CORSConfig = {
  allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
  cachePreflight: true,
};

/**
 * Default CORS configuration for production
 */
const DEFAULT_PROD_CONFIG: CORSConfig = {
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [], // Empty means no origins allowed
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
  cachePreflight: true,
};

/**
 * Get default CORS configuration based on environment
 */
function getDefaultConfig(): CORSConfig {
  return process.env.NODE_ENV === 'production'
    ? DEFAULT_PROD_CONFIG
    : DEFAULT_DEV_CONFIG;
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return false;
  }

  // Wildcard allows all origins
  if (allowedOrigins.includes('*')) {
    return true;
  }

  // Exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check for wildcard subdomains (e.g., *.example.com)
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.slice(2);
      const originDomain = origin.split('://').pop();
      if (originDomain?.endsWith(domain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Set CORS headers on response
 */
export function setCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  config: CORSConfig
): NextResponse {
  const origin = request.headers.get('origin');

  // Set Access-Control-Allow-Origin
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (config.allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  // Set Access-Control-Allow-Credentials
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Set Access-Control-Allow-Methods
  response.headers.set(
    'Access-Control-Allow-Methods',
    config.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );

  // Set Access-Control-Allow-Headers
  response.headers.set(
    'Access-Control-Allow-Headers',
    config.allowedHeaders?.join(', ') ||
      'Content-Type, Authorization, X-Requested-With'
  );

  // Set Access-Control-Expose-Headers
  if (config.exposedHeaders && config.exposedHeaders.length > 0) {
    response.headers.set(
      'Access-Control-Expose-Headers',
      config.exposedHeaders.join(', ')
    );
  }

  // Set Access-Control-Max-Age
  if (config.maxAge) {
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  // Set Vary header (important for caching)
  response.headers.set('Vary', 'Origin');

  return response;
}

/**
 * Handle preflight OPTIONS request
 */
export function handlePreflight(
  request: NextRequest,
  config: CORSConfig
): NextResponse | null {
  // Only handle OPTIONS requests
  if (request.method !== 'OPTIONS') {
    return null;
  }

  // Create response
  const response = new NextResponse(null, { status: 204 });

  // Set CORS headers
  setCORSHeaders(response, request, config);

  // Log preflight request
  logger.debug('CORS preflight request handled', {
    method: request.method,
    origin: request.headers.get('origin'),
    path: request.nextUrl.pathname,
  });

  return response;
}

/**
 * CORS middleware wrapper
 */
export function withCORS(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CORSConfig>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const finalConfig: CORSConfig = {
      ...getDefaultConfig(),
      ...config,
    };

    // Handle preflight request
    const preflightResponse = handlePreflight(request, finalConfig);
    if (preflightResponse) {
      return preflightResponse;
    }

    // Check origin for non-preflight requests
    const origin = request.headers.get('origin');
    if (origin && !isOriginAllowed(origin, finalConfig.allowedOrigins)) {
      logger.warn('CORS blocked: Origin not allowed', {
        origin,
        path: request.nextUrl.pathname,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'CORS_ERROR',
            message: 'Origin not allowed',
          },
        },
        { status: 403 }
      );
    }

    // Execute handler
    let response: NextResponse;
    try {
      response = await handler(request);
    } catch (error) {
      response = NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        },
        { status: 500 }
      );
    }

    // Set CORS headers on response
    return setCORSHeaders(response, request, finalConfig);
  };
}

/**
 * Create CORS configuration for specific routes
 */
export function createCORSConfig(
  config: Partial<CORSConfig>
): CORSConfig {
  return {
    ...getDefaultConfig(),
    ...config,
  };
}

/**
 * Validate CORS configuration
 */
export function validateCORSConfig(
  config: CORSConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate allowed origins
  if (!Array.isArray(config.allowedOrigins) || config.allowedOrigins.length === 0) {
    errors.push('allowedOrigins must be a non-empty array');
  }

  for (const origin of config.allowedOrigins) {
    if (typeof origin !== 'string' || origin.trim() === '') {
      errors.push(`Invalid origin: ${origin}`);
    }
  }

  // Validate allowed methods
  if (config.allowedMethods) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    for (const method of config.allowedMethods) {
      if (!validMethods.includes(method.toUpperCase())) {
        errors.push(`Invalid HTTP method: ${method}`);
      }
    }
  }

  // Validate credentials
  if (config.credentials && config.allowedOrigins.includes('*')) {
    errors.push('credentials cannot be true when allowedOrigins includes "*"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get current CORS configuration
 */
export function getCORSConfig(
  overrideConfig?: Partial<CORSConfig>
): CORSConfig {
  const defaultConfig = getDefaultConfig();

  if (overrideConfig) {
    return {
      ...defaultConfig,
      ...overrideConfig,
    };
  }

  return defaultConfig;
}
