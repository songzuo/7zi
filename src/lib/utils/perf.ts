/**
 * Performance utilities
 *
 * @module lib/utils/perf
 */

import { isClient } from './env'

/**
 * Optimize image URL with Next.js Image Optimization
 * @param {string} url - Original image URL
 * @param {number} width - Desired width (default: 800)
 * @param {number} quality - Image quality 1-100 (default: 75)
 * @returns {string} Optimized image URL
 * @example
 * optimizeImageUrl('https://example.com/image.jpg', 1200, 85)
 */
export function optimizeImageUrl(url: string, width: number = 800, quality: number = 75): string {
  // For external images, use Next.js image optimization
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
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
  if (typeof document === 'undefined') return

  resources.forEach(({ href, as, type }) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    if (as) link.setAttribute('as', as)
    if (type) link.setAttribute('type', type)
    document.head.appendChild(link)
  })
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
  return importFunc
}
