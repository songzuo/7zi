/**
 * ToastProvider Component
 *
 * Context provider for toast notifications with positioning and management
 *
 * @example
 * <ToastProvider position="top-right" maxToasts={5}>
 *   <App />
 * </ToastProvider>
 */

'use client';

import React, { createContext, useContext, ReactNode, useCallback, useMemo, memo } from 'react';
import Toast, { ToastProps, ToastType } from './Toast';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  title?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  showCloseButton?: boolean;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ToastPosition = 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';

export interface ToastValue {
  /**
   * Show a toast notification
   */
  toast: (options: ToastOptions) => string;

  /**
   * Show a success toast
   */
  success: (message: string, title?: string) => string;

  /**
   * Show an error toast
   */
  error: (message: string, title?: string) => string;

  /**
   * Show a warning toast
   */
  warning: (message: string, title?: string) => string;

  /**
   * Show an info toast
   */
  info: (message: string, title?: string) => string;

  /**
   * Close a specific toast by ID
   */
  close: (id: string) => void;

  /**
   * Close all toasts
   */
  closeAll: () => void;

  /**
   * Get current toast count
   */
  toastCount: number;
}

interface ToastItem extends ToastProps {
  id: string;
  createdAt: number;
}

const ToastContext = createContext<ToastValue | null>(null);

interface ToastProviderProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Position of toasts on screen
   * @default 'top-right'
   */
  position?: ToastPosition;

  /**
   * Maximum number of toasts to show at once
   * @default 5
   */
  maxToasts?: number;

  /**
   * Z-index for toast container
   * @default 9999
   */
  zIndex?: number;

  /**
   * Whether to show progress bar on toasts
   * @default true
   */
  showProgress?: boolean;
}

let toastCounter = 0;

function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
  zIndex = 9999,
  showProgress = true,
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const positionClasses: Record<ToastPosition, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  /**
   * Add a new toast
   */
  const addToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${++toastCounter}-${Date.now()}`;

    const newToast: ToastItem = {
      id,
      message: options.message,
      type: options.type ?? 'info',
      title: options.title,
      autoClose: options.autoClose ?? true,
      autoCloseDelay: options.autoCloseDelay ?? 5000,
      showCloseButton: options.showCloseButton ?? true,
      icon: options.icon,
      action: options.action,
      onClose: () => removeToast(id),
      position: toasts.length,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Remove old toasts if we exceed max
      return updated.slice(-maxToasts);
    });

    return id;
  }, [maxToasts, toasts.length]);

  /**
   * Remove a toast by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      // Update positions
      return updated.map((t, index) => ({ ...t, position: index }));
    });
  }, []);

  /**
   * Remove all toasts
   */
  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Convenience methods
   */
  const toastValue: ToastValue = useMemo(
    () => ({
      toast: addToast,
      success: (message, title) => addToast({ message, title, type: 'success' }),
      error: (message, title) => addToast({ message, title, type: 'error' }),
      warning: (message, title) => addToast({ message, title, type: 'warning' }),
      info: (message, title) => addToast({ message, title, type: 'info' }),
      close: removeToast,
      closeAll: removeAllToasts,
      toastCount: toasts.length,
    }),
    [addToast, removeToast, removeAllToasts, toasts.length]
  );

  return (
    <ToastContext.Provider value={toastValue}>
      {children}

      {/* Toast Container */}
      <div
        className={`fixed ${positionClasses[position]} z-${zIndex} w-full max-w-md pointer-events-none`}
        style={{ zIndex }}
      >
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast context
 */
export function useToast(): ToastValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

/**
 * HOC to add toast functionality to a component
 */
export function withToast<P extends object>(
  Component: React.ComponentType<P & { toast: ToastValue }>
) {
  return function WithToastComponent(props: P) {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
}

export default memo(ToastProvider);
