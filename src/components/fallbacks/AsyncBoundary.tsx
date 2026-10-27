/**
 * Async Boundary Component
 *
 * Handles async operations with loading, error, and success states
 * Provides a consistent UI pattern for async operations
 */

'use client'

import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { ComponentFallback, FallbackVariant } from './ComponentFallback'

export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error'

/**
 * 为动态依赖数组生成稳定的字符串 key
 *
 * 依赖项按引用（Object.is 语义）比较：对象/函数使用稳定 id，
 * 基本类型直接使用其字面值。这样可以在不展开依赖数组的前提下，
 * 保持与「逐元素比较展开后的依赖数组」一致的行为。
 */
const dependencyIds = new WeakMap<object, number>()
let dependencyIdCounter = 0

function getDependencyToken(value: unknown): string {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    const key = value as object
    let id = dependencyIds.get(key)
    if (id === undefined) {
      id = ++dependencyIdCounter
      dependencyIds.set(key, id)
    }
    return `#${id}`
  }
  return `${typeof value}:${String(value)}`
}

function getDependenciesKey(dependencies: unknown[]): string {
  return dependencies.map(getDependencyToken).join('|')
}

export interface AsyncBoundaryProps<T = unknown> {
  /** Async operation to execute */
  children: AsyncChildren<T>
  /** Loading variant */
  loadingVariant?: FallbackVariant
  /** Error variant */
  errorVariant?: FallbackVariant
  /** Custom loading UI */
  loadingFallback?: ReactNode
  /** Custom error UI */
  errorFallback?: ReactNode
  /** Empty state UI */
  emptyFallback?: ReactNode
  /** Loading text */
  loadingText?: string
  /** Error message */
  errorMessage?: string
  /** Show retry button */
  showRetry?: boolean
  /** Auto-retry on error */
  autoRetry?: boolean
  /** Max auto-retry attempts */
  maxAutoRetry?: number
  /** Auto-retry delay (ms) */
  autoRetryDelay?: number
  /** Execute on mount */
  executeOnMount?: boolean
  /** Dependencies for re-execution */
  dependencies?: unknown[]
  /** On success callback */
  onSuccess?: (data: T) => void
  /** On error callback */
  onError?: (error: Error) => void
  /** Custom className */
  className?: string
}

export type AsyncChildren<T = unknown> = (
  data: T,
  utils: {
    /** Re-execute the async operation */
    reload: () => void
    /** Update data manually */
    setData: (data: T) => void
    /** Current status */
    status: AsyncStatus
  }
) => ReactNode

/**
 * Async Boundary Component
 *
 * Manages async operations with consistent loading/error/success states
 *
 * @example
 * ```tsx
 * <AsyncBoundary
 *   loadingText="加载用户数据..."
 *   executeOnMount
 *   async () => await fetchUser(userId)}
 * >
 *   {(user, { reload }) => (
 *     <UserProfile user={user} onRefresh={reload} />
 *   )}
 * </AsyncBoundary>
 * ```
 */
export function AsyncBoundary<T = unknown>({
  children,
  loadingVariant = 'skeleton',
  errorVariant = 'error',
  loadingFallback,
  errorFallback,
  emptyFallback,
  loadingText = '加载中...',
  errorMessage = '加载失败',
  showRetry = true,
  autoRetry = false,
  maxAutoRetry = 3,
  autoRetryDelay = 1000,
  executeOnMount = false,
  dependencies = [],
  onSuccess,
  onError,
  className,
}: AsyncBoundaryProps<T>) {
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  // 保存最新的 execute，供自动重试与挂载时调用（避免在初始化表达式中自引用）
  const executeRef = useRef<() => void>(() => {})

  const execute = useCallback(async () => {
    setStatus('pending')
    setError(null)

    try {
      // The async function is provided by children
      // This is a placeholder - actual implementation needs async function prop
      setStatus('success')
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      setStatus('error')

      if (onError) {
        onError(errorObj)
      }

      // Auto-retry if enabled
      // 仅递增重试计数，由下面的重试 effect 负责执行最新的 execute
      // （execute 内部不读取 ref，避免把 ref 值带入渲染期作用域）
      if (autoRetry && retryCount < maxAutoRetry) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, autoRetryDelay)
      }
    }
  }, [autoRetry, autoRetryDelay, maxAutoRetry, retryCount, onError])

  useEffect(() => {
    // 用包装函数保存最新的 execute，避免把 useCallback 本身写入 ref
    // （ref 中的值在渲染期被间接引用会触发 react-hooks/refs 规则）
    executeRef.current = () => {
      void execute()
    }
  }, [execute])

  // 自动重试：重试计数递增后执行最新的 execute
  useEffect(() => {
    if (retryCount > 0) {
      void executeRef.current()
    }
  }, [retryCount])


  // Reload function
  const reload = useCallback(() => {
    setRetryCount(0)
    setReloadKey(prev => prev + 1)
    execute()
  }, [execute])

  // Manual data update
  const setDataManual = useCallback((newData: T) => {
    setData(newData)
    setStatus('success')
  }, [])

  // Execute on mount or when dependencies change
  // dependencies 为调用方传入的动态依赖数组：用稳定的 key 表示（语义与展开一致），
  // 避免在依赖数组中使用展开语法（React Hooks 无法静态校验动态展开的依赖）
  const dependenciesKey = getDependenciesKey(dependencies)
  useEffect(() => {
    if (executeOnMount) {
      void executeRef.current()
    }
  }, [executeOnMount, reloadKey, dependenciesKey])

  // Call on success
  useEffect(() => {
    if (status === 'success' && data && onSuccess) {
      onSuccess(data)
    }
  }, [status, data, onSuccess])

  // Loading state
  if (status === 'pending') {
    if (loadingFallback) {
      return <>{loadingFallback}</>
    }
    return (
      <ComponentFallback
        variant={loadingVariant}
        showLoading
        loadingText={loadingText}
        className={className}
      />
    )
  }

  // Error state
  if (status === 'error' && error) {
    if (errorFallback) {
      return <>{errorFallback}</>
    }
    return (
      <ComponentFallback
        variant={errorVariant}
        message={errorMessage}
        error={error}
        showRetry={showRetry}
        onRetry={reload}
        className={className}
      />
    )
  }

  // Empty state
  if (status === 'success' && data === null && emptyFallback) {
    return <>{emptyFallback}</>
  }

  // Success state with children render
  if (status === 'success' && data !== null) {
    return <>{children(data, { reload, setData: setDataManual, status })}</>
  }

  // Idle state - render nothing or loading
  if (status === 'idle') {
    if (executeOnMount) {
      return (
        <ComponentFallback
          variant={loadingVariant}
          showLoading
          loadingText={loadingText}
          className={className}
        />
      )
    }
    return null
  }

  return null
}

/**
 * Async Boundary with async function prop
 * This is the actual usable version
 */
export interface AsyncBoundaryFnProps<T = unknown> extends Omit<AsyncBoundaryProps<T>, 'children'> {
  /** Async function to execute */
  fn: () => Promise<T>
  /** Children render function */
  children: AsyncChildren<T>
}

export function AsyncBoundaryFn<T = unknown>({
  fn,
  children,
  loadingVariant = 'skeleton',
  errorVariant = 'error',
  loadingFallback,
  errorFallback,
  emptyFallback,
  loadingText = '加载中...',
  errorMessage = '加载失败',
  showRetry = true,
  autoRetry = false,
  maxAutoRetry = 3,
  autoRetryDelay = 1000,
  executeOnMount = true,
  dependencies = [],
  onSuccess,
  onError,
  className,
}: AsyncBoundaryFnProps<T>) {
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  // 保存最新的 execute，供自动重试与挂载时调用（避免在初始化表达式中自引用）
  const executeRef = useRef<() => void>(() => {})

  // Execute async operation
  const execute = useCallback(async () => {
    setStatus('pending')
    setError(null)

    try {
      const result = await fn()
      setData(result)
      setStatus('success')

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      setStatus('error')

      if (onError) {
        onError(errorObj)
      }

      // Auto-retry if enabled
      // 仅递增重试计数，由下面的重试 effect 负责执行最新的 execute
      // （execute 内部不读取 ref，避免把 ref 值带入渲染期作用域）
      if (autoRetry && retryCount < maxAutoRetry) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, autoRetryDelay)
      }
    }
  }, [fn, autoRetry, autoRetryDelay, maxAutoRetry, retryCount, onSuccess, onError])

  useEffect(() => {
    // 用包装函数保存最新的 execute，避免把 useCallback 本身写入 ref
    // （ref 中的值在渲染期被间接引用会触发 react-hooks/refs 规则）
    executeRef.current = () => {
      void execute()
    }
  }, [execute])

  // 自动重试：重试计数递增后执行最新的 execute
  useEffect(() => {
    if (retryCount > 0) {
      void executeRef.current()
    }
  }, [retryCount])


  // Reload function
  const reload = useCallback(() => {
    setRetryCount(0)
    setReloadKey(prev => prev + 1)
    execute()
  }, [execute])

  // Manual data update
  const setDataManual = useCallback((newData: T) => {
    setData(newData)
    setStatus('success')
  }, [])

  // Execute on mount or when dependencies change
  // dependencies 为调用方传入的动态依赖数组：用稳定的 key 表示（语义与展开一致），
  // 避免在依赖数组中使用展开语法（React Hooks 无法静态校验动态展开的依赖）
  const dependenciesKey = getDependenciesKey(dependencies)
  useEffect(() => {
    if (executeOnMount) {
      void executeRef.current()
    }
  }, [executeOnMount, reloadKey, fn, dependenciesKey])

  // Loading state
  if (status === 'pending') {
    if (loadingFallback) {
      return <>{loadingFallback}</>
    }
    return (
      <ComponentFallback
        variant={loadingVariant}
        showLoading
        loadingText={loadingText}
        className={className}
      />
    )
  }

  // Error state
  if (status === 'error' && error) {
    if (errorFallback) {
      return <>{errorFallback}</>
    }
    return (
      <ComponentFallback
        variant={errorVariant}
        message={errorMessage}
        error={error}
        showRetry={showRetry}
        onRetry={reload}
        className={className}
      />
    )
  }

  // Empty state
  if (status === 'success' && data === null && emptyFallback) {
    return <>{emptyFallback}</>
  }

  // Success state with children render
  if (status === 'success' && data !== null) {
    return <>{children(data, { reload, setData: setDataManual, status })}</>
  }

  // Idle state
  if (status === 'idle' && executeOnMount) {
    return (
      <ComponentFallback
        variant={loadingVariant}
        showLoading
        loadingText={loadingText}
        className={className}
      />
    )
  }

  return null
}

export default AsyncBoundaryFn
