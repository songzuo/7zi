/**
 * Enhanced Notifications API Route
 *
 * Provides endpoints for managing notifications with all delivery channels
 * Requires JWT authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedNotificationService } from '@/lib/services/notification-enhanced'
import { NotificationType, NotificationPriority } from '@/lib/services/notification-types'
import type { Notification } from '@/lib/services/notification-types'
import { EmailRecipient } from '@/lib/services/email'
import {
  createSuccessResponse,
  createValidationError,
  createErrorResponse,
} from '../../../../lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'

/**
 * GET /api/notifications/enhanced
 *
 * Get notifications with enhanced features
 * Requires JWT authentication
 */
export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams

    // User can only see their own notifications unless admin
    const userId =
      authResult.role === 'admin' ? searchParams.get('userId') || undefined : authResult.userId

    const teamId = searchParams.get('teamId') || undefined
    const taskId = searchParams.get('taskId') || undefined
    const type = searchParams.get('type') as NotificationType | null
    const priority = searchParams.get('priority') as NotificationPriority | null
    const read =
      searchParams.get('read') === 'true'
        ? true
        : searchParams.get('read') === 'false'
          ? false
          : undefined
    const since = searchParams.get('since') ? parseInt(searchParams.get('since')!, 10) : undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50

    const notifications = enhancedNotificationService.getNotifications({
      userId,
      teamId,
      taskId,
      type: type || undefined,
      priority: priority || undefined,
      read,
      since,
      limit,
    })

    const unreadCount = enhancedNotificationService.getUnreadCount(userId)

    return createSuccessResponse({
      notifications,
      meta: {
        count: notifications.length,
        unreadCount,
      },
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/notifications/enhanced
 *
 * Create and send a notification with all delivery channels
 * Requires JWT authentication
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

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.message) {
      return createValidationError('title and message are required')
    }

    // Prepare delivery options
    const options = {
      skipEmail: body.skipEmail === true,
      skipPush: body.skipPush === true,
      skipStorage: body.skipStorage === true,
      forceEmail: body.forceEmail === true,
      emailRecipients: body.emailRecipients as EmailRecipient[] | undefined,
    }

    // Send notification
    const result = await enhancedNotificationService.notify(
      {
        type: body.type || NotificationType.INFO,
        priority: body.priority || NotificationPriority.MEDIUM,
        title: body.title,
        message: body.message,
        data: body.data,
        userId: body.userId,
        teamId: body.teamId,
        taskId: body.taskId,
        expiresAt: body.expiresAt,
      },
      options
    )

    if (result.success) {
      return createSuccessResponse(
        {
          id: result.notificationId,
          emailSent: result.emailSent,
          message: 'Notification sent',
        },
        201
      )
    } else {
      return createErrorResponse(new Error(result.error || 'Failed to send notification'))
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
