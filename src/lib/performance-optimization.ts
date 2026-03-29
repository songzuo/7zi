/**
 * Performance Optimization Module
 * 性能优化模块
 *
 * 功能：
 * - 优化 Largest Contentful Paint (LCP)
 * - 优化 Interaction to Next Paint (INP)
 * - User Timing API 标记
 * - Resource 提示
 * - 关键资源预加载
 */

// ============================================
// TypeScript 类型定义
// ============================================

/**
 * runInChunks 函数的选项配置
 */
export interface RunInChunksOptions {
  /**
   * 每批次处理的元素数量
   * @default 50
   */
  chunkSize?: number;

  /**
   * 最大执行时长（毫秒），超过后让出主线程
   * @default 50
   */
  maxDuration?: number;

  /**
   * 让出主线程的持续时间（毫秒）
   * @default 5
   */
  yieldDuration?: number;
}



// ============================================
// LCP 优化
// ============================================

/**
 * 预加载关键资源以优化 LCP
 * 
 * 使用方法：
 * 1. 在页面组件中调用 preloadCriticalResources()
 * 2. 传递关键资源的 URL 列表
 * 3. 系统会自动预加载这些资源
 */
export function preloadCriticalResources(resources: {
  images?: string[];
  fonts?: string[];
  stylesheets?: string[];
  scripts?: string[];
}) {
  if (typeof document === 'undefined') return;

  const preloadLink = (href: string, as: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    
    // 高优先级预加载
    const existing = document.querySelector(`link[href="${href}"][rel="preload"]`);
    if (!existing) {
      document.head.appendChild(link);
    }
  };

  // 预加载图片
  resources.images?.forEach((src) => {
    preloadLink(src, 'image');
  });

  // 预加载字体
  resources.fonts?.forEach((href) => {
    preloadLink(href, 'font', 'font/woff2');
  });

  // 预加载样式表
  resources.stylesheets?.forEach((href) => {
    preloadLink(href, 'style');
  });

  // 预加载脚本
  resources.scripts?.forEach((src) => {
    preloadLink(src, 'script');
  });
}

/**
 * 预连接到第三方域名
 */
export function preconnectToDomains(domains: string[]) {
  if (typeof document === 'undefined') return;

  domains.forEach((domain) => {
    // DNS 预解析
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = domain;
    document.head.appendChild(dnsLink);

    // 预连接
    const connectLink = document.createElement('link');
    connectLink.rel = 'preconnect';
    connectLink.href = domain;
    connectLink.crossOrigin = 'anonymous';
    document.head.appendChild(connectLink);
  });
}

/**
 * 移除未使用的 CSS（动态）
 */
export function removeUnusedCSS() {
  if (typeof document === 'undefined' || !window.performance) return;

  // 在页面加载完成后执行
  window.addEventListener('load', () => {
    // TODO: 使用 PurgeCSS 或类似工具清理未使用的 CSS
    // 这里只是占位符
  });
}

// ============================================
// INP/FID 优化
// ============================================

/**
 * 将大任务分解为小任务以优化 INP
 * 
 * 使用方法：
 * // 处理数组
 * const results = await runInChunks(
 *   items,
 *   (item) => processItem(item),
 *   { chunkSize: 50, maxDuration: 50 }
 * );
 * 
 * // 处理生成器
 * async function* generateItems() { ... }
 * const results = await runInChunks(
 *   generateItems(),
 *   (item) => processItem(item),
 *   { chunkSize: 50 }
 * );
 */
export async function runInChunks<T, R>(
  items: T[] | AsyncIterable<T> | Iterable<T>,
  processor: (item: T, index: number) => R | Promise<R>,
  options: { chunkSize?: number; maxDuration?: number; yieldDuration?: number } = {}
): Promise<R[]> {
  const { chunkSize = 50, maxDuration = 50, yieldDuration = 5 } = options;
  const results: R[] = [];
  let index = 0;

  // 让出主线程的辅助函数
  const yieldControl = (): Promise<void> => {
    return new Promise((resolve) => {
      // 优先使用 requestIdleCallback（浏览器环境）
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          resolve();
        }, { timeout: yieldDuration });
      } else if (typeof setTimeout !== 'undefined') {
        // 使用 setTimeout 让出主线程
        setTimeout(() => resolve(), 0);
      } else {
        // 使用 setImmediate（Node.js 环境）
        setImmediate(() => resolve());
      }
    });
  };

  // 处理一个批次
  const processChunk = async (chunk: T[]): Promise<void> => {
    for (let i = 0; i < chunk.length; i++) {
      results[i + index] = await processor(chunk[i], index + i);
    }
    index += chunk.length;
  };

  // 将数组分块处理
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await processChunk(chunk);
      
      // 如果还有更多数据需要处理，让出主线程
      if (i + chunkSize < items.length) {
        await yieldControl();
      }
    }
  }
  // 处理可迭代对象
  else {
    // 安全地获取迭代器
    const iter = (items as any)[Symbol.iterator]
      ? (items as Iterable<T>)[Symbol.iterator]()
      : (items as AsyncIterable<T>)[Symbol.asyncIterator]();
    
    if (!iter) {
      throw new Error('runInChunks: items must be an array or iterable');
    }

    let chunk: T[] = [];

    if ('next' in iter && typeof iter.next === 'function') {
      // AsyncIterable
      while (true) {
        const { value, done } = await (iter as AsyncIterator<T>).next();
        if (done) break;

        chunk.push(value);

        if (chunk.length >= chunkSize) {
          await processChunk(chunk);
          chunk = [];
          await yieldControl();
        }
      }

      // 处理剩余的最后一组
      if (chunk.length > 0) {
        await processChunk(chunk);
      }
    } else {
      // Sync Iterable
      while (true) {
        const { value, done } = (iter as Iterator<T>).next();
        if (done) break;

        chunk.push(value);

        if (chunk.length >= chunkSize) {
          await processChunk(chunk);
          chunk = [];
          await yieldControl();
        }
      }

      // 处理剩余的最后一组
      if (chunk.length > 0) {
        await processChunk(chunk);
      }
    }
  }

  return results;
}

/**
 * 延迟非关键 JavaScript
 * 
 * 查找所有带有 data-defer 属性的脚本，并在页面加载完成后异步加载它们。
 * 这有助于优化页面初始加载性能。
 */
export function deferNonCriticalScripts() {
  if (typeof document === 'undefined') return;

  window.addEventListener('load', () => {
    // 查找所有带有 data-defer 属性的脚本
    const deferredScripts = document.querySelectorAll('script[data-defer]');
    
    deferredScripts.forEach((script) => {
      const newScript = document.createElement('script');
      newScript.src = script.getAttribute('src') || '';
      newScript.async = true;
      document.body.appendChild(newScript);
      script.remove();
    });
  });
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
// User Timing API
// ============================================

/**
 * User Timing 标记工具
 * 
 * 使用方法：
 * import { performanceMark } from '@/lib/performance-optimization';
 * 
 * performanceMark('task-start');
 * // 执行任务
 * performanceMark('task-end');
 * performanceMeasure('task', 'task-start', 'task-end');
 */

/**
 * 创建性能标记
 */
export function performanceMark(name: string, detail?: unknown) {
  if (typeof performance === 'undefined' || !performance.mark) return;
  
  try {
    performance.mark(name, detail ? { detail } : undefined);
  } catch (error) {
    // 标记已存在，忽略错误
    console.warn('[Performance] Mark already exists:', name);
  }
}

/**
 * 测量两个标记之间的时间
 */
export function performanceMeasure(
  name: string,
  startMark: string,
  endMark?: string
) {
  if (typeof performance === 'undefined' || !performance.measure) return;
  
  try {
    performance.measure(name, startMark, endMark);
    
    // 获取测量结果
    const measure = performance.getEntriesByName(name, 'measure')[0];
    if (measure) {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }
  } catch (error) {
    console.warn('[Performance] Measure failed:', name, error);
  }
}

/**
 * 清除性能标记
 */
export function clearPerformanceMarks(markNames?: string[]) {
  if (typeof performance === 'undefined') return;
  
  if (markNames) {
    markNames.forEach((name) => performance.clearMarks(name));
  } else {
    performance.clearMarks();
  }
}

/**
 * 清除性能测量
 */
export function clearPerformanceMeasures(measureNames?: string[]) {
  if (typeof performance === 'undefined') return;
  
  if (measureNames) {
    measureNames.forEach((name) => performance.clearMeasures(name));
  } else {
    performance.clearMeasures();
  }
}

/**
 * 获取所有性能测量
 */
export function getPerformanceMeasures(): PerformanceEntry[] {
  if (typeof performance === 'undefined') {
    return [];
  }

  return performance.getEntriesByType('measure');
}

/**
 * 自动测量异步函数性能
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  
  performanceMark(startMark);
  
  try {
    const result = await fn();
    performanceMark(endMark);
    performanceMeasure(name, startMark, endMark);
    clearPerformanceMarks([startMark, endMark]);
    
    return result;
  } catch (error) {
    performanceMark(endMark);
    performanceMeasure(`${name}-error`, startMark, endMark);
    clearPerformanceMarks([startMark, endMark]);
    
    throw error;
  }
}

/**
 * 自动测量同步函数性能
 */
export function measureSync<T>(
  name: string,
  fn: () => T
): T {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  
  performanceMark(startMark);
  
  try {
    const result = fn();
    performanceMark(endMark);
    performanceMeasure(name, startMark, endMark);
    clearPerformanceMarks([startMark, endMark]);
    
    return result;
  } catch (error) {
    performanceMark(endMark);
    performanceMeasure(`${name}-error`, startMark, endMark);
    clearPerformanceMarks([startMark, endMark]);
    
    throw error;
  }
}

// ============================================
// 资源优化
// ============================================

/**
 * 懒加载图片
 * 
 * 使用 IntersectionObserver API 实现图片的懒加载。
 * 当图片进入视口时才会加载实际资源，减少初始加载带宽。
 * 要求图片元素具有 data-src 属性和 'lazy' class。
 */
export function lazyLoadImages() {
  if (typeof document === 'undefined' || !('IntersectionObserver' in window)) return;

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach((img) => {
    imageObserver.observe(img);
  });
}

/**
 * 图片格式提示
 */
export function setImageFormatSupport() {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.add(
    'modern-browser'
  );
  
  // 检查 WebP 支持
  const checkWebP = () => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  };
  
  checkWebP().then((isSupported) => {
    if (isSupported) {
      document.documentElement.classList.add('webp');
    }
  });
}

// ============================================
// 初始化函数
// ============================================

/**
 * 初始化所有性能优化
 * 
 * 此函数会在页面加载时自动启动一系列性能优化措施：
 * - 预连接常用域名以减少网络延迟
 * - 延迟非关键脚本的加载
 * - 实现图片懒加载
 * - 检测并标记图片格式支持（如 WebP）
 * - 添加性能标记以跟踪优化效果
 */
export function initPerformanceOptimizations() {
  if (typeof window === 'undefined') return;

  // 预连接常用域名
  preconnectToDomains([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net',
  ]);

  // 延迟非关键脚本
  deferNonCriticalScripts();

  // 懒加载图片
  lazyLoadImages();

  // 设置图片格式支持
  setImageFormatSupport();

  // 添加性能标记
  performanceMark('optimizations-init');
  
  window.addEventListener('load', () => {
    performanceMark('page-complete');
    performanceMeasure('page-load', 'optimizations-init', 'page-complete');
  });
}
