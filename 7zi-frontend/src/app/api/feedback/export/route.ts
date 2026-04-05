/**
 * Feedback Export API
 *
 * GET /api/feedback/export - Export feedbacks as CSV
 */

import { NextRequest, NextResponse } from 'next/server'
import { feedbackStorage, type Feedback, type FeedbackFilter } from '@/lib/db/feedback-storage'
import { createForbiddenError, createErrorResponse } from '@/lib/api/error-handler'

/**
 * Initialize feedback storage
 */
feedbackStorage.initialize()

/**
 * Helper: Extract user info from request headers
 */
function getUserInfo(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'anonymous'
  const userName = request.headers.get('x-user-name') || 'Anonymous User'
  const userEmail = request.headers.get('x-user-email') || 'anonymous@example.com'
  const userRole = request.headers.get('x-user-role') || 'user'

  return { userId, userName, userEmail, userRole }
}

/**
 * GET /api/feedback/export - Export feedbacks as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const { userRole } = getUserInfo(request)

    // Check admin permission
    if (userRole !== 'admin') {
      return createForbiddenError('需要管理员权限')
    }

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
      '管理员回复',
      '创建时间',
      '更新时间',
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
      `"${(f.adminResponse || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      new Date(f.createdAt).toISOString(),
      new Date(f.updatedAt).toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=feedbacks_${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (error) {
    console.error('[Feedback Export API] GET error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
