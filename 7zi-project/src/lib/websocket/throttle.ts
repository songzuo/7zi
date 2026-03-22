/**
 * Throttle and Debounce Utilities
 *
 * Optimizes high-frequency events like cursor movement, typing, etc.
 */

// ============================================================================
// Throttle
// ============================================================================

/**
 * Throttle function - ensures function is called at most once every delay ms
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0 || remaining > delay) {
      // Call immediately
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else {
      // Schedule call for later
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          timeoutId = null;
          fn.apply(this, args);
        }, remaining);
      }
    }
  };
}

/**
 * Throttle with leading edge (calls immediately on first invocation)
 */
export function throttleLeading<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function(this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

// ============================================================================
// Debounce
// ============================================================================

/**
 * Debounce function - ensures function is called only after delay ms since last invocation
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Debounce with immediate option (calls immediately on first invocation, then debounces)
 */
export function debounceImmediate<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let firstCall = true;

  return function(this: unknown, ...args: Parameters<T>) {
    if (firstCall) {
      firstCall = false;
      fn.apply(this, args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        firstCall = true;
        timeoutId = null;
      }, delay);
    }
  };
}

// ============================================================================
// Request Animation Frame Throttle
// ============================================================================

/**
 * Throttle using requestAnimationFrame for smooth animations
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      fn.apply(this, args);
      rafId = null;
    });
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Batches multiple operations together and executes them in a single batch
 */
export class Batcher<T> {
  private items: T[] = [];
  private flushTimeoutId: NodeJS.Timeout | null = null;
  private readonly maxBatchSize: number;
  private readonly maxWaitTime: number;
  private readonly processor: (items: T[]) => void;

  constructor(
    processor: (items: T[]) => void,
    options: { maxBatchSize?: number; maxWaitTime?: number } = {}
  ) {
    this.processor = processor;
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.maxWaitTime = options.maxWaitTime ?? 100;
  }

  add(item: T): void {
    this.items.push(item);

    // Flush immediately if batch is full
    if (this.items.length >= this.maxBatchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeoutId === null) {
      this.flushTimeoutId = setTimeout(() => {
        this.flush();
      }, this.maxWaitTime);
    }
  }

  flush(): void {
    if (this.flushTimeoutId !== null) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }

    if (this.items.length > 0) {
      const batch = this.items.splice(0); // Copy and clear
      this.processor(batch);
    }
  }

  clear(): void {
    if (this.flushTimeoutId !== null) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    this.items = [];
  }

  size(): number {
    return this.items.length;
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Rate limiter for controlling operation frequency
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly refillInterval: number;

  constructor(maxTokens: number, refillRate: number, refillInterval: number = 1000) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryAcquire(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  acquire(count: number = 1): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquireLoop = () => {
        this.refill();

        if (this.tokens >= count) {
          this.tokens -= count;
          resolve();
        } else {
          // Try again after a short delay
          setTimeout(tryAcquireLoop, 50);
        }
      };

      tryAcquireLoop();
    });
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillInterval) {
      const intervals = Math.floor(elapsed / this.refillInterval);
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + intervals * this.refillRate
      );
      this.lastRefill = now;
    }
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  throttle,
  throttleLeading,
  debounce,
  debounceImmediate,
  rafThrottle,
  Batcher,
  RateLimiter,
};
