/**
 * CORS Middleware for 7zi Project
 *
 * Provides:
 * - Configurable CORS policies
 * - Whitelist support
 * - Credential support
 * - Preflight request handling
 * - Custom headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export interface CorsConfig {
  /**
   * List of allowed origins
   * Use '*' to allow all origins (not recommended for production)
   */
  origin?: string | string[] | ((origin: string) => boolean)

  /**
   * List of allowed HTTP methods
   */
  methods?: string[]

  /**
   * List of allowed headers
   */
  allowedHeaders?: string[]

  /**
   * List of exposed headers
   */
  exposedHeaders?: string[]

  /**
   * Allow credentials (cookies, authorization headers)
   */
  credentials?: boolean

  /**
   * Max age for preflight requests (in seconds)
   */
  maxAge?: number

  /**
   * Custom error handler for CORS violations
   */
  onError?: (error: Error) => NextResponse
}

// Default CORS configuration
const DEFAULT_CORS_CONFIG: Required<CorsConfig> = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
  onError: (error: Error) => {
    logger.error('CORS error', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'CORS_ERROR',
          message: 'CORS policy violation',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 403 }
    )
  },
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(
  requestOrigin: string | null,
  allowedOrigin: CorsConfig['origin']
): boolean {
  if (!requestOrigin) {
    // No origin header (e.g., same-origin, curl, or non-browser requests)
    return true
  }

  if (allowedOrigin === '*') {
    return true
  }

  if (typeof allowedOrigin === 'string') {
    return allowedOrigin === requestOrigin
  }

  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.includes(requestOrigin)
  }

  if (typeof allowedOrigin === 'function') {
    return allowedOrigin(requestOrigin)
  }

  return false
}

/**
 * Get allowed origins for the current request
 */
function getOriginHeader(
  requestOrigin: string | null,
  allowedOrigin: CorsConfig['origin']
): string {
  if (allowedOrigin === '*') {
    return '*'
  }

  if (typeof allowedOrigin === 'string') {
    return allowedOrigin
  }

  if (Array.isArray(allowedOrigin) && requestOrigin && allowedOrigin.includes(requestOrigin)) {
    return requestOrigin
  }

  if (typeof allowedOrigin === 'function' && requestOrigin && allowedOrigin(requestOrigin)) {
    return requestOrigin
  }

  // Fallback for when origin check fails
  return '*'
}

/**
 * Apply CORS headers to response
 */
function applyCorsHeaders(
  response: NextResponse,
  requestOrigin: string | null,
  config: Required<CorsConfig>
): NextResponse {
  // Access-Control-Allow-Origin
  response.headers.set('Access-Control-Allow-Origin', getOriginHeader(requestOrigin, config.origin))

  // Access-Control-Allow-Methods
  response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '))

  // Access-Control-Allow-Headers
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))

  // Access-Control-Expose-Headers
  if (config.exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
  }

  // Access-Control-Allow-Credentials
  response.headers.set('Access-Control-Allow-Credentials', String(config.credentials))

  // Access-Control-Max-Age (for preflight requests)
  response.headers.set('Access-Control-Max-Age', String(config.maxAge))

  // Additional security headers
  response.headers.set('Vary', 'Origin')

  return response
}

/**
 * Create a CORS middleware wrapper
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CorsConfig>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const finalConfig: Required<CorsConfig> = {
      ...DEFAULT_CORS_CONFIG,
      ...config,
      // Override origin if specifically provided in config
      origin: config?.origin ?? DEFAULT_CORS_CONFIG.origin,
    }

    // Handle case where headers might be undefined (e.g., in test mocks)
    const requestOrigin = req?.headers?.get('origin') ?? null

    // Handle preflight request (OPTIONS)
    const requestMethod = req?.method ?? 'GET'
    if (requestMethod === 'OPTIONS') {
      logger.debug('CORS preflight request', {
        origin: requestOrigin,
        method: req?.headers?.get('access-control-request-method'),
      })

      // Check if origin is allowed
      if (!isOriginAllowed(requestOrigin, finalConfig.origin)) {
        logger.warn('CORS preflight request blocked - origin not allowed', {
          origin: requestOrigin,
        })
        return finalConfig.onError(new Error('Origin not allowed'))
      }

      // Create preflight response with CORS headers
      const preflightResponse = new NextResponse(null, { status: 204 })
      return applyCorsHeaders(preflightResponse, requestOrigin, finalConfig)
    }

    // Check if origin is allowed for non-preflight requests
    if (!isOriginAllowed(requestOrigin, finalConfig.origin)) {
      logger.warn('CORS request blocked - origin not allowed', {
        origin: requestOrigin,
        path: req?.nextUrl?.pathname ?? 'unknown',
        method: requestMethod,
      })
      return finalConfig.onError(new Error('Origin not allowed'))
    }

    // Execute the handler
    let response: NextResponse

    try {
      response = await handler(req)
    } catch (error) {
      logger.error('Handler error in CORS middleware', error)
      return finalConfig.onError(error instanceof Error ? error : new Error(String(error)))
    }

    // Apply CORS headers to the response
    return applyCorsHeaders(response, requestOrigin, finalConfig)
  }
}

/**
 * Create a CORS middleware for specific paths
 */
export function createCorsMiddleware(config?: Partial<CorsConfig>) {
  return (req: NextRequest) =>
    withCors(async request => {
      // This is a placeholder - actual handler should be provided
      return NextResponse.next()
    }, config)(req)
}

/**
 * Pre-configured CORS policies
 */
export const corsPolicies = {
  /**
   * Strict CORS policy for production
   * Only allows specific whitelisted origins
   */
  strict: (allowedOrigins: string[]) => {
    return (req: NextRequest) =>
      withCors(async request => NextResponse.next(), {
        origin: allowedOrigins,
        credentials: true,
      })(req)
  },

  /**
   * Permissive CORS policy for development
   * Allows all origins
   */
  development: (req: NextRequest) =>
    withCors(async request => NextResponse.next(), {
      origin: '*',
      credentials: false,
    })(req),

  /**
   * API gateway CORS policy
   * Allows specific origins with credentials
   */
  apiGateway: (allowedOrigins: string[]) => {
    return (req: NextRequest) =>
      withCors(async request => NextResponse.next(), {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        maxAge: 86400,
      })(req)
  },

  /**
   * Public API CORS policy
   * Allows all origins but no credentials
   */
  public: (req: NextRequest) =>
    withCors(async request => NextResponse.next(), {
      origin: '*',
      credentials: false,
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    })(req),
}

/**
 * Helper function to create CORS error response
 */
export function createCorsErrorResponse(message: string = 'CORS policy violation'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'CORS_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 403 }
  )
}

/**
 * Get environment-based CORS origin list
 */
export function getEnvironmentOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development'

  if (env === 'production') {
    // Production: use explicitly configured origins
    const origins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []
    if (origins.length === 0) {
      logger.warn('No CORS origins configured for production')
    }
    return origins
  }

  if (env === 'development' || env === 'test') {
    // Development/test: allow local origins
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ]
  }

  // Default
  return ['http://localhost:3000']
}
