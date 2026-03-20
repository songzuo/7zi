/**
 * API Performance Report Endpoint
 * API 性能报告端点
 *
 * GET /api/performance/report - 获取性能报告
 * GET /api/performance/slow - 获取慢请求列表
 * DELETE /api/performance/clear - 清除性能数据
 */

import { NextRequest } from 'next/server';
import { apiPerformanceCollector, getApiPerformanceReport } from '@/lib/middleware/api-performance';
import { logger } from '@/lib/logger';
import { createErrorResponse, ErrorType } from '@/lib/api/error-handler';
import { createSuccessResponse } from '@/lib/api/utils';

/**
 * GET /api/performance/report
 * 获取性能报告
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'slow') {
      // 获取慢请求列表
      const slowRequests = apiPerformanceCollector.getSlowRequests();
      return createSuccessResponse({
        slowRequests,
        count: slowRequests.length,
        threshold: 500, // ms
      });
    }

    // 获取完整性能报告
    const report = getApiPerformanceReport();

    return createSuccessResponse(report);
  } catch (error) {
    logger.error('[Performance API] Failed to generate report', {
      error: error instanceof Error ? error.message : String(error),
    });

    return createErrorResponse(new Error('Failed to generate performance report'));
  }
}

/**
 * DELETE /api/performance/clear
 * 清除性能数据
 */
export async function DELETE(request: NextRequest) {
  try {
    // 在生产环境中，应该添加认证检查
    if (process.env.NODE_ENV === 'production') {
      // Verify admin authorization
      const authHeader = request.headers.get('authorization');
      const adminSecret = process.env.ADMIN_SECRET;

      if (!authHeader || !adminSecret) {
        return createErrorResponse(
          new Error('Unauthorized: Missing authentication'),
          401
        );
      }

      const token = authHeader.replace('Bearer ', '');
      if (token !== adminSecret) {
        logger.warn('[Performance API] Unauthorized attempt to clear performance data');
        return createErrorResponse(
          new Error('Forbidden: Invalid credentials'),
          403
        );
      }
    }

    apiPerformanceCollector.clear();

    logger.info('[Performance API] Performance data cleared');

    return createSuccessResponse({
      message: 'Performance data cleared successfully',
    });
  } catch (error) {
    logger.error('[Performance API] Failed to clear performance data', {
      error: error instanceof Error ? error.message : String(error),
    });

    return createErrorResponse(new Error('Failed to clear performance data'));
  }
}
