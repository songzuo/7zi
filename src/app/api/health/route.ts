/**
 * 健康检查 API 端点
 * 用于 Kubernetes/Docker 健康检查和负载均衡器探测
 */

import { NextResponse } from 'next/server';

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
    
    // 检查内存是否健康
    const memoryHealthy = memUsage.heapUsed < memLimit * 0.9; // 90% 阈值
    
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
    
    return NextResponse.json(healthStatus, { status: statusCode });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}

// 禁用缓存
export const dynamic = 'force-dynamic';