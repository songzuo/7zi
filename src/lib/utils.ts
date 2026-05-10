/**
 * 7zi Project Utility Functions
 *
 * Central re-export file for commonly used utilities.
 * For better tree-shaking, import directly from submodules when possible.
 *
 * @module lib/utils
 * @version 3.0.0
 *
 * @example
 * // Preferred: direct imports for better tree-shaking
 * import { cn } from '@/lib/utils/ui'
 * import { debounce } from '@/lib/utils/async'
 * import { generateId } from '@/lib/utils/id'
 *
 * @example
 * // Backward compatible: import from central utils
 * import { cn } from '@/lib/utils'
 */

// Re-export UI utilities (most commonly used - 33 imports across codebase)
export { cn } from './utils/ui'

// Re-export ID utilities
export { generateId, generateUUID } from './utils/id'