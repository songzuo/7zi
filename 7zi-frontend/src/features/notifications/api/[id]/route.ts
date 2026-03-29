/**
 * Notification Detail API Route
 *
 * Handle individual notification operations (read, delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification';
import {
  createSuccessResponse,
  createNotFoundError,
  createErrorResponse,
} from '../../../../lib/api/error-handler';

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
      return createNotFoundError('Notification not found');
    }

    return createSuccessResponse(notification);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
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

    return createSuccessResponse({
      id: notificationId,
      message: 'Notification updated',
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
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

    return createSuccessResponse({
      id: notificationId,
      message: 'Notification deleted',
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
