/**
 * Status API Route
 * System status endpoint (PROTECTED)
 * Requires authentication
 * Returns limited information to prevent information leakage
 *
 * @module status-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { withAuth, withRateLimit, RATE_LIMIT_CONFIG } from '@/middleware/auth';

// ============================================================================
// Types
// ============================================================================

/**
 * System status response
 */
interface StatusResponse {
  /** Operation success status */
  success: boolean;
  /** System status (ok, error) */
  status: string;
  /** Response timestamp */
  timestamp: string;
  /** Process uptime in seconds */
  uptime: number;
}

// ============================================================================
// GET /api/status - Get system status (sanitized)
// ============================================================================

/**
 * GET /api/status
 *
 * Get system status information
 *
 * @auth Required
 *
 * @returns {Promise<NextResponse>} JSON response with system status
 *
 * @example
 * ```http
 * GET /api/status
 * Authorization: Bearer <token>
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/status', {
 *   headers: {
 *     'Authorization': 'Bearer ' + token
 *   }
 * });
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "status": "ok",
 * //   "timestamp": "2024-01-22T14:30:00Z",
 * //   "uptime": 3600
 * // }
 * ```
 *
 * @note This endpoint returns minimal information to prevent information leakage
 * @note Version and environment details are intentionally excluded
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      // Return minimal status information
      // Remove version and environment details to prevent information leakage
      return NextResponse.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      logger.error('Status check failed', error);
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          error: 'Status check failed',
        },
        { status: 500 }
      );
    }
  });
}
