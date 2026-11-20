/**
 * Shared Error Analysis Utilities
 *
 * Common error analysis functions used across ErrorBoundary components.
 */

import { ErrorType } from '../ErrorDisplay'
import { getErrorCode, ErrorCodes, isNetworkError } from '@/lib/errors'

// Direct imports from submodules
import { UnifiedErrorType } from '@/lib/errors/unified-types'

/**
 * Analyze error type and return standardized ErrorType
 */
export function analyzeErrorType(error: Error): ErrorType {
  // Network errors
  if (isNetworkError(error)) {
    return 'network'
  }

  const code = getErrorCode(error)

  switch (code) {
    case ErrorCodes.NOT_FOUND:
    case UnifiedErrorType.NOT_FOUND:
      return 'not-found'
    case ErrorCodes.UNAUTHORIZED:
    case UnifiedErrorType.UNAUTHORIZED:
      return 'unauthorized'
    case ErrorCodes.FORBIDDEN:
    case UnifiedErrorType.FORBIDDEN:
      return 'forbidden'
    case ErrorCodes.SERVER_ERROR:
    case UnifiedErrorType.INTERNAL:
      return 'server'
    case ErrorCodes.NETWORK_ERROR:
    case UnifiedErrorType.NETWORK_ERROR:
      return 'network'
    default:
      return 'generic'
  }
}

/**
 * Get user-friendly error title based on error type
 */
export function getErrorTitle(errorType: ErrorType, defaultTitle: string): string {
  switch (errorType) {
    case 'network':
      return '网络连接失败'
    case 'not-found':
      return '页面不存在'
    case 'unauthorized':
      return '需要登录'
    case 'forbidden':
      return '没有权限'
    case 'server':
      return '服务器错误'
    default:
      return defaultTitle
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(errorType: ErrorType, defaultMessage: string): string {
  switch (errorType) {
    case 'network':
      return '请检查您的网络连接，然后重试'
    case 'not-found':
      return '您访问的页面不存在或已被移除'
    case 'unauthorized':
      return '请登录后继续访问此页面'
    case 'forbidden':
      return '您没有权限访问此页面'
    case 'server':
      return '服务器暂时无法处理请求，请稍后重试'
    default:
      return defaultMessage
  }
}