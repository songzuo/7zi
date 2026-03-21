/**
 * Notification Statistics API Route
 *
 * Get notification system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../../../lib/api/error-handler';

/**
 * GET /api/notifications/stats
 *
 * Get notification statistics
 */
export async function GET() {
  try {
    const stats = enhancedNotificationService.getStats();

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
