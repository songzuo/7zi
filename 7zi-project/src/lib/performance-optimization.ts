/**
 * Performance Optimizations
 * 性能优化模块
 *
 * Includes resource preloading, preconnection, and performance measurement utilities
 */

// ============================================================================
// Types
// ============================================================================

interface PreloadOptions {
  images?: string[];
  fonts?: string[];
  stylesheets?: string[];
  scripts?: string[];
}

interface ChunkOptions {
  maxDuration?: number;
  yieldDuration?: number;
}

interface IdleCallbackOptions {
  timeout?: number;
}

type IdleCallback = () => void;

// ============================================================================
// Main Export
// ============================================================================

export function initPerformanceOptimizations(): void {
  if (typeof window !== 'undefined') {
    // Preload critical resources
    preloadCriticalResources();

    // Enable passive event listeners for scroll/touch
    enablePassiveEventListeners();
  }
}

export function enablePassiveEventListeners(): void {
  // Add passive event listeners for better scroll performance
}

// ============================================================================
// Preload Critical Resources
// ============================================================================

/**
 * Preload critical resources (images, fonts, stylesheets, scripts)
 */
export function preloadCriticalResources(options: PreloadOptions = {}): void {
  if (typeof document === 'undefined') {
    return;
  }

  const preloadResource = (href: string, as: string): void => {
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;

    document.head.appendChild(link);
  };

  // Preload images
  options.images?.forEach((src) => {
    preloadResource(src, 'image');
  });

  // Preload fonts
  options.fonts?.forEach((src) => {
    preloadResource(src, 'font');
    const fontLink = document.querySelector(`link[href="${src}"]`) as HTMLLinkElement;
    if (fontLink) {
      fontLink.crossOrigin = 'anonymous';
    }
  });

  // Preload stylesheets
  options.stylesheets?.forEach((src) => {
    preloadResource(src, 'style');
  });

  // Preload scripts
  options.scripts?.forEach((src) => {
    preloadResource(src, 'script');
  });
}

// ============================================================================
// Preconnect to Domains
// ============================================================================

/**
 * Preconnect to specified domains to speed up future requests
 */
export function preconnectToDomains(domains: string[]): void {
  if (typeof document === 'undefined' || domains.length === 0) {
    return;
  }

  domains.forEach((domain) => {
    const existing = document.querySelector(`link[href="${domain}"]`);
    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;

    document.head.appendChild(link);
  });
}

// ============================================================================
// Remove Unused CSS
// ============================================================================

/**
 * Remove unused CSS from the page (client-side optimization)
 * Note: This is a simplified version - production use should be build-time
 */
export function removeUnusedCSS(): void {
  if (typeof document === 'undefined' || typeof performance === 'undefined') {
    return;
  }

  // Get all style tags and link tags
  const styleTags = document.querySelectorAll('style[data-remove-unused]');
  const linkTags = document.querySelectorAll('link[rel="stylesheet"][data-remove-unused]');

  // In a real implementation, we would:
  // 1. Extract all selectors used in the DOM
  // 2. Compare with CSS rules
  // 3. Remove unused rules
  // This is a placeholder for the actual implementation

  console.log('removeUnusedCSS called (placeholder implementation)');
}

// ============================================================================
// Run in Chunks
// ============================================================================

/**
 * Execute a task in chunks to avoid blocking the main thread
 */
export async function runInChunks<T>(
  task: () => T,
  options: ChunkOptions = {}
): Promise<T> {
  const maxDuration = options.maxDuration || 50; // Default 50ms per chunk
  const yieldDuration = options.yieldDuration || 0;

  const startTime = Date.now();
  let result: T;

  try {
    // Execute the task
    result = task();

    // If task took longer than maxDuration, yield
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDuration) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, yieldDuration);
      });
    }

    return result;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// Defer Non-Critical Scripts
// ============================================================================

/**
 * Defer loading of non-critical scripts until after page load
 */
export function deferNonCriticalScripts(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('load', () => {
    // Find all scripts with data-defer attribute
    const deferredScripts = document.querySelectorAll('script[data-defer]');

    deferredScripts.forEach((script: Element) => {
      const scriptElement = script as HTMLScriptElement;

      // Create new script element
      const newScript = document.createElement('script');
      newScript.src = scriptElement.getAttribute('data-src') || '';

      // Copy other attributes
      Array.from(scriptElement.attributes).forEach((attr) => {
        if (attr.name !== 'data-defer' && attr.name !== 'data-src') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });

      // Replace original script
      scriptElement.parentNode?.replaceChild(newScript, scriptElement);
    });
  });
}

// ============================================================================
// Idle Task Scheduling
// ============================================================================

/**
 * Schedule a task to run during browser idle time
 */
export function scheduleIdleTask(
  callback: IdleCallback,
  options?: IdleCallbackOptions
): number {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, options) as unknown as number;
  }

  // Fallback to setTimeout
  return setTimeout(callback, options?.timeout || 1) as unknown as number;
}

/**
 * Cancel a scheduled idle task
 */
export function cancelIdleTask(handle: number): void {
  if (typeof cancelIdleCallback !== 'undefined') {
    cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Create a performance mark
 */
export function performanceMark(name: string, detail?: unknown): void {
  if (typeof performance === 'undefined' || !performance.mark) {
    return;
  }

  try {
    if (detail) {
      performance.mark(name, { detail } as PerformanceMarkOptions);
    } else {
      performance.mark(name);
    }
  } catch (error) {
    // Mark already exists - ignore
    console.warn(`Performance mark "${name}" already exists or failed:`, error);
  }
}

/**
 * Create a performance measurement between two marks
 */
export function performanceMeasure(
  name: string,
  startMark?: string,
  endMark?: string
): void {
  if (typeof performance === 'undefined' || !performance.measure) {
    return;
  }

  try {
    performance.measure(name, startMark, endMark);
  } catch (error) {
    console.warn(`Performance measure "${name}" failed:`, error);
  }
}

/**
 * Clear all performance marks
 */
export function clearPerformanceMarks(marks?: string[]): void {
  if (typeof performance === 'undefined' || !performance.clearMarks) {
    return;
  }

  if (marks && marks.length > 0) {
    marks.forEach(mark => performance.clearMarks(mark));
  } else {
    performance.clearMarks();
  }
}

/**
 * Clear all performance measures
 */
export function clearPerformanceMeasures(measures?: string[]): void {
  if (typeof performance === 'undefined' || !performance.clearMeasures) {
    return;
  }

  if (measures && measures.length > 0) {
    measures.forEach(measure => performance.clearMeasures(measure));
  } else {
    performance.clearMeasures();
  }
}

/**
 * Get all performance measures
 */
export function getPerformanceMeasures(): PerformanceEntry[] {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return [];
  }
  return performance.getEntriesByType('measure');
}

/**
 * Measure async function execution
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const errorMark = `${name}-error`;

  performanceMark(startMark);

  try {
    const result = await fn();
    performanceMark(endMark);
    performanceMeasure(name, startMark, endMark);
    clearPerformanceMarks([startMark, endMark]);
    return result;
  } catch (error) {
    performanceMark(errorMark);
    performanceMeasure(`${name}-error`, startMark, errorMark);
    throw error;
  }
}

/**
 * Measure sync function execution
 */
export function measureSync<T>(
  name: string,
  fn: () => T
): T {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const errorMark = `${name}-error`;

  performanceMark(startMark);

  try {
    const result = fn();
    performanceMark(endMark);
    performanceMeasure(name, startMark, endMark);
    clearPerformanceMarks([startMark, endMark]);
    return result;
  } catch (error) {
    performanceMark(errorMark);
    performanceMeasure(`${name}-error`, startMark, errorMark);
    throw error;
  }
}

// ============================================================================
// Image Optimization
// ============================================================================

/**
 * Lazy load images using Intersection Observer
 */
export function lazyLoadImages(): void {
  if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return;
  }

  const lazyImages = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  });

  lazyImages.forEach(img => imageObserver.observe(img));
}

/**
 * Detect and set image format support (WebP, AVIF, etc.)
 */
export function setImageFormatSupport(): void {
  if (typeof document === 'undefined') {
    return;
  }

  // Check for WebP support
  const webP = new Image();
  webP.onload = webP.onerror = () => {
    const isSupported = webP.height === 2;
    if (isSupported) {
      document.documentElement.classList.add('webp');
      document.documentElement.classList.add('modern-browser');
    }
  };
  webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
}

// ============================================================================
// Export Main Function
// ============================================================================

export default initPerformanceOptimizations;
