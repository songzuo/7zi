/**
 * GET /api/analytics/overview
 * 
 * Returns overview metrics for the analytics dashboard.
 * 
 * @openapi
 *   /api/analytics/overview:
 *     get:
 *       summary: Get analytics overview
 *       description: Returns overview metrics for the analytics dashboard
 *       tags:
 *         - analytics
 *       responses:
 *         200:
 *           description: Overview metrics
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/OverviewMetrics'
 *         500:
 *           description: Internal server error
 */

import { NextRequest } from 'next/server'
import { analyticsService } from '@/lib/analytics/service'
import type { OverviewMetrics } from '@/lib/analytics/types'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'

/**
 * GET /api/analytics/overview - Get analytics overview metrics
 */
export async function GET(request: NextRequest) {
  try {
    const metrics = await analyticsService.getOverviewMetrics()

    return createSuccessResponse(metrics)
  } catch (error) {
    console.error('[Analytics API] Overview error:', error)

    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      500
    )
  }
}
