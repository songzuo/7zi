/**
 * DOM utilities
 *
 * @module lib/utils/dom
 */

import { debounce, throttle } from './async'
import { logger } from '../logger'

/**
 * Check if an element is in the viewport
 * @param {Element} element - Element to check
 * @param {number} offset - Offset from viewport edges (default: 0)
 * @returns {boolean} True if element is in viewport
 * @example
 * isInViewport(document.getElementById('myElement'))
 */
export function isInViewport(element: Element, offset: number = 0): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= offset &&
    rect.left >= offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) - offset
  )
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
  })
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
  target.addEventListener(event, handler as EventListener, options)
  return () => target.removeEventListener(event, handler as EventListener)
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
  const element = document.getElementById(id)
  // Type assertion: caller is responsible for ensuring the element matches T
  return element ? (element as unknown as T) : null
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
  return Array.from(document.querySelectorAll(selector)) as T[]
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
  return document.querySelector(selector) as T | null
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
  return debounce(handler, delay) as (event: T) => void
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
  return throttle(handler, limit) as (event: T) => void
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
  const observer = new IntersectionObserver(callback, options)
  observer.observe(element)
  return () => observer.disconnect()
}

/**
 * Observe element resize
 * @param {Element} element - Element to observe
 * @param {Function} callback - Callback when size changes
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = observeResize(
 *   element,
 *   (entries) => logger.debug('Resize entries', { category: 'app', entries })
 * );
 */
export function observeResize(
  element: Element,
  callback: (entries: ResizeObserverEntry[]) => void
): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {}
  }

  const observer = new ResizeObserver(callback)
  observer.observe(element)
  return () => observer.disconnect()
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
    element.classList.add(className)
  }, delay)

  return () => {
    clearTimeout(timeout)
    element.classList.remove(className)
  }
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
      element.classList.add(className)
    } else {
      element.classList.remove(className)
    }
    return force
  }
  return element.classList.toggle(className)
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
  return classNames.every(className => element.classList.contains(className))
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
  return classNames.some(className => element.classList.contains(className))
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
  return window.getComputedStyle(element).getPropertyValue(property)
}
