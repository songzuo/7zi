/**
 * Feedback Components
 *
 * Unified module for user feedback components:
 * - Loading states (LoadingState, SkeletonLoader)
 * - Toast notifications (Toast, ToastProvider, useToast)
 * - Error handling (ErrorBoundary, ErrorFallback)
 *
 * @example
 * // Loading states
 * import { LoadingState, PageLoading, ComponentLoading } from '@/components/ui/feedback';
 *
 * // Skeleton loaders
 * import { SkeletonLoader, TextSkeletonLines, CardSkeletonLoader } from '@/components/ui/feedback';
 *
 * // Toast notifications
 * import { ToastProvider, useToast } from '@/components/ui/feedback';
 *
 * // Error handling
 * import { ErrorBoundary, ErrorFallback, withErrorBoundary } from '@/components/ui/feedback';
 */

// Loading States
export {
  default as LoadingState,
  InlineLoading,
  PageLoading,
  ComponentLoading,
} from './LoadingState';
export type { LoadingVariant, LoadingSize } from './LoadingState';

// Skeleton Loaders
export {
  default as SkeletonLoader,
  TextSkeletonLines,
  CardSkeletonLoader,
  ListSkeletonLoader,
  TableSkeletonLoader,
} from './SkeletonLoader';
export type { SkeletonVariant, SkeletonSize } from './SkeletonLoader';

// Toast System
export { default as Toast } from './Toast';
export type { ToastProps, ToastType } from './Toast';

export {
  default as ToastProvider,
  useToast,
  withToast,
} from './ToastProvider';
export type {
  ToastOptions,
  ToastPosition,
  ToastValue,
} from './ToastProvider';

// Toast Hooks
export {
  useToastCreator,
  useToastManager,
  useCustomToast,
  useToastWithCallback,
  useToastPromise,
  useDismissibleToast,
  usePersistentToast,
} from './useToast';

// Error Handling
export {
  default as ErrorBoundary,
  ErrorFallback,
  SimpleErrorFallback,
  FullErrorFallback,
  CardErrorFallback,
  useErrorBoundary,
  withErrorBoundary,
} from './ErrorBoundary';
export type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorFallbackProps,
} from './ErrorBoundary';
