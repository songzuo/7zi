/**
 * Middleware Module
 * 中间件模块 - 统一导出
 *
 * 包含：
 * - API 性能追踪
 * - 监控包装器
 * - 速率限制
 * - CSRF 保护
 * - CORS 配置
 * - 数据库性能
 */

// ============================================
// API Performance Monitoring
// ============================================
export {
  ApiPerformanceCollector,
  apiPerformanceCollector,
  withApiPerformanceTracking,
  getApiPerformanceReport,
  clearApiPerformanceData,
  type ApiPerformanceData,
  type ApiPerformanceMetrics,
} from './api-performance'

// ============================================
// Monitoring Wrapper
// ============================================
export {
  withMonitoring,
  withGETMonitoring,
  withPOSTMonitoring,
  withPUTMonitoring,
  withDELETEMonitoring,
  getMonitoringStats,
  resetMonitoringStats,
  type MonitoringOptions,
  type MonitoringStats,
} from './monitoring-wrapper'

// ============================================
// Rate Limiting
// ============================================
export {
  withRateLimit,
  getRateLimitStats,
  performPeriodicCleanup,
  startPeriodicCleanup,
  stopPeriodicCleanup,
} from './rate-limit'
export type { RateLimitEntry, RateLimitConfig } from './rate-limit'

// ============================================
// CSRF Protection
// ============================================
export {
  withCsrfProtection,
  createCsrfMiddleware,
  createCsrfErrorResponse,
  validateRequestCsrf,
  generateCsrfToken,
  type CsrfProtectionConfig,
} from './csrf'

// ============================================
// CORS Configuration
// ============================================
export {
  withCors,
  createCorsMiddleware,
  corsPolicies,
  createCorsErrorResponse,
  getEnvironmentOrigins,
  type CorsConfig,
} from '@/middleware/cors'

// ============================================
// Database Performance
// ============================================
export { getQueryMetrics, getQueryMetricsSummary, type QueryMetrics } from './db-performance'
