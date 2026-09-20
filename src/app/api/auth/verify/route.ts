/**
 * Verify Token API Route
 * GET /api/auth/verify - Verify an access token
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJwtToken, authenticateToken } from '@/lib/auth/service'
import { verifyAgentToken } from '@/lib/agents/core/auth-service'
import { isTokenBlacklisted } from '@/lib/auth/token-blacklist'
import { logAuditEvent, AuditEventType } from '@/lib/auth/audit-logger'
import { verify } from '@/lib/auth/jwt'

/**
 * Response types
 */
interface VerifySuccessResponse {
  active: boolean
  sub?: string
  email?: string
  role?: string
  roles?: string[]
  permissions?: string[]
  type?: 'user' | 'agent'
  exp?: number
  iat?: number
}

interface VerifyErrorResponse {
  active: false
  error?: string
}

/**
 * GET /api/auth/verify
 * Verify an access token (RFC 7662 OAuth 2.0 Token Introspection)
 * 
 * Headers:
 *   Authorization: Bearer <token>
 * 
 * Query params:
 *   token: <token> (alternative to Authorization header)
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or query param
    let token: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      token = request.nextUrl.searchParams.get('token')
    }

    if (!token) {
      return NextResponse.json<VerifyErrorResponse>(
        {
          active: false,
          error: 'No token provided',
        },
        { status: 401 }
      )
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token)
    if (isBlacklisted) {
      return NextResponse.json<VerifyErrorResponse>(
        {
          active: false,
          error: 'Token has been revoked',
        },
        { status: 401 }
      )
    }

    // Verify JWT
    const result = await verify(token)

    if (!result.valid || !result.payload) {
      return NextResponse.json<VerifyErrorResponse>(
        {
          active: false,
          error: result.error || 'Invalid token',
        },
        { status: 401 }
      )
    }

    // Check token type and get additional info
    if (result.payload.type === 'user') {
      // Validate against database
      const authResult = await authenticateToken(token)
      if (!authResult) {
        return NextResponse.json<VerifyErrorResponse>(
          {
            active: false,
            error: 'Token validation failed',
          },
          { status: 401 }
        )
      }

      return NextResponse.json<VerifySuccessResponse>({
        active: true,
        sub: result.payload.sub,
        email: result.payload.email,
        role: result.payload.role,
        roles: result.payload.roles,
        permissions: result.payload.permissions,
        type: 'user',
        exp: result.payload.exp,
        iat: result.payload.iat,
      })
    } else if (result.payload.type === 'agent') {
      // Validate agent token
      const agentResult = await verifyAgentToken(token)
      if (!agentResult) {
        return NextResponse.json<VerifyErrorResponse>(
          {
            active: false,
            error: 'Agent token validation failed',
          },
          { status: 401 }
        )
      }

      return NextResponse.json<VerifySuccessResponse>({
        active: true,
        sub: agentResult.agentId,
        role: agentResult.role,
        permissions: agentResult.permissions,
        type: 'agent',
        exp: result.payload.exp,
        iat: result.payload.iat,
      })
    }

    return NextResponse.json<VerifyErrorResponse>(
      {
        active: false,
        error: 'Unknown token type',
      },
      { status: 401 }
    )
  } catch (error) {
    console.error('Verify token endpoint error:', error)

    return NextResponse.json<VerifyErrorResponse>(
      {
        active: false,
        error: 'Token verification failed',
      },
      { status: 500 }
    )
  }
}
