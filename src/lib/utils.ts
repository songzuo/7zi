/**
 * 7zi Project Utility Functions
 *
 * A comprehensive collection of utility functions for common programming tasks,
 * including caching, debouncing, throttling, data manipulation, DOM helpers,
 * and environment detection.
 *
 * @module lib/utils
 * @version 1.0.0
 * @author 7zi Team
 * @license MIT
 *
 * @example
 * // Import specific functions
 * import { debounce, deepClone, generateId } from '@/lib/utils';
 *
 * @example
 * // Import all utilities
 * import * as Utils from '@/lib/utils';
 *
 * // Use debounce for search input
 * const search = debounce((query: string) => {
 *   // Search logic here
 * }, 300);
 */

import { logger } from './logger';
import { debounce, throttle } from './utils/async';

/**
 * Cache entry with value, timestamp, and TTL
 * @interface CacheEntry
 * @template T
 * @deprecated No longer used, LRUCache now stores metadata directly
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Creation timestamp in milliseconds */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Access timestamp for LRU tracking */
  lastAccess: number;
}

// Re-export from dedicated cache module for better code organization
// @deprecated Import from @/lib/cache/lru-cache directly instead
export { LRUCache, createCache } from './cache/lru-cache';

// Re-export from dedicated async module for better code organization
// @deprecated Import from @/lib/utils/async directly instead
export { debounce, throttle, memoize, sleep, retry } from './utils/async';

// Re-export from dedicated clone module for better code organization
// @deprecated Import from @/lib/utils/clone directly instead
export { deepClone } from './utils/clone';

// Re-export from dedicated format module for better code organization
// @deprecated Import from @/lib/utils/format directly instead
export { formatFileSize, formatNumber } from './utils/format';

/**
 * Helper function to format raw bytes as UUID v4 string
 * @param {Uint8Array | Buffer} bytes - 16 bytes of random data
 * @returns {string} UUID v4 formatted string
 * @private
 */
function formatUUIDv4(bytes: Uint8Array | Buffer): string {
  const hex = bytes.toString('hex');
  const variant = parseInt(hex[16], 16);
  const variantChar = [8, 9, 10, 11].includes(variant) ? hex[16] : (variant | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variantChar}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generate a unique ID (UUID v4)
 * 
 * 优化点:
 * 1. 优先使用 crypto.randomUUID（浏览器和现代 Node.js）
 * 2. 使用 crypto.getRandomValues 替代 Math.random（更安全）
 * 3. 提取 formatUUIDv4 公共函数，避免重复代码
 * 4. 减少不必要的字符串拼接和条件判断
 * 
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 * @example
 * generateId() // "550e8400-e29b-41d4-a716-446655440000"
 * generateId('user') // "user-550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(prefix: string = ''): string {
  // Use crypto.randomUUID if available (modern browsers/Node.js 15+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }

  // Use crypto.getRandomValues (browser) or crypto.randomBytes (Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const uuid = formatUUIDv4(bytes);
    return prefix ? `${prefix}-${uuid}` : uuid;
  }

  // Fallback for Node.js environment
  if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      // Try crypto.randomUUID first (Node.js 15.6.0+)
      if (crypto.randomUUID) {
        const uuid = crypto.randomUUID();
        return prefix ? `${prefix}-${uuid}` : uuid;
      }
      // Fallback to crypto.randomBytes
      const bytes = crypto.randomBytes(16);
      const uuid = formatUUIDv4(bytes);
      return prefix ? `${prefix}-${uuid}` : uuid;
    } catch {
      // Last resort: Math.random (not recommended but guarantees availability)
      const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      return prefix ? `${prefix}-${hex}` : hex;
    }
  }

  // Final fallback: Math.random (should rarely reach here)
  const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return prefix ? `${prefix}-${hex}` : hex;
}

/**
 * Alias for generateId() - for consistency with crypto module
 * @returns {string} UUID v4 string
 */
export function generateUUID(): string {
  return generateId();
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is empty
 * @example
 * isEmpty(null) // true
 * isEmpty('') // true
 * isEmpty([]) // true
 * isEmpty({}) // true
 * isEmpty('hello') // false
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Re-export from dedicated array module for better code organization
// @deprecated Import from @/lib/utils/array directly instead
export { batch, shuffle, randomItem, unique, groupBy, pick, omit } from './utils/array';

// Re-export from dedicated math module for better code organization
// @deprecated Import from @/lib/utils/math directly instead
export { clamp, mapRange, lerp } from './utils/math';

/**
 * Check if code is running on the client side
 * @returns {boolean} True if running on client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if code is running on the server side
 * @returns {boolean} True if running on server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if code is running in a browser
 * @returns {boolean} True if running in a browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if code is running in a Node.js environment
 * @returns {boolean} True if running in Node.js
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * Check if a CSS media query matches
 * @param {string} query - CSS media query string
 * @returns {boolean} True if the query matches
 * @private
 */
function checkMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

/**
 * Check if an element is in the viewport
 * @param {Element} element - Element to check
 * @param {number} offset - Offset from viewport edges (default: 0)
 * @returns {boolean} True if element is in viewport
 * @example
 * isInViewport(document.getElementById('myElement'))
 */
export function isInViewport(element: Element, offset: number = 0): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= offset &&
    rect.left >= offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) - offset
  );
}

/**
 * Scroll an element into view smoothly
 * @param {Element} element - Element to scroll to
 * @param {boolean} center - Whether to center the element (default: false)
 * @example
 * scrollToElement(document.getElementById('myElement'), true)
 */
export function scrollToElement(element: Element, center: boolean = false): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: center ? 'center' : 'start',
  });
}

/**
 * Add event listener with automatic cleanup
 * @template T - Event type
 * @param {EventTarget} target - Event target
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {AddEventListenerOptions} options - Event listener options
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = addEventListener(window, 'resize', () => {
 *   // Handle resize
 * });
 * // Later: cleanup()
 */
export function addEventListener<T extends Event>(
  target: EventTarget,
  event: string,
  handler: (event: T) => void,
  options?: AddEventListenerOptions
): () => void {
  target.addEventListener(event, handler as EventListener, options);
  return () => target.removeEventListener(event, handler as EventListener);
}

/**
 * Get element by ID with type safety
 * @template T - Element type
 * @param {string} id - Element ID
 * @returns {T | null} Element or null if not found
 * @example
 * const button = getElementById<HTMLButtonElement>('myButton');
 */
export function getElementById<T extends Element>(id: string): T | null {
  const element = document.getElementById(id);
  // Type assertion: caller is responsible for ensuring the element matches T
  return element ? (element as unknown as T) : null;
}

/**
 * Get all elements by selector with type safety
 * @template T - Element type
 * @param {string} selector - CSS selector
 * @returns {NodeList<T>} Elements matching selector
 * @example
 * const buttons = querySelectorAll<HTMLButtonElement>('button.primary');
 */
export function querySelectorAll<T extends Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector)) as T[];
}

/**
 * Get first element by selector with type safety
 * @template T - Element type
 * @param {string} selector - CSS selector
 * @returns {T | null} First matching element or null
 * @example
 * const button = querySelector<HTMLButtonElement>('button.primary');
 */
export function querySelector<T extends Element>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

/**
 * Create a debounced DOM event handler
 * @template T - Event type
 * @param {Function} handler - Event handler
 * @param {number} delay - Debounce delay in milliseconds (default: 100)
 * @returns {Function} Debounced handler
 * @example
 * const handleResize = debounceDOM((e: Event) => {
 *   // Handle resize event
 * }, 100);
 */
export function debounceDOM<T extends Event>(
  handler: (event: T) => void,
  delay: number = 100
): (event: T) => void {
  return debounce(handler, delay) as (event: T) => void;
}

/**
 * Create a throttled DOM event handler
 * @template T - Event type
 * @param {Function} handler - Event handler
 * @param {number} limit - Throttle limit in milliseconds (default: 100)
 * @returns {Function} Throttled handler
 * @example
 * const handleScroll = throttleDOM((e: Event) => {
 *   // Handle scroll event
 * }, 100);
 */
export function throttleDOM<T extends Event>(
  handler: (event: T) => void,
  limit: number = 100
): (event: T) => void {
  return throttle(handler, limit) as (event: T) => void;
}

/**
 * Observe element intersection
 * @param {Element} element - Element to observe
 * @param {Function} callback - Callback when intersection changes
 * @param {IntersectionObserverInit} options - Observer options
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = observeIntersection(
 *   element,
 *   (entries) => {
 *     // Handle intersection changes
 *   }
 * );
 */
export function observeIntersection(
  element: Element,
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver(callback, options);
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Observe element resize
 * @param {Element} element - Element to observe
 * @param {Function} callback - Callback when size changes
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = observeResize(
 *   element,
 *   (entries) => console.info('Element resized:', entries[0].contentRect)
 * );
 */
export function observeResize(
  element: Element,
  callback: (entries: ResizeObserverEntry[]) => void
): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const observer = new ResizeObserver(callback);
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 * @example
 * await copyToClipboard('Hello, world!');
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClient()) return false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
    return false;
  }
}

/**
 * Read text from clipboard
 * @returns {Promise<string | null>} Clipboard content or null
 * @example
 * const text = await readFromClipboard();
 */
export async function readFromClipboard(): Promise<string | null> {
  if (!isClient()) return null;

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    return null;
  } catch (error) {
    logger.error('Failed to read from clipboard', error);
    return null;
  }
}

/**
 * Download a file from URL
 * @param {string} url - File URL
 * @param {string} filename - Optional filename
 * @example
 * downloadFile('https://example.com/file.pdf', 'document.pdf');
 */
export function downloadFile(url: string, filename?: string): void {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.click();
  link.remove();
}

/**
 * Get the current query parameters as an object
 * @returns {Record<string, string>} Query parameters
 * @example
 * // URL: ?search=hello&page=1
 * getQueryParams() // { search: "hello", page: "1" }
 */
export function getQueryParams(): Record<string, string> {
  if (!isClient()) return {};

  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Update query parameters in URL
 * @param {Record<string, string | number | boolean | undefined | null>} params - Parameters to update
 * @param {boolean} replace - Whether to replace current history state (default: true)
 * @example
 * updateQueryParams({ search: 'hello', page: 2 });
 */
export function updateQueryParams(
  params: Record<string, string | number | boolean | undefined | null>,
  replace: boolean = true
): void {
  if (!isClient()) return;

  const url = new URL(window.location.href);
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value === undefined || value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ path: url.href }, '', url.href);
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return checkMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Check if user prefers dark mode
 * @returns {boolean} True if prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return checkMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Check if user prefers light mode
 * @returns {boolean} True if prefers light mode
 */
export function prefersLightMode(): boolean {
  return checkMediaQuery('(prefers-color-scheme: light)');
}

/**
 * Check if device supports touch
 * @returns {boolean} True if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - vendor prefixed property
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get device type based on user agent
 * @returns {'desktop' | 'tablet' | 'mobile'} Device type
 */
export function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) && !isMobile;

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

/**
 * Get viewport dimensions
 * @returns {Object} Viewport width and height
 */
export function getViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 0, height: 0 };

  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/**
 * Get element's computed style
 * @param {Element} element - Target element
 * @param {string} property - CSS property name
 * @returns {string} Computed style value
 * @example
 * getComputedStyleValue(element, 'color') // "rgb(255, 255, 255)"
 */
export function getComputedStyleValue(element: Element, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Add CSS class to element with delay
 * @param {Element} element - Target element
 * @param {string} className - Class name to add
 * @param {number} delay - Delay in milliseconds (default: 0)
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = addClassWithDelay(element, 'active', 100);
 * // Later: cleanup()
 */
export function addClassWithDelay(
  element: Element,
  className: string,
  delay: number = 0
): () => void {
  const timeout = setTimeout(() => {
    element.classList.add(className);
  }, delay);

  return () => {
    clearTimeout(timeout);
    element.classList.remove(className);
  };
}

/**
 * Toggle CSS class on element
 * @param {Element} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} force - Optional force state
 * @returns {boolean} New class state
 * @example
 * toggleClass(element, 'active', true); // Force add
 * toggleClass(element, 'active'); // Toggle
 */
export function toggleClass(element: Element, className: string, force?: boolean): boolean {
  if (force !== undefined) {
    if (force) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
    return force;
  }
  return element.classList.toggle(className);
}

/**
 * Check if element has all specified classes
 * @param {Element} element - Target element
 * @param {Array<string>} classNames - Class names to check
 * @returns {boolean} True if element has all classes
 * @example
 * hasAllClasses(element, ['active', 'visible'])
 */
export function hasAllClasses(element: Element, classNames: string[]): boolean {
  return classNames.every(className => element.classList.contains(className));
}

/**
 * Check if element has any of the specified classes
 * @param {Element} element - Target element
 * @param {Array<string>} classNames - Class names to check
 * @returns {boolean} True if element has any class
 * @example
 * hasAnyClass(element, ['active', 'disabled'])
 */
export function hasAnyClass(element: Element, classNames: string[]): boolean {
  return classNames.some(className => element.classList.contains(className));
}

/**
 * Optimize image URL with Next.js Image Optimization
 * @param {string} url - Original image URL
 * @param {number} width - Desired width (default: 800)
 * @param {number} quality - Image quality 1-100 (default: 75)
 * @returns {string} Optimized image URL
 * @example
 * optimizeImageUrl('https://example.com/image.jpg', 1200, 85)
 */
export function optimizeImageUrl(
  url: string,
  width: number = 800,
  quality: number = 75
): string {
  // For external images, use Next.js image optimization
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

/**
 * Preload important resources
 * @param {Array<{ href: string; as?: string; type?: string }>} resources - Resources to preload
 * @example
 * preloadResources([
 *   { href: '/styles.css', as: 'style' },
 *   { href: '/app.js', as: 'script' }
 * ])
 */
export function preloadResources(
  resources: Array<{ href: string; as?: string; type?: string }>
): void {
  if (typeof document === 'undefined') return;

  resources.forEach(({ href, as, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    if (as) link.setAttribute('as', as);
    if (type) link.setAttribute('type', type);
    document.head.appendChild(link);
  });
}

/**
 * Lazy load a component
 * @template T - Component props type
 * @param {Function} importFunc - Dynamic import function
 * @returns {Promise<{ default: React.ComponentType<T> }>} Component module
 * @example
 * const LazyComponent = lazyLoadComponent(() => import('./Component'));
 */
export function lazyLoadComponent<T>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>
) {
  return importFunc;
}

/**
 * Re-export date utilities from dedicated module
 */
export { formatTimeAgo, formatDate, formatDateTime, isToday, isYesterday } from './date';

/**
 * Merge Tailwind CSS classes with clsx and deduplication
 * Optimized single-pass implementation
 *
 * @param {...(string | undefined | null | boolean)[]} classes - Class names to merge
 * @returns {string} Merged and deduplicated class string
 * @example
 * cn('foo', 'bar') // 'foo bar'
 * cn('foo', false && 'bar', 'baz') // 'foo baz'
 * cn('foo', { bar: true, baz: false }) // 'foo bar'
 */
export function cn(...classes: (string | undefined | null | boolean | Record<string, boolean>)[]): string {
  const seen = new Set<string>();

  for (const cls of classes) {
    if (!cls) continue;

    if (typeof cls === 'string') {
      // Single-pass: split and add directly to set
      for (const part of cls.split(' ').filter(Boolean)) {
        seen.add(part);
      }
    } else if (typeof cls === 'object') {
      for (const [key, value] of Object.entries(cls)) {
        if (value) {
          seen.add(key);
        }
      }
    }
  }

  return Array.from(seen).join(' ');
}

// Cache email regex to avoid recreating it on every call
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email);
}

// Cache URL regex for faster validation (avoids try-catch overhead)
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return URL_REGEX.test(url);
}
