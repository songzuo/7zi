/**
 * 认证中间件
 * JWT 验证、速率限制、认证错误处理
 * 
 * @module lib/middleware
 */

// 错误处理
export { 
  createErrorResponse, 
  withErrorHandler,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  serverError,
  successResponse,
  paginatedResponse,
} from './error-handler';

// 认证中间件
export {
  withAuth,
  getCurrentUser,
  checkPermission,
  checkAdmin,
  requireAdmin,
  requireAuth,
  optionalAuth,
  withRateLimit,
  withCsrf,
  adminRateLimited,
  type AuthOptions,
} from './auth';

// JWT 认证 (从 security 模块 re-export)
export {
  createAuthMiddleware,
  extractToken,
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  isAdmin,
  hasPermission,
  validateJwtSecret,
  generateSecureSecret,
  type User,
  type TokenPayload,
  type AuthMiddlewareOptions,
} from '@/lib/security/auth';

// 速率限制 & 安全
export {
  rateLimit,
  sanitizeInput,
  sanitizeObject,
  detectSqlInjection,
  detectXss,
  securityMiddleware,
  setSecurityHeaders,
  createApiSecurityMiddleware,
  type RateLimitConfig,
} from '@/lib/security/middleware';

// CSRF
export {
  generateCsrfToken,
  generateSignedCsrfToken,
  verifySignedCsrfToken,
  setCsrfTokenCookie,
  clearCsrfTokenCookie,
  getCsrfTokenFromHeader,
  validateDoubleSubmitCookie,
  requiresCsrfProtection,
  isCsrfExempt,
} from '@/lib/security/csrf';
