/**
 * 统一错误处理系统
 * Unified Error Handling System
 *
 * 这是项目的统一错误处理入口。
 * 所有模块都应该使用这里的类型、类和函数来处理错误。
 *
 * 使用方式:
 * ```typescript
 * import {
 *   UnifiedAppError,
 *   UnifiedErrorType,
 *   createUnifiedErrorResponse,
 *   createUnifiedSuccessResponse,
 *   withUnifiedErrorHandling,
 * } from '@/lib/errors';
 * ```
 *
 * 向后兼容性:
 * 此模块保留对旧错误处理系统的兼容导出，包括:
 * - src/lib/errors.ts 中的函数
 * - src/lib/api/error-handler.ts 中的函数
 * 请使用统一的 @/lib/errors 导入路径。
 */

// ============================================================
// 统一接口导出 (来自子模块)
// ============================================================

export type { UnifiedErrorInfo } from './unified-types'
export {
  UnifiedErrorType,
  ErrorCodes,
  STATUS_CODE_TO_ERROR_TYPE,
  isRetryableErrorType,
  getDefaultStatusCode,
} from './unified-types'

export {
  UnifiedAppError,
  toUnifiedError,
  isUnifiedError,
  extractErrorInfo,
} from './unified-error'

export type { UnifiedErrorResponse, UnifiedSuccessResponse } from './unified-response'
export {
  createUnifiedErrorResponse,
  createUnifiedSuccessResponse,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
  createUnauthorizedErrorResponse,
  createForbiddenErrorResponse,
  createRateLimitErrorResponse,
  createInternalErrorResponse,
  createServiceUnavailableErrorResponse,
  createNetworkErrorResponse,
  createTimeoutErrorResponse,
  createRegistrationFailedErrorResponse,
  createWeakPasswordErrorResponse,
  createMissingTokenErrorResponse,
  createConflictErrorResponse,
  withUnifiedErrorHandling,
  parseUnifiedResponse,
} from './unified-response'

// ============================================================
// 向后兼容类型别名
// ============================================================

export { UnifiedAppError as AppError } from './unified-error'
export { ErrorCodes as legacyErrorCodes } from './unified-types'
export { UnifiedErrorType as ErrorType } from './unified-types'

// ApiError 类型别名
import type { UnifiedAppError } from './unified-error'
export type ApiError = UnifiedAppError
