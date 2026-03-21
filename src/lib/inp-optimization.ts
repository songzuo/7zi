/**
 * INP Optimization Helper
 * 专门优化 Interaction to Next Paint (INP) 和 First Input Delay (FID)
 * 
 * INP 是衡量交互响应性的最重要指标
 * 
 * INP 优化包括：
 * 1. 减少主线程阻塞
 * 2. 使用 requestIdleCallback
 * 3. 事件委托
 * 4. Web Workers
 * 
 * @module lib/inp-optimization
 */

import { debounce as importedDebounce, throttle as importedThrottle } from './utils/async';

// Re-export for convenience
export const debounce = importedDebounce;
export const throttle = importedThrottle;

// ============================================
// 主线程优化
// ============================================

/**
 * 将大任务分解为小任务
 * 
 * 使用 requestIdleCallback 或 setTimeout 来让出主线程
 * 
 * 使用方法：
 * ```ts
 * await runInIdle(() => {
 *   // 大任务代码
 * }, { maxDuration: 50 });
 * ```
 */
export async function runInIdle<T>(
  task: () => T,
  options: { maxDuration?: number; timeout?: number } = {}
): Promise<T> {
  const { maxDuration = 50, timeout = 2000 } = options;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let result: T;

    const executeStep = () => {
      try {
        result = task();
        
        // 检查是否超过时间限制
        if (performance.now() - startTime > maxDuration) {
          // 让出主线程
          const yieldFn = typeof requestIdleCallback !== 'undefined'
            ? (cb: () => void) => requestIdleCallback(cb, { timeout })
            : (cb: () => void) => setTimeout(cb, 0);
          
          yieldFn(executeStep);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    };

    executeStep();
  });
}

/**
 * 批量处理任务
 * 
 * 将大数组分成小块处理，避免阻塞主线程
 * 
 * 使用方法：
 * ```ts
 * await processBatch(array, async (item) => {
 *   // 处理每个项目
 * }, { batchSize: 100 });
 * ```
 */
export async function processBatch<T>(
  items: T[],
  processor: (item: T) => void | Promise<void>,
  options: { batchSize?: number; delay?: number } = {}
): Promise<void> {
  const { batchSize = 100, delay = 0 } = options;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // 处理当前批次
    await Promise.all(batch.map(processor));
    
    // 让出主线程
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * 使用 requestIdleCallback 执行低优先级任务
 */
export function scheduleIdleTask(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, options);
  } else {
    // Fallback to setTimeout
    return setTimeout(() => callback({
      didTimeout: false,
      timeRemaining: () => 50,
    }), 1) as unknown as number;
  }
}

/**
 * 取消空闲任务
 */
export function cancelIdleTask(handle: number) {
  if (typeof cancelIdleCallback !== 'undefined') {
    cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

// ============================================
// 事件优化
// ============================================

/**
 * 被动事件监听器
 * 
 * 使用 passive: true 可以提高滚动和触摸事件的性能
 * 
 * 使用方法：
 * ```ts
 * element.addEventListener('scroll', handler, { passive: true });
 * ```
 */
 */
export function addPassiveEventListener(
  element: HTMLElement | Document | Window,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options: AddEventListenerOptions = { passive: true }
): void {
  element.addEventListener(event, handler, options);
}

/**
 * 事件委托
 *
 * 使用事件委托减少事件监听器数量
 *
 * 使用方法：
 * ```ts
 * delegateEvent(container, 'button', 'click', (e) => {
 *   // Handle button click
 * });
 * ```
 */
export function delegateEvent<T extends HTMLElement>(
  container: HTMLElement,
  selector: string,
  event: string,
  handler: (e: Event, target: T) => void
): void {
  container.addEventListener(event, (e) => {
    const target = (e.target as HTMLElement).closest(selector) as T | null;
    if (target) {
      handler(e, target);
    }
  });
}

// ============================================
// Web Worker 支持
// ============================================

/**
 * 在 Web Worker 中运行计算密集型任务
 * 
 * 使用方法：
 * ```ts
 * const result = await runInWorker((data) => {
 *   // 计算密集型任务
 *   return data.map(x => x * x);
 * }, [1, 2, 3, 4, 5]);
 * ```
 */
export function runInWorker<T, R>(
  workerFn: (data: T) => R,
  data: T
): Promise<R> {
  return new Promise((resolve, reject) => {
    // 将函数转换为 Blob URL
    const workerCode = `
      self.onmessage = function(e) {
        try {
          const result = (${workerFn.toString()})(e.data);
          self.postMessage(result);
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data);
      }
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.postMessage(data);
  });
}

// ============================================
// 输入优化
// ============================================

/**
 * 优化输入事件
 * 
 * 防止输入事件阻塞主线程
 * 
 * 使用方法：
 * ```ts
 * input.addEventListener('input', optimizeInput((e) => {
 *   // 输入处理逻辑
 * }));
 * ```
 */
export function optimizeInput(
  handler: (e: InputEvent) => void,
  options: { debounceMs?: number } = {}
): (e: InputEvent) => void {
  const { debounceMs = 100 } = options;
  const debouncedHandler = debounce(handler, debounceMs);

  return (e: InputEvent) => {
    // 立即更新 UI（如果需要）
    requestAnimationFrame(() => {
      debouncedHandler(e);
    });
  };
}

/**
 * 优化点击事件
 * 
 * 确保点击事件快速响应
 */
export function optimizeClick(
  handler: (e: MouseEvent) => void
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    // 立即执行关键逻辑
    handler(e);
    
    // 非关键逻辑延迟执行
    requestIdleCallback(() => {
      // 可以在这里执行非关键逻辑
    });
  };
}

// ============================================
// 动画优化
// ============================================

/**
 * 使用 requestAnimationFrame 优化动画
 * 
 * 确保动画与浏览器刷新率同步
 */
export function optimizeAnimation(
  callback: (timestamp: number) => void,
  options: { sync?: boolean } = {}
): () => void {
  const { sync = true } = options;
  let rafId: number | null = null;

  const animate = (timestamp: number) => {
    callback(timestamp);
    
    if (sync) {
      rafId = requestAnimationFrame(animate);
    }
  };

  if (sync) {
    rafId = requestAnimationFrame(animate);
  } else {
    callback(performance.now());
  }

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

/**
 * 批量 DOM 更新
 * 
 * 将多个 DOM 更新合并到一次重绘中
 */
export function batchDOMUpdates(updates: Array<() => void>): void {
  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
}

// ============================================
// 性能监控
// ============================================

/**
 * 监控长任务
 * 
 * 长任务会阻塞主线程，影响 INP
 */
export function observeLongTasks(
  callback: (entries: PerformanceEntry[]) => void
): () => void {
  if (!('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });

    observer.observe({ type: 'longtask', buffered: true });

    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

/**
 * 监控交互延迟
 * 
 * 使用 Event Timing API 监控交互响应时间
 */
export function observeInteractionDelay(
  callback: (entry: PerformanceEventTiming) => void
): () => void {
  if (!('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'event' || entry.entryType === 'first-input') {
          callback(entry as PerformanceEventTiming);
        }
      });
    });

    observer.observe({ type: 'event', buffered: true });
    observer.observe({ type: 'first-input', buffered: true });

    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

// ============================================
// 初始化 INP 优化
// ============================================

/**
 * 自动应用 INP 优化
 * 
 * 在应用启动时调用此函数
 */
export function initINPOptimizations() {
  if (typeof window === 'undefined') return;

  // 监控长任务
  observeLongTasks((entries) => {
    entries.forEach((entry) => {
      if (entry.duration > 50) {
        console.warn(`[INP] Long task detected: ${entry.duration.toFixed(0)}ms`, entry);
      }
    });
  });

  // 监控交互延迟
  observeInteractionDelay((entry) => {
    const delay = entry.processingStart - entry.startTime;
    if (delay > 100) {
      console.warn(`[INP] High input delay: ${delay.toFixed(0)}ms`, entry);
    }
  });

  // 添加性能标记
  if (typeof performance !== 'undefined') {
    performance.mark('inp-optimizations-init');
  }
}
