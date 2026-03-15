/**
 * Performance Metrics Collection System
 * 
 * Tracks API response times, request counts, error rates, and system performance
 * for monitoring and alerting purposes.
 */

import os from 'os';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Performance');

/**
 * API endpoint metrics
 */
export interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  errors: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  lastAccess: string;
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * System performance snapshot
 */
export interface SystemSnapshot {
  timestamp: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    arrayBuffers: number;
    usagePercent: number;
  };
  cpu: {
    user: number;
    system: number;
    cores: number;
    loadAverage: number[];
  };
  uptime: number;
  nodeVersion: string;
}

/**
 * Performance metrics store
 */
export interface PerformanceStore {
  endpoints: Map<string, EndpointMetrics>;
  responseTimes: Map<string, number[]>; // Store last N response times per endpoint
  hourlyStats: Map<string, { requests: number; errors: number; avgTime: number }>;
  systemSnapshots: SystemSnapshot[];
  startTime: number;
  totalRequests: number;
  totalErrors: number;
}

// Global performance store (in-memory)
const MAX_RESPONSE_TIMES = 100; // Keep last 100 response times per endpoint
const MAX_SNAPSHOTS = 60; // Keep last 60 system snapshots (1 per minute)

let performanceStore: PerformanceStore = {
  endpoints: new Map(),
  responseTimes: new Map(),
  hourlyStats: new Map(),
  systemSnapshots: [],
  startTime: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
};

/**
 * Generate a key for endpoint tracking
 */
function getEndpointKey(path: string, method: string): string {
  // Normalize path to avoid tracking individual IDs as separate endpoints
  const normalizedPath = path
    .replace(/\/[a-f0-9-]{36}/gi, '/:id') // UUIDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\?.*$/, ''); // Query strings
  
  return `${method}:${normalizedPath}`;
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Record API response time
 */
export function recordResponseTime(
  path: string,
  method: string,
  durationMs: number,
  isError: boolean = false
): void {
  const key = getEndpointKey(path, method);
  
  // Update total counters
  performanceStore.totalRequests++;
  if (isError) {
    performanceStore.totalErrors++;
  }

  // Get or create endpoint metrics
  let metrics = performanceStore.endpoints.get(key);
  if (!metrics) {
    metrics = {
      path,
      method,
      count: 0,
      errors: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastAccess: new Date().toISOString(),
      avgResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
    performanceStore.endpoints.set(key, metrics);
  }

  // Update metrics
  metrics.count++;
  metrics.totalTime += durationMs;
  metrics.minTime = Math.min(metrics.minTime, durationMs);
  metrics.maxTime = Math.max(metrics.maxTime, durationMs);
  metrics.lastAccess = new Date().toISOString();
  metrics.avgResponseTime = Math.round(metrics.totalTime / metrics.count);
  
  if (isError) {
    metrics.errors++;
  }

  // Store response time for percentile calculation
  let times = performanceStore.responseTimes.get(key);
  if (!times) {
    times = [];
    performanceStore.responseTimes.set(key, times);
  }
  times.push(durationMs);
  
  // Keep only last N response times
  if (times.length > MAX_RESPONSE_TIMES) {
    times.shift();
  }

  // Update percentiles
  const sorted = [...times].sort((a, b) => a - b);
  metrics.p50 = calculatePercentile(sorted, 50);
  metrics.p95 = calculatePercentile(sorted, 95);
  metrics.p99 = calculatePercentile(sorted, 99);

  // Update hourly stats
  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  let hourStats = performanceStore.hourlyStats.get(hourKey);
  if (!hourStats) {
    hourStats = { requests: 0, errors: 0, avgTime: 0 };
    performanceStore.hourlyStats.set(hourKey, hourStats);
  }
  hourStats.requests++;
  if (isError) hourStats.errors++;
  hourStats.avgTime = (hourStats.avgTime * (hourStats.requests - 1) + durationMs) / hourStats.requests;
}

/**
 * Take a system performance snapshot
 */
export function takeSystemSnapshot(): SystemSnapshot {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const snapshot: SystemSnapshot = {
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      usagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
    },
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
  };

  // Store snapshot
  performanceStore.systemSnapshots.push(snapshot);
  
  // Keep only last N snapshots
  if (performanceStore.systemSnapshots.length > MAX_SNAPSHOTS) {
    performanceStore.systemSnapshots.shift();
  }

  return snapshot;
}

/**
 * Get all endpoint metrics
 */
export function getEndpointMetrics(): EndpointMetrics[] {
  return Array.from(performanceStore.endpoints.values())
    .sort((a, b) => b.count - a.count);
}

/**
 * Get slowest endpoints
 */
export function getSlowestEndpoints(limit: number = 10): EndpointMetrics[] {
  return Array.from(performanceStore.endpoints.values())
    .filter(m => m.count > 0)
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, limit);
}

/**
 * Get most error-prone endpoints
 */
export function getErrorProneEndpoints(limit: number = 10): EndpointMetrics[] {
  return Array.from(performanceStore.endpoints.values())
    .filter(m => m.errors > 0)
    .sort((a, b) => (b.errors / b.count) - (a.errors / a.count))
    .slice(0, limit);
}

/**
 * Get most accessed endpoints
 */
export function getMostAccessedEndpoints(limit: number = 10): EndpointMetrics[] {
  return Array.from(performanceStore.endpoints.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get overall performance summary
 */
export function getPerformanceSummary(): {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  uptime: number;
  avgResponseTime: number;
  endpointsCount: number;
  slowestEndpoint: EndpointMetrics | null;
  mostAccessedEndpoint: EndpointMetrics | null;
} {
  const endpoints = Array.from(performanceStore.endpoints.values());
  const totalResponseTime = endpoints.reduce((sum, m) => sum + m.totalTime, 0);
  const totalCount = endpoints.reduce((sum, m) => sum + m.count, 0);
  
  const slowest = endpoints.length > 0 
    ? endpoints.reduce((max, m) => m.avgResponseTime > max.avgResponseTime ? m : max)
    : null;
  
  const mostAccessed = endpoints.length > 0
    ? endpoints.reduce((max, m) => m.count > max.count ? m : max)
    : null;

  return {
    totalRequests: performanceStore.totalRequests,
    totalErrors: performanceStore.totalErrors,
    errorRate: totalCount > 0 ? (performanceStore.totalErrors / performanceStore.totalRequests) * 100 : 0,
    uptime: Math.floor((Date.now() - performanceStore.startTime) / 1000),
    avgResponseTime: totalCount > 0 ? Math.round(totalResponseTime / totalCount) : 0,
    endpointsCount: endpoints.length,
    slowestEndpoint: slowest,
    mostAccessedEndpoint: mostAccessed,
  };
}

/**
 * Get hourly statistics
 */
export function getHourlyStats(hours: number = 24): Map<string, { requests: number; errors: number; avgTime: number }> {
  const result = new Map();
  const now = new Date();
  
  for (let i = 0; i < hours; i++) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourKey = hour.toISOString().slice(0, 13);
    const stats = performanceStore.hourlyStats.get(hourKey);
    
    if (stats) {
      result.set(hourKey, stats);
    }
  }
  
  return result;
}

/**
 * Get system snapshots
 */
export function getSystemSnapshots(limit: number = 60): SystemSnapshot[] {
  return performanceStore.systemSnapshots.slice(-limit);
}

/**
 * Get latest system snapshot
 */
export function getLatestSnapshot(): SystemSnapshot | null {
  const snapshots = performanceStore.systemSnapshots;
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Reset performance metrics (useful for testing)
 */
export function resetPerformanceMetrics(): void {
  performanceStore = {
    endpoints: new Map(),
    responseTimes: new Map(),
    hourlyStats: new Map(),
    systemSnapshots: [],
    startTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
  };
  logger.info('Performance metrics reset');
}

/**
 * Get performance store for debugging
 */
export function getPerformanceStore(): PerformanceStore {
  return performanceStore;
}

/**
 * Performance timing wrapper for async functions
 */
export async function withPerformanceTracking<T>(
  path: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let isError = false;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    isError = true;
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    recordResponseTime(path, method, duration, isError);
  }
}

/**
 * Express/Next.js middleware helper for performance tracking
 */
export function createPerformanceTracker() {
  return {
    start: (path: string, method: string) => {
      const startTime = Date.now();
      return {
        end: (isError: boolean = false) => {
          const duration = Date.now() - startTime;
          recordResponseTime(path, method, duration, isError);
          return duration;
        },
      };
    },
  };
}

// Auto-capture system snapshots every minute (only in production or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  setInterval(() => {
    try {
      takeSystemSnapshot();
    } catch (error) {
      logger.error('Failed to take system snapshot', error);
    }
  }, 60000); // Every minute
  
  // Take initial snapshot
  takeSystemSnapshot();
  logger.info('Performance monitoring enabled with auto-snapshots');
}
