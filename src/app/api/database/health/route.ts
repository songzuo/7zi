/**
 * Database Health API Route
 * Provides database health monitoring and optimization endpoints
 */

import { NextResponse } from 'next/server';
import {
  getDatabaseStats,
  getDatabaseSize,
  getDatabaseHealth as getDBHealth,
  optimizeDatabase as runOptimizeDatabase,
} from '@/lib/db';

/**
 * GET /api/database/health
 * Get database health report
 */
export async function GET() {
  try {
    const stats = getDatabaseStats();
    const size = getDatabaseSize();
    const health = await getDBHealth();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        size,
        health,
      },
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/database/optimize
 * Run database optimization
 */
export async function POST() {
  try {
    const result = await runOptimizeDatabase();

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Database optimization completed successfully',
    });
  } catch (error) {
    console.error('Database optimization failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database optimization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
