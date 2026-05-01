/**
 * Socket.IO Setup API Route
 *
 * Initializes the Socket.IO server for real-time notifications.
 * Requires JWT authentication with admin role for initialization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification'
import { createServer } from 'http'
import { createSuccessResponse, createErrorResponse, createUnauthorizedError, createForbiddenError } from '../../../../lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'

/**
 * GET /api/notifications/socket
 *
 * Returns Socket.IO server status and configuration
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  // Authenticate user
  const authResult = await authenticateJWT(request)

  if (!authResult.authenticated) {
    return createUnauthorizedError(authResult.error || 'Authentication required')
  }

  // Only admin can view socket status
  if (authResult.role !== 'admin') {
    return createForbiddenError('Admin role required to view socket status')
  }

  const io = notificationService.getIO()

  return createSuccessResponse({
    initialized: !!io,
    message: io ? 'Socket.IO server is running' : 'Socket.IO server not initialized yet',
  })
}

/**
 * POST /api/notifications/socket
 *
 * Initialize Socket.IO server (typically called on server startup)
 * Requires admin role
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const authResult = await authenticateJWT(request)

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

  // Only admin can initialize socket server
  if (authResult.role !== 'admin') {
    return createForbiddenError('Admin role required to initialize socket server')
  }

  try {
    const io = notificationService.getIO()

    if (io) {
      return createSuccessResponse({
        message: 'Socket.IO server already initialized',
      })
    }

    // Create a simple HTTP server for Socket.IO
    const httpServer = createServer()
    notificationService.initialize(httpServer)

    // Start the server on a different port
    const SOCKET_PORT = process.env.NOTIFICATION_SOCKET_PORT || 3001
    httpServer.listen(SOCKET_PORT, () => {
      logger.debug(`[Socket.IO] Server listening on port ${SOCKET_PORT}`)
    })

    // Set up periodic cleanup
    setInterval(
      () => {
        notificationService.cleanupExpired()
      },
      5 * 60 * 1000
    ) // Every 5 minutes

    return createSuccessResponse({
      message: 'Socket.IO server initialized',
      port: SOCKET_PORT,
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
