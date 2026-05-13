/**
 * Common Utility Functions
 *
 * Shared helper functions used across multiple modules to reduce code duplication.
 *
 * @module lib/common
 * @version 1.0.0
 */

/**
 * Calculate a timestamp threshold for "minutes ago" comparisons.
 * Returns Date.now() minus the specified minutes.
 *
 * @param minutes - Number of minutes to look back
 * @returns Timestamp in milliseconds
 *
 * @example
 * const threshold = getTimeThreshold(30) // 30 minutes ago
 * const oldItems = items.filter(item => item.timestamp < threshold)
 */
export function getTimeThreshold(minutes: number): number {
  return Date.now() - minutes * 60 * 1000
}

/**
 * Parse JSON text with error handling.
 * Returns fallback value if parsing fails.
 *
 * @param text - JSON string to parse
 * @param fallback - Default value to return on parse error (default: null)
 * @returns Parsed object or fallback value
 *
 * @example
 * const data = parseJSON(validJsonString, {})
 * const data = parseJSON(invalidJsonString, { default: true })
 */
export function parseJSON<T>(text: string, fallback: T = null as T): T {
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

/**
 * Format duration in human-readable format with appropriate units.
 * Handles microseconds, milliseconds, seconds, and minutes.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(500)      // "500μs"
 * formatDuration(1500)    // "1.50s"
 * formatDuration(90000)    // "1.5min"
 * formatDuration(3600000)  // "60.0min"
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0μs'

  // Microseconds (less than 1ms)
  if (ms < 1) {
    const us = ms * 1000
    return us < 1 ? '0μs' : `${us.toFixed(0)}μs`
  }

  // Milliseconds (less than 1000ms)
  if (ms < 1000) {
    return `${ms.toFixed(ms < 10 ? 2 : 1)}ms`
  }

  // Seconds (less than 60s)
  if (ms < 60000) {
    const secs = ms / 1000
    return `${secs.toFixed(secs < 10 ? 2 : 1)}s`
  }

  // Minutes
  const mins = ms / 60000
  return `${mins.toFixed(1)}min`
}