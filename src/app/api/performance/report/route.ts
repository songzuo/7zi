/**
 * API Performance Report Endpoint
 * API 性能报告端点
 *
 * GET /api/performance/report - 获取性能报告
 * GET /api/performance/slow - 获取慢请求列表
 * DELETE /api/performance/clear - 清除性能数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiPerformanceCollector, getApiPerformanceReport } from '@/lib/middleware/api-performance';
import { logger } from '@/lib/logger';
import { createErrorResponse, ErrorType } from '@/lib/api/error-handler';
import { createSuccessResponse } from '@/lib/api/utils';
import { withAdmin, RBACUserContext } from '@/lib/auth/middleware-rbac';

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
async function DELETEHandler(
  request: NextRequest,
  context: RBACUserContext
) {
  try {
    apiPerformanceCollector.clear();

    logger.info('[Performance API] Performance data cleared', {
      userId: context.userId,
    });

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

export async function DELETE(request: NextRequest) {
  return withAdmin(request, DELETEHandler);
}
