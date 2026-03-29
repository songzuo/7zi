/**
 * Feedback Statistics API
 *
 * GET /api/feedback/stats - Get feedback statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { feedbackStorage } from '@/lib/db/feedback-storage';

/**
 * Initialize feedback storage
 */
feedbackStorage.initialize();

/**
 * Helper: Extract user info from request headers
 */
function getUserInfo(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'anonymous';
  const userName = request.headers.get('x-user-name') || 'Anonymous User';
  const userEmail = request.headers.get('x-user-email') || 'anonymous@example.com';
  const userRole = request.headers.get('x-user-role') || 'user';

  return { userId, userName, userEmail, userRole };
}

/**
 * GET /api/feedback/stats - Get statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { userRole } = getUserInfo(request);

    // Check admin permission
    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: '需要管理员权限',
        },
        { status: 403 }
      );
    }

    // Get stats
    const stats = feedbackStorage.getStats();

    return NextResponse.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('[Feedback Stats API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        message: '获取统计信息失败',
      },
      { status: 500 }
    );
  }
}
