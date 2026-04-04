/**
 * Global type declarations for browser APIs
 */

import type { ErrorInfo } from 'react'

declare global {
  interface Performance {
    getEntriesByType(type: string): PerformanceEntry[]
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }

  interface Window {
    next?: {
      router?: unknown
    }
    /** Error tracking function (e.g., Sentry, LogRocket) */
    trackError?: (error: Error, errorInfo?: ErrorInfo) => void
  }
}

export {}
