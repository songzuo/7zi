/**
 * Notifications API Route
 *
 * REST API for managing notifications (CRUD operations)
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService, NotificationType, NotificationPriority, NotificationFilter } from '@/lib/services/notification';

/**
 * GET /api/notifications
 *
 * Get notifications with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filter: NotificationFilter = {};

    if (searchParams.get('type')) {
      filter.type = searchParams.get('type') as NotificationType;
    }

    if (searchParams.get('priority')) {
      filter.priority = searchParams.get('priority') as NotificationPriority;
    }

    if (searchParams.get('userId')) {
      filter.userId = searchParams.get('userId')!;
    }

    if (searchParams.get('teamId')) {
      filter.teamId = searchParams.get('teamId')!;
    }

    if (searchParams.get('taskId')) {
      filter.taskId = searchParams.get('taskId')!;
    }

    if (searchParams.get('read') !== null) {
      filter.read = searchParams.get('read') === 'true';
    }

    if (searchParams.get('since')) {
      filter.since = parseInt(searchParams.get('since')!, 10);
    }

    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50;

    // Get notifications
    const notifications = notificationService
      .getNotifications(filter)
      .slice(0, limit);

    // Get unread count
    const unreadCount = notificationService.getUnreadCount(filter);

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        count: notifications.length,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('[GET /api/notifications] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 *
 * Create a new notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.message) {
      return NextResponse.json(
        {
          success: false,
          error: 'title and message are required',
        },
        { status: 400 }
      );
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
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: notificationId,
          message: 'Notification created',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/notifications] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create notification',
      },
      { status: 500 }
    );
  }
}
