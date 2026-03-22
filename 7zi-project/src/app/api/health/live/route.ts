/**
 * Health Live API Route
 * Liveness probe endpoint for Kubernetes
 *
 * @module health-live-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

/**
 * Liveness probe response
 */
interface LivenessResponse {
  /** Liveness status */
  status: string;
  /** Current timestamp */
  timestamp: string;
}

// ============================================================================
// GET /api/health/live - Liveness probe
// ============================================================================

/**
 * GET /api/health/live
 *
 * Kubernetes liveness probe endpoint
 * Indicates whether the container is alive
 *
 * @auth Not required
 *
 * @returns {Promise<NextResponse>} JSON response with liveness status
 *
 * @example
 * ```http
 * GET /api/health/live
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/health/live');
 * const data = await response.json();
 * // {
 * //   "status": "alive",
 * //   "timestamp": "2024-01-22T14:30:00Z"
 * // }
 * ```
 *
 * @note Used by Kubernetes liveness probe
 * @note Should return 200 if the container is running
 */
export async function GET(request: NextRequest): Promise<NextResponse<LivenessResponse>> {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}
