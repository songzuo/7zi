/**
 * Global Middleware Module
 *
 * This module exports all middleware components for the 7zi-project.
 * Middleware components can be composed together to create layered security.
 *
 * Usage Examples:
 *
 * ```typescript
 * import { withCors, withRateLimit, withCsrfProtection } from '@/middleware';
 *
 * // Single middleware
 * export const GET = withCors(handler);
 *
 * // Multiple middleware (applied in order)
 * export const POST = withCsrfProtection(
 *   withRateLimit(
 *     withCors(handler),
 *     { windowMs: 60000, maxRequests: 10 }
 *   ),
 *   { useSignedTokens: true }
 * );
 * ```
 */

// ============================================
// Imports for internal use
// ============================================
import { withCors as _withCors } from './cors'
import { withCsrfProtection as _withCsrfProtection } from '../lib/middleware/csrf'
import { withRateLimit as _withRateLimit } from '../lib/middleware/rate-limit'

// ============================================
// Authentication Middleware
// ============================================
export {
  withAuth,
  authenticateRequest,
  RATE_LIMIT_CONFIG,
  withUserAuth,
  withPermissions,
  withAnyPermission,
  withRole,
  withAnyRole,
  withAdmin,
  withManagerOrAdmin,
  withOptionalAuth,
  type RBACUserContext,
} from './auth'

// Re-export types from auth middleware
export type { UserContext, UserRole } from '@/lib/auth/types'

// ============================================
// CORS Middleware
// ============================================
export {
  withCors,
  createCorsMiddleware,
  corsPolicies,
  createCorsErrorResponse,
  getEnvironmentOrigins,
  type CorsConfig,
} from './cors'

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
} from '../lib/middleware/csrf'

// ============================================
// Rate Limiting
// ============================================
export {
  withRateLimit,
  withSmartRateLimit,
  getRateLimitStatus,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimitStats,
  performPeriodicCleanup,
  startPeriodicCleanup,
  stopPeriodicCleanup,
  type RateLimitEntry,
  type RateLimitConfig,
} from '../lib/middleware/rate-limit'

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
} from '../lib/middleware/api-performance'

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
} from '../lib/middleware/monitoring-wrapper'

// ============================================
// Database Performance
// ============================================
export {
  getQueryMetrics,
  getQueryMetricsSummary,
  type QueryMetrics,
} from '../lib/middleware/db-performance'

// ============================================
// Pre-configured Middleware Chains
// ============================================

/**
 * Standard API security chain
 * Applies CORS, rate limiting, and CSRF protection in order
 */
export function withStandardApiSecurity(
  handler: (req: import('next/server').NextRequest) => Promise<import('next/server').NextResponse>,
  config?: {
    cors?: Partial<import('./cors').CorsConfig>
    rateLimit?: Partial<import('../lib/middleware/rate-limit').RateLimitConfig>
    csrf?: Partial<import('../lib/middleware/csrf').CsrfProtectionConfig>
  }
) {
  return _withCsrfProtection(
    _withRateLimit(_withCors(handler, config?.cors), config?.rateLimit),
    config?.csrf
  )
}

/**
 * Public API security chain (no CSRF)
 * Applies CORS and rate limiting only
 */
export function withPublicApiSecurity(
  handler: (req: import('next/server').NextRequest) => Promise<import('next/server').NextResponse>,
  config?: {
    cors?: Partial<import('./cors').CorsConfig>
    rateLimit?: Partial<import('../lib/middleware/rate-limit').RateLimitConfig>
  }
) {
  return _withRateLimit(_withCors(handler, config?.cors), config?.rateLimit)
}

/**
 * Internal API security chain (no CORS)
 * Applies rate limiting and CSRF protection only
 */
export function withInternalApiSecurity(
  handler: (req: import('next/server').NextRequest) => Promise<import('next/server').NextResponse>,
  config?: {
    rateLimit?: Partial<import('../lib/middleware/rate-limit').RateLimitConfig>
    csrf?: Partial<import('../lib/middleware/csrf').CsrfProtectionConfig>
  }
) {
  return _withCsrfProtection(_withRateLimit(handler, config?.rateLimit), config?.csrf)
}
