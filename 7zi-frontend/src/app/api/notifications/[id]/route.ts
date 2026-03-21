/**
 * Notification Detail API Route
 *
 * Handle individual notification operations (read, delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification';

/**
 * GET /api/notifications/[id]
 *
 * Get a specific notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;

    // Note: Since notificationService.getNotifications returns filtered results,
    // we'll need to search through all notifications
    const allNotifications = notificationService.getNotifications();
    const notification = allNotifications.find(n => n.id === notificationId);

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notification not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error(`[GET /api/notifications/${params.id}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notification',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/[id]
 *
 * Update a notification (mark as read)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    const body = await request.json();

    if (body.read !== undefined && body.read === true) {
      notificationService.markAsRead(notificationId);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: notificationId,
        message: 'Notification updated',
      },
    });
  } catch (error) {
    console.error(`[PATCH /api/notifications/${params.id}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update notification',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 *
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    notificationService.deleteNotification(notificationId);

    return NextResponse.json({
      success: true,
      data: {
        id: notificationId,
        message: 'Notification deleted',
      },
    });
  } catch (error) {
    console.error(`[DELETE /api/notifications/${params.id}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete notification',
      },
      { status: 500 }
    );
  }
}
