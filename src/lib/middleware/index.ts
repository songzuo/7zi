/**
 * 认证中间件
 * JWT 验证、速率限制、认证错误处理
 * 
 * @module lib/middleware
 */

// 统一 API 响应处理系统（推荐使用）
export {
  // 核心函数
  apiHandler,
  createErrorResponse,
  
  // 错误创建
  apiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  rateLimited,
  serverError,
  serviceUnavailable,

  // 成功响应
  success,
  paginated,
  created,

  // 验证
  validateRequired,
  validateString,
  validateRange,
  validateEnum,
  validateObject,
  validateArray,
  
  // 类型
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ApiResponse,
  type ErrorHandlerConfig,
} from '@/lib/api-response';

// 向后兼容导出 (deprecated - 将在未来版本移除)
import {
  badRequest as _badRequest,
  unauthorized as _unauthorized,
  forbidden as _forbidden,
  notFound as _notFound,
  success as _success,
  paginated as _paginated,
} from '@/lib/api-response';
import type { NextRequest, NextResponse } from 'next/server';

/** @deprecated 使用 badRequest 代替 */
export function validationError(message: string, field?: string, request?: NextRequest): NextResponse {
  return _badRequest(message, field ? { field } : undefined, request);
}

/** @deprecated 使用 unauthorized 代替 */
export function authError(message?: string, request?: NextRequest): NextResponse {
  return _unauthorized(message || '需要登录才能访问', request);
}

/** @deprecated 使用 forbidden 代替 */
export function forbiddenError(message?: string, request?: NextRequest): NextResponse {
  return _forbidden(message || '没有权限访问', request);
}

/** @deprecated 使用 notFound 代替 */
export function notFoundError(resource?: string, id?: string, request?: NextRequest): NextResponse {
  return _notFound(resource || '资源', id, request);
}

/** @deprecated 使用 success 代替 */
export const successResponse = _success;

/** @deprecated 使用 paginated 代替 */
export const paginatedResponse = _paginated;

/** @deprecated 使用 apiHandler 代替 */
export { apiHandler as withErrorHandler } from '@/lib/api-response';

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
