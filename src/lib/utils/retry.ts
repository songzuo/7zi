/**
 * @fileoverview Retry Utility with Exponential Backoff
 * @description 通用重试工具，支持指数退避策略、抖动、条件重试等
 *
 * 特性：
 * - 指数退避（Exponential Backoff）
 * - 抖动（Jitter）避免惊群效应
 * - 条件重试（基于错误类型或响应状态）
 * - 最大重试次数限制
 * - 超时控制
 * - 进度回调
 */

export interface RetryOptions {
  /** 最大重试次数（默认: 3） */
  maxRetries?: number;
  /** 初始延迟时间（毫秒，默认: 1000） */
  initialDelay?: number;
  /** 最大延迟时间（毫秒，默认: 30000） */
  maxDelay?: number;
  /** 退避因子（默认: 2） */
  backoffFactor?: number;
  /** 是否添加抖动（默认: true） */
  jitter?: boolean;
  /** 判断是否应该重试的函数 */
  shouldRetry?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
  /** 重试回调 */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
  /** 成功回调 */
  onSuccess?: (result: unknown, attempt: number) => void;
  /** 失败回调 */
  onFailure?: (error: unknown, attempts: number) => void;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 取消信号 */
  signal?: AbortSignal;
}

export interface RetryResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 结果 */
  result?: T;
  /** 错误 */
  error?: unknown;
  /** 尝试次数 */
  attempts: number;
  /** 总耗时 */
  totalTime: number;
}

// ============================================
// Type Definitions
// ============================================

/**
 * Error interface with optional Response property
 */
interface ErrorWithResponse extends Error {
  response?: Response;
}

// ============================================
// Default retry handler
function defaultShouldRetry(error: unknown, attempt: number): boolean {
  // 如果已达到最大尝试次数，不再重试
  if (attempt > 3) {
    return false;
  }

  // 如果是 AbortError，不重试
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  // 根据错误类型判断
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 网络错误、超时错误可以重试
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT')
    ) {
      return true;
    }

    // HTTP 错误状态码
    const statusMatch = message.match(/status\s*(\d{3})/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      // 408, 429, 500, 502, 503, 504 可以重试
      return [408, 429, 500, 502, 503, 504].includes(status);
    }
  }

  // Response 对象
  if (error instanceof Response) {
    return [408, 429, 500, 502, 503, 504].includes(error.status);
  }

  // 默认不重试
  return false;
}

/**
 * 计算退避延迟（带抖动）
 */
function calculateBackoffDelay(
  attempt: number,
  options: Pick<RetryOptions, 'initialDelay' | 'maxDelay' | 'backoffFactor' | 'jitter'>
): number {
  const {
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true,
  } = options;

  // 指数退避计算
  const baseDelay = initialDelay * Math.pow(backoffFactor, attempt - 1);

  // 应用最大延迟限制
  let delay = Math.min(baseDelay, maxDelay);

  // 添加抖动（避免惊群效应）
  if (jitter) {
    // Full jitter: random between 0 and delay
    delay = Math.random() * delay;
  }

  return Math.floor(delay);
}

/**
 * 延迟函数
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(), ms);

    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error('Delay cancelled'));
      };

      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * 带超时的 Promise 包装器
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Operation cancelled'));
      });
    }
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * 通用重试函数
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = await retry(() => fetch('https://api.example.com/data'));
 *
 * // 自定义选项
 * const result = await retry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     backoffFactor: 2,
 *     jitter: true,
 *   }
 * );
 *
 * // 条件重试
 * const result = await retry(
 *   async () => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw response;
 *     return response.json();
 *   },
 *   {
 *     shouldRetry: (error) => {
 *       if (error instanceof Response) {
 *         return error.status >= 500 || error.status === 429;
 *       }
 *       return false;
 *     },
 *   }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const startTime = Date.now();

  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    onRetry,
    onSuccess,
    onFailure,
    timeout,
    signal,
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      // 执行函数
      let promise = fn();

      // 添加超时
      if (timeout) {
        promise = withTimeout(promise, timeout, signal);
      }

      // 检查取消信号
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      const result = await promise;

      // 成功回调
      if (onSuccess) {
        onSuccess(result, attempt);
      }

      return result;
    } catch (_error) {
      lastError = error;

      // 检查是否应该重试
      const canRetry = await shouldRetry(error, attempt);

      if (!canRetry || attempt > maxRetries) {
        // 失败回调
        if (onFailure) {
          onFailure(error, attempt);
        }
        throw error;
      }

      // 计算延迟时间
      const delayMs = calculateBackoffDelay(attempt, {
        initialDelay,
        maxDelay,
        backoffFactor,
        jitter,
      });

      // 重试回调
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }

      // 等待
      await delay(delayMs, signal);
    }
  }

  // 不应该到达这里，但为了类型安全
  throw lastError;
}

/**
 * 带详细结果的重试函数
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();

  try {
    const result = await retry(fn, options);
    const totalTime = Date.now() - startTime;

    return {
      success: true,
      result,
      attempts: 1,
      totalTime,
    };
  } catch (_error) {
    const totalTime = Date.now() - startTime;

    return {
      success: false,
      error,
      attempts: options.maxRetries ?? 3,
      totalTime,
    };
  }
}

/**
 * HTTP 请求专用的重试函数
 */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: Omit<RetryOptions, 'shouldRetry'>
): Promise<Response> {
  return retry(
    async () => {
      const response = await fetch(input, init);

      // 如果响应状态码表明可以重试，抛出错误以便重试
      if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as ErrorWithResponse).response = response;
        throw error;
      }

      return response;
    },
    {
      ...retryOptions,
      shouldRetry: (error) => {
        // 检查是否是带有 Response 的 Error 对象
        if (error instanceof Error && (error as ErrorWithResponse).response) {
          const response = (error as ErrorWithResponse).response;
          if (response) {
            return [408, 429, 500, 502, 503, 504].includes(response.status);
          }
        }
        return defaultShouldRetry(error, 1);
      },
    }
  );
}

/**
 * 带缓存的异步函数重试
 * 用于避免短时间内重复失败
 */
export class RetryCache {
  private cache = new Map<string, { timestamp: number; result?: unknown; error?: unknown }>();
  private ttl: number;

  constructor(ttl: number = 60000) {
    this.ttl = ttl;
  }

  /**
   * 带缓存的执行
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    // 检查缓存
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.ttl) {
      if (cached.result !== undefined) {
        return cached.result as T;
      }
      if (cached.error !== undefined) {
        throw cached.error;
      }
    }

    try {
      const result = await retry(fn, options);
      this.cache.set(key, { timestamp: now, result });
      return result;
    } catch (_error) {
      this.cache.set(key, { timestamp: now, error });
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * 创建一个重试缓存实例
 */
export function createRetryCache(ttl: number = 60000): RetryCache {
  return new RetryCache(ttl);
}
