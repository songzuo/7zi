/**
 * Notification Statistics API Route
 *
 * Get notification system statistics
 * Requires JWT authentication with admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../../../lib/api/error-handler';
import { authenticateJWT } from '@/lib/auth/api-auth';

/**
 * GET /api/notifications/stats
 *
 * Get notification statistics
 * Requires admin role
 */
export async function GET(request: NextRequest) {
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

  // Only admin can view system-wide statistics
  if (authResult.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Admin role required to view system statistics',
      },
      { status: 403 }
    );
  }

  try {
    const stats = enhancedNotificationService.getStats();

    // Transform stats to match expected format
    const transformedStats = {
      total: stats.totalNotifications || 0,
      unread: stats.unreadNotifications || 0,
      totalUsers: stats.totalUsers || 0,
      totalDeliveries: stats.totalDeliveries || 0,
      emailEnabled: stats.emailEnabled || false,
    };

    return createSuccessResponse(transformedStats);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
