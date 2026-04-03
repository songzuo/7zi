/**
 * Prometheus Metrics Exporter for 7zi Platform v1.9.1
 * 
 * 用于在 Next.js 应用中暴露 Prometheus 指标
 * 使用 prom-client 库
 */

import { NextRequest, NextResponse } from 'next/server';
import client from 'prom-client';

// 创建 Registry
const register = new client.Registry();

// 添加默认标签
register.setDefaultLabels({
  app: '7zi-frontend',
  version: '1.9.1',
  environment: process.env.NODE_ENV || 'development',
});

// ==================== 系统指标 ====================

// CPU 使用率
const cpuUsageGauge = new client.Gauge({
  name: 'node_cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [register],
});

// 内存使用率
const memoryUsageGauge = new client.Gauge({
  name: 'node_memory_usage_percent',
  help: 'Memory usage percentage',
  registers: [register],
});

// 堆内存使用
const heapUsedGauge = new client.Gauge({
  name: 'node_heap_used_bytes',
  help: 'Heap memory used in bytes',
  registers: [register],
});

const heapTotalGauge = new client.Gauge({
  name: 'node_heap_total_bytes',
  help: 'Total heap memory in bytes',
  registers: [register],
});

// ==================== HTTP 指标 ====================

// HTTP 请求计数器
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP 请求持续时间直方图
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// HTTP 请求大小
const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// HTTP 响应大小
const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'path', 'status'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// ==================== API 指标 ====================

// API 请求计数器
const apiRequestsTotal = new client.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [register],
});

// API 错误计数器
const apiErrorsTotal = new client.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['endpoint', 'error_type'],
  registers: [register],
});

// API 响应时间
const apiResponseTime = new client.Histogram({
  name: 'api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// ==================== 子代理指标 ====================

// 子代理执行计数器
const subagentExecutionsTotal = new client.Counter({
  name: 'subagent_executions_total',
  help: 'Total number of subagent executions',
  labelNames: ['subagent_name', 'status'],
  registers: [register],
});

// 子代理执行时间
const subagentExecutionDuration = new client.Histogram({
  name: 'subagent_execution_duration_seconds',
  help: 'Subagent execution duration in seconds',
  labelNames: ['subagent_name'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

// 子代理队列大小
const subagentQueueSize = new client.Gauge({
  name: 'subagent_queue_size',
  help: 'Current size of subagent queue',
  labelNames: ['queue_name'],
  registers: [register],
});

// ==================== 数据库指标 ====================

// 数据库连接池
const dbConnectionPoolActive = new client.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active database connections',
  registers: [register],
});

const dbConnectionPoolMax = new client.Gauge({
  name: 'db_connection_pool_max',
  help: 'Maximum database connection pool size',
  registers: [register],
});

// 数据库查询时间
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// 慢查询计数器
const dbSlowQueriesTotal = new client.Counter({
  name: 'db_slow_queries_total',
  help: 'Total number of slow database queries',
  labelNames: ['query_type', 'table'],
  registers: [register],
});

// ==================== 缓存指标 ====================

// 缓存命中率
const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [register],
});

const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [register],
});

// 缓存大小
const cacheSize = new client.Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_name'],
  registers: [register],
});

// ==================== WebSocket 指标 ====================

// WebSocket 连接数
const wsConnectionsActive = new client.Gauge({
  name: 'ws_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// WebSocket 消息计数
const wsMessagesTotal = new client.Counter({
  name: 'ws_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['type', 'direction'],
  registers: [register],
});

// ==================== 辅助函数 ====================

// 更新系统指标
export function updateSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  memoryUsageGauge.set(heapUsagePercent);
  heapUsedGauge.set(memoryUsage.heapUsed);
  heapTotalGauge.set(memoryUsage.heapTotal);
  
  // CPU 使用率（需要在外部计算）
  // cpuUsageGauge.set(cpuPercent);
}

// 记录 HTTP 请求
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  requestSize?: number,
  responseSize?: number
) {
  httpRequestsTotal.inc({ method, path, status: status.toString() });
  httpRequestDuration.observe(
    { method, path, status: status.toString() },
    durationMs / 1000
  );
  
  if (requestSize) {
    httpRequestSize.observe({ method, path }, requestSize);
  }
  if (responseSize) {
    httpResponseSize.observe({ method, path, status: status.toString() }, responseSize);
  }
}

// 记录 API 请求
export function recordApiRequest(
  endpoint: string,
  method: string,
  status: number,
  durationMs: number
) {
  apiRequestsTotal.inc({ endpoint, method, status: status.toString() });
  apiResponseTime.observe({ endpoint, method }, durationMs / 1000);
}

// 记录 API 错误
export function recordApiError(endpoint: string, errorType: string) {
  apiErrorsTotal.inc({ endpoint, error_type: errorType });
}

// 记录子代理执行
export function recordSubagentExecution(
  subagentName: string,
  status: 'success' | 'failed' | 'timeout',
  durationMs: number
) {
  subagentExecutionsTotal.inc({ subagent_name: subagentName, status });
  subagentExecutionDuration.observe({ subagent_name: subagentName }, durationMs / 1000);
}

// 更新子代理队列大小
export function updateSubagentQueueSize(queueName: string, size: number) {
  subagentQueueSize.set({ queue_name: queueName }, size);
}

// 记录数据库查询
export function recordDbQuery(
  queryType: string,
  table: string,
  durationMs: number,
  isSlow: boolean = false
) {
  dbQueryDuration.observe({ query_type: queryType, table }, durationMs / 1000);
  if (isSlow) {
    dbSlowQueriesTotal.inc({ query_type: queryType, table });
  }
}

// 更新数据库连接池
export function updateDbConnectionPool(active: number, max: number) {
  dbConnectionPoolActive.set(active);
  dbConnectionPoolMax.set(max);
}

// 记录缓存命中/未命中
export function recordCacheHit(cacheName: string, isHit: boolean) {
  if (isHit) {
    cacheHitsTotal.inc({ cache_name: cacheName });
  } else {
    cacheMissesTotal.inc({ cache_name: cacheName });
  }
}

// 更新缓存大小
export function updateCacheSize(cacheName: string, sizeBytes: number) {
  cacheSize.set({ cache_name: cacheName }, sizeBytes);
}

// 更新 WebSocket 连接数
export function updateWsConnections(count: number) {
  wsConnectionsActive.set(count);
}

// 记录 WebSocket 消息
export function recordWsMessage(type: string, direction: 'in' | 'out') {
  wsMessagesTotal.inc({ type, direction });
}

// ==================== Metrics 端点 ====================

export async function GET(request: NextRequest) {
  try {
    // 更新系统指标
    updateSystemMetrics();
    
    // 获取指标输出
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}

// 导出 register 用于自定义指标
export { register };
