/**
 * Toast Component
 *
 * Individual toast notification with animations
 *
 * @example
 * <Toast
 *   message="Operation successful"
 *   type="success"
 *   onClose={() => {}}
 * />
 */

'use client'

import React, { useEffect, useState, useCallback, memo } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  /**
   * Unique ID for the toast
   */
  id: string

  /**
   * Message to display
   */
  message: string

  /**
   * Type of toast
   * @default 'info'
   */
  type?: ToastType

  /**
   * Optional title (shown above message)
   */
  title?: string

  /**
   * Callback when toast is closed
   */
  onClose: () => void

  /**
   * Whether toast should auto-close
   * @default true
   */
  autoClose?: boolean

  /**
   * Delay before auto-close (ms)
   * @default 5000
   */
  autoCloseDelay?: number

  /**
   * Whether to show close button
   * @default true
   */
  showCloseButton?: boolean

  /**
   * Custom icon (overrides default)
   */
  icon?: React.ReactNode

  /**
   * Additional CSS class names
   */
  className?: string

  /**
   * Position in the toast container
   * Used for animation
   */
  position?: number

  /**
   * Action button configuration
   */
  action?: {
    label: string
    onClick: () => void
  }
}

const typeStyles: Record<ToastType, { container: string; icon: string; iconBg: string }> = {
  success: {
    container: 'border-l-green-500',
    icon: 'text-green-500',
    iconBg: 'bg-green-50 dark:bg-green-900/20',
  },
  error: {
    container: 'border-l-red-500',
    icon: 'text-red-500',
    iconBg: 'bg-red-50 dark:bg-red-900/20',
  },
  warning: {
    container: 'border-l-yellow-500',
    icon: 'text-yellow-500',
    iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  info: {
    container: 'border-l-blue-500',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
}

const defaultIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
}

function Toast({
  id,
  message,
  type = 'info',
  title,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  showCloseButton = true,
  icon,
  className = '',
  position,
  action,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    // Animation in
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto hide
    if (autoClose) {
      let timer: NodeJS.Timeout
      let remainingTime = autoCloseDelay

      const startTimer = () => {
        timer = setTimeout(() => {
          handleClose()
        }, remainingTime)
      }

      startTimer()

      // Handle pause on hover
      const handleMouseEnter = () => {
        setIsPaused(true)
        clearTimeout(timer)
        remainingTime = remainingTime - (Date.now() - startTime)
      }

      const handleMouseLeave = () => {
        setIsPaused(false)
        startTime = Date.now()
        startTimer()
      }

      let startTime = Date.now()

      // Add event listeners
      const toastElement = document.getElementById(`toast-${id}`)
      if (toastElement) {
        toastElement.addEventListener('mouseenter', handleMouseEnter)
        toastElement.addEventListener('mouseleave', handleMouseLeave)
      }

      return () => {
        clearTimeout(timer)
        if (toastElement) {
          toastElement.removeEventListener('mouseenter', handleMouseEnter)
          toastElement.removeEventListener('mouseleave', handleMouseLeave)
        }
      }
    }
  }, [autoClose, autoCloseDelay, id])

  const handleClose = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }, [onClose])

  const styles = typeStyles[type]

  return (
    <div
      id={`toast-${id}`}
      className={`relative rounded-lg border-l-4 bg-white shadow-lg dark:bg-gray-800 ${styles.container} mb-3 transform p-4 transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${isLeaving ? 'translate-x-full opacity-0' : ''} ${isPaused ? 'scale-105' : ''} ${className} `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${styles.iconBg} rounded-full p-1`}>
          {icon ?? defaultIcons[type]}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {title && (
            <h4 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>

          {/* Action button */}
          {action && (
            <button
              onClick={() => {
                action.onClick()
                handleClose()
              }}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar for auto-close */}
      {autoClose && !isLeaving && (
        <div className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gray-400 transition-all ease-linear dark:bg-gray-500"
            style={{
              width: '100%',
              animation: `toast-progress ${autoCloseDelay}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  )
}

// Add keyframe animations for progress bar
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes toast-progress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `
  document.head.appendChild(style)
}

export default memo(Toast)
