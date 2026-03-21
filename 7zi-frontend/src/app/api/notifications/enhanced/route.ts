/**
 * Enhanced Notifications API Route
 *
 * Provides endpoints for managing notifications with all delivery channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedNotificationService, NotificationType, NotificationPriority } from '@/lib/services/notification-enhanced';
import { EmailRecipient } from '@/lib/services/email';

/**
 * GET /api/notifications/enhanced
 *
 * Get notifications with enhanced features
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const userId = searchParams.get('userId') || undefined;
    const teamId = searchParams.get('teamId') || undefined;
    const taskId = searchParams.get('taskId') || undefined;
    const type = searchParams.get('type') as NotificationType | null;
    const priority = searchParams.get('priority') as NotificationPriority | null;
    const read = searchParams.get('read') === 'true' ? true : searchParams.get('read') === 'false' ? false : undefined;
    const since = searchParams.get('since') ? parseInt(searchParams.get('since')!, 10) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const notifications = enhancedNotificationService.getNotifications({
      userId,
      teamId,
      taskId,
      type: type || undefined,
      priority: priority || undefined,
      read,
      since,
      limit,
    });

    const unreadCount = enhancedNotificationService.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        count: notifications.length,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('[GET /api/notifications/enhanced] Error:', error);
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
 * POST /api/notifications/enhanced
 *
 * Create and send a notification with all delivery channels
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

    // Prepare delivery options
    const options = {
      skipEmail: body.skipEmail === true,
      skipPush: body.skipPush === true,
      skipStorage: body.skipStorage === true,
      forceEmail: body.forceEmail === true,
      emailRecipients: body.emailRecipients as EmailRecipient[] | undefined,
    };

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
    );

    return NextResponse.json(
      {
        success: result.success,
        data: {
          id: result.notificationId,
          emailSent: result.emailSent,
          message: result.success ? 'Notification sent' : 'Failed to send notification',
        },
        error: result.error,
      },
      { status: result.success ? 201 : 500 }
    );
  } catch (error) {
    console.error('[POST /api/notifications/enhanced] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send notification',
      },
      { status: 500 }
    );
  }
}
