/**
 * GET /api/analytics/resources
 *
 * Returns resource usage data.
 */

import { NextRequest } from 'next/server'
import { analyticsService } from '@/lib/analytics/service'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const hours = Number(searchParams.get('hours')) || 24

  const resourceUsage = await analyticsService.getResourceUsage(hours)

  return createSuccessResponse(resourceUsage)
})