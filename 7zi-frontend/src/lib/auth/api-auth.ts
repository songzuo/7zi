/**
 * API Authentication Utilities
 *
 * Unified authentication middleware for API routes
 * Supports both JWT and API Key authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, JWTPayload } from './jwt'

/**
 * API Key configuration
 */
const MCP_API_KEYS = new Set(
  (process.env.MCP_API_KEYS || '')
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0)
)

/**
 * Allowed CORS origins for MCP
 */
const ALLOWED_MCP_ORIGINS = new Set(
  (process.env.ALLOWED_MCP_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)
)

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean
  userId?: string
  username?: string
  role?: string
  authMethod?: 'jwt' | 'api-key'
  error?: string
}

/**
 * Extract JWT token from request
 */
function extractJWTToken(request: NextRequest): string | null {
  // From Cookie
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) return cookieToken

  // From Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * Extract API Key from request
 */
function extractAPIKey(request: NextRequest): string | null {
  // From X-API-Key header
  const headerKey = request.headers.get('x-api-key')
  if (headerKey) return headerKey

  // From query parameter
  const queryKey = request.nextUrl.searchParams.get('api_key')
  if (queryKey) return queryKey

  return null
}

/**
 * Verify JWT authentication
 */
async function verifyJWTAuth(request: NextRequest): Promise<AuthResult> {
  const token = extractJWTToken(request)

  if (!token) {
    return {
      authenticated: false,
      error: 'No JWT token provided',
    }
  }

  try {
    const payload = await verifyJWT(token)
    return {
      authenticated: true,
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      authMethod: 'jwt',
    }
  } catch (error) {
    return {
      authenticated: false,
      error: 'Invalid or expired JWT token',
    }
  }
}

/**
 * Verify API Key authentication
 */
function verifyAPIKeyAuth(request: NextRequest): AuthResult {
  const apiKey = extractAPIKey(request)

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'No API key provided',
    }
  }

  if (MCP_API_KEYS.size === 0) {
    console.warn('[API Auth] No MCP_API_KEYS configured - API key authentication disabled')
    return {
      authenticated: false,
      error: 'API key authentication not configured',
    }
  }

  if (!MCP_API_KEYS.has(apiKey)) {
    return {
      authenticated: false,
      error: 'Invalid API key',
    }
  }

  return {
    authenticated: true,
    userId: 'api-service',
    username: 'api-service',
    role: 'service',
    authMethod: 'api-key',
  }
}

/**
 * Authenticate request with JWT (for user-facing routes)
 */
export async function authenticateJWT(request: NextRequest): Promise<AuthResult> {
  return verifyJWTAuth(request)
}

/**
 * Authenticate request with API Key (for MCP routes)
 */
export function authenticateAPIKey(request: NextRequest): AuthResult {
  return verifyAPIKeyAuth(request)
}

/**
 * Authenticate request with either JWT or API Key
 * JWT takes precedence over API Key
 */
export async function authenticateEither(request: NextRequest): Promise<AuthResult> {
  // Try JWT first
  const jwtResult = await verifyJWTAuth(request)
  if (jwtResult.authenticated) {
    return jwtResult
  }

  // Fall back to API Key
  return verifyAPIKeyAuth(request)
}

/**
 * Create authentication middleware for API routes
 * Returns 401 if not authenticated
 */
export function withAuth(
  handler: (request: NextRequest, context: { user: AuthResult }) => Promise<NextResponse>,
  options: {
    method?: 'jwt' | 'api-key' | 'either'
  } = {}
) {
  const { method = 'jwt' } = options

  return async (request: NextRequest): Promise<NextResponse> => {
    let authResult: AuthResult

    switch (method) {
      case 'api-key':
        authResult = verifyAPIKeyAuth(request)
        break
      case 'either':
        authResult = await authenticateEither(request)
        break
      case 'jwt':
      default:
        authResult = await verifyJWTAuth(request)
        break
    }

    if (!authResult.authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: authResult.error || 'Authentication required',
        },
        { status: 401 }
      )
    }

    return handler(request, { user: authResult })
  }
}

/**
 * Verify user ownership for resources
 * Returns 403 if the authenticated user doesn't match the resource owner
 */
export function verifyOwnership(authenticatedUserId: string, resourceUserId: string): boolean {
  // Admin can access any resource
  // This check should be done by the caller using the role from AuthResult
  return authenticatedUserId === resourceUserId
}

/**
 * Get CORS headers for MCP routes
 * Validates origin against allowed list
 */
export function getMCPCORSHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '*'

  // Check if origin is allowed
  const allowedOrigin = ALLOWED_MCP_ORIGINS.has(origin)
    ? origin
    : Array.from(ALLOWED_MCP_ORIGINS)[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Check if MCP is enabled (has API keys configured)
 */
export function isMCPEnabled(): boolean {
  return MCP_API_KEYS.size > 0
}

/**
 * Get allowed MCP origins
 */
export function getAllowedMCPOrigins(): string[] {
  return Array.from(ALLOWED_MCP_ORIGINS)
}

/**
 * Create admin-only authentication middleware
 * Returns 401 if not authenticated, 403 if not admin
 */
export function withAdmin(
  handler: (request: NextRequest, context: { user: AuthResult }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifyJWTAuth(request)

    if (!authResult.authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: authResult.error || 'Authentication required',
        },
        { status: 401 }
      )
    }

    if (authResult.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: '需要管理员权限',
        },
        { status: 403 }
      )
    }

    return handler(request, { user: authResult })
  }
}
