import { NextRequest, NextResponse } from 'next/server'
/**
 * Rating API endpoints
 */

import { detectSpam } from '@/lib/feedback/anti-spam'
import {
  CreateRatingDto,
  Rating,
  RatingFilters,
  RatingListResponse,
  FeedbackStatus,
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
import { getOptimizedRatingStats } from '@/lib/db/query-optimizations'

/**
 * GET /api/ratings
 * Get ratings list with filters
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const searchParams = request.nextUrl.searchParams

    // Build filters
    const filters: RatingFilters = {
      user_id: searchParams.get('user_id') || undefined,
      target_type: searchParams.get('target_type') || undefined,
      target_id: searchParams.get('target_id') || undefined,
      rating_min: searchParams.get('rating_min')
        ? parseInt(searchParams.get('rating_min')!)
        : undefined,
      rating_max: searchParams.get('rating_max')
        ? parseInt(searchParams.get('rating_max')!)
        : undefined,
      status: searchParams.get('status') as FeedbackStatus | undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      sort_by: (searchParams.get('sort_by') as RatingFilters['sort_by']) || 'created_at',
      sort_order: (searchParams.get('sort_order') as RatingFilters['sort_order']) || 'desc',
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
    if (filters.target_type) {
      conditions.push('target_type = ?')
      params.push(filters.target_type)
    }
    if (filters.target_id) {
      conditions.push('target_id = ?')
      params.push(filters.target_id)
    }
    if (filters.rating_min) {
      conditions.push('rating >= ?')
      params.push(filters.rating_min)
    }
    if (filters.rating_max) {
      conditions.push('rating <= ?')
      params.push(filters.rating_max)
    }
    if (filters.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }
    if (filters.start_date) {
      conditions.push('created_at >= ?')
      params.push(filters.start_date)
    }
    if (filters.end_date) {
      conditions.push('created_at <= ?')
      params.push(filters.end_date)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total
    const countResult = db.queryRows(
      `SELECT COUNT(*) as total FROM ratings ${whereClause}`,
      params
    )[0] as { total: number }
    const total = countResult.total

    // Get paginated results
    const offset = (filters.page! - 1) * filters.per_page!
    const orderClause =
      filters.sort_by === 'rating'
        ? 'ORDER BY rating DESC, created_at DESC'
        : `ORDER BY ${filters.sort_by} ${filters.sort_order!.toUpperCase()}`

    const ratings = db.queryRows(
      `SELECT * FROM ratings ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, filters.per_page, offset]
    ) as unknown as Rating[]

    // Parse metadata JSON
    const ratingsWithParsedMetadata = ratings.map(r => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata as unknown as string) : undefined,
      verified: Boolean(r.verified),
    }))

    // Get statistics
    const stats = await getRatingStats(db, filters)

    const response = createSuccessResponse<RatingListResponse>({
      ratings: ratingsWithParsedMetadata,
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
 * POST /api/ratings
 * Create new rating
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const body = await request.json()

    // Validate request body
    const {
      target_type,
      target_id,
      rating,
      title,
      description,
      images,
      verified,
      metadata: ratingMetadata,
    } = body as CreateRatingDto

    if (!target_type || !target_id || !rating) {
      const response = await createValidationError(
        'target_type, target_id, and rating are required'
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

    // Validate target_type
    const validTargetTypes = ['agent', 'task', 'feature', 'project', 'overall']
    if (!validTargetTypes.includes(target_type)) {
      const response = await createValidationError(
        `Invalid target_type. Must be one of: ${validTargetTypes.join(', ')}`
      )
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate title length if provided
    if (title && title.length > 100) {
      const response = await createValidationError('Title must be less than 100 characters')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Validate description length if provided
    if (description && description.length > 1000) {
      const response = await createValidationError('Description must be less than 1000 characters')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Get user ID from session (for now, use a placeholder)
    // In production, this would come from auth token
    const userId = body.user_id || 'anonymous'

    // Anti-spam check
    const contentToCheck = `${title || ''}\n${description || ''}`
    if (contentToCheck.trim()) {
      const spamCheck = await detectSpam(userId, contentToCheck, 'rating')
      if (spamCheck.is_spam) {
        logger.warn('Spam rating rejected', {
          category: 'rating',
          userId,
          reason: spamCheck.reason,
          score: spamCheck.score,
        })

        const response = await createUnauthorizedError('Rating rejected due to spam detection')
        logRequestComplete(metadata, response, startTime)
        return response
      }
    }

    const db = await getDatabaseAsync()

    // Check if user already rated this target
    const existingRating = db.queryRows(
      'SELECT * FROM ratings WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, target_type, target_id]
    )[0] as unknown as Rating | undefined

    if (existingRating) {
      // Update existing rating
      const now = new Date().toISOString()

      db.exec(
        `UPDATE ratings
         SET rating = ?, title = ?, description = ?, verified = ?, updated_at = ?, metadata = ?
         WHERE user_id = ? AND target_type = ? AND target_id = ?`,
        [
          rating,
          title || null,
          description || null,
          verified ? 1 : 0,
          now,
          ratingMetadata ? JSON.stringify(ratingMetadata) : null,
          userId,
          target_type,
          target_id,
        ]
      )

      const updatedRating = db.queryRows(
        'SELECT * FROM ratings WHERE user_id = ? AND target_type = ? AND target_id = ?',
        [userId, target_type, target_id]
      )[0] as unknown as Rating

      const response = createSuccessResponse({
        ...updatedRating,
        metadata: updatedRating.metadata
          ? JSON.parse(updatedRating.metadata as unknown as string)
          : undefined,
        verified: Boolean(updatedRating.verified),
      })

      logger.info('Rating updated', {
        category: 'rating',
        ratingId: updatedRating.id,
        userId,
        target_type,
        target_id,
        rating,
      })

      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Create new rating
    const ratingId = crypto.randomUUID()
    const now = new Date().toISOString()

    db.exec(
      `INSERT INTO ratings (id, user_id, target_type, target_id, rating, title, description, verified, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ratingId,
        userId,
        target_type,
        target_id,
        rating,
        title || null,
        description || null,
        verified ? 1 : 0,
        now,
        now,
        ratingMetadata ? JSON.stringify(ratingMetadata) : null,
      ]
    )

    // Get created rating
    const newRating = db.queryRows('SELECT * FROM ratings WHERE id = ?', [
      ratingId,
    ])[0] as unknown as Rating

    const response = createSuccessResponse({
      ...newRating,
      metadata: newRating.metadata
        ? JSON.parse(newRating.metadata as unknown as string)
        : undefined,
      verified: Boolean(newRating.verified),
    })

    logger.info('Rating created', {
      category: 'rating',
      ratingId,
      userId,
      target_type,
      target_id,
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
 * GET /api/ratings/[id]
 * Get single rating
 */
export async function GET_RATING(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const { id } = await params

    const db = await getDatabaseAsync()

    const rating = db.queryRows('SELECT * FROM ratings WHERE id = ?', [id])[0] as unknown as
      | Rating
      | undefined

    if (!rating) {
      const response = await createNotFoundError('Rating not found')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    const response = createSuccessResponse({
      ...rating,
      metadata: rating.metadata ? JSON.parse(rating.metadata as unknown as string) : undefined,
      verified: Boolean(rating.verified),
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * DELETE /api/ratings/[id]
 * Delete rating
 */
export async function DELETE_RATING(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const { id } = params

    // Get user ID from session (for now, use a placeholder)
    // In production, this would come from auth token
    const userId = request.headers.get('x-user-id') || 'anonymous'

    const db = await getDatabaseAsync()

    // Check if rating exists and belongs to user
    const existing = db.queryRows('SELECT * FROM ratings WHERE id = ?', [id])[0] as unknown as
      | Rating
      | undefined

    if (!existing) {
      const response = await createNotFoundError('Rating not found')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Check if user owns this rating (in production, verify JWT token)
    if (existing.user_id !== userId && userId !== 'admin') {
      const response = await createForbiddenError('You can only delete your own ratings')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Delete rating
    db.exec('DELETE FROM ratings WHERE id = ?', [id])

    const response = createSuccessResponse({
      id,
      message: 'Rating deleted successfully',
    })

    logger.info('Rating deleted', {
      category: 'rating',
      ratingId: id,
      userId,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/ratings/[id]/helpful
 * Mark rating as helpful or not helpful
 */
export async function POST_HELPFUL(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const metadata = logRequestStart(request)

  try {
    const { id } = await params
    const body = await request.json()

    const { is_helpful } = body as { is_helpful: boolean }

    if (typeof is_helpful !== 'boolean') {
      const response = await createValidationError('is_helpful must be a boolean')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Get user ID from session (for now, use a placeholder)
    const userId = request.headers.get('x-user-id') || 'anonymous'

    const db = await getDatabaseAsync()

    // Check if rating exists
    const rating = db.queryRows('SELECT * FROM ratings WHERE id = ?', [id])[0] as unknown as
      | Rating
      | undefined

    if (!rating) {
      const response = await createNotFoundError('Rating not found')
      logRequestComplete(metadata, response, startTime)
      return response
    }

    // Check if user already voted
    const existingVote = db.queryRows(
      'SELECT * FROM helpful_votes WHERE rating_id = ? AND user_id = ?',
      [id, userId]
    )[0] as
      | {
          rating_id: string
          user_id: string
          is_helpful: boolean
          created_at: string
        }
      | undefined

    if (existingVote) {
      // Update existing vote
      if (existingVote.is_helpful !== is_helpful) {
        // Remove old vote count
        if (existingVote.is_helpful) {
          db.exec('UPDATE ratings SET helpful_count = helpful_count - 1 WHERE id = ?', [id])
        } else {
          db.exec('UPDATE ratings SET not_helpful_count = not_helpful_count - 1 WHERE id = ?', [id])
        }

        // Add new vote count
        if (is_helpful) {
          db.exec('UPDATE ratings SET helpful_count = helpful_count + 1 WHERE id = ?', [id])
        } else {
          db.exec('UPDATE ratings SET not_helpful_count = not_helpful_count + 1 WHERE id = ?', [id])
        }

        db.exec('UPDATE helpful_votes SET is_helpful = ? WHERE rating_id = ? AND user_id = ?', [
          is_helpful ? 1 : 0,
          id,
          userId,
        ])
      }
    } else {
      // Create new vote
      db.exec(
        'INSERT INTO helpful_votes (id, rating_id, user_id, is_helpful, created_at) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), id, userId, is_helpful ? 1 : 0, new Date().toISOString()]
      )

      // Update rating counts
      if (is_helpful) {
        db.exec('UPDATE ratings SET helpful_count = helpful_count + 1 WHERE id = ?', [id])
      } else {
        db.exec('UPDATE ratings SET not_helpful_count = not_helpful_count + 1 WHERE id = ?', [id])
      }
    }

    // Get updated rating
    const updatedRating = db.queryRows('SELECT * FROM ratings WHERE id = ?', [
      id,
    ])[0] as unknown as Rating

    const response = createSuccessResponse({
      ...updatedRating,
      metadata: updatedRating.metadata
        ? JSON.parse(updatedRating.metadata as unknown as string)
        : undefined,
      verified: Boolean(updatedRating.verified),
      user_vote: is_helpful,
    })

    logRequestComplete(metadata, response, startTime)
    return response
  } catch (error) {
    logRequestError(metadata, error, startTime)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Helper function to get rating statistics (optimized)
 */
async function getRatingStats(db: DatabaseConnection, filters?: RatingFilters) {
  // Use optimized query that combines multiple GROUP BY operations into fewer queries
  return getOptimizedRatingStats(db, filters)
}
