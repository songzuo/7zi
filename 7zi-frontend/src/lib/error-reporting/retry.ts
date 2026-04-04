/**
 * Retry Utility
 * 操作重试工具 - 通用重试机制，支持指数退避
 */

import { logger } from '../logger'

/**
 * 重试选项
 */
export interface RetryOptions<T = unknown> {
  /**
   * 最大重试次数
   * @default 3
   */
  maxAttempts?: number

  /**
   * 初始延迟（毫秒）
   * @default 1000
   */
  initialDelay?: number

  /**
   * 最大延迟（毫秒）
   * @default 30000
   */
  maxDelay?: number

  /**
   * 退避乘数
   * @default 2
   */
  backoffMultiplier?: number

  /**
   * 是否使用指数退避
   * @default true
   */
  useExponentialBackoff?: boolean

  /**
   * 是否添加随机抖动
   * @default true
   */
  addJitter?: boolean

  /**
   * 可重试的错误类型
   * @default ['Error', 'TypeError', 'RangeError']
   */
  retryableErrors?: string[]

  /**
   * 重试回调
   */
  onRetry?: (attempt: number, error: Error, delay: number) => void

  /**
   * 完成回调
   */
  onComplete?: (success: boolean, attempts: number, error?: Error) => void

  /**
   * 自定义重试条件判断
   */
  shouldRetry?: (error: Error, attempt: number) => boolean

  /**
   * 重试信号（用于外部取消）
   */
  signal?: AbortSignal

  /**
   * 重试标签（用于日志）
   */
  label?: string
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  /**
   * 是否成功
   */
  success: boolean

  /**
   * 结果值（如果成功）
   */
  data?: T

  /**
   * 错误（如果失败）
   */
  error?: Error

  /**
   * 总尝试次数
   */
  attempts: number

  /**
   * 总耗时（毫秒）
   */
  totalTime: number
}

/**
 * 默认可重试的错误类型
 */
const DEFAULT_RETRYABLE_ERRORS = [
  'Error',
  'TypeError',
  'RangeError',
  'FetchError',
  'TimeoutError',
  'NetworkError',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
]

/**
 * 默认网络错误状态码（可重试）
 */
const DEFAULT_RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]

/**
 * 执行带重试的操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions<T> = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now()

  // 解析选项
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    useExponentialBackoff = true,
    addJitter = true,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    onRetry,
    onComplete,
    shouldRetry,
    signal,
    label = 'operation',
  } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; signal?.throwIfAborted(), attempt++) {
    try {
      // 执行操作
      const data = await operation()

      // 成功
      const totalTime = Date.now() - startTime
      onComplete?.(true, attempt)

      logger.debug(`${label} succeeded after ${attempt} attempt(s)`, { attempt, totalTime })

      return {
        success: true,
        data,
        attempts: attempt,
        totalTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 检查是否应该重试
      const canRetry = attempt < maxAttempts && (
        (shouldRetry && shouldRetry(lastError, attempt)) ||
        isRetryableError(lastError, retryableErrors) ||
        isRetryableNetworkError(lastError)
      )

      if (!canRetry) {
        const totalTime = Date.now() - startTime
        onComplete?.(false, attempt, lastError)

        logger.debug(`${label} failed after ${attempt} attempt(s)`, {
          attempt,
          totalTime,
          error: lastError.message,
        })

        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTime,
        }
      }

      // 计算延迟
      let delay: number
      if (useExponentialBackoff) {
        delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay)
      } else {
        delay = initialDelay
      }

      // 添加随机抖动
      if (addJitter) {
        const jitter = delay * 0.3 * Math.random()
        delay = Math.floor(delay + jitter)
      }

      // 调用重试回调
      onRetry?.(attempt, lastError, delay)

      logger.debug(`${label} retrying after ${delay}ms`, {
        attempt,
        maxAttempts,
        delay,
        error: lastError.message,
      })

      // 等待延迟
      await sleep(delay, signal)
    }
  }

  // 不应该到达这里
  const totalTime = Date.now() - startTime
  onComplete?.(false, maxAttempts, lastError)

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime,
  }
}

/**
 * 同步版本的重试操作
 */
export function withRetrySync<T>(
  operation: () => T,
  options: RetryOptions<T> = {}
): RetryResult<T> {
  const startTime = Date.now()

  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    useExponentialBackoff = true,
    addJitter = true,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    onComplete,
    shouldRetry,
    label = 'operation',
  } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = operation()

      const totalTime = Date.now() - startTime
      onComplete?.(true, attempt)

      logger.debug(`${label} succeeded after ${attempt} attempt(s)`, { attempt, totalTime })

      return {
        success: true,
        data,
        attempts: attempt,
        totalTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      const canRetry = attempt < maxAttempts && (
        (shouldRetry && shouldRetry(lastError, attempt)) ||
        isRetryableError(lastError, retryableErrors)
      )

      if (!canRetry) {
        const totalTime = Date.now() - startTime
        onComplete?.(false, attempt, lastError)

        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTime,
        }
      }

      let delay: number
      if (useExponentialBackoff) {
        delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay)
      } else {
        delay = initialDelay
      }

      if (addJitter) {
        const jitter = delay * 0.3 * Math.random()
        delay = Math.floor(delay + jitter)
      }

      // 同步等待
      sleepSync(delay)
    }
  }

  const totalTime = Date.now() - startTime
  onComplete?.(false, maxAttempts, lastError)

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime,
  }
}

/**
 * 检查错误是否可重试
 */
export function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  // 检查错误类型名称
  if (retryableErrors.includes(error.name)) {
    return true
  }

  // 检查错误消息
  const errorMessage = error.message.toLowerCase()
  const retryablePatterns = ['timeout', 'network', 'connection', 'econnreset', 'etimedout']

  return retryablePatterns.some(pattern => errorMessage.includes(pattern))
}

/**
 * 检查网络错误是否可重试
 */
function isRetryableNetworkError(error: Error): boolean {
  // 检查 fetch 响应状态码
  if ('response' in error && error.response) {
    const response = (error as unknown as { response: { status: number } }).response
    return DEFAULT_RETRYABLE_STATUS_CODES.includes(response.status)
  }

  return false
}

/**
 * 睡眠（异步）
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abortHandler)
      resolve()
    }, ms)

    signal?.addEventListener('abort', abortHandler)

    // 如果已经中止，立即拒绝
    if (signal?.aborted) {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
  })
}

/**
 * 睡眠（同步）
 */
function sleepSync(ms: number): void {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // busy wait
  }
}

/**
 * 创建可重试的异步函数
 */
export function createRetryableFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions<T> = {}
): T {
  return ((...args: Parameters<T>) => withRetry(() => fn(...args), options)) as T
}

/**
 * 重试装饰器
 */
export function retry<T extends (...args: unknown[]) => Promise<unknown>>(
  options: RetryOptions<T> = {}
): MethodDecorator {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as T

    descriptor.value = function (...args: Parameters<T>) {
      return withRetry(() => originalMethod.apply(this, args), options)
    } as unknown as T

    return descriptor
  }
}

/**
 * 重试状态钩子（用于 React）
 */
export interface UseRetryState<T> {
  /**
   * 当前是否正在重试
   */
  isRetrying: boolean

  /**
   * 当前尝试次数
   */
  attempt: number

  /**
   * 执行操作（带重试）
   */
  execute: () => Promise<T | undefined>

  /**
   * 手动重试
   */
  retry: () => void

  /**
   * 错误
   */
  error: Error | null

  /**
   * 数据
   */
  data: T | null
}

/**
 * 创建重试状态
 */
export function createRetryState<T>(
  operation: () => Promise<T>,
  options: RetryOptions<T> = {}
): UseRetryState<T> {
  let attempt = 0
  let isRetrying = false
  let error: Error | null = null
  let data: T | null = null

  const execute = async (): Promise<T | undefined> => {
    attempt++
    isRetrying = true
    error = null

    try {
      const result = await withRetry(operation, {
        ...options,
        onComplete: (success, attempts) => {
          attempt = attempts
          isRetrying = false
          if (!success) {
            error = options.onComplete ? undefined : new Error('Operation failed')
          }
        },
      })

      if (result.success) {
        data = result.data
        error = null
      } else {
        error = result.error || new Error('Operation failed')
      }

      return result.data
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e))
      isRetrying = false
      return undefined
    }
  }

  const retry = () => {
    error = null
    data = null
    execute()
  }

  return {
    get isRetrying() { return isRetrying },
    get attempt() { return attempt },
    get error() { return error },
    get data() { return data },
    execute,
    retry,
  }
}

// 导出便捷函数
export default {
  withRetry,
  withRetrySync,
  createRetryableFunction,
  retry,
}
