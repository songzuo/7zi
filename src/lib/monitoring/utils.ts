/**
 * Shared Utility Functions for Monitoring
 * 共享工具函数，避免重复代码
 */

import type { MetricRating, AlertLevel } from './performance.config'

/**
 * Get performance score color based on value
 */
export function getPerformanceScoreColor(score: number): string {
  if (score >= 90) return '#0cce6b'
  if (score >= 50) return '#ffa400'
  return '#ff4e42'
}

/**
 * Get performance score label based on value
 */
export function getPerformanceScoreLabel(score: number): string {
  if (score >= 90) return '优秀'
  if (score >= 50) return '需改进'
  return '差'
}

/**
 * Get performance color based on rating
 */
export function getPerformanceColor(rating: MetricRating): string {
  switch (rating) {
    case 'good':
      return '#0cce6b'
    case 'needs-improvement':
      return '#ffa400'
    case 'poor':
      return '#ff4e42'
  }
}

/**
 * Calculate performance score from summary
 */
export function calculatePerformanceScore(
  summary: Record<string, { value: number; rating: MetricRating; count: number }>
): number {
  const weights: Record<string, number> = {
    LCP: 0.25,
    INP: 0.25,
    CLS: 0.25,
    FCP: 0.15,
    TTFB: 0.1,
  }

  let totalScore = 0
  let totalWeight = 0

  Object.entries(summary).forEach(([name, data]) => {
    const weight = weights[name]
    if (!weight) return

    let score = 100
    if (data.rating === 'needs-improvement') score = 50
    else if (data.rating === 'poor') score = 0

    totalScore += score * weight
    totalWeight += weight
  })

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
}

/**
 * Get resource type from URL
 */
export function getResourceType(url: string): string {
  const patterns = {
    js: /\.js($|\?)/,
    css: /\.css($|\?)/,
    image: /\.(png|jpg|jpeg|gif|webp|svg|ico)($|\?)/i,
    font: /\.(woff|woff2|ttf|otf|eot)($|\?)/i,
    api: /\/api\//,
  }

  for (const [type, pattern] of Object.entries(patterns)) {
    if (url.match(pattern)) return type
  }

  return 'other'
}

/**
 * Get alert key for deduplication
 */
export function getAlertKey(level: AlertLevel, metricName: string, route?: string): string {
  return `${level}:${metricName}:${route || 'global'}`
}

/**
 * Check if value is above threshold
 */
export function isAboveThreshold(value: number, threshold: number): boolean {
  return value > threshold
}

/**
 * Format duration for display
 */
export function formatDuration(duration: number, unit: string = 'ms'): string {
  return `${duration.toFixed(0)}${unit}`
}

/**
 * Truncate object to JSON string with max length
 */
export function truncateObject(obj: unknown, maxLength: number = 500): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj)
  }

  try {
    return JSON.stringify(obj).slice(0, maxLength)
  } catch (error) {
    return '[Object]'
  }
}

/**
 * Safe performance.now() call
 */
export function getPerformanceNow(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now()
  }
  return Date.now()
}

/**
 * Check if we're in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if feature is supported
 */
export function isFeatureSupported(feature: string): boolean {
  if (!isBrowser()) return false

  switch (feature) {
    case 'PerformanceObserver':
      return 'PerformanceObserver' in window
    case 'PerformanceMemory':
      return 'performance' in window && 'memory' in performance
    default:
      return false
  }
}

/**
 * Set timer with cleanup
 */
export function setIntervalSafe(callback: () => void, ms: number): NodeJS.Timeout | number {
  if (typeof setInterval !== 'undefined') {
    return setInterval(callback, ms)
  }
  return 0 // Fallback for non-browser environments
}

/**
 * Clear timer safely
 */
export function clearIntervalSafe(timerId: NodeJS.Timeout | number): void {
  if (typeof clearInterval !== 'undefined' && timerId !== 0) {
    clearInterval(timerId as NodeJS.Timeout)
  }
}

/**
 * Add event listener with cleanup
 */
export function addEventListenerSafe<T extends keyof WindowEventMap>(
  target: EventTarget,
  event: T,
  handler: (this: Window, ev: WindowEventMap[T]) => unknown,
  options?: AddEventListenerOptions
): () => void {
  const wrappedHandler: EventListener = (evt: Event) =>
    handler.call(window, evt as WindowEventMap[T])
  target.addEventListener(event, wrappedHandler, options)
  return () => target.removeEventListener(event, wrappedHandler, options as EventListenerOptions)
}
