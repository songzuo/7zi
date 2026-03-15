/**
 * Health Check Middleware
 * 自动监控系统健康状态，定期检查关键系统组件
 */

import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { cacheLogger } from '@/lib/logger';
import { enhancedHealthReport } from '@/lib/monitoring/health';

// 检查间隔（毫秒）
const CHECK_INTERVAL = 60000; // 1 分钟
const MAX_HISTORY_SIZE = 100;

// 健康状态历史
const healthHistory: HealthCheckRecord[] = [];

// 最后一次检查时间
let lastCheckTime = 0;
let lastCheckResult: HealthCheckRecord | null = null;

// 检查运行状态
let isChecking = false;

/**
 * 健康检查记录
 */
export interface HealthCheckRecord {
  timestamp: string;
  status: 'ok' | 'degraded' | 'error';
  responseTime: number;
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  cpu: {
    loadAverage: number[];
  };
  components: {
    cache: string;
    auth: string;
    logger: string;
  };
  apiLatency?: {
    health?: number;
    ready?: number;
    live?: number;
  };
  errors: string[];
}

/**
 * 获取系统内存使用情况
 */
function getMemoryUsage(): { used: number; total: number; percent: number } {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const percent = Math.round((usedMemory / totalMemory) * 100);

  return {
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percent,
  };
}

/**
 * 获取 CPU 负载
 */
function getCpuLoad(): { loadAverage: number[] } {
  return {
    loadAverage: os.loadavg(),
  };
}

/**
 * 检查 API 响应时间
 */
async function checkApiLatency(endpoint: string): Promise<number | undefined> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const start = Date.now();
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - start;
    
    if (response.ok) {
      return latency;
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * 检查缓存组件
 */
async function checkCache(): Promise<string> {
  try {
    // 动态导入避免 webpack 打包问题
    const { getCacheManager } = await import('@/lib/cache/cache-manager');
    const cacheManager = getCacheManager();
    
    if (!cacheManager) {
      return 'skipped';
    }

    const testKey = `__health_check_${Date.now()}`;
    await cacheManager.set(testKey, 'ok', 10);
    const value = await cacheManager.get(testKey);

    return value === 'ok' ? 'ok' : 'warning';
  } catch (error) {
    return 'error';
  }
}

/**
 * 检查认证组件
 */
function checkAuth(): string {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const csrfSecret = process.env.CSRF_SECRET;

    if (!jwtSecret) {
      return 'error';
    }

    if (!csrfSecret) {
      return 'warning';
    }

    if (jwtSecret.length < 32) {
      return 'warning';
    }

    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * 检查日志组件
 */
function checkLogger(): string {
  try {
    if (!cacheLogger) {
      return 'skipped';
    }

    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * 执行完整的健康检查
 */
export async function performHealthCheck(): Promise<HealthCheckRecord> {
  const timestamp = new Date().toISOString();
  const errors: string[] = [];

  // 避免并发检查
  if (isChecking) {
    return lastCheckResult || {
      timestamp,
      status: 'degraded' as const,
      responseTime: 0,
      memory: getMemoryUsage(),
      cpu: getCpuLoad(),
      components: {
        cache: 'checking',
        auth: 'checking',
        logger: 'checking',
      },
      errors: ['Health check already in progress'],
    };
  }

  isChecking = true;
  const startTime = Date.now();

  try {
    // 并行执行所有检查
    const [cacheStatus, authStatus, loggerStatus, apiLatencies] = await Promise.all([
      checkCache(),
      Promise.resolve(checkAuth()),
      Promise.resolve(checkLogger()),
      Promise.all([
        checkApiLatency('/api/health'),
        checkApiLatency('/api/health/ready'),
        checkApiLatency('/api/health/live'),
      ]).catch(() => [undefined, undefined, undefined]),
    ]);

    const responseTime = Date.now() - startTime;
    const memory = getMemoryUsage();
    const cpu = getCpuLoad();

    // 收集错误
    if (cacheStatus === 'error') errors.push('Cache check failed');
    if (authStatus === 'error') errors.push('Auth check failed');
    if (loggerStatus === 'error') errors.push('Logger check failed');
    if (memory.percent > 90) errors.push(`High memory usage: ${memory.percent}%`);
    if (cpu.loadAverage[0] > os.cpus().length * 0.7) {
      errors.push(`High CPU load: ${cpu.loadAverage[0].toFixed(2)}`);
    }

    // 确定整体状态
    let status: 'ok' | 'degraded' | 'error' = 'ok';
    if (errors.length > 0 || cacheStatus === 'error' || authStatus === 'error') {
      status = 'error';
    } else if (cacheStatus === 'warning' || authStatus === 'warning' || memory.percent > 80) {
      status = 'degraded';
    }

    const record: HealthCheckRecord = {
      timestamp,
      status,
      responseTime,
      memory,
      cpu,
      components: {
        cache: cacheStatus,
        auth: authStatus,
        logger: loggerStatus,
      },
      apiLatency: {
        health: apiLatencies[0],
        ready: apiLatencies[1],
        live: apiLatencies[2],
      },
      errors,
    };

    // 记录到日志
    cacheLogger?.info(`[HealthCheck] Status: ${status}, Memory: ${memory.percent}%, ResponseTime: ${responseTime}ms`, {
      status,
      memory: memory.percent,
      responseTime,
      components: { cache: cacheStatus, auth: authStatus, logger: loggerStatus },
    });

    // 保存结果
    lastCheckResult = record;
    lastCheckTime = Date.now();

    // 添加到历史记录
    healthHistory.push(record);
    if (healthHistory.length > MAX_HISTORY_SIZE) {
      healthHistory.shift();
    }

    return record;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);

    cacheLogger?.error(`[HealthCheck] Error: ${errorMessage}`);

    return {
      timestamp,
      status: 'error',
      responseTime: Date.now() - startTime,
      memory: getMemoryUsage(),
      cpu: getCpuLoad(),
      components: {
        cache: 'error',
        auth: 'error',
        logger: 'error',
      },
      errors,
    };
  } finally {
    isChecking = false;
  }
}

/**
 * 获取健康检查历史
 */
export function getHealthCheckHistory(limit: number = 10): HealthCheckRecord[] {
  return healthHistory.slice(-limit);
}

/**
 * 获取最后一次健康检查结果
 */
export function getLastHealthCheck(): HealthCheckRecord | null {
  return lastCheckResult;
}

/**
 * 触发健康检查（可选手动触发）
 */
export async function triggerHealthCheck(): Promise<HealthCheckRecord> {
  return performHealthCheck();
}

/**
 * 健康检查中间件函数
 * 用于在请求处理前检查系统健康状态
 */
export async function healthCheckMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // 只对特定路径进行健康检查
  const healthCheckPaths = ['/api/health', '/api/status', '/'];
  
  // 如果不是健康检查路径，不做额外处理
  const isHealthPath = healthCheckPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  if (!isHealthPath) {
    return null;
  }

  // 检查是否需要自动检查（每分钟一次）
  const now = Date.now();
  const shouldCheck = now - lastCheckTime > CHECK_INTERVAL;

  if (shouldCheck && !isChecking) {
    // 在后台触发健康检查（不阻塞请求）
    performHealthCheck().catch(error => {
      cacheLogger?.error(`[HealthCheck] Background check failed: ${error}`);
    });
  }

  return null;
}

/**
 * 初始化健康检查（启动定期检查）
 * 在应用启动时调用一次
 */
let healthCheckInterval: NodeJS.Timeout | null = null;

export function initHealthCheck(): void {
  if (healthCheckInterval) {
    return; // 已经初始化
  }

  // 立即执行一次初始检查
  performHealthCheck().catch(error => {
    cacheLogger?.error(`[HealthCheck] Initial check failed: ${error}`);
  });

  // 设置定期检查（每分钟）
  healthCheckInterval = setInterval(() => {
    performHealthCheck().catch(error => {
      cacheLogger?.error(`[HealthCheck] Scheduled check failed: ${error}`);
    });
  }, CHECK_INTERVAL);

  // 清理函数
  if (typeof process !== 'undefined') {
    process.on('SIGINT', () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    });
    
    process.on('SIGTERM', () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    });
  }

  cacheLogger?.info('[HealthCheck] Initialized with 60s interval');
}

/**
 * 停止健康检查定时器
 */
export function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    cacheLogger?.info('[HealthCheck] Stopped');
  }
}

export default healthCheckMiddleware;
