/**
 * useToast Hook
 *
 * Convenient hook for accessing toast notifications
 *
 * @example
 * const toast = useToast();
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 *
 * @example
 * const { toast, success, error, warning, info, close, closeAll } = useToast();
 */

import { useToast as useToastContext } from './ToastProvider'
import type { ToastOptions } from './ToastProvider'
import type { ToastType } from './Toast'

/**
 * useToast hook
 *
 * Provides methods to show toast notifications.
 * Must be used within a ToastProvider.
 *
 * @returns Toast value object with methods to control toasts
 *
 * @example
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleClick = () => {
 *     toast.success('Data saved successfully!');
 *   };
 *
 *   return <button onClick={handleClick}>Save</button>;
 * }
 */
export function useToast() {
  return useToastContext()
}

/**
 * Hook that returns only toast creation methods (close methods omitted)
 * Useful for components that only need to show toasts
 *
 * @example
 * const { toast, success, error, warning, info } = useToastCreator();
 */
export function useToastCreator() {
  const toast = useToastContext()
  const { close: _, closeAll: __, ...rest } = toast
  return rest
}

/**
 * Hook that returns only close methods (creator methods omitted)
 * Useful for components that only need to manage toasts
 *
 * @example
 * const { close, closeAll } = useToastManager();
 */
export function useToastManager() {
  const toast = useToastContext()
  return {
    close: toast.close,
    closeAll: toast.closeAll,
    toastCount: toast.toastCount,
  }
}

/**
 * Hook for creating a toast with custom options
 *
 * @example
 * const showToast = useCustomToast();
 *
 * showToast({
 *   message: 'Custom notification',
 *   type: 'info',
 *   title: 'Info',
 *   autoCloseDelay: 10000,
 *   action: {
 *     label: 'Undo',
 *     onClick: () => console.log('Undo')
 *   }
 * });
 */
export function useCustomToast() {
  const toast = useToastContext()
  return toast.toast
}

/**
 * Hook for creating toasts with callbacks
 *
 * @example
 * const showToastWithCallback = useToastWithCallback();
 *
 * showToastWithCallback({
 *   message: 'Data deleted',
 *   type: 'warning',
 *   onClosed: () => console.log('Toast closed')
 * });
 */
export function useToastWithCallback() {
  const toast = useToastContext()

  return (options: ToastOptions & { onClosed?: () => void }) => {
    const id = toast.toast(options)

    if (options.onClosed) {
      // Wait for the toast to be removed
      // This is a simple implementation - in production you might want
      // a more sophisticated tracking system
      setTimeout(() => {
        toast.close(id)
        options.onClosed?.()
      }, options.autoCloseDelay ?? 5000)
    }

    return id
  }
}

/**
 * Hook for creating toasts with promise handling
 *
 * @example
 * const showToastWithPromise = useToastPromise();
 *
 * try {
 *   const result = await showToastWithPromise(
 *     fetchData(),
 *     {
 *       loading: 'Loading data...',
 *       success: 'Data loaded successfully',
 *       error: 'Failed to load data'
 *     }
 *   );
 * } catch (err) {
 *   // Error is handled by the toast
 * }
 */
export function useToastPromise() {
  const toast = useToastContext()

  return async <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ): Promise<T> => {
    const loadingId = toast.toast({
      message: messages.loading,
      type: 'info',
      autoClose: false,
    })

    try {
      const result = await promise
      toast.close(loadingId)
      toast.success(messages.success)
      return result
    } catch (error) {
      toast.close(loadingId)
      toast.error(messages.error)
      throw error
    }
  }
}

/**
 * Hook for creating dismissible toasts (can be manually closed)
 *
 * @example
 * const showDismissibleToast = useDismissibleToast();
 *
 * const toastId = showDismissibleToast({
 *   message: 'This can be dismissed',
 *   type: 'info'
 * });
 *
 * // Later...
 * toast.close(toastId);
 */
export function useDismissibleToast() {
  const toast = useToastContext()

  return (options: Omit<ToastOptions, 'autoClose'>) => {
    return toast.toast({
      ...options,
      autoClose: false,
    })
  }
}

/**
 * Hook for creating persistent toasts (never auto-close)
 *
 * @example
 * const showPersistentToast = usePersistentToast();
 *
 * const toastId = showPersistentToast({
 *   message: 'Important notice',
 *   type: 'warning',
 *   action: {
 *     label: 'Acknowledge',
 *     onClick: () => toast.close(toastId)
 *   }
 * });
 */
export function usePersistentToast() {
  const toast = useToastContext()

  return (options: ToastOptions) => {
    return toast.toast({
      ...options,
      autoClose: false,
    })
  }
}

// Re-export types for convenience
export type { ToastOptions } from './ToastProvider'
export type { ToastValue } from './ToastProvider'
export type { ToastType } from './Toast'
