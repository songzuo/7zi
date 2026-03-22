/**
 * Database Optimization and Health API Endpoints
 *
 * @openapi
 * /api/database/optimize:
 *   get:
 *     summary: Get database health and optimization status
 *     description: Returns comprehensive database health report including pool status, performance metrics, and optimization recommendations.
 *     tags:
 *       - Database
 *     responses:
 *       200:
 *         description: Database health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     pool:
 *                       type: object
 *                     performance:
 *                       type: object
 *                     dbAnalysis:
 *                       type: object
 *                 timestamp:
 *                   type: string
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Run database optimization operations
 *     description: Execute database optimization operations like VACUUM, ANALYZE, index rebuild, etc. Requires admin privileges.
 *     tags:
 *       - Database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operations
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [vacuum, analyze, clear_metrics, rebuild_indexes]
 *     responses:
 *       200:
 *         description: Operations completed
 *       400:
 *         description: Invalid operations
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseHealth, optimizeDatabase, vacuumDatabase, getDatabaseStats } from '@/lib/db';
import { getConnectionPool, type PoolConfig } from '@/lib/db/connection-pool';
import { generatePerformanceReport } from '@/lib/db/performance-analyzer';
import { logger } from '@/lib/logger';
import {
  createValidationError,
  createErrorResponse,
} from '@/lib/api/error-handler';
import { z } from 'zod';
import { withAdmin, RBACUserContext } from '@/lib/auth/middleware-rbac';

/**
 * Database operation schema
 */
const dbOperationsSchema = z.object({
  operations: z.array(z.enum(['vacuum', 'analyze', 'clear_metrics', 'rebuild_indexes'])).min(1),
});

/**
 * GET /api/database/optimize/health
 * Get comprehensive database health report
 */
export async function GET(request: NextRequest) {
  try {
    const health = await getDatabaseHealth();
    const performanceReport = await generatePerformanceReport();
    const pool = getConnectionPool();
    const stats = getDatabaseStats();

    return NextResponse.json({
      success: true,
      data: {
        pool: {
          ...pool.getStats(),
          maxConnections: 10,
        },
        health: {
          size: health.size,
          migrationVersion: health.migrationVersion,
          latestMigration: health.latestMigration,
          needsMigration: health.needsMigration,
          recommendations: health.recommendations,
        },
        performance: {
          slowQueries: health.slowQueryAnalysis,
        },
        dbAnalysis: {
          slowQueries: performanceReport.slowQueries,
          tableAnalyses: performanceReport.tableAnalyses,
          recommendations: performanceReport.recommendations,
          databaseSize: performanceReport.databaseSize,
          missingIndexes: performanceReport.missingIndexes,
        },
        stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get database health', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to get database health'));
  }
}

/**
 * POST /api/database/optimize
 * Run database optimization operations (requires admin privileges)
 */
async function POSTHandler(
  request: NextRequest,
  context: RBACUserContext
) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = dbOperationsSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      return createValidationError('Invalid request body', { fields: errors });
    }

    const { operations } = validation.data;

    logger.info(`Database optimization requested by admin: ${context.userId}`, {
      operations,
      userId: context.userId,
    });

    const results: Array<{ operation: string; success: boolean; message?: string; error?: string }> = [];

    for (const operation of operations) {
      try {
        switch (operation) {
          case 'vacuum':
            vacuumDatabase();
            results.push({
              operation,
              success: true,
              message: 'Database vacuumed successfully',
            });
            break;

          case 'analyze':
            await optimizeDatabase();
            results.push({
              operation,
              success: true,
              message: 'Database analyzed and optimized successfully',
            });
            break;

          case 'clear_metrics':
            // Performance metrics are cleared as part of optimizeDatabase
            await optimizeDatabase();
            results.push({
              operation,
              success: true,
              message: 'Performance metrics cleared',
            });
            break;

          case 'rebuild_indexes':
            // Rebuild indexes by running optimize
            await optimizeDatabase();
            results.push({
              operation,
              success: true,
              message: 'Indexes rebuilt successfully',
            });
            break;

          default:
            // This should never happen due to Zod validation
            results.push({
              operation,
              success: false,
              error: `Unknown operation: ${operation}`,
            });
        }
      } catch (error) {
        logger.error(`Database operation failed: ${operation}`, error);
        results.push({
          operation,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info(`Database optimization completed: ${results.filter(r => r.success).length}/${results.length} successful`, {
      userId: context.userId,
      results,
    });

    return NextResponse.json({
      success: true,
      data: {
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to run database optimization', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to run database optimization'));
  }
}

export async function POST(request: NextRequest) {
  return withAdmin(request, POSTHandler);
}

/**
 * PUT /api/database/optimize/config
 * Update database pool configuration (requires admin privileges)
 *
 * @openapi
 * /api/database/optimize/config:
 *   put:
 *     summary: Update database pool configuration
 *     description: Update the connection pool configuration. Note: Full configuration updates require server restart in production.
 *     tags:
 *       - Database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config
 *             properties:
 *               config:
 *                 type: object
 *                 properties:
 *                   maxConnections:
 *                     type: number
 *                   minConnections:
 *                     type: number
 *                   connectionTimeout:
 *                     type: number
 *     responses:
 *       200:
 *         description: Configuration update info
 *       400:
 *         description: Invalid configuration
 *       403:
 *         description: Forbidden - admin privileges required
 *       500:
 *         description: Internal server error
 */
async function PUTHandler(
  request: NextRequest,
  context: RBACUserContext
) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || !body.config) {
      return createValidationError('Missing config parameter in request body');
    }

    const config: Partial<PoolConfig> = body.config;

    // Get current pool stats before update
    const pool = getConnectionPool();
    const oldStats = pool.getStats();

    logger.info(`Database pool configuration update requested by admin: ${context.userId}`, {
      oldConfig: oldStats,
      newConfig: config,
      userId: context.userId,
    });

    // Note: Reconfiguring pool requires restart in production
    // For now, just return validation info
    return NextResponse.json({
      success: true,
      data: {
        message: 'Pool configuration update requires restart. Current config:',
        oldStats,
        newConfig: config,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to update pool configuration', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to update pool configuration'));
  }
}

export async function PUT(request: NextRequest) {
  return withAdmin(request, PUTHandler);
}
