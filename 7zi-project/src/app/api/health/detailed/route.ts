/**
 * Health Detailed API Route
 * Detailed health check endpoint with system metrics
 *
 * @module health-detailed-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getDatabase, getDatabaseSize } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Memory usage information
 */
interface MemoryInfo {
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

/**
 * Database health info
 */
interface DatabaseInfo {
  status: string;
  size: number;
}

/**
 * Detailed health check response
 */
interface DetailedHealthResponse {
  success: boolean;
  status: string;
  checks: {
    database: DatabaseInfo;
    memory: MemoryInfo;
    uptime: number;
    timestamp: string;
  };
}

// ============================================================================
// GET /api/health/detailed - Detailed health check
// ============================================================================

/**
 * GET /api/health/detailed
 *
 * Get detailed health check with system metrics
 *
 * @auth Not required
 *
 * @returns {Promise<NextResponse>} JSON response with detailed health info
 *
 * @example
 * ```http
 * GET /api/health/detailed
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/health/detailed');
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "status": "healthy",
 * //   "checks": {
 * //     "database": {
 * //       "status": "connected",
 * //       "size": 102400000
 * //     },
 * //     "memory": {
 * //       "heapUsed": 52428800,
 * //       "heapTotal": 104857600,
 * //       "rss": 157286400
 * //     },
 * //     "uptime": 3600,
 * //     "timestamp": "2024-01-22T14:30:00Z"
 * //   }
 * // }
 * ```
 *
 * @note Includes memory usage and database size metrics
 * @warning Contains sensitive information, should be restricted in production
 */
export async function GET(request: NextRequest): Promise<NextResponse<DetailedHealthResponse>> {
  try {
    const db = getDatabase();
    const dbSize = getDatabaseSize();

    return NextResponse.json({
      success: true,
      status: 'healthy',
      checks: {
        database: {
          status: db ? 'connected' : 'disconnected',
          size: dbSize?.sizeInBytes ?? 0,
        },
        memory: {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          rss: process.memoryUsage().rss,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Detailed health check failed', error);
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        checks: {
          database: { status: 'disconnected', size: 0 },
          memory: { heapUsed: 0, heapTotal: 0, rss: 0 },
          uptime: 0,
          timestamp: new Date().toISOString(),
        },
      } as DetailedHealthResponse,
      { status: 503 }
    );
  }
}
