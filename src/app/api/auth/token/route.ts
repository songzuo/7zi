/**
 * Token API Route
 * POST /api/auth/token - Get access token for users or agents
 */

import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth/service'
import { authenticateAgent } from '@/lib/agents/core/auth-service'
import { logAuditEvent, AuditEventType, AuditSeverity } from '@/lib/auth/audit-logger'
import { z } from 'zod'

/**
 * Request validation schema
 */
const tokenRequestSchema = z.object({
  grant_type: z.enum(['password', 'api_key', 'client_credentials']),
  username: z.string().email().optional(),
  password: z.string().optional(),
  api_key: z.string().optional(),
  agent_id: z.string().optional(),
  scope: z.string().optional(),
})

/**
 * Response types
 */
interface TokenSuccessResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope?: string
}

interface TokenErrorResponse {
  error: string
  error_description?: string
}

/**
 * POST /api/auth/token
 * OAuth 2.0 compliant token endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validation = tokenRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<TokenErrorResponse>(
        {
          error: 'invalid_request',
          error_description: validation.error.issues[0].message,
        },
        { status: 400 }
      )
    }

    const { grant_type, username, password, api_key, agent_id, scope } = validation.data

    // Get client info for audit
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Handle different grant types
    if (grant_type === 'password') {
      // User login with email/password
      if (!username || !password) {
        return NextResponse.json<TokenErrorResponse>(
          {
            error: 'invalid_grant',
            error_description: 'Username and password are required',
          },
          { status: 400 }
        )
      }

      const result = await loginUser({ email: username, password })

      if (!result.success) {
        // Log failed login
        await logAuditEvent({
          eventType: AuditEventType.LOGIN_FAILURE,
          severity: AuditSeverity.WARNING,
          ipAddress,
          userAgent,
          result: 'failure',
          details: { email: username, reason: result.error },
        })

        return NextResponse.json<TokenErrorResponse>(
          {
            error: 'invalid_grant',
            error_description: result.error,
          },
          { status: 401 }
        )
      }

      // Log successful login
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: result.user.id,
        ipAddress,
        userAgent,
        result: 'success',
        details: { email: username },
      })

      return NextResponse.json<TokenSuccessResponse>({
        access_token: result.token,
        token_type: 'Bearer',
        expires_in: Math.floor(
          (result.expiresAt.getTime() - Date.now()) / 1000
        ),
        refresh_token: result.refreshToken,
        scope: scope,
      })
    } else if (grant_type === 'api_key') {
      // Agent authentication with API key
      if (!api_key) {
        return NextResponse.json<TokenErrorResponse>(
          {
            error: 'invalid_grant',
            error_description: 'API key is required',
          },
          { status: 400 }
        )
      }

      if (!agent_id) {
        return NextResponse.json<TokenErrorResponse>(
          {
            error: 'invalid_grant',
            error_description: 'Agent ID is required',
          },
          { status: 400 }
        )
      }

      const result = await authenticateAgent({ agentId: agent_id, apiKey: api_key })

      if (!result) {
        // Log failed authentication
        await logAuditEvent({
          eventType: AuditEventType.AGENT_AUTH_FAILURE,
          severity: AuditSeverity.WARNING,
          agentId: agent_id,
          ipAddress,
          userAgent,
          result: 'failure',
          details: { reason: 'Invalid API key' },
        })

        return NextResponse.json<TokenErrorResponse>(
          {
            error: 'invalid_grant',
            error_description: 'Invalid API key',
          },
          { status: 401 }
        )
      }

      // Log successful authentication
      await logAuditEvent({
        eventType: AuditEventType.AGENT_AUTHENTICATED,
        agentId: result.agent.id,
        ipAddress,
        userAgent,
        result: 'success',
      })

      return NextResponse.json<TokenSuccessResponse>({
        access_token: result.token.token,
        token_type: 'Bearer',
        expires_in: Math.floor(
          (result.token.expiresAt.getTime() - Date.now()) / 1000
        ),
        refresh_token: result.token.refreshToken,
        scope: scope,
      })
    } else if (grant_type === 'client_credentials') {
      // Client credentials flow (for service-to-service auth)
      // This is a placeholder - implement based on your needs
      return NextResponse.json<TokenErrorResponse>(
        {
          error: 'unsupported_grant_type',
          error_description: 'Client credentials grant not yet implemented',
        },
        { status: 400 }
      )
    }

    return NextResponse.json<TokenErrorResponse>(
      {
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grant_type}' is not supported`,
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Token endpoint error:', error)

    return NextResponse.json<TokenErrorResponse>(
      {
        error: 'server_error',
        error_description: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
