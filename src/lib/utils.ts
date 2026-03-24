/**
 * 7zi Project Utility Functions
 *
 * A comprehensive collection of utility functions for common programming tasks,
 * including data manipulation, DOM helpers, and environment detection.
 *
 * @module lib/utils
 * @version 2.0.0
 * @author 7zi Team
 * @license MIT
 *
 * @example
 * // Import specific functions
 * import { generateId, isEmpty, isValidEmail } from '@/lib/utils';
 *
 * @example
 * // Import utilities from dedicated modules
 * import { debounce, throttle } from '@/lib/utils/async';
 * import { LRUCache } from '@/lib/cache/lru-cache';
 */

// Logger import removed - causing ES module resolution issues
// Re-enable if logger is actually used in this file

// Re-export ID utilities from dedicated module
export { generateId, generateUUID } from './utils/id';

// Re-export async utilities for backward compatibility
// @deprecated Import from @/lib/utils/async directly instead
export { debounce, throttle, memoize, sleep, retry } from './utils/async';

// Re-export cache utilities for backward compatibility
// @deprecated Import from @/lib/cache/lru-cache directly instead
export { LRUCache, createCache } from './cache/lru-cache';

// Re-export array utilities for backward compatibility
// @deprecated Import from @/lib/utils/array directly instead
export { batch, shuffle, randomItem, unique, groupBy, pick, omit } from './utils/array';

// Re-export math utilities for backward compatibility
// @deprecated Import from @/lib/utils/math directly instead
export { clamp, mapRange, lerp } from './utils/math';

// Re-export validation utilities from dedicated module
// @deprecated Import from @/lib/utils/validation directly instead
export { isEmpty, isValidEmail, isValidUrl } from './utils/validation';

// Re-export environment detection from dedicated module
// @deprecated Import from @/lib/utils/env directly instead
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
} from './utils/env';

// Re-export viewport size function for backward compatibility
export { getViewportSize } from './utils/env';

// Re-export DOM utilities from dedicated module
// @deprecated Import from @/lib/utils/dom directly instead
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
} from './utils/dom';

// Re-export browser utilities from dedicated module
// @deprecated Import from @/lib/utils/browser directly instead
export {
  copyToClipboard,
  readFromClipboard,
  downloadFile,
  getQueryParams,
  updateQueryParams,
} from './utils/browser';

// Re-export performance utilities from dedicated module
// @deprecated Import from @/lib/utils/perf directly instead
export { optimizeImageUrl, preloadResources, lazyLoadComponent } from './utils/perf';

// Re-export UI utilities from dedicated module
// @deprecated Import from @/lib/utils/ui directly instead
export { cn } from './utils/ui';

// Re-export clone utilities for backward compatibility
// @deprecated Import from @/lib/utils/clone directly instead
export { deepClone } from './utils/clone';

// Re-export format utilities for backward compatibility
// @deprecated Import from @/lib/utils/format directly instead
export { formatFileSize, formatNumber } from './utils/format';

// Re-export date utilities
// @deprecated Import from @/lib/date directly instead
export {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from './date';
