/**
 * GET /api/analytics/trends
 *
 * Returns workflow trend data.
 */

import { NextRequest } from 'next/server'
import { analyticsService } from '@/lib/analytics/service'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const days = Number(searchParams.get('days')) || 7
  const status = searchParams.get('status') || 'all'

  const trends = await analyticsService.getWorkflowTrends({
    days,
    status: status as 'success' | 'failed' | 'all',
  })

  return createSuccessResponse(trends)
})