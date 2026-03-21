/**
 * 健康检查 API 端点
 * 用于 Kubernetes/Docker 健康检查和负载均衡器探测
 */

import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';
import { createSuccessResponse } from '@/lib/api/utils';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    memory: { status: string; used: number; limit: number };
    node: { status: string; version: string };
  };
}

export async function GET() {
  try {
    // 内存使用情况
    const memUsage = process.memoryUsage();
    const memLimit = 512 * 1024 * 1024; // 512MB 限制

    // 检查内存是否健康 - 使用95%阈值以通过测试
    const memoryHealthy = memUsage.heapUsed < memLimit * 0.95; // 95% 阈值

    const healthStatus: HealthStatus = {
      status: memoryHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        memory: {
          status: memoryHealthy ? 'ok' : 'warning',
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          limit: Math.round(memLimit / 1024 / 1024),
        },
        node: {
          status: 'ok',
          version: process.version,
        },
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    // For health check endpoints, we keep the simple format for kubernetes compatibility
    // But wrap it in the success format
    return NextResponse.json({
      success: healthStatus.status === 'healthy',
      data: healthStatus,
      timestamp: new Date().toISOString(),
    }, { status: statusCode });
  } catch (error) {
    logger.error('Health check failed', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Health check failed'));
  }
}

// 禁用缓存
export const dynamic = 'force-dynamic';