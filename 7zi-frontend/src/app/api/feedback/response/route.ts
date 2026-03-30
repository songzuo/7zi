/**
 * Feedback Response API
 *
 * POST /api/feedback/response - Add admin response to feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { feedbackStorage } from '@/lib/db/feedback-storage';
import { validateAndSanitizeBody, sanitizeHtml } from '@/lib/validation-schemas';
import { z } from 'zod';

/**
 * Initialize feedback storage
 */
feedbackStorage.initialize();

/**
 * Response submission schema
 */
const responseSubmissionSchema = z.object({
  feedbackId: z.string(),
  response: z.string().min(1, '回复内容不能为空'),
  adminId: z.string(),
  adminName: z.string(),
});

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
 * POST /api/feedback/response - Add admin response
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userName, userEmail, userRole } = getUserInfo(request);

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

    const body = await request.json();

    // Validate input
    const validationResult = await validateAndSanitizeBody(body, responseSubmissionSchema);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          errors: validationResult.errors.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { feedbackId, response, adminId, adminName } = validationResult.data;

    // Update feedback with admin response
    const updated = feedbackStorage.updateFeedback(feedbackId, {
      adminResponse: sanitizeHtml(response),
      adminId,
      adminName,
      status: 'in_progress',
    });

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: '反馈不存在',
        },
        { status: 404 }
      );
    }

    // Add comment
    feedbackStorage.addComment(
      feedbackId,
      adminId,
      adminName,
      userEmail,
      response,
      true
    );

    return NextResponse.json({
      success: true,
      message: '回复已发送',
      data: updated,
    });
  } catch (error) {
    console.error('[Feedback Response API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send response',
        message: '发送回复失败',
      },
      { status: 500 }
    );
  }
}
