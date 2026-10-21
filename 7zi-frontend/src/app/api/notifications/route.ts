/**
 * Notifications API Route
 *
 * REST API for managing notifications (CRUD operations)
 * Requires JWT authentication
 */

import { NextRequest } from 'next/server'
import {
  notificationService,
  NotificationType,
  NotificationPriority,
  NotificationFilter,
} from '@/lib/services/notification'
import {
  createSuccessResponse,
  createValidationError,
  createErrorResponse,
  createUnauthorizedError,
} from '@/lib/api/error-handler'
import { authenticateJWT, AuthResult } from '@/lib/auth/api-auth'
import { withCSRF } from '@/lib/middleware/csrf'
import { createHotDataCache, CachePresets } from '@/lib/cache'

// Cache for notifications (short TTL due to frequent updates)
const notificationsCache = createHotDataCache<unknown>(CachePresets.SHORT)

/**
 * GET /api/notifications
 *
 * Get notifications with optional filters
 * Requires JWT authentication
 */
export async function GET(request: NextRequest) {
  // Authenticate user
  const authResult = await authenticateJWT(request)

  if (!authResult.authenticated) {
    return createUnauthorizedError(authResult.error || 'Authentication required')
  }

  try {
    const searchParams = request.nextUrl.searchParams

    // Parse filters - user can only see their own notifications unless admin
    const filter: NotificationFilter = {
      // Enforce user ownership (non-admin can only see their own notifications)
      userId:
        authResult.role === 'admin' ? searchParams.get('userId') || undefined : authResult.userId,
    }

    if (searchParams.get('type')) {
      filter.type = searchParams.get('type') as NotificationType
    }

    if (searchParams.get('priority')) {
      filter.priority = searchParams.get('priority') as NotificationPriority
    }

    if (searchParams.get('teamId')) {
      filter.teamId = searchParams.get('teamId')!
    }

    if (searchParams.get('taskId')) {
      filter.taskId = searchParams.get('taskId')!
    }

    if (searchParams.get('read') !== null) {
      filter.read = searchParams.get('read') === 'true'
    }

    if (searchParams.get('since')) {
      filter.since = parseInt(searchParams.get('since')!, 10)
    }

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50

    // Generate cache key (user-specific)
    const cacheKey = {
      userId: authResult.userId!,
      endpoint: 'notifications',
      params: { ...filter, limit },
      version: '1',
    }

    // Check cache first (only for non-filtered queries to keep cache manageable)
    if (!filter.type && !filter.priority && !filter.read && !filter.since) {
      const cachedResult = notificationsCache.get(cacheKey)
      if (cachedResult) {
        return createSuccessResponse(cachedResult)
      }
    }

    // Get notifications
    const notifications = notificationService.getNotifications(filter).slice(0, limit)

    // Get unread count
    const unreadCount = notificationService.getUnreadCount(filter)

    const response = {
      notifications,
      meta: {
        count: notifications.length,
        unreadCount,
      },
    }

    // Cache the response (only for non-filtered queries)
    if (!filter.type && !filter.priority && !filter.read && !filter.since) {
      notificationsCache.set(cacheKey, response)
    }

    return createSuccessResponse(response)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/notifications
 *
 * Create a new notification
 * Requires JWT authentication
 * Requires CSRF protection
 */
export const POST = withCSRF(async (request: NextRequest) => {
  // Authenticate user
  const authResult = await authenticateJWT(request)

  if (!authResult.authenticated) {
    return createUnauthorizedError(authResult.error || 'Authentication required')
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.message) {
      return createValidationError('title and message are required')
    }

    // Create notification
    const notificationId = await notificationService.notify({
      type: body.type || NotificationType.INFO,
      priority: body.priority || NotificationPriority.MEDIUM,
      title: body.title,
      message: body.message,
      data: body.data,
      userId: body.userId,
      teamId: body.teamId,
      taskId: body.taskId,
      expiresAt: body.expiresAt,
    })

    // Invalidate user's notification cache since a new notification was added
    if (authResult.userId) {
      notificationsCache.deleteByUser(authResult.userId)
    }

    return createSuccessResponse(
      {
        id: notificationId,
        message: 'Notification created',
      },
      201
    )
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
})
