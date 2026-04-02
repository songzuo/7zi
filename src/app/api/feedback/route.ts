import { NextRequest, NextResponse } from 'next/server'
/**
 * Feedback API endpoints
 */

import { detectSpam } from '@/lib/feedback/anti-spam'
import {
  CreateFeedbackDto,
  Feedback,
  FeedbackFilters,
  FeedbackListResponse,
  UpdateFeedbackDto,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
} from '@/types/feedback'
import { getDatabaseAsync, DatabaseConnection } from '@/lib/db/index'
import { logger } from '@/lib/logger'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
} from '@/lib/api/error-handler'
import { logRequestStart, logRequestComplete, logRequestError } from '@/lib/api/api-logger'
import { getOptimizedFeedbackStats } from '@/lib/db/query-optimizations'

/**
 * GET /api/feedback
 * Get feedback list with filters
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const searchParams = request.nextUrl.searchParams

    // Build filters
    const filters: FeedbackFilters = {
      user_id: searchParams.get('user_id') || undefined,
      type: searchParams.get('type') as FeedbackType | undefined,
      status: searchParams.get('status') as FeedbackStatus | undefined,
      priority: searchParams.get('priority') as FeedbackPriority | undefined,
      rating_min: searchParams.get('rating_min')
        ? parseInt(searchParams.get('rating_min')!)
        : undefined,
      rating_max: searchParams.get('rating_max')
        ? parseInt(searchParams.get('rating_max')!)
        : undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      search: searchParams.get('search') || undefined,
      sort_by: (searchParams.get('sort_by') as FeedbackFilters['sort_by']) || 'created_at',
      sort_order: (searchParams.get('sort_order') as FeedbackFilters['sort_order']) || 'desc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.get('per_page')
        ? Math.min(parseInt(searchParams.get('per_page')!), 100)
        : 20,
    }

    const db = await getDatabaseAsync()

    // Build WHERE clause
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.user_id) {
      conditions.push('user_id = ?')
      params.push(filters.user_id)
    }
    if (filters.type) {
      conditions.push('type = ?')
      params.push(filters.type)
    }
    if (filters.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    if (filters.priority) {
      conditions.push('priority = ?')
      params.push(filters.priority)
    }
    if (filters.rating_min) {
      conditions.push('rating >= ?')
      params.push(filters.rating_min)
    }
    if (filters.rating_max) {
      conditions.push('rating <= ?')
      params.push(filters.rating_max)
    }
    if (filters.start_date) {
      conditions.push('created_at >= ?')
      params.push(filters.start_date)
    }
    if (filters.end_date) {
      conditions.push('created_at <= ?')
      params.push(filters.end_date)
    }
    if (filters.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total
    const countResult = db.queryRows(
      `SELECT COUNT(*) as total FROM feedbacks ${whereClause}`,
      params
    )[0] as { total: number }
    const total = countResult.total

    // Get paginated results
    const offset = (filters.page! - 1) * filters.per_page!
    const orderClause =
      filters.sort_by === 'rating'
        ? 'ORDER BY rating DESC, created_at DESC'
        : `ORDER BY ${filters.sort_by} ${filters.sort_order!.toUpperCase()}`

    const feedbacks = db.queryRows(
      `SELECT * FROM feedbacks ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, filters.per_page, offset]
    ) as unknown as Feedback[]

    // Parse metadata JSON
    const feedbacksWithParsedMetadata = feedbacks.map(f => ({
      ...f,
      metadata: f.metadata ? JSON.parse(f.metadata as unknown as string) : undefined,
    }))

    // Get statistics
    const stats = await getFeedbackStats(db)

    const response = createSuccessResponse<FeedbackListResponse>({
      feedbacks: feedbacksWithParsedMetadata,
      meta: {
        total,
        page: filters.page!,
        per_page: filters.per_page!,
        total_pages: Math.ceil(total / filters.per_page!),
      },
      stats,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/feedback
 * Create new feedback
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const body = await request.json()

    // Validate request body
    const {
      type,
      rating,
      title,
      description,
      email,
      images,
      metadata: feedbackMetadata,
    } = body as CreateFeedbackDto

    if (!type || !rating || !title || !description) {
      const response = await createValidationError(
        'type, rating, title, and description are required'
      )
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      const response = await createValidationError('Rating must be between 1 and 5')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate title length
    if (title.length > 100) {
      const response = await createValidationError('Title must be less than 100 characters')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate description length
    if (description.length > 1000) {
      const response = await createValidationError('Description must be less than 1000 characters')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Get user ID from session (for now, use a placeholder)
    // In production, this would come from auth token
    const userId = body.user_id || 'anonymous'

    // Anti-spam check
    const spamCheck = await detectSpam(userId, `${title}\n${description}`, 'feedback')
    if (spamCheck.is_spam) {
      logger.warn('Spam feedback rejected', {
        category: 'feedback',
        userId,
        reason: spamCheck.reason,
        score: spamCheck.score,
      })

      const response = await createUnauthorizedError('Feedback rejected due to spam detection')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    const db = await getDatabaseAsync()

    // Create feedback
    const feedbackId = crypto.randomUUID()
    const now = new Date().toISOString()

    db.exec(
      `INSERT INTO feedbacks (id, user_id, type, rating, title, description, email, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedbackId,
        userId,
        type,
        rating,
        title,
        description,
        email || null,
        now,
        now,
        feedbackMetadata ? JSON.stringify(feedbackMetadata) : null,
      ]
    )

    // Process image attachments if provided
    if (images && images.length > 0) {
      for (const image of images) {
        // In production, you would upload the image to storage and get a URL
        // For now, we'll just store the filename
        const attachmentId = crypto.randomUUID()
        db.exec(
          `INSERT INTO feedback_attachments (id, feedback_id, filename, url, size, mimetype, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            attachmentId,
            feedbackId,
            image.name || 'image.jpg',
            `/uploads/feedback/${attachmentId}`,
            image.size || 0,
            image.type || 'image/jpeg',
            now,
          ]
        )
      }
    }

    // Get the created feedback
    const feedback = db.queryRows('SELECT * FROM feedbacks WHERE id = ?', [
      feedbackId,
    ])[0] as unknown as Feedback

    const response = createSuccessResponse({
      ...feedback,
      metadata: feedback.metadata ? JSON.parse(feedback.metadata as unknown as string) : undefined,
    })

    logger.info('Feedback created', {
      category: 'feedback',
      feedbackId,
      userId,
      type,
      rating,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * GET /api/feedback/[id]
 * Get single feedback
 */
export async function GET_FEEDBACK(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const { id } = params

    const db = await getDatabaseAsync()

    const feedback = db.queryRows('SELECT * FROM feedbacks WHERE id = ?', [id])[0] as unknown as
      | Feedback
      | undefined

    if (!feedback) {
      const response = await createNotFoundError('Feedback not found')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    const response = createSuccessResponse({
      ...feedback,
      metadata: feedback.metadata ? JSON.parse(feedback.metadata as unknown as string) : undefined,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * PATCH /api/feedback/[id]
 * Update feedback (admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()

    // Check admin permissions (simplified - in production, verify JWT token)
    const isAdmin = body.admin_id === 'admin' // Placeholder

    if (!isAdmin) {
      const response = await createForbiddenError('Admin access required')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    const updates: UpdateFeedbackDto = {
      status: body.status,
      priority: body.priority,
      admin_notes: body.admin_notes,
      metadata: body.metadata,
    }

    const db = await getDatabaseAsync()

    // Check if feedback exists
    const existing = db.queryRows('SELECT * FROM feedbacks WHERE id = ?', [id])[0] as unknown as
      | Feedback
      | undefined

    if (!existing) {
      const response = await createNotFoundError('Feedback not found')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Build update query
    const setStatements: string[] = []
    const updateParams: unknown[] = []

    if (updates.status) {
      setStatements.push('status = ?')
      updateParams.push(updates.status)

      // Update reviewed_at or resolved_at timestamps
      if (updates.status === 'reviewed' && !existing.reviewed_at) {
        setStatements.push('reviewed_at = ?')
        updateParams.push(new Date().toISOString())
      }
      if (updates.status === 'resolved' && !existing.resolved_at) {
        setStatements.push('resolved_at = ?')
        updateParams.push(new Date().toISOString())
      }
    }
    if (updates.priority) {
      setStatements.push('priority = ?')
      updateParams.push(updates.priority)
    }
    if (updates.admin_notes !== undefined) {
      setStatements.push('admin_notes = ?')
      updateParams.push(updates.admin_notes)
    }
    if (updates.metadata) {
      setStatements.push('metadata = ?')
      updateParams.push(JSON.stringify(updates.metadata))
    }

    setStatements.push('updated_at = ?')
    updateParams.push(new Date().toISOString())

    updateParams.push(id)

    db.exec(`UPDATE feedbacks SET ${setStatements.join(', ')} WHERE id = ?`, updateParams)

    // Get updated feedback
    const feedback = db.queryRows('SELECT * FROM feedbacks WHERE id = ?', [
      id,
    ])[0] as unknown as Feedback

    const response = createSuccessResponse({
      ...feedback,
      metadata: feedback.metadata ? JSON.parse(feedback.metadata as unknown as string) : undefined,
    })

    logger.info('Feedback updated', {
      category: 'feedback',
      feedbackId: id,
      adminId: body.admin_id,
      updates,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * DELETE /api/feedback/[id]
 * Delete feedback (admin only)
 */
export async function DELETE_FEEDBACK(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const { id } = params

    // Check admin permissions (simplified - in production, verify JWT token)
    const _authHeader = request.headers.get('authorization')
    // In production, verify JWT token here

    const db = await getDatabaseAsync()

    // Check if feedback exists
    const existing = db.queryRows('SELECT * FROM feedbacks WHERE id = ?', [id])[0] as unknown as
      | Feedback
      | undefined

    if (!existing) {
      const response = await createNotFoundError('Feedback not found')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Delete feedback
    db.exec('DELETE FROM feedbacks WHERE id = ?', [id])

    const response = createSuccessResponse({
      id,
      message: 'Feedback deleted successfully',
    })

    logger.info('Feedback deleted', {
      category: 'feedback',
      feedbackId: id,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Helper function to get feedback statistics (optimized)
 */
async function getFeedbackStats(db: DatabaseConnection) {
  // Use optimized query that combines all GROUP BY operations into single query
  return getOptimizedFeedbackStats(db)
}
