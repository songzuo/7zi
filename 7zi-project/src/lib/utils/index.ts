/**
 * Utility Functions - Central Export Point
 *
 * @module lib/utils
 * @deprecated This file is kept for backward compatibility.
 *            Please import from specific modules:
 *            - @/lib/utils/async (debounce, throttle, memoize, sleep, retry)
 *            - @/lib/utils/clone (deepClone)
 *            - @/lib/utils/format (formatFileSize, formatNumber)
 *            - @/lib/utils/id (generateId, generateUUID)
 *            - @/lib/utils/cache (LRUCache, createCache)
 *            - @/lib/date (formatTimeAgo, formatDate, formatDateTime, isToday, isYesterday)
 *            - @/lib/utils/array (batch, shuffle, randomItem, unique, groupBy, pick, omit)
 *            - @/lib/utils/math (clamp, mapRange, lerp)
 */

// Async utilities
export {
  debounce,
  throttle,
  memoize,
  sleep,
  retry,
} from './async';

// Clone utilities
export { deepClone } from './clone';

// Format utilities
export { formatFileSize, formatNumber } from './format';

// ID utilities
export { generateId, generateUUID } from './id';

// Cache utilities
export { LRUCache, createCache } from './cache';

// Date utilities (re-export from date module)
export {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from '../date';

// Array utilities
export { batch, shuffle, randomItem, unique, groupBy, pick, omit } from './array';

// Math utilities
export { clamp, mapRange, lerp } from './math';

// Validation utilities
export { isEmpty, isValidEmail, isValidUrl } from './validation';

// Environment detection
export {
  isClient,
  isServer,
  isBrowser,
  isNode,
  isTouchDevice,
  getDeviceType,
  prefersReducedMotion,
  prefersDarkMode,
  prefersLightMode,
} from './env';

// Re-export viewport size function for backward compatibility
export { getViewportSize } from './env';

// DOM utilities
export {
  isInViewport,
  scrollToElement,
  addEventListener,
  getElementById,
  querySelector,
  querySelectorAll,
  debounceDOM,
  throttleDOM,
  observeIntersection,
  observeResize,
  addClassWithDelay,
  toggleClass,
  hasAllClasses,
  hasAnyClass,
  getComputedStyleValue,
} from './dom';

// Browser utilities
export {
  copyToClipboard,
  readFromClipboard,
  downloadFile,
  getQueryParams,
  updateQueryParams,
} from './browser';

// Performance utilities
export { optimizeImageUrl, preloadResources, lazyLoadComponent } from './perf';

// UI utilities
export { cn } from './ui';
