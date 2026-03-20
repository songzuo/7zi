/**
 * UI utilities - className merging
 * 
 * @module lib/utils/ui
 */

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
