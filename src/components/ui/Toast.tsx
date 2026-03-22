/**
 * Toast Notification Component
 *
 * A toast notification system with multiple variants and positions.
 * Supports internationalization via optional translation keys.
 *
 * @module components/ui/Toast
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/**
 * Toast variant types
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast position types
 */
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * Toast item interface with i18n support
 */
export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  titleKey?: string;
  messageKey?: string;
  duration?: number;
  closable?: boolean;
}

/**
 * Toast context interface
 */
interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

/**
 * Toast context
 */
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook to use toast context
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * Toast provider props
 */
export interface ToastProviderProps {
  /** Default toast position (default: 'top-right') */
  defaultPosition?: ToastPosition;
  /** Maximum number of toasts (default: 5) */
  maxToasts?: number;
  /** Children components */
  children: React.ReactNode;
}

/**
 * Toast provider component
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  defaultPosition = 'top-right',
  maxToasts = 5,
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
      closable: toast.closable ?? true,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev].slice(0, maxToasts);
      return updated;
    });

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer
        toasts={toasts}
        position={defaultPosition}
        onRemove={removeToast}
      />
    </ToastContext.Provider>
  );
};

/**
 * Toast container component
 */
interface ToastContainerProps {
  toasts: ToastItem[];
  position: ToastPosition;
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, position, onRemove }) => {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 p-4 pointer-events-none',
        positionClasses[position]
      )}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

/**
 * Toast component props
 */
export interface ToastProps {
  toast: ToastItem;
  onClose: () => void;
}

/**
 * Variant configurations
 */
const VARIANT_CONFIG: Record<ToastVariant, { icon: string; bg: string; border: string }> = {
  success: {
    icon: '✓',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  error: {
    icon: '✕',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  warning: {
    icon: '⚠',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

/**
 * Toast component with i18n support
 */
const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { icon, bg, border } = VARIANT_CONFIG[toast.variant];
  const t = useTranslations('ui.toast');

  // Use translation keys if provided, otherwise use the title/message directly
  const displayTitle = toast.titleKey ? t(toast.titleKey as keyof typeof t) : toast.title;
  const displayMessage = toast.messageKey ? t(toast.messageKey as keyof typeof t) : toast.message;

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-full fade-in duration-300',
        bg,
        border
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 text-xl">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">
            {displayTitle}
          </p>
          {displayMessage && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {displayMessage}
            </p>
          )}
        </div>

        {/* Close button */}
        {toast.closable && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label={t('success')}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Toast hook - Convenience hook for common toast types
 */
export function useToastActions() {
  const { showToast, removeToast } = useToast();

  return {
    success: (title: string, message?: string, duration?: number) => {
      showToast({ variant: 'success', title, message, duration });
    },
    error: (title: string, message?: string, duration?: number) => {
      showToast({ variant: 'error', title, message, duration });
    },
    warning: (title: string, message?: string, duration?: number) => {
      showToast({ variant: 'warning', title, message, duration });
    },
    info: (title: string, message?: string, duration?: number) => {
      showToast({ variant: 'info', title, message, duration });
    },
    custom: (toast: Omit<ToastItem, 'id'>) => {
      showToast(toast);
    },
    remove: removeToast,
  };
};

/**
 * Toast button - Button that shows a toast when clicked
 */
export interface ToastButtonProps extends Omit<ToastItem, 'id' | 'variant'> {
  /** Button label */
  label: string;
  /** Button variant */
  variant: ToastVariant;
}

export const ToastButton: React.FC<ToastButtonProps> = ({
  label,
  ...toastProps
}) => {
  const { showToast } = useToast();

  return (
    <button
      onClick={() => showToast(toastProps)}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      {label}
    </button>
  );
};

export default ToastProvider;
