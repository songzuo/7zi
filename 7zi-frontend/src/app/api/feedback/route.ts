/**
 * Feedback API Routes
 *
 * Provides endpoints for feedback management:
 * - POST /api/feedback - Submit feedback
 * - GET /api/feedback - List feedbacks (with filters)
 * - GET /api/feedback/stats - Get statistics
 * - PATCH /api/feedback - Update feedback status/response
 * - DELETE /api/feedback - Delete feedback
 * - POST /api/feedback/response - Add admin response
 * - GET /api/feedback/export - Export feedbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { feedbackStorage, type Feedback } from '@/lib/db/feedback-storage';
import { validateAndSanitizeBody, sanitizeHtml } from '@/lib/validation-schemas';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize feedback storage
 */
feedbackStorage.initialize();

/**
 * Feedback submission schema
 */
const feedbackSubmissionSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'complaint', 'praise', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  title: z.string().min(1, '标题不能为空').max(100, '标题最多100个字符'),
  description: z.string().min(10, '描述至少10个字符').max(1000, '描述最多1000个字符'),
  url: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional(),
  attachments: z.array(z.string().max(500)).max(5, '最多上传5个附件').optional(),
  tags: z.array(z.string()).max(10, '最多10个标签').optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

/**
 * Feedback update schema
 */
const feedbackUpdateSchema = z.object({
  feedbackId: z.string(),
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed', 'rejected']).optional(),
  adminResponse: z.string().optional(),
  adminId: z.string().optional(),
  adminName: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

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
 * GET /api/feedback - List feedbacks
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, userRole } = getUserInfo(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') as Feedback['type'] | null;
    const priority = searchParams.get('priority') as Feedback['priority'] | null;
    const status = searchParams.get('status') as Feedback['status'] | null;
    const rating = searchParams.get('rating');
    const searchQuery = searchParams.get('q');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Build filter
    const filter: FeedbackFilter = {};

    // Non-admin users can only see their own feedbacks
    if (userRole !== 'admin') {
      filter.userId = userId;
    }

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (rating) filter.rating = parseInt(rating);
    if (searchQuery) filter.searchQuery = searchQuery;
    if (dateFrom) filter.dateFrom = parseInt(dateFrom);
    if (dateTo) filter.dateTo = parseInt(dateTo);

    // Fetch feedbacks
    const result = feedbackStorage.getFeedbacks(
      filter,
      { field: 'createdAt', order: 'desc' },
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Feedback API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedbacks',
        message: '获取反馈列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback - Submit feedback
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userName, userEmail } = getUserInfo(request);

    const body = await request.json();

    // Validate input
    const validationResult = await validateAndSanitizeBody(body, feedbackSubmissionSchema, 'html');

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          errors: validationResult.errors.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { type, priority, title, description, url, attachments, tags, rating } = validationResult.data;

    // Create feedback
    const feedback = feedbackStorage.createFeedback({
      userId,
      userName,
      userEmail,
      type,
      priority,
      status: 'pending',
      title: sanitizeHtml(title),
      description: sanitizeHtml(description),
      url: url || undefined,
      attachments: attachments || [],
      tags: tags || [],
      rating: rating,
    });

    return NextResponse.json(
      {
        success: true,
        message: '感谢您的反馈！我们会尽快处理。',
        data: {
          id: feedback.id,
          type: feedback.type,
          title: feedback.title,
          status: feedback.status,
          createdAt: feedback.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Feedback API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Submission Failed',
        message: '反馈提交失败，请稍后重试',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feedback - Update feedback
 */
export async function PATCH(request: NextRequest) {
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
    const validationResult = await validateAndSanitizeBody(body, feedbackUpdateSchema);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          errors: validationResult.errors.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { feedbackId, status, adminResponse, adminId, adminName, priority } = validationResult.data;

    // Build updates
    const updates: Partial<Feedback> = {};

    if (status) {
      updates.status = status;
      
      // Set resolved_at or closed_at
      if (status === 'resolved') {
        updates.resolvedAt = Date.now();
      } else if (status === 'closed') {
        updates.closedAt = Date.now();
      }
    }

    if (adminResponse) {
      updates.adminResponse = sanitizeHtml(adminResponse);
      updates.adminId = adminId || userId;
      updates.adminName = adminName || userName;
    }

    if (priority) {
      updates.priority = priority;
    }

    // Update feedback
    const updated = feedbackStorage.updateFeedback(feedbackId, updates);

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

    // Add comment if admin response is provided
    if (adminResponse && adminId && adminName) {
      feedbackStorage.addComment(
        feedbackId,
        adminId,
        adminName,
        userEmail,
        adminResponse,
        true
      );
    }

    return NextResponse.json({
      success: true,
      message: '反馈已更新',
      data: updated,
    });
  } catch (error) {
    console.error('[Feedback API] PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Update Failed',
        message: '更新失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedback - Delete feedback
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('id');

    if (!feedbackId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: '缺少反馈 ID',
        },
        { status: 400 }
      );
    }

    // Delete feedback
    const deleted = feedbackStorage.deleteFeedback(feedbackId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: '反馈不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '反馈已删除',
    });
  } catch (error) {
    console.error('[Feedback API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Delete Failed',
        message: '删除失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback/stats - Get statistics
 */
export async function GET_STATS(request: NextRequest) {
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
    console.error('[Feedback API] GET_STATS error:', error);
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

/**
 * POST /api/feedback/response - Add admin response
 */
export async function POST_RESPONSE(request: NextRequest) {
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
          errors: validationResult.errors.issues.map(err => ({
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
    console.error('[Feedback API] POST_RESPONSE error:', error);
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

/**
 * GET /api/feedback/export - Export feedbacks as CSV
 */
export async function GET_EXPORT(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as Feedback['type'] | null;
    const priority = searchParams.get('priority') as Feedback['priority'] | null;
    const status = searchParams.get('status') as Feedback['status'] | null;

    // Build filter
    const filter: FeedbackFilter = {};
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    // Fetch all feedbacks
    const result = feedbackStorage.getFeedbacks(filter, { field: 'createdAt', order: 'desc' }, 1, 10000);

    // Generate CSV
    const headers = ['ID', '用户', '邮箱', '类型', '优先级', '状态', '标题', '描述', '评分', 'URL', '标签', '创建时间'];
    const rows = result.feedbacks.map(f => [
      f.id,
      f.userName,
      f.userEmail,
      f.type,
      f.priority,
      f.status,
      `"${f.title.replace(/"/g, '""')}"`,
      `"${f.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      f.rating || '',
      f.url || '',
      f.tags.join('; '),
      new Date(f.createdAt).toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=feedbacks_${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  } catch (error) {
    console.error('[Feedback API] GET_EXPORT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Export Failed',
        message: '导出失败',
      },
      { status: 500 }
    );
  }
}
