/**
 * Environment detection utilities
 *
 * @module lib/utils/env
 */

/**
 * Check if code is running on the client side
 * @returns {boolean} True if running on client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if code is running on the server side
 * @returns {boolean} True if running on server
 */
export function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * Check if code is running in a browser
 * @returns {boolean} True if running in a browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Check if code is running in a Node.js environment
 * @returns {boolean} True if running in Node.js
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null
}

/**
 * Check if a CSS media query matches
 * @param {string} query - CSS media query string
 * @returns {boolean} True if the query matches
 * @private
 */
function checkMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return checkMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Check if user prefers dark mode
 * @returns {boolean} True if prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return checkMediaQuery('(prefers-color-scheme: dark)')
}

/**
 * Check if user prefers light mode
 * @returns {boolean} True if prefers light mode
 */
export function prefersLightMode(): boolean {
  return checkMediaQuery('(prefers-color-scheme: light)')
}

/**
 * Check if device supports touch
 * @returns {boolean} True if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - vendor prefixed property
    navigator.msMaxTouchPoints > 0
  )
}

/**
 * Get device type based on user agent
 * @returns {'desktop' | 'tablet' | 'mobile'} Device type
 */
export function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) && !isMobile

  if (isTablet) return 'tablet'
  if (isMobile) return 'mobile'
  return 'desktop'
}

/**
 * Get viewport size
 * @returns {{width: number, height: number}} Viewport dimensions
 */
export function getViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }

  return {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0,
  }
}
