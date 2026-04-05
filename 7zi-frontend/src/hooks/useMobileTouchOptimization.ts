'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to optimize touch events on mobile devices
 * Disables 300ms tap delay and improves scroll performance
 */
export function useMobileTouchOptimization() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isTouchDevice || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile) return

    // Disable 300ms tap delay
    document.body.style.touchAction = 'manipulation'

    // Improve scroll performance
    document.body.style.webkitOverflowScrolling = 'touch'

    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('button, a, [role="button"]')
    buttons.forEach(button => {
      button.addEventListener('touchstart', () => {}, { passive: true })
    })

    return () => {
      // Cleanup
      document.body.style.touchAction = ''
      document.body.style.webkitOverflowScrolling = ''
    }
  }, [isMobile])

  return isMobile
}

/**
 * Hook to add passive event listeners for better scroll performance
 */
export function usePassiveScroll() {
  useEffect(() => {
    const supportsPassive = (() => {
      let supports = false
      try {
        const opts = Object.defineProperty({}, 'passive', {
          get() {
            supports = true
            return true
          },
        })
        window.addEventListener('test', null as any, opts)
        window.removeEventListener('test', null as any, opts)
      } catch (e) {
        // Ignore
      }
      return supports
    })()

    if (!supportsPassive) return

    // Add passive event listeners for scroll
    const addPassiveListeners = () => {
      const scrollElements = document.querySelectorAll('[data-scroll-passive]')
      scrollElements.forEach(element => {
        element.addEventListener('touchstart', () => {}, { passive: true })
        element.addEventListener('touchmove', () => {}, { passive: true })
      })
    }

    addPassiveListeners()

    // Use MutationObserver to watch for new elements
    const observer = new MutationObserver(addPassiveListeners)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])
}

/**
 * Hook to optimize viewport meta tag for mobile
 */
export function useMobileViewport() {
  useEffect(() => {
    // Check if viewport meta tag exists
    let viewport = document.querySelector('meta[name="viewport"]')

    if (!viewport) {
      // Create viewport meta tag
      viewport = document.createElement('meta')
      viewport.setAttribute('name', 'viewport')
      document.head.appendChild(viewport)
    }

    // Set optimized viewport for mobile
    const content =
      'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no'
    viewport.setAttribute('content', content)

    return () => {
      // Cleanup - restore default viewport
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1')
      }
    }
  }, [])
}

/**
 * Hook to add safe area insets for notched devices
 */
export function useSafeAreaInsets() {
  useEffect(() => {
    // Add CSS variables for safe area insets
    const style = document.createElement('style')
    style.textContent = `
      :root {
        --safe-area-inset-top: env(safe-area-inset-top, 0px);
        --safe-area-inset-right: env(safe-area-inset-right, 0px);
        --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
        --safe-area-inset-left: env(safe-area-inset-left, 0px);
      }

      .safe-area-top {
        padding-top: max(16px, var(--safe-area-inset-top));
      }

      .safe-area-bottom {
        padding-bottom: max(16px, var(--safe-area-inset-bottom));
      }

      .safe-area-left {
        padding-left: max(16px, var(--safe-area-inset-left));
      }

      .safe-area-right {
        padding-right: max(16px, var(--safe-area-inset-right));
      }

      .safe-area-all {
        padding: max(16px, var(--safe-area-inset-top))
                 max(16px, var(--safe-area-inset-right))
                 max(16px, var(--safe-area-inset-bottom))
                 max(16px, var(--safe-area-inset-left));
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])
}