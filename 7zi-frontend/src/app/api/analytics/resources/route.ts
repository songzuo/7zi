/**
 * GET /api/analytics/resources
 *
 * Returns resource usage data.
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
  const hours = Number(searchParams.get('hours')) || 24

  const resourceUsage = await analyticsService.getResourceUsage(hours)

  return createSuccessResponse(resourceUsage)
})