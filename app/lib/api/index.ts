/**
 * API 增强工具 - 统一导出
 */

// 限流
export {
  createRateLimiter,
  withRateLimit,
  rateLimitPresets,
} from './rate-limit';

// 缓存
export {
  createCacheMiddleware,
  getCache,
  setCache,
  clearCache,
  getCacheStats,
  cachePresets,
} from './cache';

// 验证
export {
  validateBody,
  validateQuery,
  withValidation,
  commonSchemas,
  type ValidationSchema,
  type ValidationRule,
  type ValidationResult,
} from './validation';

// 响应
export {
  ApiResponse,
  ApiError,
  withApiResponse,
  HttpStatus,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type PaginatedData,
} from './response';
