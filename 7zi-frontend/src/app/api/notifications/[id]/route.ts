/**
 * Notification Detail API Route
 *
 * Handle individual notification operations (read, delete)
 * Requires JWT authentication and user ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification'
import {
  createSuccessResponse,
  createNotFoundError,
  createErrorResponse,
  createForbiddenError,
} from '../../../../lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'

/**
 * GET /api/notifications/[id]
 *
 * Get a specific notification
 * Requires JWT authentication and user ownership
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const notificationId = params.id

    // Get notification
    const allNotifications = notificationService.getNotifications()
    const notification = allNotifications.find(n => n.id === notificationId)

    if (!notification) {
      return createNotFoundError('Notification not found')
    }

    // Verify ownership - user can only access their own notifications unless admin
    if (authResult.role !== 'admin' && notification.userId !== authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to access this notification',
        },
        { status: 403 }
      )
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
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const notificationId = params.id

    // Get notification to verify ownership
    const allNotifications = notificationService.getNotifications()
    const notification = allNotifications.find(n => n.id === notificationId)

    if (!notification) {
      return createNotFoundError('Notification not found')
    }

    // Verify ownership
    if (authResult.role !== 'admin' && notification.userId !== authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to modify this notification',
        },
        { status: 403 }
      )
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
}

/**
 * DELETE /api/notifications/[id]
 *
 * Delete a notification
 * Requires JWT authentication and user ownership
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const notificationId = params.id

    // Get notification to verify ownership
    const allNotifications = notificationService.getNotifications()
    const notification = allNotifications.find(n => n.id === notificationId)

    if (!notification) {
      return createNotFoundError('Notification not found')
    }

    // Verify ownership
    if (authResult.role !== 'admin' && notification.userId !== authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to delete this notification',
        },
        { status: 403 }
      )
    }

    notificationService.deleteNotification(notificationId)

    return createSuccessResponse({
      id: notificationId,
      message: 'Notification deleted',
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
