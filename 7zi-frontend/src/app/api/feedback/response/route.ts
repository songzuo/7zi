/**
 * Feedback Response API
 *
 * POST /api/feedback/response - Add admin response to feedback
 */

import { NextRequest } from 'next/server'
import { feedbackStorage } from '@/lib/db/feedback-storage'
import { validateAndSanitizeBody, sanitizeHtml } from '@/lib/validation-schemas'
import { z } from 'zod'
import { createSuccessResponse, createForbiddenError, createBadRequestError, createNotFoundError, createErrorResponse } from '@/lib/api/error-handler'
import { withCSRF } from '@/lib/middleware/csrf'

/**
 * Initialize feedback storage
 */
feedbackStorage.initialize()

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
 * POST /api/feedback/response - Add admin response
 */
export const POST = withCSRF(async (request: NextRequest) => {
  try {
    const { userId, userName, userEmail, userRole } = getUserInfo(request)

    // Check admin permission
    if (userRole !== 'admin') {
      return createForbiddenError('需要管理员权限')
    }

    const body = await request.json()

    // Validate input
    const validationResult = await validateAndSanitizeBody(body, responseSubmissionSchema)

    if (!validationResult.success) {
      return createBadRequestError('Validation Error', {
        errors: validationResult.errors.map((err: z.ZodIssue) => ({
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
    feedbackStorage.addComment(feedbackId, adminId, adminName, userEmail, response, true)

    return createSuccessResponse({
      message: '回复已发送',
      data: updated,
    })
  } catch (error) {
    console.error('[Feedback Response API] POST error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
})
