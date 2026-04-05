/**
 * GET /api/analytics/nodes
 *
 * Returns node performance data.
 */

import { NextRequest } from 'next/server'
import { analyticsService } from '@/lib/analytics/service'
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const workflowId = searchParams.get('workflowId') || undefined

  const nodePerformance = await analyticsService.getNodePerformance(workflowId)

  return createSuccessResponse(nodePerformance)
})