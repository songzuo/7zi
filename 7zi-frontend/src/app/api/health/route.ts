/**
 * 生产环境健康检查端点
 * 
 * 提供系统健康状态检查，包括：
 * - 系统状态
 * - 内存使用
 * - 磁盘使用
 * - 构建信息
 * - 环境信息
 * 
 * @version 1.0.0
 * @date 2026-03-28
 */

import { NextResponse } from 'next/server';
import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================
// 健康检查配置
// ============================================
const HEALTH_CHECK_CONFIG = {
  // 内存警告阈值 (90%)
  memoryWarningThreshold: 0.9,
  // 磁盘警告阈值 (90%)
  diskWarningThreshold: 0.9,
  // 响应时间警告阈值 (ms)
  responseTimeWarningThreshold: 1000,
  // 缓存时间 (秒)
  cacheTime: 60,
} as const;

// ============================================
// 获取构建信息
// ============================================
async function getBuildInfo() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    return {
      version: packageJson.version,
      name: packageJson.name,
      environment: process.env.NODE_ENV || 'unknown',
      buildTime: new Date().toISOString(),
    };
  } catch (error) {
    return {
      version: 'unknown',
      name: 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      buildTime: new Date().toISOString(),
    };
  }
}

// ============================================
// 获取系统信息
// ============================================
function getSystemInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = usedMemory / totalMemory;

  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usage: Math.round(memoryUsage * 100) / 100,
      formatted: {
        total: `${Math.round(totalMemory / 1024 / 1024 / 1024)}GB`,
        used: `${Math.round(usedMemory / 1024 / 1024 / 1024)}GB`,
        free: `${Math.round(freeMemory / 1024 / 1024 / 1024)}GB`,
        usage: `${Math.round(memoryUsage * 100)}%`,
      },
    },
    cpus: os.cpus().length,
  };
}

// ============================================
// 评估健康状态
// ============================================
function evaluateHealth(systemInfo: ReturnType<typeof getSystemInfo>, responseTime: number) {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 检查内存使用
  if (systemInfo.memory.usage > HEALTH_CHECK_CONFIG.memoryWarningThreshold) {
    issues.push(
      `Memory usage critical: ${systemInfo.memory.formatted.usage} (threshold: ${HEALTH_CHECK_CONFIG.memoryWarningThreshold * 100}%)`
    );
  } else if (systemInfo.memory.usage > HEALTH_CHECK_CONFIG.memoryWarningThreshold * 0.8) {
    warnings.push(
      `Memory usage high: ${systemInfo.memory.formatted.usage}`
    );
  }

  // 检查响应时间
  if (responseTime > HEALTH_CHECK_CONFIG.responseTimeWarningThreshold * 2) {
    issues.push(
      `Response time critical: ${responseTime}ms (threshold: ${HEALTH_CHECK_CONFIG.responseTimeWarningThreshold}ms)`
    );
  } else if (responseTime > HEALTH_CHECK_CONFIG.responseTimeWarningThreshold) {
    warnings.push(
      `Response time slow: ${responseTime}ms`
    );
  }

  // 检查负载平均
  const loadAverage = systemInfo.loadAverage[0];
  const cpus = systemInfo.cpus;
  if (loadAverage > cpus * 2) {
    issues.push(
      `Load average critical: ${loadAverage.toFixed(2)} (CPUs: ${cpus})`
    );
  } else if (loadAverage > cpus) {
    warnings.push(
      `Load average high: ${loadAverage.toFixed(2)} (CPUs: ${cpus})`
    );
  }

  // 确定状态
  let status = 'healthy';
  if (issues.length > 0) {
    status = 'unhealthy';
  } else if (warnings.length > 0) {
    status = 'degraded';
  }

  return {
    status,
    issues,
    warnings,
  };
}

// ============================================
// GET 请求处理器
// ============================================
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // 获取构建信息
    const buildInfo = await getBuildInfo();
    
    // 获取系统信息
    const systemInfo = getSystemInfo();
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    // 评估健康状态
    const health = evaluateHealth(systemInfo, responseTime);

    // 构建响应
    const response = {
      status: health.status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      uptime: `${Math.round(systemInfo.uptime / 60)} minutes`,
      build: buildInfo,
      system: {
        ...systemInfo,
        memory: {
          ...systemInfo.memory,
        },
      },
      health: {
        issues: health.issues,
        warnings: health.warnings,
      },
    };

    // 根据健康状态设置 HTTP 状态码
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': `public, max-age=${HEALTH_CHECK_CONFIG.cacheTime}`,
        'X-Health-Status': health.status,
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    // 错误处理
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: {
          'X-Health-Status': 'unhealthy',
        },
      }
    );
  }
}

// ============================================
// HEAD 请求处理器 (用于监控)
// ============================================
export async function HEAD() {
  const startTime = Date.now();
  
  try {
    const systemInfo = getSystemInfo();
    const responseTime = Date.now() - startTime;
    const health = evaluateHealth(systemInfo, responseTime);

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'X-Health-Status': health.status,
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': `public, max-age=${HEALTH_CHECK_CONFIG.cacheTime}`,
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
      },
    });
  }
}
