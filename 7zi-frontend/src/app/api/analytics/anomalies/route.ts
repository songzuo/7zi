/**
 * GET /api/analytics/anomalies
 *
 * Returns anomaly detection data.
 */

import { NextRequest } from 'next/server'
import { analyticsService } from '@/lib/analytics/service'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  const allMetrics = await analyticsService.getAllMetrics({
    startDate,
    endDate,
  })

  return createSuccessResponse(allMetrics.anomalies)
})