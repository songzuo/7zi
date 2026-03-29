/**
 * User Notification Preferences API Route
 *
 * Manage user notification preferences
 * Requires JWT authentication and user ownership verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedNotificationService, UserNotificationPreferences, NotificationPriority } from '@/lib/services/notification-enhanced';
import {
  createSuccessResponse,
  createValidationError,
  createErrorResponse,
} from '../../../../../lib/api/error-handler';
import { authenticateJWT } from '@/lib/auth/api-auth';

/**
 * GET /api/notifications/preferences/[userId]
 *
 * Get user notification preferences
 * Requires JWT authentication and ownership verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Authenticate user
  const authResult = await authenticateJWT(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      },
      { status: 401 }
    );
  }

  // Verify ownership - user can only access their own preferences unless admin
  if (authResult.role !== 'admin' && authResult.userId !== params.userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'You can only access your own notification preferences',
      },
      { status: 403 }
    );
  }

  try {
    const userId = params.userId;

    const preferences = enhancedNotificationService.getUserPreferences(userId);

    if (!preferences) {
      // Return default preferences
      return createSuccessResponse({
        userId,
        emailEnabled: true,
        emailThreshold: NotificationPriority.HIGH,
        pushEnabled: true,
        pushThreshold: NotificationPriority.MEDIUM,
        digestEnabled: false,
        digestFrequency: 'daily',
        timezone: 'UTC',
      });
    }

    return createSuccessResponse(preferences);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * PUT /api/notifications/preferences/[userId]
 *
 * Update user notification preferences
 * Requires JWT authentication and ownership verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Authenticate user
  const authResult = await authenticateJWT(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      },
      { status: 401 }
    );
  }

  // Verify ownership - user can only modify their own preferences unless admin
  if (authResult.role !== 'admin' && authResult.userId !== params.userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'You can only modify your own notification preferences',
      },
      { status: 403 }
    );
  }

  try {
    const userId = params.userId;
    const body = await request.json();

    // Validate priority thresholds
    const validPriorities = [NotificationPriority.LOW, NotificationPriority.MEDIUM, NotificationPriority.HIGH, NotificationPriority.URGENT];

    if (body.emailThreshold && !validPriorities.includes(body.emailThreshold)) {
      return createValidationError('Invalid emailThreshold value');
    }

    if (body.pushThreshold && !validPriorities.includes(body.pushThreshold)) {
      return createValidationError('Invalid pushThreshold value');
    }

    // Update preferences
    enhancedNotificationService.setUserPreferences({
      userId,
      emailEnabled: body.emailEnabled !== undefined ? body.emailEnabled : true,
      emailThreshold: body.emailThreshold || NotificationPriority.HIGH,
      pushEnabled: body.pushEnabled !== undefined ? body.pushEnabled : true,
      pushThreshold: body.pushThreshold || NotificationPriority.MEDIUM,
      digestEnabled: body.digestEnabled || false,
      digestFrequency: body.digestFrequency || 'daily',
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
      timezone: body.timezone || 'UTC',
    });

    // Fetch updated preferences
    const preferences = enhancedNotificationService.getUserPreferences(userId);

    return createSuccessResponse({
      ...preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
