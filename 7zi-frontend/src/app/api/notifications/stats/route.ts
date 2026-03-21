/**
 * Notification Statistics API Route
 *
 * Get notification system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';

/**
 * GET /api/notifications/stats
 *
 * Get notification statistics
 */
export async function GET() {
  try {
    const stats = enhancedNotificationService.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[GET /api/notifications/stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
      },
      { status: 500 }
    );
  }
}
