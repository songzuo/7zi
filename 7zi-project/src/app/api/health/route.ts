/**
 * Health API Route
 * Basic health check endpoint
 *
 * @module health-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getDatabase } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Health check response
 */
interface HealthCheckResponse {
  /** Operation success status */
  success: boolean;
  /** Health status (healthy, unhealthy) */
  status: string;
  /** Health check results */
  checks: {
    database: string;
    timestamp: string;
  };
}

// ============================================================================
// GET /api/health - Basic health check
// ============================================================================

/**
 * GET /api/health
 *
 * Basic health check endpoint for monitoring
 *
 * @auth Not required
 *
 * @returns {Promise<NextResponse>} JSON response with health status
 *
 * @example
 * ```http
 * GET /api/health
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/health');
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "status": "healthy",
 * //   "checks": {
 * //     "database": "ok",
 * //     "timestamp": "2024-01-22T14:30:00Z"
 * //   }
 * // }
 * ```
 *
 * @note This endpoint does not require authentication for monitoring tools
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  try {
    // Check database connection
    let dbStatus = 'ok';
    try {
      const db = getDatabase();
      if (!db) {
        dbStatus = 'error';
      }
    } catch (error) {
      dbStatus = 'error';
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      checks: {
        database: dbStatus,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        checks: {
          database: 'error',
          timestamp: new Date().toISOString(),
        },
      } as HealthCheckResponse,
      { status: 503 }
    );
  }
}
