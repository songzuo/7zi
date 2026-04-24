/**
 * GET /api/analytics/anomalies
 *
 * Returns anomaly detection data.
 */

import { NextRequest } from 'next/server'
import { analyticsService } from '@/lib/analytics/service'
import { createSuccessResponse, createUnauthorizedError } from '@/lib/api/error-handler'
import { withErrorHandling } from '@/lib/api/error-handler'
import { authenticateJWT } from '@/lib/auth/api-auth'

export const GET = withErrorHandling(async (request: NextRequest) => {
  // 🔒 SECURITY FIX (2026-04-23): Add authentication
  const authResult = await authenticateJWT(request)
  if (!authResult.authenticated) {
    return createUnauthorizedError('Authentication required')
  }
  
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  const allMetrics = await analyticsService.getAllMetrics({
    startDate,
    endDate,
  })

  return createSuccessResponse(allMetrics.anomalies)
})