/**
 * Enhanced CSRF Protection Middleware
 *
 * Provides:
 * - CSRF token validation for sensitive endpoints
 * - Double-submit cookie pattern
 * - Time-based token expiration
 * - Token rotation support
 * - Request fingerprinting
 * - Configurable protection levels
 * - Enhanced security with signed tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { validateCsrfToken as validateToken } from '@/lib/csrf'
import { SignJWT, jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
  process.env.CSRF_SECRET_KEY || 'change-this-secret-key-in-production'
)

export interface CsrfProtectionConfig {
  /**
   * Whether CSRF protection is enabled
   */
  enabled?: boolean

  /**
   * Methods that require CSRF validation (GET, HEAD, OPTIONS are exempt by default)
   */
  protectedMethods?: string[]

  /**
   * Whether to skip validation for same-origin requests
   */
  skipSameOrigin?: boolean

  /**
   * Custom error handler
   */
  onError?: (error: Error) => NextResponse

  /**
   * Token expiration time in milliseconds (default: 1 hour)
   */
  tokenMaxAge?: number

  /**
   * Whether to rotate tokens after successful validation
   */
  rotateTokens?: boolean

  /**
   * Paths that are exempt from CSRF validation
   */
  exemptPaths?: string[]

  /**
   * Whether to use signed tokens (JWT)
   */
  useSignedTokens?: boolean
}

// Default configuration
const DEFAULT_CONFIG: Required<CsrfProtectionConfig> = {
  enabled: true,
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  skipSameOrigin: true,
  onError: (error: Error) => {
    logger.error('CSRF validation error', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'CSRF_VALIDATION_FAILED',
          message: 'CSRF token validation failed',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 403 }
    )
  },
  tokenMaxAge: 60 * 60 * 1000, // 1 hour
  rotateTokens: false,
  exemptPaths: [],
  useSignedTokens: true,
}

/**
 * Generate a signed CSRF token using JWT
 */
async function generateSignedToken(): Promise<string> {
  const token = await new SignJWT({ nonce: crypto.randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET_KEY)

  return token
}

/**
 * Verify a signed CSRF token
 */
async function verifySignedToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET_KEY)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Generate request fingerprint for enhanced validation
 */
function generateRequestFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''

  // Create a simple hash of the fingerprint data
  const data = `${userAgent}:${acceptLanguage}:${acceptEncoding}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  return hash.toString(16)
}

/**
 * Check if path is exempt from CSRF validation
 */
function isPathExempt(pathname: string, exemptPaths: string[]): boolean {
  return exemptPaths.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1))
    }
    return pathname === pattern
  })
}

/**
 * Check if request is same-origin
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin || !host) {
    return false
  }

  try {
    const originUrl = new URL(origin)
    return originUrl.host === host
  } catch (error) {
    return false
  }
}

/**
 * Extract CSRF token from request
 */
function extractCsrfToken(request: NextRequest): string | null {
  // Check X-CSRF-Token header first
  const headerToken = request.headers.get('x-csrf-token') || request.headers.get('X-CSRF-Token')

  if (headerToken) {
    return headerToken
  }

  // Check request body (for multipart/form-data)
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      // For JSON, we'd need to clone and parse, but that's expensive
      // Skip body parsing for middleware
      return null
    }
  } catch (error) {
    // Ignore parsing errors
  }

  return null
}

/**
 * Get CSRF token from cookie
 */
async function getCookieToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('csrf_token')
  return cookie?.value || null
}

/**
 * Validate CSRF token with timing attack protection and signature verification
 */
async function validateCsrfToken(
  headerToken: string | null,
  cookieToken: string | null,
  useSignedTokens: boolean = true
): Promise<boolean> {
  if (!headerToken || !cookieToken) {
    return false
  }

  // If using signed tokens, verify JWT signature
  if (useSignedTokens) {
    const headerValid = await verifySignedToken(headerToken)
    const cookieValid = await verifySignedToken(cookieToken)

    if (!headerValid || !cookieValid) {
      logger.warn('CSRF token signature verification failed')
      return false
    }
  }

  // Use timing-safe comparison
  return validateToken(headerToken, cookieToken)
}

/**
 * CSRF protection middleware
 */
export function withCsrfProtection(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CsrfProtectionConfig>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }

    // Skip if CSRF protection is disabled
    if (!finalConfig.enabled) {
      return handler(req)
    }

    const method = req.method
    const pathname = req.nextUrl.pathname

    // Skip validation for exempt paths
    if (isPathExempt(pathname, finalConfig.exemptPaths)) {
      return handler(req)
    }

    // Skip validation for safe methods
    if (!finalConfig.protectedMethods.includes(method)) {
      return handler(req)
    }

    // Skip validation for same-origin requests if configured
    if (finalConfig.skipSameOrigin && isSameOrigin(req)) {
      return handler(req)
    }

    try {
      // Extract tokens
      const headerToken = extractCsrfToken(req)
      const cookieToken = await getCookieToken()

      // Generate request fingerprint for enhanced security
      const fingerprint = generateRequestFingerprint(req)

      // Validate tokens with signature verification
      const isValid = await validateCsrfToken(headerToken, cookieToken, finalConfig.useSignedTokens)

      if (!isValid) {
        logger.warn('CSRF validation failed', {
          path: pathname,
          method,
          ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
          hasHeaderToken: !!headerToken,
          hasCookieToken: !!cookieToken,
          origin: req.headers.get('origin'),
          referer: req.headers.get('referer'),
          fingerprint: fingerprint.substring(0, 8) + '...', // Log partial fingerprint for debugging
        })

        return finalConfig.onError(new Error('CSRF token validation failed'))
      }

      let response: NextResponse

      // If token rotation is enabled, generate new token for authenticated users
      if (finalConfig.rotateTokens) {
        const newToken = finalConfig.useSignedTokens
          ? await generateSignedToken()
          : crypto.randomUUID()

        // Execute handler
        response = await handler(req)

        // Set new token in cookie
        const cookieStore = await cookies()
        cookieStore.set('csrf_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: finalConfig.tokenMaxAge / 1000,
          path: '/',
        })

        // Add new token to response headers for client-side access
        response.headers.set('X-CSRF-Token', newToken)
        response.headers.set('X-CSRF-Token-Rotated', 'true')
      } else {
        // Token is valid, proceed with request
        response = await handler(req)
      }

      // Add CSRF validation success header
      response.headers.set('X-CSRF-Validated', 'true')

      return response
    } catch (error) {
      return finalConfig.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}

/**
 * Create a CSRF error response
 */
export function createCsrfErrorResponse(
  message: string = 'CSRF token validation failed'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'CSRF_VALIDATION_FAILED',
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 403 }
  )
}

/**
 * Validate CSRF token for API routes (helper function)
 */
export async function validateRequestCsrf(
  request: Request,
  useSignedTokens: boolean = true
): Promise<boolean> {
  const req = request as NextRequest

  // Extract header token
  const headerToken = req.headers?.get('x-csrf-token') || req.headers?.get('X-CSRF-Token')

  // Get cookie token
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('csrf_token')?.value

  return await validateCsrfToken(headerToken || null, cookieToken || null, useSignedTokens)
}

/**
 * Generate a new CSRF token (server-side)
 */
export async function generateCsrfToken(useSignedTokens: boolean = true): Promise<string> {
  if (useSignedTokens) {
    return await generateSignedToken()
  }
  return crypto.randomUUID()
}

/**
 * Middleware factory for route protection
 */
export function createCsrfMiddleware(config?: Partial<CsrfProtectionConfig>) {
  return (req: NextRequest) =>
    withCsrfProtection(async request => {
      // This is a placeholder - actual handler should be provided
      return NextResponse.next()
    }, config)(req)
}
