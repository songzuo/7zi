/**
 * @fileoverview Toast Notification Component
 * @description 显示 Toast 通知的容器组件，与 uiStore 集成
 *
 * Features:
 * - 支持多种类型（success, error, warning, info, loading）
 * - 支持堆叠显示
 * - 自动关闭和手动关闭
 * - 动画效果
 * - 深色/浅色模式
 * - ARIA 无障碍支持
 */

'use client'

import { memo, useCallback, useEffect, type FC } from 'react'
import { useToasts, useToastActions, type Toast, type ToastType } from '@/stores/uiStore'

// ============================================================================
// Types
// ============================================================================

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

// ============================================================================
// Toast Icon Component
// ============================================================================

interface ToastIconProps {
  type: ToastType
}

const ToastIcon: FC<ToastIconProps> = memo(({ type }) => {
  const iconMap: Record<ToastType, React.ReactNode> = {
    success: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    loading: (
      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ),
  }

  return <>{iconMap[type]}</>
})

ToastIcon.displayName = 'ToastIcon'

// ============================================================================
// Toast Style Configurations
// ============================================================================

interface ToastStyleConfig {
  container: string
  icon: string
  progress: string
}

const getToastStyle = (type: ToastType): ToastStyleConfig => {
  const styles: Record<ToastType, ToastStyleConfig> = {
    success: {
      container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: 'text-green-500',
      progress: 'bg-green-500',
    },
    error: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-500',
      progress: 'bg-red-500',
    },
    warning: {
      container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-500',
      progress: 'bg-yellow-500',
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-500',
      progress: 'bg-blue-500',
    },
    loading: {
      container: 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
      icon: 'text-zinc-500',
      progress: 'bg-zinc-500',
    },
  }

  return styles[type]
}

// ============================================================================
// Toast Item Component
// ============================================================================

const ToastItem: FC<ToastItemProps> = memo(({ toast, onRemove }) => {
  const style = getToastStyle(toast.type)

  const handleClose = useCallback(() => {
    onRemove(toast.id)
  }, [onRemove, toast.id])

  const handleAction = useCallback(() => {
    toast.action?.onClick()
    onRemove(toast.id)
  }, [toast.action, onRemove, toast.id])

  return (
    <div
      className={`animate-slide-in-right relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg ${style.container} `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${style.icon}`}>
        <ToastIcon type={toast.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {toast.title && (
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{toast.title}</p>
        )}
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{toast.message}</p>

        {/* Action Button */}
        {toast.action && (
          <button
            onClick={handleAction}
            className="mt-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      {toast.type !== 'loading' && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          aria-label="关闭通知"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && toast.type !== 'loading' && (
        <div className="absolute right-0 bottom-0 left-0 h-1 overflow-hidden rounded-b-xl bg-zinc-200 dark:bg-zinc-700">
          <div
            className={`h-full ${style.progress} animate-shrink`}
            style={{
              animationDuration: `${toast.duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  )
})

ToastItem.displayName = 'ToastItem'

// ============================================================================
// Toast Container Component
// ============================================================================

export const ToastContainer: FC = memo(() => {
  const toasts = useToasts()
  const { removeToast } = useToastActions()

  if (toasts.length === 0) return null

  return (
    <div className="fixed z-50 flex w-full max-w-sm flex-col gap-2 p-4" aria-label="通知">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
})

ToastContainer.displayName = 'ToastContainer'

// ============================================================================
// Toast Position Variants
// ============================================================================

interface PositionedToastContainerProps {
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center'
}

const POSITION_CLASSES: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
}

export const PositionedToastContainer: FC<PositionedToastContainerProps> = memo(
  ({ position = 'top-right' }) => {
    const toasts = useToasts()
    const { removeToast } = useToastActions()

    if (toasts.length === 0) return null

    return (
      <div
        className={`fixed z-50 flex w-full max-w-sm flex-col gap-2 p-4 ${POSITION_CLASSES[position]}`}
        aria-label="通知"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    )
  }
)

PositionedToastContainer.displayName = 'PositionedToastContainer'

// ============================================================================
// Exports
// ============================================================================

export default ToastContainer
