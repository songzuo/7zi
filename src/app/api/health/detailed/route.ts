/**
 * @fileoverview Detailed Health Check Endpoint
 * @description Protected endpoint with authentication requirement
 *
 * Security:
 * - Requires JWT authentication via Bearer token
 * - Returns 401 Unauthorized for unauthenticated requests
 * - Logs authentication failures for security monitoring
 */

import { NextRequest } from 'next/server'
import { detailedHealthCheck, healthResponse } from '@/lib/monitoring'
import { createUnauthorizedError } from '@/lib/api/error-handler'
import { authenticateToken } from '@/lib/auth/service'
import { logger } from '@/lib/logger'

/**
 * GET /api/health/detailed
 * Detailed health check with dependency status
 *
 * **SECURITY**: Requires authentication
 * - Headers: Authorization: Bearer <token>
 * - Returns 401 for unauthenticated access
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const clientIp =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  try {
    // Extract and validate authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized access attempt to /api/health/detailed', {
        endpoint: '/api/health/detailed',
        clientIp,
        hasAuthHeader: !!authHeader,
        requestId,
      })

      return await createUnauthorizedError('Authentication required for detailed health check')
    }

    const token = authHeader.substring(7)

    // Validate token format
    if (!token || token.length < 10) {
      logger.warn('Invalid token format for /api/health/detailed', {
        endpoint: '/api/health/detailed',
        clientIp,
        tokenLength: token?.length,
        requestId,
      })

      return await createUnauthorizedError('Invalid authentication token')
    }

    // Verify token and authenticate user
    const authResult = await authenticateToken(token)

    if (!authResult) {
      logger.warn('Invalid or expired token for /api/health/detailed', {
        endpoint: '/api/health/detailed',
        clientIp,
        userId: 'unknown',
        requestId,
      })

      return await createUnauthorizedError('Invalid or expired authentication token')
    }

    // Log successful access for audit
    logger.info('Successful access to /api/health/detailed', {
      endpoint: '/api/health/detailed',
      clientIp,
      userId: authResult.context.userId,
      requestId,
    })

    // Proceed with health check
    const health = await detailedHealthCheck()
    return healthResponse(health)
  } catch (error) {
    logger.error('Error in /api/health/detailed endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: '/api/health/detailed',
      clientIp,
      requestId,
    })

    // Return standardized error response
    return await createUnauthorizedError('Authentication check failed')
  }
}
