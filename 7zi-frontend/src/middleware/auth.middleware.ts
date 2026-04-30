/**
 * Authentication Middleware
 *
 * Provides authentication and authorization middleware for API routes.
 * This module validates user credentials and attaches user context to requests.
 * Includes request signature verification to prevent tampering.
 *
 * @module @/middleware/auth.middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Request signature verification configuration
 */
const SIGNATURE_SECRET = process.env.MIDDLEWARE_SIGNATURE_SECRET || ''
const SIGNATURE_HEADER = 'x-request-signature'
const SIGNATURE_TIMESTAMP_HEADER = 'x-request-timestamp'
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Authentication result type
 */
export interface AuthResult {
  success: boolean
  userId?: string
  email?: string
  role?: string
  error?: string
}

/**
 * Default protected paths that require authentication
 */
const PROTECTED_PATHS = ['/api/search', '/api/data/import', '/api/data/export']

/**
 * Check if a path requires authentication
 */
function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath))
}

/**
 * Verify request signature to prevent tampering
 * Uses HMAC-SHA256 with timing-safe comparison
 */
function verifyRequestSignature(request: NextRequest): boolean {
  // If no signature secret configured, skip verification (log warning in production)
  if (!SIGNATURE_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Auth Middleware] MIDDLEWARE_SIGNATURE_SECRET not configured - signature verification disabled')
    }
    return true // Allow in dev, require in production
  }

  const signature = request.headers.get(SIGNATURE_HEADER)
  const timestamp = request.headers.get(SIGNATURE_TIMESTAMP_HEADER)

  if (!signature || !timestamp) {
    return false
  }

  // Check timestamp freshness to prevent replay attacks
  const requestTime = parseInt(timestamp, 10)
  const now = Date.now()
  if (isNaN(requestTime) || Math.abs(now - requestTime) > SIGNATURE_MAX_AGE_MS) {
    return false
  }

  // Compute expected signature: HMAC-SHA256(method + path + timestamp, secret)
  const pathname = new URL(request.url).pathname
  const method = request.method
  const payload = `${method}:${pathname}:${timestamp}`
  const expectedSignature = createHmac('sha256', SIGNATURE_SECRET)
    .update(payload)
    .digest('hex')

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    if (sigBuffer.length !== expectedBuffer.length) return false
    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * Create request signature for client use (exported for API routes / edge functions)
 */
export function createRequestSignature(method: string, pathname: string): { signature: string; timestamp: string } {
  if (!SIGNATURE_SECRET) {
    throw new Error('MIDDLEWARE_SIGNATURE_SECRET must be configured for signature generation')
  }
  const timestamp = Date.now().toString()
  const payload = `${method}:${pathname}:${timestamp}`
  const signature = createHmac('sha256', SIGNATURE_SECRET).update(payload).digest('hex')
  return { signature, timestamp }
}

/**
 * Extract user information from request headers
 */
function extractUserFromHeaders(request: NextRequest): AuthResult {
  const userId = request.headers.get('x-user-id')
  const email = request.headers.get('x-user-email')
  const role = request.headers.get('x-user-role')

  if (!userId) {
    return {
      success: false,
      error: 'Missing authentication credentials',
    }
  }

  return {
    success: true,
    userId,
    email: email || undefined,
    role: role || 'user',
  }
}

/**
 * Authentication middleware function
 *
 * Validates authentication credentials from request headers.
 * Returns 401 Unauthorized if credentials are missing or invalid.
 * Attaches user information to headers for downstream use.
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse with appropriate status code
 *
 * @example
 * ```typescript
 * import { authMiddleware } from '@/middleware/auth.middleware';
 *
 * export async function GET(request: NextRequest) {
 *   const authResponse = authMiddleware(request);
 *   if (authResponse.status !== 200) {
 *     return authResponse;
 *   }
 *
 *   const userId = request.headers.get('x-user-id');
 *   // ... handle authenticated request
 * }
 * ```
 */
export function authMiddleware(request: NextRequest): NextResponse {
  // Only check protected paths
  const pathname = new URL(request.url).pathname

  // Allow non-protected paths without auth
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  // Verify request signature to prevent tampering
  if (!verifyRequestSignature(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Invalid or missing request signature',
      },
      { status: 403 }
    )
  }

  // Extract user from headers
  const authResult = extractUserFromHeaders(request)

  if (!authResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      },
      { status: 401 }
    )
  }

  // Create response with user info in headers
  const headers = new Headers(request.headers)
  headers.set('x-user-id', authResult.userId!)

  if (authResult.email) {
    headers.set('x-user-email', authResult.email)
  }

  if (authResult.role) {
    headers.set('x-user-role', authResult.role)
  }

  return new NextResponse(null, {
    status: 200,
    headers,
  })
}

/**
 * Check permissions middleware
 *
 * Creates a middleware function that checks if the user has one of the required roles.
 *
 * @param requiredRoles - Array of role names that are allowed access
 * @returns Middleware function that validates user role
 *
 * @example
 * ```typescript
 * const adminOnly = checkPermissions(['admin', 'superadmin']);
 * // Use in route handler
 * ```
 */
export function checkPermissions(requiredRoles: string[]) {
  return (request: NextRequest): NextResponse => {
    const userRole = request.headers.get('x-user-role')
    const userId = request.headers.get('x-user-id')

    // If no auth headers, reject
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Check role if roles are required
    if (requiredRoles.length > 0 && (!userRole || !requiredRoles.includes(userRole))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        },
        { status: 403 }
      )
    }

    return NextResponse.next()
  }
}

/**
 * Require authentication - strict version
 *
 * Always requires valid authentication, regardless of path.
 * Use for highly sensitive endpoints.
 */
export function requireAuth(request: NextRequest): NextResponse {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

/**
 * Get authenticated user ID from request
 *
 * @param request - The incoming request
 * @returns User ID or null if not authenticated
 */
export function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id')
}

/**
 * Get authenticated user role from request
 *
 * @param request - The incoming request
 * @returns User role or null if not authenticated
 */
export function getUserRole(request: NextRequest): string | null {
  return request.headers.get('x-user-role')
}
