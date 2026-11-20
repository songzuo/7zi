/**
 * Responsive Design Test Helper
 *
 * This file provides utilities to test responsive behavior across different breakpoints.
 */

/**
 * Breakpoint configurations (matching Tailwind CSS defaults)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * Resize window to specific breakpoint width
 */
export function resizeTo(breakpoint: Breakpoint) {
  window.innerWidth = BREAKPOINTS[breakpoint]
  window.dispatchEvent(new Event('resize'))
}

/**
 * Resize window to custom width
 */
export function resizeToWidth(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

/**
 * Check if current viewport matches breakpoint
 */
export function isBreakpoint(breakpoint: Breakpoint): boolean {
  return window.innerWidth >= BREAKPOINTS[breakpoint]
}

/**
 * Get current breakpoint name
 */
export function getCurrentBreakpoint(): Breakpoint {
  const width = window.innerWidth

  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

/**
 * Test helper: Run callback for each breakpoint
 */
export function testBreakpoints(callback: (bp: Breakpoint) => void) {
  ;(Object.keys(BREAKPOINTS) as Breakpoint[]).forEach(bp => {
    describe(`at ${bp} breakpoint`, () => {
      beforeEach(() => {
        resizeTo(bp)
      })

      callback(bp)
    })
  })
}

/**
 * Test helper: Check if element has responsive classes
 */
export function expectResponsiveClasses(element: HTMLElement, bp: Breakpoint, classes: string) {
  const expectedClasses = classes.split(' ').map(cls => {
    if (cls.includes(':')) {
      // Responsive class like "md:text-lg"
      const [prefix, suffix] = cls.split(':')
      const bpPrefix = prefix === 'sm' ? 'sm' : prefix === 'md' ? 'md' : prefix === 'lg' ? 'lg' : ''
      return bpPrefix ? `${bpPrefix}:${suffix}` : suffix
    }
    return cls
  })

  expectedClasses.forEach(cls => {
    expect(element).toHaveClass(cls)
  })
}

/**
 * Mobile detection utility
 */
export function isMobile(): boolean {
  return window.innerWidth < BREAKPOINTS.sm
}

/**
 * Tablet detection utility
 */
export function isTablet(): boolean {
  return window.innerWidth >= BREAKPOINTS.sm && window.innerWidth < BREAKPOINTS.lg
}

/**
 * Desktop detection utility
 */
export function isDesktop(): boolean {
  return window.innerWidth >= BREAKPOINTS.lg
}

/**
 * Touch device detection
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - vendor prefixed property
    navigator.msMaxTouchPoints > 0
  )
}

/**
 * Orientation detection
 */
export function getOrientation(): 'portrait' | 'landscape' {
  return window.innerWidth < window.innerHeight ? 'portrait' : 'landscape'
}

/**
 * Test helper: Test touch interactions
 */
export function simulateTouch(element: HTMLElement) {
  const touch = new Touch({
    identifier: Date.now(),
    target: element,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    screenX: 0,
    screenY: 0,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
  })

  const touchStart = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [touch],
  })

  const touchEnd = new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    changedTouches: [touch],
  })

  element.dispatchEvent(touchStart)
  element.dispatchEvent(touchEnd)
}

/**
 * Test helper: Test keyboard navigation
 */
export function simulateKeyNavigation(element: HTMLElement, keys: string[]) {
  keys.forEach(key => {
    const keyEvent = new KeyboardEvent('keydown', { key, bubbles: true })
    element.dispatchEvent(keyEvent)
  })
}

/**
 * Test helper: Check minimum touch target size (44x44px for accessibility)
 */
export function expectTouchTargetSize(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  expect(rect.width).toBeGreaterThanOrEqual(44)
  expect(rect.height).toBeGreaterThanOrEqual(44)
}

/**
 * Test helper: Check for accessible contrast (basic check)
 */
export function expectAccessibleContrast(foreground: string, background: string) {
  // This is a simplified check - in production, use a proper color contrast library
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.replace('#', ''), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = rgb & 0xff

    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const lum1 = getLuminance(foreground)
  const lum2 = getLuminance(background)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  const contrast = (brightest + 0.05) / (darkest + 0.05)

  // WCAG AA requires at least 4.5:1 for normal text
  expect(contrast).toBeGreaterThanOrEqual(4.5)
}

/**
 * Test helper: Verify focus order (tab navigation)
 */
export async function verifyFocusOrder(elements: HTMLElement[]) {
  elements[0].focus()
  expect(document.activeElement).toBe(elements[0])

  for (let i = 1; i < elements.length; i++) {
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    document.activeElement?.dispatchEvent(tabEvent)
    expect(document.activeElement).toBe(elements[i])
  }
}

/**
 * Test helper: Verify aria attributes
 */
export function expectAriaAttributes(element: HTMLElement, attributes: Record<string, string>) {
  Object.entries(attributes).forEach(([key, value]) => {
    expect(element).toHaveAttribute(key, value)
  })
}

/**
 * Test helper: Verify role
 */
export function expectRole(element: HTMLElement, role: string) {
  expect(element).toHaveAttribute('role', role)
}

/**
 * Test helper: Verify accessible name
 */
export function expectAccessibleName(element: HTMLElement, name: string) {
  expect(element).toHaveAccessibleName(name)
}

/**
 * Export all helpers as a default object for convenience
 */
export default {
  resizeTo,
  resizeToWidth,
  isBreakpoint,
  getCurrentBreakpoint,
  testBreakpoints,
  expectResponsiveClasses,
  isMobile,
  isTablet,
  isDesktop,
  isTouchDevice,
  getOrientation,
  simulateTouch,
  simulateKeyNavigation,
  expectTouchTargetSize,
  expectAccessibleContrast,
  verifyFocusOrder,
  expectAriaAttributes,
  expectRole,
  expectAccessibleName,
  BREAKPOINTS,
}
