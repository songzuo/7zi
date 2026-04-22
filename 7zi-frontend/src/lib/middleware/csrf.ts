/**
 * CSRF Protection Middleware
 *
 * Provides Cross-Site Request Forgery protection for API endpoints.
 * Uses double-submit cookie pattern with signed tokens.
 *
 * @version 1.13.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSuccessResponse, createForbiddenError, createBadRequestError } from '@/lib/api/error-handler'

// ============================================
// Configuration
// ============================================

const CSRF_CONFIG = {
  // Token expiration in seconds (default: 1 hour)
  tokenExpiration: 3600,

  // Cookie name for CSRF token
  cookieName: 'csrf_token',

  // Header name for CSRF token in requests
  headerName: 'X-CSRF-Token',

  // Trusted origins (for additional validation)
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://7zi.com',
    'https://www.7zi.com',
  ],

  // Enable origin validation
  validateOrigin: true,
}

// ============================================
// Token Generation & Validation
// ============================================

/**
 * Generate a secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a signed token with timestamp
 */
function createSignedToken(): string {
  const token = generateToken()
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = `${token}:${timestamp}`
  return Buffer.from(signature).toString('base64')
}

/**
 * Verify and decode a signed token
 */
 
export function verifyToken(signedToken: string): { valid: boolean; token?: string; error?: string } {
  try {
    const decoded = Buffer.from(signedToken, 'base64').toString('utf-8')
    const [token, timestampStr] = decoded.split(':')

    if (!token || !timestampStr) {
      return { valid: false, error: 'Invalid token format' }
    }

    const timestamp = parseInt(timestampStr, 10)
    const now = Math.floor(Date.now() / 1000)

    // Check token expiration
    if (now - timestamp > CSRF_CONFIG.tokenExpiration) {
      return { valid: false, error: 'Token expired' }
    }

    return { valid: true, token }
  } catch (error) {
    return { valid: false, error: 'Token verification failed' }
  }
}

// ============================================
// Origin Validation
// ============================================

/**
 * Validate request origin
 */
function validateOrigin(request: NextRequest): boolean {
  if (!CSRF_CONFIG.validateOrigin) {
    return true
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Check origin header
  if (origin) {
    const isTrusted = CSRF_CONFIG.trustedOrigins.some(trusted =>
      origin === trusted || origin.startsWith(trusted)
    )
    if (isTrusted) return true
  }

  // Fallback to referer header
  if (referer) {
    const isTrusted = CSRF_CONFIG.trustedOrigins.some(trusted =>
      referer.startsWith(trusted)
    )
    if (isTrusted) return true
  }

  // Allow same-origin requests
  const requestUrl = new URL(request.url)
  if (origin === requestUrl.origin) {
    return true
  }

  return false
}

// ============================================
// CSRF Middleware
// ============================================

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens for state-changing requests (POST, PUT, DELETE, PATCH)
 *
 * @param request - Next.js request object
 * @returns NextResponse or null (if validation passes)
 */
 
export function withCSRF(handler: (request: NextRequest, ...args: any[]) => any) {
   
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const method = request.method.toUpperCase()

    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return handler(request, ...args)
    }

    // Validate origin
    if (!validateOrigin(request)) {
      return createForbiddenError('Invalid origin for CSRF-protected request')
    }

    // Get token from cookie
    const cookieToken = request.cookies.get(CSRF_CONFIG.cookieName)?.value

    if (!cookieToken) {
      return createBadRequestError('CSRF token cookie missing')
    }

    // Get token from header
    const headerToken = request.headers.get(CSRF_CONFIG.headerName)

    if (!headerToken) {
      return createBadRequestError(`CSRF token header '${CSRF_CONFIG.headerName}' missing`)
    }

    // Verify both tokens
    const cookieVerification = verifyToken(cookieToken)
    const headerVerification = verifyToken(headerToken)

    if (!cookieVerification.valid) {
      return createBadRequestError(`Invalid CSRF token cookie: ${cookieVerification.error}`)
    }

    if (!headerVerification.valid) {
      return createBadRequestError(`Invalid CSRF token header: ${headerVerification.error}`)
    }

    // Compare tokens
    if (cookieVerification.token !== headerVerification.token) {
      return createForbiddenError('CSRF token mismatch')
    }

    // All checks passed, proceed to handler
    return handler(request, ...args)
  }
}

// ============================================
// CSRF Token Provider
// ============================================

/**
 * Generate and set CSRF token cookie
 *
 * This should be called by an endpoint that provides CSRF tokens to the client
 */
export function generateCSRFToken(response?: NextResponse): NextResponse {
  const token = createSignedToken()
  const res = response || new NextResponse()

  // Set cookie with security attributes
  res.cookies.set(CSRF_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_CONFIG.tokenExpiration,
  })

  return res
}

/**
 * Get CSRF token endpoint handler
 *
 * Returns a new CSRF token to the client
 */
export async function getCSRFToken(request: NextRequest): Promise<NextResponse> {
  const response = createSuccessResponse({
    token: createSignedToken(),
    headerName: CSRF_CONFIG.headerName,
    cookieName: CSRF_CONFIG.cookieName,
  })

  return generateCSRFToken(response)
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a request method requires CSRF protection
 */
export function requiresCSRFProtection(method: string): boolean {
  const upperMethod = method.toUpperCase()
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod)
}

/**
 * Extract CSRF token from request
 */
export function extractCSRFToken(request: NextRequest): {
  cookieToken?: string
  headerToken?: string
} {
  return {
    cookieToken: request.cookies.get(CSRF_CONFIG.cookieName)?.value,
    headerToken: request.headers.get(CSRF_CONFIG.headerName) || undefined,
  }
}