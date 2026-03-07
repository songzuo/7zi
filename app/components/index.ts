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

// 表单编辑器和富文本编辑器
export { RichTextEditor } from './RichTextEditor';
export type { RichTextEditorProps } from './RichTextEditor';

export { 
  FormBuilder, 
  FormPreview,
  createDefaultFormConfig,
} from './FormBuilder';
export type { 
  FormBuilderProps, 
  FormConfig, 
  FormField, 
  FieldType, 
  FieldOption,
  FormData,
  FormErrors,
} from './FormBuilder';

// 用户活动日志组件
export { UserActivityLog } from './UserActivityLog';
export type { UserActivityLogProps } from './UserActivityLog';

export { ActivityTimelineView } from './ActivityTimelineView';
export type { ActivityTimelineViewProps } from './ActivityTimelineView';