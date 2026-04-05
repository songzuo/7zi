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
 *
 * Rate limits applied to sensitive endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  feedbackStorage,
  type Feedback,
  type FeedbackFilter,
  type FeedbackRating,
} from '@/lib/db/feedback-storage'
import { validateAndSanitizeBody, sanitizeHtml } from '@/lib/validation-schemas'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { withAdmin, withAuth, type AuthResult } from '@/lib/auth/api-auth'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api-rate-limit'
import { createSuccessResponse, createBadRequestError, createNotFoundError, createForbiddenError, createErrorResponse } from '@/lib/api/error-handler'
import { withCSRF } from '@/lib/middleware/csrf'

/**
 * Initialize feedback storage
 */
feedbackStorage.initialize()

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
})

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
})

/**
 * Response submission schema
 */
const responseSubmissionSchema = z.object({
  feedbackId: z.string(),
  response: z.string().min(1, '回复内容不能为空'),
  adminId: z.string(),
  adminName: z.string(),
})

/**
 * GET /api/feedback - List feedbacks
 */
async function handleGET(request: NextRequest, context: { user: AuthResult }) {
  try {
    const { userId, role: userRole } = context.user
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') as Feedback['type'] | null
    const priority = searchParams.get('priority') as Feedback['priority'] | null
    const status = searchParams.get('status') as Feedback['status'] | null
    const rating = searchParams.get('rating')
    const searchQuery = searchParams.get('q')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return createBadRequestError('Invalid pagination parameters')
    }

    // Build filter
    const filter: FeedbackFilter = {}

    // Non-admin users can only see their own feedbacks
    if (userRole !== 'admin') {
      filter.userId = userId
    }

    if (type) filter.type = type
    if (priority) filter.priority = priority
    if (status) filter.status = status
    if (rating) {
      const parsedRating = parseInt(rating)
      if (parsedRating >= 1 && parsedRating <= 5) {
        filter.rating = parsedRating as FeedbackRating
      }
    }
    if (searchQuery) filter.searchQuery = searchQuery
    if (dateFrom) filter.dateFrom = parseInt(dateFrom)
    if (dateTo) filter.dateTo = parseInt(dateTo)

    // Fetch feedbacks
    const result = feedbackStorage.getFeedbacks(
      filter,
      { field: 'createdAt', order: 'desc' },
      page,
      limit
    )

    return createSuccessResponse(result)
  } catch (error) {
    console.error('[Feedback API] GET error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const GET = withAuth(handleGET)

/**
 * POST /api/feedback - Submit feedback
 *
 * Rate limit: 10 requests per minute
 */
async function handlePOST(request: NextRequest, context: { user: AuthResult }) {
  try {
    const userId = context.user.userId!
    const username = context.user.username!

    const body = await request.json()

    // Validate input
    const validationResult = await validateAndSanitizeBody(body, feedbackSubmissionSchema, 'html')

    if (!validationResult.success) {
      return createBadRequestError('Validation Error', {
        errors: validationResult.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    }

    const { type, priority, title, description, url, attachments, tags, rating } =
      validationResult.data

    // Create feedback
    const feedback = feedbackStorage.createFeedback({
      userId,
      userName: username,
      userEmail: `${userId}@example.com`,
      type,
      priority,
      status: 'pending',
      title: sanitizeHtml(title),
      description: sanitizeHtml(description),
      url: url || undefined,
      attachments: attachments || [],
      tags: tags || [],
      rating: rating as FeedbackRating,
    })

    return createSuccessResponse({
      id: feedback.id,
      type: feedback.type,
      title: feedback.title,
      status: feedback.status,
      createdAt: feedback.createdAt,
    }, 201)
  } catch (error) {
    console.error('[Feedback API] POST error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

// Apply both authentication and rate limiting to POST, with CSRF protection
export const POST = withAuth(
  withRateLimit(RATE_LIMIT_PRESETS.moderate, withCSRF(handlePOST))
)

/**
 * PATCH /api/feedback - Update feedback
 * Requires admin authentication
 */
async function handlePATCH(request: NextRequest, context: { user: AuthResult }) {
  try {
    const { userId, username: userName } = context.user

    const body = await request.json()

    // Validate input
    const validationResult = await validateAndSanitizeBody(body, feedbackUpdateSchema)

    if (!validationResult.success) {
      return createBadRequestError('Validation Error', {
        errors: validationResult.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    }

    const { feedbackId, status, adminResponse, adminId, adminName, priority } =
      validationResult.data

    // Build updates
    const updates: Partial<Feedback> = {}

    if (status) {
      updates.status = status

      // Set resolved_at or closed_at
      if (status === 'resolved') {
        updates.resolvedAt = Date.now()
      } else if (status === 'closed') {
        updates.closedAt = Date.now()
      }
    }

    if (adminResponse) {
      updates.adminResponse = sanitizeHtml(adminResponse)
      updates.adminId = adminId || userId
      updates.adminName = adminName || userName
    }

    if (priority) {
      updates.priority = priority
    }

    // Update feedback
    const updated = feedbackStorage.updateFeedback(feedbackId, updates)

    if (!updated) {
      return createNotFoundError('反馈不存在')
    }

    // Add comment if admin response is provided
    if (adminResponse && adminId && adminName) {
      feedbackStorage.addComment(feedbackId, adminId, adminName, `${adminId}@example.com`, adminResponse, true)
    }

    return createSuccessResponse({
      message: '反馈已更新',
      data: updated,
    })
  } catch (error) {
    console.error('[Feedback API] PATCH error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const PATCH = withAdmin(withCSRF(handlePATCH))

/**
 * DELETE /api/feedback - Delete feedback
 * Requires admin authentication
 */
async function handleDELETE(request: NextRequest, context: { user: AuthResult }) {
  try {
    const { searchParams } = new URL(request.url)
    const feedbackId = searchParams.get('id')

    if (!feedbackId) {
      return createBadRequestError('缺少反馈 ID')
    }

    // Delete feedback
    const deleted = feedbackStorage.deleteFeedback(feedbackId)

    if (!deleted) {
      return createNotFoundError('反馈不存在')
    }

    return createSuccessResponse({ message: '反馈已删除' })
  } catch (error) {
    console.error('[Feedback API] DELETE error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const DELETE = withAdmin(withCSRF(handleDELETE))

/**
 * GET /api/feedback/stats - Get statistics
 * Requires admin authentication
 */
async function handleGET_STATS(request: NextRequest, context: { user: AuthResult }) {
  try {
    // Get stats
    const stats = feedbackStorage.getStats()

    return createSuccessResponse({ stats })
  } catch (error) {
    console.error('[Feedback API] GET_STATS error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const GET_STATS = withAdmin(handleGET_STATS)

/**
 * POST /api/feedback/response - Add admin response
 * Requires admin authentication
 */
async function handlePOST_RESPONSE(request: NextRequest, context: { user: AuthResult }) {
  try {
    const { userId, username: userName } = context.user

    const body = await request.json()

    // Validate input
    const validationResult = await validateAndSanitizeBody(body, responseSubmissionSchema)

    if (!validationResult.success) {
      return createBadRequestError('Validation Error', {
        errors: validationResult.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    }

    const { feedbackId, response, adminId, adminName } = validationResult.data

    // Update feedback with admin response
    const updated = feedbackStorage.updateFeedback(feedbackId, {
      adminResponse: sanitizeHtml(response),
      adminId,
      adminName,
      status: 'in_progress',
    })

    if (!updated) {
      return createNotFoundError('反馈不存在')
    }

    // Add comment
    feedbackStorage.addComment(feedbackId, adminId, adminName, `${adminId}@example.com`, response, true)

    return createSuccessResponse({
      message: '回复已发送',
      data: updated,
    })
  } catch (error) {
    console.error('[Feedback API] POST_RESPONSE error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const POST_RESPONSE = withAdmin(withCSRF(handlePOST_RESPONSE))

/**
 * GET /api/feedback/export - Export feedbacks as CSV
 * Requires admin authentication
 */
async function handleGET_EXPORT(request: NextRequest, context: { user: AuthResult }) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as Feedback['type'] | null
    const priority = searchParams.get('priority') as Feedback['priority'] | null
    const status = searchParams.get('status') as Feedback['status'] | null

    // Build filter
    const filter: FeedbackFilter = {}
    if (type) filter.type = type
    if (priority) filter.priority = priority
    if (status) filter.status = status

    // Fetch all feedbacks
    const result = feedbackStorage.getFeedbacks(
      filter,
      { field: 'createdAt', order: 'desc' },
      1,
      10000
    )

    // Generate CSV
    const headers = [
      'ID',
      '用户',
      '邮箱',
      '类型',
      '优先级',
      '状态',
      '标题',
      '描述',
      '评分',
      'URL',
      '标签',
      '创建时间',
    ]
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
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=feedbacks_${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (error) {
    console.error('[Feedback API] GET_EXPORT error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const GET_EXPORT = withAdmin(handleGET_EXPORT)
