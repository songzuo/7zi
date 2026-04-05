'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

/**
 * Dynamic import options for mobile optimization
 */
interface DynamicImportOptions {
  /** Component to show while loading */
  loading?: ComponentType
  /** Fallback component if loading fails */
  fallback?: ComponentType
  /** Disable SSR for client-only components */
  ssr?: boolean
  /** Load only on desktop (skip mobile) */
  desktopOnly?: boolean
  /** Load only on mobile (skip desktop) */
  mobileOnly?: boolean
}

/**
 * Create a dynamically imported component with mobile optimization
 * Automatically skips loading heavy components on mobile devices
 */
export function createDynamicImport<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicImportOptions = {}
) {
  const {
    loading: LoadingComponent,
    fallback: FallbackComponent,
    ssr = false,
    desktopOnly = false,
    mobileOnly = false,
  } = options

  // Create dynamic component
  const DynamicComponent = dynamic(importFn, {
    ssr,
    loading: LoadingComponent ? () => <LoadingComponent /> : undefined,
  })

  // Wrapper component for conditional loading
  const ConditionalWrapper = (props: T) => {
    // Check device type
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    // Skip loading based on device type
    if (desktopOnly && isMobile) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null
    }

    if (mobileOnly && !isMobile) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null
    }

    return <DynamicComponent {...props} />
  }

  return ConditionalWrapper
}

/**
 * Lazy load 3D components (desktop only)
 * Automatically falls back to simple version on mobile
 */
export function lazyLoad3D<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallbackComponent: ComponentType<T>
) {
  return createDynamicImport(importFn, {
    ssr: false,
    desktopOnly: true,
    fallback: fallbackComponent,
  })
}

/**
 * Lazy load chart components
 * Uses simplified charts on mobile
 */
export function lazyLoadChart<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallbackComponent: ComponentType<T>
) {
  return createDynamicImport(importFn, {
    ssr: false,
    fallback: fallbackComponent,
  })
}

/**
 * Lazy load heavy components with loading state
 */
export function lazyLoadWithLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingComponent: ComponentType
) {
  return createDynamicImport(importFn, {
    ssr: false,
    loading: loadingComponent,
  })
}

/**
 * Preload a component in the background
 * Useful for components that will be needed soon
 */
export function preloadComponent(importFn: () => Promise<any>) {
  if (typeof window === 'undefined') return

  // Use requestIdleCallback to preload during idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Ignore preload errors
      })
    })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore preload errors
      })
    }, 1000)
  }
}

/**
 * Preload multiple components
 */
export function preloadComponents(importFns: Array<() => Promise<any>>) {
  importFns.forEach(importFn => preloadComponent(importFn))
}