/**
 * @fileoverview 防抖工具函数
 * @description 提供搜索输入防抖功能，优化性能
 */

// ============================================================================
// 防抖函数
// ============================================================================

/**
 * 防抖函数 - 延迟执行函数，在延迟时间内再次调用则重置计时器
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 立即执行的防抖函数 - 第一次调用立即执行，后续调用防抖
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounceLeading<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isFirstCall = true;

  return function(this: unknown, ...args: Parameters<T>) {
    if (isFirstCall) {
      fn.apply(this, args);
      isFirstCall = false;
      return;
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 可取消的防抖函数 - 返回一个可以取消的函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数，带有 cancel 方法
 */
export function debounceCancellable<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;
  let pendingContext: unknown = null;

  const debounced = function(this: unknown, ...args: Parameters<T>) {
    pendingArgs = args;
    pendingContext = this;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (pendingArgs !== null) {
        fn.apply(pendingContext, pendingArgs);
      }
      timeoutId = null;
      pendingArgs = null;
      pendingContext = null;
    }, delay);
  };

  // 取消待执行的调用
  debounced.cancel = function() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
    pendingContext = null;
  };

  // 立即执行待处理的调用
  debounced.flush = function() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingArgs !== null) {
      fn.apply(pendingContext, pendingArgs);
      pendingArgs = null;
      pendingContext = null;
    }
  };

  return debounced as typeof debounced & { cancel: () => void; flush: () => void };
}

// ============================================================================
// 节流函数（补充功能）
// ============================================================================

/**
 * 节流函数 - 限制函数执行频率
 * @param fn 要节流的函数
 * @param delay 最小间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      // 可以立即执行
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      // 等待剩余时间
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// ============================================================================
// 针对搜索优化的防抖配置
// ============================================================================

/**
 * 搜索防抖延迟时间配置
 */
export const SEARCH_DEBOUNCE_DELAYS = {
  /** 快速搜索 - 150ms */
  FAST: 150,
  /** 标准搜索 - 300ms（默认） */
  STANDARD: 300,
  /** 慢速搜索 - 500ms */
  SLOW: 500,
  /** 非常慢的搜索 - 800ms */
  VERY_SLOW: 800,
} as const;

/**
 * 创建搜索防抖函数（使用标准延迟）
 */
export function createSearchDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = SEARCH_DEBOUNCE_DELAYS.STANDARD
): ReturnType<typeof debounceCancellable<T>> {
  return debounceCancellable(fn, delay);
}

// ============================================================================
// 防抖管理器（用于管理多个防抖函数）
// ============================================================================

/**
 * 防抖管理器 - 集中管理多个防抖函数
 */
export class DebounceManager {
  private debouncers: Map<string, { (...args: unknown[]): void; cancel: () => void; flush: () => void }> = new Map();

  /**
   * 注册一个防抖函数
   */
  register<T extends (...args: unknown[]) => unknown>(
    key: string,
    fn: T,
    delay: number = SEARCH_DEBOUNCE_DELAYS.STANDARD
  ): void {
    // 如果已存在，先取消
    if (this.debouncers.has(key)) {
      this.cancel(key);
    }

    const debounced = debounceCancellable(fn, delay);
    this.debouncers.set(key, debounced as { (...args: unknown[]): void; cancel: () => void; flush: () => void });
  }

  /**
   * 执行注册的防抖函数
   */
  execute(key: string, ...args: unknown[]): void {
    const debouncer = this.debouncers.get(key);
    if (debouncer) {
      debouncer(...args);
    }
  }

  /**
   * 取消注册的防抖函数
   */
  cancel(key: string): void {
    const debouncer = this.debouncers.get(key);
    if (debouncer) {
      debouncer.cancel();
      this.debouncers.delete(key);
    }
  }

  /**
   * 立即执行注册的防抖函数
   */
  flush(key: string): void {
    const debouncer = this.debouncers.get(key);
    if (debouncer) {
      debouncer.flush();
    }
  }

  /**
   * 取消所有防抖函数
   */
  cancelAll(): void {
    for (const [key] of this.debouncers) {
      this.cancel(key);
    }
  }

  /**
   * 检查是否有注册的防抖函数
   */
  has(key: string): boolean {
    return this.debouncers.has(key);
  }

  /**
   * 清理所有防抖函数
   */
  dispose(): void {
    this.cancelAll();
    this.debouncers.clear();
  }
}

// ============================================================================
// 全局防抖管理器实例
// ============================================================================

let globalDebounceManager: DebounceManager | null = null;

/**
 * 获取或创建全局防抖管理器
 */
export function getGlobalDebounceManager(recreate = false): DebounceManager {
  if (!globalDebounceManager || recreate) {
    globalDebounceManager = new DebounceManager();
  }
  return globalDebounceManager;
}

/**
 * 重置全局防抖管理器
 */
export function resetGlobalDebounceManager(): void {
  if (globalDebounceManager) {
    globalDebounceManager.dispose();
  }
  globalDebounceManager = null;
}
