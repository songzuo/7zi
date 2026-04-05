/**
 * Notification Detail API Route
 *
 * Handle individual notification operations (read, delete)
 * Requires JWT authentication and user ownership verification
 */

import { NextRequest } from 'next/server'
import { notificationService } from '@/lib/services/notification'
import {
  createSuccessResponse,
  createNotFoundError,
  createErrorResponse,
  createForbiddenError,
  createUnauthorizedError,
} from '../../../../lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'
import { withCSRF } from '@/lib/middleware/csrf'

/**
 * GET /api/notifications/[id]
 *
 * Get a specific notification
 * Requires JWT authentication and user ownership
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Authenticate user
  const authResult = await authenticateJWT(request)

  if (!authResult.authenticated) {
    return createUnauthorizedError(authResult.error || 'Authentication required')
  }

  try {
    const { id: notificationId } = await params

    // Get notification
    const allNotifications = notificationService.getNotifications()
    const notification = allNotifications.find(n => n.id === notificationId)

    if (!notification) {
      return createNotFoundError('Notification not found')
    }

    // Verify ownership - user can only access their own notifications unless admin
    if (authResult.role !== 'admin' && notification.userId !== authResult.userId) {
      return createForbiddenError('You do not have permission to access this notification')
    }

    return createSuccessResponse(notification)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * PATCH /api/notifications/[id]
 *
 * Update a notification (mark as read)
 * Requires JWT authentication and user ownership
 * Requires CSRF protection
 */
export const PATCH = withCSRF(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Authenticate user
  const authResult = await authenticateJWT(request)

  if (!authResult.authenticated) {
    return createUnauthorizedError(authResult.error || 'Authentication required')
  }

  try {
    const { id: notificationId } = await params

    // Get notification to verify ownership
    const allNotifications = notificationService.getNotifications()
    const notification = allNotifications.find(n => n.id === notificationId)

    if (!notification) {
      return createNotFoundError('Notification not found')
    }

    // Verify ownership
    if (authResult.role !== 'admin' && notification.userId !== authResult.userId) {
      return createForbiddenError('You do not have permission to modify this notification')
    }

    const body = await request.json()

    if (body.read !== undefined && body.read === true) {
      notificationService.markAsRead(notificationId)
    }

    return createSuccessResponse({
      id: notificationId,
      message: 'Notification updated',
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
})

/**
 * DELETE /api/notifications/[id]
 *
 * Delete a notification
 * Requires JWT authentication and user ownership
 * Requires CSRF protection
 */
export const DELETE = withCSRF(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Authenticate user
  const authResult = await authenticateJWT(request)

  if (!authResult.authenticated) {
    return createUnauthorizedError(authResult.error || 'Authentication required')
  }

  try {
    const { id: notificationId } = await params

    // Get notification to verify ownership
    const allNotifications = notificationService.getNotifications()
    const notification = allNotifications.find(n => n.id === notificationId)

    if (!notification) {
      return createNotFoundError('Notification not found')
    }

    // Verify ownership
    if (authResult.role !== 'admin' && notification.userId !== authResult.userId) {
      return createForbiddenError('You do not have permission to delete this notification')
    }

    notificationService.deleteNotification(notificationId)

    return createSuccessResponse({
      id: notificationId,
      message: 'Notification deleted',
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
})