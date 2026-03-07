'use client';

// 重新导出 ErrorBoundary 及相关类型
export {
  ErrorBoundary,
  ErrorType,
  withErrorBoundary,
} from './ErrorBoundary';

// classifyError 是模块内部函数，不导出
// 如果需要使用，请直接从 ErrorBoundary.tsx 导入

export {
  reportError,
  setupGlobalErrorHandler,
  reportApiError,
  reportNetworkError,
} from '@/lib/error-reporter';
export type { ErrorReportPayload, ErrorCategory } from '@/lib/error-reporter';