/**
 * Health Ready API Route
 * Readiness probe endpoint for Kubernetes
 *
 * @module health-ready-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Readiness probe response
 */
interface ReadinessResponse {
  /** Readiness status */
  status: string;
  /** Current timestamp */
  timestamp: string;
}

/**
 * Readiness error response
 */
interface ReadinessErrorResponse {
  status: string;
  error: string;
}

// ============================================================================
// GET /api/health/ready - Readiness probe
// ============================================================================

/**
 * GET /api/health/ready
 *
 * Kubernetes readiness probe endpoint
 * Indicates whether the container is ready to serve traffic
 *
 * @auth Not required
 *
 * @returns {Promise<NextResponse>} JSON response with readiness status
 *
 * @example
 * ```http
 * GET /api/health/ready
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/health/ready');
 * const data = await response.json();
 * // {
 * //   "status": "ready",
 * //   "timestamp": "2024-01-22T14:30:00Z"
 * // }
 * ```
 *
 * @note Used by Kubernetes readiness probe
 * @note Returns 503 if database is not ready
 */
export async function GET(request: NextRequest): Promise<NextResponse<ReadinessResponse | ReadinessErrorResponse>> {
  try {
    // Check if system is ready to handle requests
    const db = getDatabase();
    const isReady = db !== undefined;

    if (isReady) {
      return NextResponse.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          status: 'not_ready',
          error: 'Database not ready',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not_ready',
        error: 'Readiness check failed',
      },
      { status: 503 }
    );
  }
}
